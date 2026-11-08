/* "Things I have learned": reads learned.md and (a) renders the Learned page, (b) feeds the random-fact box
   on the home page. learned.md is plain text that Christopher edits by hand; nothing here is AI-written.

   File format (see the instructions at the top of learned.md):
     - 2026-11-08 Text of the thing I learned. Links work: [label](https://example.org). #tag #another-tag
   One bullet per entry. The date is optional. Indented lines continue the entry. Tags are the #words at the end. */
(function () {
  "use strict";
  var BL = window.BL;

  /* ---------- parser ---------- */
  var DATE = /^(\d{4}-\d{2}-\d{2})\b[\s:,–—-]*/;

  function parse(src) {
    var out = [], cur = null;
    String(src || "").replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/).forEach(function (raw) {
      var m = /^\s{0,3}[-*+]\s+(.*)$/.exec(raw);
      if (m && !/^\s{4,}/.test(raw)) {
        if (cur) out.push(cur);
        cur = { text: m[1].trim() };
      } else if (cur && /^\s+\S/.test(raw)) {
        cur.text += " " + raw.trim();
      } else if (!raw.trim() || /^#/.test(raw)) {
        if (cur) { out.push(cur); cur = null; }
      }
    });
    if (cur) out.push(cur);

    return out.map(function (e, i) {
      var text = e.text, date = null, d = DATE.exec(text);
      if (d) { date = d[1]; text = text.slice(d[0].length); }
      var tags = [], t;
      while ((t = /(?:^|\s)#([A-Za-z][\w-]*)\s*$/.exec(text))) {
        tags.unshift(t[1].toLowerCase());
        text = text.slice(0, t.index);
      }
      text = text.trim();
      return { id: i, date: date, text: text, tags: tags };
    }).filter(function (e) { return e.text; });
  }

  /* newest dated first; undated entries keep their file order after the dated ones */
  function ordered(list) {
    var dated = list.filter(function (e) { return e.date; });
    var undated = list.filter(function (e) { return !e.date; });
    dated.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.id - b.id; });
    return dated.concat(undated);
  }

  /* ---------- rendering of one entry's text: [label](url), *italic*, plain text only ---------- */
  function inline(text) {
    var frag = document.createDocumentFragment();
    var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*([^*]+)\*/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(text.slice(last, m.index));
      if (m[2]) frag.append(BL.h("a", { href: BL.safeUrl(m[2]), target: "_blank", rel: "noopener", text: m[1] }));
      else frag.append(BL.h("em", { text: m[3] }));
      last = re.lastIndex;
    }
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }

  var FILE = "/learned.md";
  function load() {
    return fetch(FILE, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { return ordered(parse(t)); });
  }

  /* ---------- the home page's random-fact box ---------- */
  function mountFactBox(box, textEl, btn) {
    load().then(function (list) {
      if (!list.length) { box.hidden = true; return; }
      box.hidden = false;
      var last = -1;
      function pick() {
        var i;
        do { i = Math.floor(Math.random() * list.length); } while (i === last && list.length > 1);
        last = i;
        var e = list[i];
        textEl.replaceChildren(inline(e.text));
        if (e.date) textEl.append(BL.h("span", { class: "ln-src", text: "Learned " + BL.dateLabel(e.date) }));
      }
      pick();
      btn.hidden = list.length < 2;
      btn.addEventListener("click", pick);
    }).catch(function () { box.hidden = true; });
  }

  /* ---------- the Learned page ---------- */
  function mountPage(root) {
    var state = { all: [], tag: null, q: "" };
    var tools = BL.h("div", { class: "ln-tools" });
    var search = BL.h("input", { class: "ln-search", type: "search", placeholder: "Search what I have learned", "aria-label": "Search entries" });
    var surprise = BL.h("button", { type: "button", class: "btn special", text: "Surprise me" });
    tools.append(search, surprise);
    var tagBar = BL.h("div", { class: "ln-tags", role: "group", "aria-label": "Filter by tag" });
    var count = BL.h("p", { class: "ln-count", "aria-live": "polite" });
    var list = BL.h("div", { class: "ln-listwrap" });
    root.replaceChildren(tools, tagBar, count, list);

    function matches(e) {
      if (state.tag && e.tags.indexOf(state.tag) < 0) return false;
      if (state.q && (e.text + " " + e.tags.join(" ")).toLowerCase().indexOf(state.q) < 0) return false;
      return true;
    }

    function draw() {
      var shown = state.all.filter(matches);
      count.textContent = shown.length === state.all.length
        ? state.all.length + (state.all.length === 1 ? " thing so far" : " things so far")
        : shown.length + " of " + state.all.length + " shown";
      list.replaceChildren();
      if (!shown.length) { list.append(BL.h("p", { class: "pj-empty", text: "Nothing matches yet." })); return; }
      var ul = null, month = null;
      shown.forEach(function (e) {
        var key = e.date ? e.date.slice(0, 7) : "undated";
        if (key !== month) {
          month = key;
          var label = e.date ? new Date(e.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : "Earlier";
          list.append(BL.h("h2", { class: "ln-month", text: label }));
          ul = BL.h("ul", { class: "ln-list" });
          list.append(ul);
        }
        var tg = e.tags.length ? BL.h("div", { class: "tg" }, e.tags.map(function (t) {
          return BL.h("button", { type: "button", onclick: function () { setTag(t); }, text: "#" + t });
        })) : null;
        ul.append(BL.h("li", { class: "ln-item", id: "e" + e.id },
          BL.h("time", e.date ? { datetime: e.date, text: BL.dateLabel(e.date) } : { text: "" }),
          BL.h("div", null, BL.h("p", { class: "tx" }, inline(e.text)), tg)));
      });
    }

    function drawTags() {
      var seen = {};
      state.all.forEach(function (e) { e.tags.forEach(function (t) { seen[t] = (seen[t] || 0) + 1; }); });
      var names = Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a] || (a < b ? -1 : 1); });
      tagBar.replaceChildren();
      tagBar.hidden = !names.length;
      if (!names.length) return;
      [null].concat(names).forEach(function (t) {
        tagBar.append(BL.h("button", { type: "button", class: "pj-chip", "aria-pressed": String(state.tag === t),
          onclick: function () { setTag(t); }, text: t ? "#" + t + " (" + seen[t] + ")" : "All" }));
      });
    }
    function setTag(t) { state.tag = state.tag === t ? null : t; drawTags(); draw(); }

    search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); draw(); });
    surprise.addEventListener("click", function () {
      if (!state.all.length) return;
      state.tag = null; state.q = ""; search.value = ""; drawTags(); draw();
      var e = state.all[Math.floor(Math.random() * state.all.length)];
      var el = document.getElementById("e" + e.id);
      if (el) {
        el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
      }
    });

    load().then(function (all) {
      state.all = all;
      surprise.hidden = all.length < 2;
      search.hidden = tools.hidden = false;
      if (!all.length) {
        tools.hidden = true; tagBar.hidden = true; count.textContent = "";
        list.append(BL.h("p", { class: "pj-empty", text: "Nothing written down yet. The first entries will show up here." }));
        return;
      }
      drawTags(); draw();
    }).catch(function () {
      tools.hidden = true; tagBar.hidden = true;
      list.replaceChildren(BL.h("p", { class: "pj-empty", text: "Could not load the list just now. Please try again in a moment." }));
    });

    /* ?edit or #add shows a shortcut to the file's editor on GitHub (only Christopher can save there) */
    if (/[?&]edit\b|#add\b/.test(location.search + location.hash)) {
      root.after(BL.h("p", { class: "ln-count" },
        BL.h("a", { class: "btn special", href: "https://github.com/CHB-Bohrer/CHB-Bohrer.github.io/edit/main/learned.md", target: "_blank", rel: "noopener", text: "Add an entry on GitHub" })));
    }
  }

  window.Learned = { parse: parse, ordered: ordered, mountFactBox: mountFactBox, mountPage: mountPage };
})();
