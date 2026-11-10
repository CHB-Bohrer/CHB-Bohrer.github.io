/* Small behaviours for assets/vibe.css: reading progress, pointer-following light on panels, portrait tilt.
   No data, no network. Safe to remove together with vibe.css. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && matchMedia("(hover: hover)").matches;

  /* reading progress */
  var bar = document.createElement("div");
  bar.id = "sprog"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var ticking = false;
  function progress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  addEventListener("resize", progress);
  progress();

  if (!canHover) return;

  /* light that follows the pointer on panels */
  var PANELS = ".tfig,.follow,.proof,.fcard,.pj-card,.cv-card";
  document.addEventListener("pointermove", function (e) {
    var el = e.target.closest && e.target.closest(PANELS);
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* portrait leans a few degrees toward the pointer */
  var pw = document.querySelector(".spot .image.pw"), photo = pw && pw.querySelector(".photo");
  if (pw && photo && !reduce) {
    pw.addEventListener("pointermove", function (e) {
      var r = photo.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      photo.style.setProperty("--ry", (Math.max(-1, Math.min(1, x)) * 7).toFixed(2) + "deg");
      photo.style.setProperty("--rx", (Math.max(-1, Math.min(1, y)) * -6).toFixed(2) + "deg");
    }, { passive: true });
    pw.addEventListener("pointerleave", function () { photo.style.setProperty("--rx", "0deg"); photo.style.setProperty("--ry", "0deg"); });
  }
})();
