/* Small helpers shared by the Projects hub, the per-project status pages and the Learned page.
   No framework, no build step. Everything user-visible is built with textContent (never innerHTML),
   so text in status.json or learned.md cannot inject markup. */
(function () {
  "use strict";

  /* h("a", {href: "..."}, "text", childNode) -> element */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null) el.append(x); });
      else el.append(c);
    }
    return el;
  }

  /* Only http(s) and same-site paths are allowed as links; anything else becomes "#". */
  function safeUrl(u, base) {
    try {
      var url = new URL(u, base || location.href);
      return (url.protocol === "https:" || url.protocol === "http:") ? url.href : "#";
    } catch (_) { return "#"; }
  }

  function ago(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return "";
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 3600) return "just now";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    var d = Math.floor(s / 86400);
    if (d === 1) return "yesterday";
    if (d < 45) return d + " days ago";
    if (d < 700) return Math.round(d / 30.4) + " months ago";
    return Math.round(d / 365) + " years ago";
  }

  function dateLabel(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return iso || "";
    return new Date(t).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }

  /* GitHub's public API, cached for 30 minutes so a busy visitor does not use up the hourly limit.
     Resolves to the parsed JSON, or null on any failure (the pages simply skip the live parts). */
  var TTL = 30 * 60 * 1000;
  function gh(path) {
    var key = "bl-gh:" + path;
    try {
      var hit = JSON.parse(localStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < TTL) return Promise.resolve(hit.d);
    } catch (_) {}
    return fetch("https://api.github.com" + path, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (_) {} return d; })
      .catch(function () { return null; });
  }

  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  var STATE_WORD = { built: "Built", partial: "In progress", planned: "Planned" };
  var STATES = ["built", "partial", "planned"];

  function countStates(nodes) {
    var c = { built: 0, partial: 0, planned: 0 };
    nodes.forEach(function (n) { if (c[n.state] != null) c[n.state]++; });
    return c;
  }
  function allNodes(board) {
    var out = [];
    ((board && board.phases) || []).forEach(function (p) { (p.nodes || []).forEach(function (n) { out.push(n); }); });
    return out;
  }
  function stateWord(state, labels) { return (labels && labels[state]) || STATE_WORD[state] || state; }

  function strip(nodes) {
    return h("div", { class: "pj-strip", role: "img", "aria-label": nodes.length + " items" },
      nodes.map(function (n) { return h("i", { "data-state": n.state, title: n.name }); }));
  }
  function counts(nodes, labels) {
    var c = countStates(nodes);
    return h("div", { class: "pj-counts" }, STATES.filter(function (s) { return c[s]; }).map(function (s) {
      return h("span", null, h("b", { text: String(c[s]) }), " " + stateWord(s, labels).toLowerCase());
    }));
  }

  window.BL = { h: h, safeUrl: safeUrl, ago: ago, dateLabel: dateLabel, gh: gh, getJSON: getJSON,
    STATES: STATES, stateWord: stateWord, countStates: countStates, allNodes: allNodes, strip: strip, counts: counts };
})();
