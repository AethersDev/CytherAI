/* tools/test-projection.js — CL-02 over a page's projected facts, under jsc.
   A minimal document stands in for the browser: its [data-m] elements are the
   ones PARSED FROM THE SHIPPED index.html (never invented), plus two sites that
   print the checksum ([data-checksum]). The claim must hold on the shipped page, fail when one
   projected fact is corrupted, and fail when the facts are absent — a page that
   prints nothing must not pass vacuously.

   Run: jsc js/manifest.js tools/test-projection.js   (loads js/claims.js itself,
   after the document exists, because claims.js binds `hasDoc` at load) */
"use strict";
var CM = globalThis.CytherManifest, fails = 0;
function ok(cond, name) { if (cond) print("PASS  " + name); else { fails++; print("FAIL  " + name); } }
var html = readFile("index.html"), marks = [], re = /<(span|td|div)\b[^>]*\bdata-m="([^"]+)"[^>]*>([^<]*)<\/\1>/g, m;
while ((m = re.exec(html))) marks.push({ dataset: { m: m[2] }, textContent: m[3] });
var doc = { marks: marks, sites: [{ textContent: CM.CHECKSUM }, { textContent: CM.CHECKSUM }],
  querySelectorAll: function (sel) { return sel === "[data-m]" ? this.marks.slice() : sel === "[data-checksum]" ? this.sites.slice() : []; },
  getElementById: function () { return null; } };
globalThis.document = doc;
load("js/claims.js");
var C = globalThis.CytherClaims;
var r = C.checkRenderManifest();
var declared = (html.match(/data-m="/g) || []).length;
ok(r.ok && marks.length === declared && declared >= 18 && r.detail.indexOf(marks.length + " projected facts") > 0,
   "CL-02 holds on the shipped page, every marked element parsed (" + declared + "): " + r.detail);
doc.marks[7].textContent = "07";
r = C.checkRenderManifest();
ok(!r.ok && r.detail.indexOf(doc.marks[7].dataset.m) > 0, "CL-02 fails when one projected fact is corrupted (" + r.detail + ")");
doc.marks[7].textContent = marks[7].textContent = CM.project(marks[7].dataset.m);
doc.marks.push({ dataset: { m: "count:nonsense" }, textContent: "01" });
r = C.checkRenderManifest();
ok(!r.ok, "CL-02 fails on a projection name the manifest does not define");
doc.marks.pop();
doc.marks = [];
r = C.checkRenderManifest();
ok(!r.ok && r.detail === "no projected facts on the page", "CL-02 does not pass vacuously on a page with no projected facts");
doc.marks = marks; doc.sites[1].textContent = "0000:0000";
ok(!C.checkRenderManifest().ok, "CL-02 still fails when one printed checksum is not the derived one");
doc.sites = [];
ok(C.checkRenderManifest().detail === "no checksum printed on the page", "CL-02 does not pass vacuously on a page that prints no checksum");
if (fails) throw new Error(fails + " projection claim regression(s) failed");
print("projection claim: all pass");
