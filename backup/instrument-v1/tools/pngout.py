"""Deterministic PNG output for derived production assets.

Byte-determinism contract: fixed zlib level, filter 0 on every row, no
ancillary chunks (no tEXt/tIME/gAMA) — identical pixels give identical bytes.
"""
import struct, zlib


def write_png(path, w, h, rows, alpha=False):
    """rows: list of h bytes objects, each w*3 (RGB) or w*4 (RGBA) samples."""
    ctype = 6 if alpha else 2
    raw = b"".join(b"\x00" + r for r in rows)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def downsample2x(w, h, rows, nchan=3):
    """Exact 2x2 box mean over 8-bit rows, round-half-up integer arithmetic."""
    ow, oh = w // 2, h // 2
    out = []
    for y in range(oh):
        r0, r1 = rows[y * 2], rows[y * 2 + 1]
        row = bytearray(ow * nchan)
        for x in range(ow):
            i = x * 2 * nchan
            for c in range(nchan):
                row[x * nchan + c] = (r0[i + c] + r0[i + nchan + c]
                                      + r1[i + c] + r1[i + nchan + c] + 2) >> 2
        out.append(bytes(row))
    return ow, oh, out
