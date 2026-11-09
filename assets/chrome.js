/* Header and footer for the lab's sub-pages, so the menu lives in one place.
   If the lab's main site ever moves (for example to a physics.osu.edu page), change LAB_HOME and
   LAB_NAME here and every project page follows. */
(function () {
  "use strict";
  var LAB_HOME = "/";            // where "Lab home" points
  var PROJECTS = "/projects.html";
  var LEARNED = "/learned.html";
  var JOIN = "/#join";

  var here = location.pathname.replace(/index\.html$/, "");
  function cur(path) { return here === path.replace(/index\.html$/, "") ? ' aria-current="page"' : ""; }

  var header =
    '<a class="skip sr" href="#main">Skip to content</a>' +
    '<header id="hdr">' +
    '<a class="logo" href="' + LAB_HOME + '"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.6 19.4c2-5 5.4-1.2 7.2-4.6s-1.6-6 2.1-7 5.4 4 3.1 6.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".55"/><circle cx="17.8" cy="21.4" r="3.1" style="fill:var(--spark)"/></svg><span><span class="ln">The Bohrer Lab</span><span class="ls">Physics &middot; Ohio State</span></span></a>' +
    '<nav class="hnav" aria-label="Main">' +
    '<a class="back" href="' + LAB_HOME + '">&larr; Lab home</a>' +
    '<a class="back" href="' + PROJECTS + '"' + cur(PROJECTS) + '>Fun Code</a>' +
    '<a class="back" href="' + LEARNED + '"' + cur(LEARNED) + '>Learned</a>' +
    '<a class="pill" href="' + JOIN + '">Join the lab</a>' +
    '</nav></header>';

  var footer =
    '<footer class="site-foot"><a href="' + LAB_HOME + '">The Bohrer Lab</a> &middot; Department of Physics, The Ohio State University' +
    '<span class="sep">|</span><a href="' + PROJECTS + '">Fun Code</a><span class="sep">|</span><a href="' + LEARNED + '">Things I have learned</a></footer>';

  document.body.insertAdjacentHTML("afterbegin", header);
  var add = function () { document.body.insertAdjacentHTML("beforeend", footer); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();

  var cs = document.querySelector('.hnav a[aria-current="page"]');
  if (cs) cs.style.opacity = "1";
})();
