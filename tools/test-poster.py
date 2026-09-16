#!/usr/bin/env python3
"""Verification for the promoted terminal exposure (assets/plate/surface-terminal.png).

The provenance chain this gate enforces:

    manifest -> substrate kernel -> terminal state D_N -> terminal raster R_N -> poster P

The load-bearing proof is decode(P) == R_N, pixel for pixel — NOT an equality between
the PNG's digest and the kernel's FNV checkpoint hash, which identify different objects.
SHA-256 is the primitive at this boundary, matching the served-artifact identity; FNV
stays what it is good at, telling a development checkpoint from its neighbour.

The pixels come from the repository's own kernel under jsc (tools/promote-poster.js).
This file decodes the shipped bytes and compares them back; it never renders a pixel,
so the PNG encoder cannot become a second authority over the image.

Run: python3 tools/test-poster.py
"""
from __future__ import annotations

import hashlib
import importlib.util
import re
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets/plate/surface-terminal.png"
LOG = ROOT / "docs/asset-promotion-log.md"
MANIFEST = ROOT / "js/manifest.js"

sys.dont_write_bytecode = True
_SPEC = importlib.util.spec_from_file_location("promote_poster", ROOT / "tools/promote-poster.py")
assert _SPEC and _SPEC.loader
PROMOTE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(PROMOTE)
sys.path.insert(0, str(ROOT / "tools"))
from pngout import write_png                                    # noqa: E402  (writer under test, never a renderer)


