/* js/develop-worker.js — the development server, off the main thread.
   Transport only. The kernel is js/substrate.js (its pure surface loads without a
   document), the protocol is CytherSubstrate.developServer, and the main thread
   keeps the presentation law. Execution location changes; the trajectory does not. */
"use strict";
importScripts("manifest.js", "substrate.js");
var serve = CytherSubstrate.developServer();
onmessage = function (e) {
  var r = serve(e.data);
  if (!r) return;
  var transfer = [];
  if (r.rgba) transfer.push(r.rgba.buffer);
  if (r.field) transfer.push(r.field.total.buffer);
  postMessage(r, transfer);
};
