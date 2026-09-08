/* tools/promote-poster.js — the offline producer for the promoted terminal exposure.

   Classification: DERIVED. It is not a second renderer: it runs js/substrate.js —
   the same kernel the browser runs — over the canonical manifest, develops plate 0
   to its terminal state D_N, and tonemaps it with the same tonemapInto the page
   uses. Since §8.1 every recurrence is dsin/dcos/datan2, so D_N and the raster R_N
   are engine-invariant: jsc and the browser produce identical bytes.

   Emits one PROVENANCE line then the terminal RGBA raster, base64, one line.
   Encoding to PNG is a lossless container step done by tools/promote-poster.py;
   tools/test-poster.py decodes the shipped file and compares pixels back to this
   producer, so the container never becomes an authority over the image.

   Run: jsc js/manifest.js js/substrate.js tools/promote-poster.js */
"use strict";
var S = globalThis.CytherSubstrate, CM = globalThis.CytherManifest;

/* The reference frame is a promotion decision, fixed here so the command takes no
   arguments and the receipt is a pure function of the repository. 1200x600 is a
   real viewport frame whose bin raster is exactly BIN_TGT (720,000 cells) — the
   most the runtime ever develops — and 2:1 is the widest aspect the page presents
   it at, so a cover-fit at any landscape aspect in [1,2] is the exact crop the
   plate for that viewport would show. */
var REF = { plate: 0, W: 1200, H: 600 };

var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(u8) {
  var parts = [], chunk = [], i = 0, n = u8.length;
  for (; i + 2 < n; i += 3) {
    var v = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
    chunk.push(B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63]);
    if (chunk.length === 8192) { parts.push(chunk.join("")); chunk = []; }
  }
  var rest = n - i;
  if (rest === 1) { var a = u8[i] << 16; chunk.push(B64[(a >> 18) & 63] + B64[(a >> 12) & 63] + "=="); }
  else if (rest === 2) { var b = (u8[i] << 16) | (u8[i + 1] << 8); chunk.push(B64[(b >> 18) & 63] + B64[(b >> 12) & 63] + B64[(b >> 6) & 63] + "="); }
  parts.push(chunk.join(""));
  return parts.join("");
}

var cam = S.deriveAnchors(CM.CANON);
var frame = S.frameFor(cam.bounds, REF.W, REF.H);
var st = S.plateState(CM.CANON, REF.plate, cam.ANCH[REF.plate], frame);
while (!st.done) S.developStep(st, CM.CANON);
/* Uint8ClampedArray, not Uint8Array: ImageData's round-half-even clamping is part
   of the exposure law, and the browser's raster must round identically. */
var rgba = new Uint8ClampedArray(frame.bw * frame.bh * 4);
S.tonemapInto(st, rgba);

print("PROVENANCE " + JSON.stringify({
  producer: "tools/promote-poster.js",
  plate: REF.plate,
  reference_frame: REF.W + "x" + REF.H,
  raster: frame.bw + "x" + frame.bh,
  bin_scale: frame.sc,
  params: CM.CANON,
  checksum: CM.CHECKSUM,
  epoch: CM.MANIFEST.epoch,
  terminal_step: st.k,
  deposits: st.dep,
  iterations: st.it,
  max_density: st.maxT,
  density_hash_fnv1a: S.stateHash(st),
  rgba_bytes: rgba.length
}));
print("RGBA " + base64(rgba));