def decode_png(data: bytes) -> tuple[int, int, int, bytes]:
    """(width, height, channels, pixel bytes) for an 8-bit non-interlaced PNG.

    Full filter support on purpose: a substituted image must be decoded correctly
    and then found different, not rejected because its encoder made other choices.
    """
    if data[:8] != b"\x89PNG\r\n\x1a\x1a"[:1] + b"PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, idat, hdr = 8, bytearray(), None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        tag = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if zlib.crc32(tag + body) & 0xffffffff != struct.unpack(">I", data[pos + 8 + length:pos + 12 + length])[0]:
            raise ValueError("chunk CRC mismatch")
        if tag == b"IHDR":
            hdr = struct.unpack(">IIBBBBB", body)
        elif tag == b"IDAT":
            idat += body
        elif tag == b"IEND":
            break
        pos += 12 + length
    if hdr is None:
        raise ValueError("no IHDR")
    w, h, depth, ctype, comp, filt, interlace = hdr
    if depth != 8 or comp != 0 or filt != 0 or interlace != 0:
        raise ValueError("unsupported PNG variant")
    channels = {0: 1, 2: 3, 4: 2, 6: 4}.get(ctype)
    if channels is None:
        raise ValueError("unsupported colour type")
    raw = zlib.decompress(bytes(idat))
    stride = w * channels
    if len(raw) != (stride + 1) * h:
        raise ValueError("raw length disagrees with IHDR")
    out, prev, pos = bytearray(), bytes(stride), 0
    for _ in range(h):
        ftype = raw[pos]
        line = bytearray(raw[pos + 1:pos + 1 + stride])
        pos += 1 + stride
        if ftype == 1:
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xff
        elif ftype == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xff
        elif ftype == 3:
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xff
        elif ftype == 4:
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                c = prev[i - channels] if i >= channels else 0
                b = prev[i]
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xff
        elif ftype != 0:
            raise ValueError("unknown filter type")
        out += line
        prev = bytes(line)
    return w, h, channels, bytes(out)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class PosterProvenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.prov, cls.rgba = PROMOTE.produce()
        cls.png = ASSET.read_bytes()

    def rendered_world(self, edit: tuple[str, str]) -> bytes:
        """The terminal raster for a manifest the producer has never seen."""
        source = MANIFEST.read_text(encoding="utf-8")
        self.assertEqual(source.count(edit[0]), 1, edit[0])
        with tempfile.TemporaryDirectory() as tmp:
            other = Path(tmp) / "manifest.js"
            other.write_text(source.replace(*edit), encoding="utf-8")
            return PROMOTE.produce(manifest=str(other))[1]

    def verifies(self, png: bytes) -> bool:
        """The gate itself: these bytes decode to exactly this kernel's terminal raster."""
        try:
            w, h, channels, pixels = decode_png(png)
        except (ValueError, zlib.error):
            return False
        return (channels == 4 and f"{w}x{h}" == self.prov["raster"]
                and sha(pixels) == sha(self.rgba))

    def test_the_producer_is_deterministic(self) -> None:
        again_prov, again_rgba = PROMOTE.produce()
        self.assertEqual(again_prov, self.prov)
        self.assertEqual(sha(again_rgba), sha(self.rgba))
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "again.png"
            w, h = (int(v) for v in self.prov["raster"].split("x"))
            write_png(str(out), w, h, [again_rgba[y * w * 4:(y + 1) * w * 4] for y in range(h)], alpha=True)
            self.assertEqual(out.read_bytes(), self.png, "a second promotion is not byte-identical")

    def test_the_shipped_poster_decodes_to_the_terminal_raster(self) -> None:
        w, h, channels, pixels = decode_png(self.png)
        self.assertEqual((f"{w}x{h}", channels), (self.prov["raster"], 4))
        self.assertEqual(sha(pixels), sha(self.rgba), "decode(P) != R_N")
        self.assertTrue(self.verifies(self.png))
        # the terminal state is a batch boundary of the same development law
        self.assertEqual(self.prov["iterations"] % 60000, 0)
        self.assertGreaterEqual(self.prov["deposits"], 900000)

    def test_only_the_declared_derivation_inputs_can_make_this_poster_stale(self) -> None:
        """The checksum tuple is what the world is derived from, and nothing else is.

        A change to a declared derivation input (normalizeManifest: epoch, derived,
        revision, disclosed, indexed, controlled, validation, not_claimed) must move the
        terminal raster, so these promoted bytes cannot survive it. A presentation-only
        manifest field must NOT, or the poster would expire for a reason the mark never
        saw — which would make staleness a bookkeeping artefact instead of a fact.
        """
        for edit in (("systems_indexed: 6", "systems_indexed: 7"),
                     ("controlled_references: 3", "controlled_references: 4")):
            with self.subTest(derivation_input=edit[1]):
                other = self.rendered_world(edit)
                self.assertEqual(len(other), len(self.rgba))
                self.assertNotEqual(sha(other), sha(self.rgba), "a derivation input did not move the raster")
        with self.subTest(presentation_only="public_records"):
            self.assertEqual(sha(self.rendered_world(("public_records: 14", "public_records: 15"))),
                             sha(self.rgba), "a field outside the checksum tuple moved the raster")

    def test_a_tampered_or_substituted_asset_fails_verification(self) -> None:
        w, h = (int(v) for v in self.prov["raster"].split("x"))
        with tempfile.TemporaryDirectory() as tmp:
            flipped = bytearray(self.rgba)
            flipped[4 * (h // 2) * w + 4] ^= 0x01          # one sample, one bit
            out = Path(tmp) / "one-pixel.png"
            write_png(str(out), w, h, [bytes(flipped[y * w * 4:(y + 1) * w * 4]) for y in range(h)], alpha=True)
            self.assertFalse(self.verifies(out.read_bytes()), "a one-bit pixel edit passed")
        raw = bytearray(self.png)
        raw[len(raw) // 2] ^= 0xff                          # a byte inside the compressed stream
        self.assertFalse(self.verifies(bytes(raw)), "a corrupted file passed")
        other_image = (ROOT / "assets/og/og-card.png").read_bytes()
        self.assertFalse(self.verifies(other_image), "a substituted valid image passed")

    def test_the_promotion_log_and_deployment_contract_record_this_artifact(self) -> None:
        log = LOG.read_text(encoding="utf-8")
        self.assertIn(sha(self.png), log, "the promotion log does not record the shipped digest")
        self.assertIn(sha(self.rgba), log, "the promotion log does not record the terminal raster digest")
        self.assertIn(self.prov["density_hash_fnv1a"], log)
        raster = self.prov["raster"]
        self.assertTrue(raster in log or raster.replace("x", "\u00d7") in log, "the log does not record the raster size")
        deployable = [line.strip() for line in (ROOT / "deploy.paths").read_text(encoding="utf-8").splitlines()]
        self.assertIn("assets/plate/surface-terminal.png", deployable)
        # a 246 KB first-paint convenience has no place in an install-time precache:
        # absent, the page simply develops its own plate, which is the whole point
        self.assertNotIn("assets/plate/surface-terminal.png", (ROOT / "sw.js").read_text(encoding="utf-8"))
        # the poster is the world's first paint; the world's page is retired to backup/instrument-v1/
        page = (ROOT / "backup/instrument-v1/index.html").read_text(encoding="utf-8")
        self.assertIn("background:url(assets/plate/surface-terminal.png) center/cover no-repeat", page)
        window = re.search(r"@media \(min-aspect-ratio:1/1\) and \(max-aspect-ratio:2/1\)\{#poster\{display:block\}\}", page)
        self.assertIsNotNone(window, "the poster must be shown only where a cover-fit is exact")


if __name__ == "__main__":
    unittest.main(verbosity=2)
