/* Renders one project's status page from its status.json.
   Used by every project's tiny index.html:
     <main id="pj-root"></main>
     <script src="/assets/project-site.js" data-status="status.json" defer></script>
   Keep status.json honest and current; this page only displays it. */
(function () {
  "use strict";
  var BL = window.BL, h = BL.h;
  var script = document.currentScript;
  var statusUrl = new URL((script && script.getAttribute("data-status")) || "status.json", location.href);
  var root = document.getElementById("pj-root");

  function section(title, sub, id) {
    return h("section", { class: "pg-section", id: id, "aria-labelledby": id + "-h" },
      h("h2", { id: id + "-h", text: title }), sub ? h("p", { class: "sub", text: sub }) : null);
  }

  function renderBoard(s) {
    var b = s.board, nodes = BL.allNodes(b), labels = b.state_labels;
    var sec = section(b.title || "Where it stands", b.intro, "board");
    var wrap = h("div", { class: "pj-board" });
    var phases = h("ol", { class: "pj-phases" });
    var filter = null;

    var keybar = h("div", { class: "pj-keybar", role: "group", "aria-label": "Highlight by status" });
    var c = BL.countStates(nodes);
    BL.STATES.forEach(function (st) {
      if (!c[st]) return;
      keybar.append(h("button", { type: "button", "aria-pressed": "false", "data-s": st,
        onclick: function () { filter = filter === st ? null : st; applyFilter(); } },
        h("span", { class: "pj-state", "data-state": st, text: c[st] + " " + BL.stateWord(st, labels) })));
    });
    keybar.append(h("span", { class: "pj-hint", text: "Click a status to highlight it. Click an item for details." }));

    function applyFilter() {
      keybar.querySelectorAll("button").forEach(function (btn) { btn.setAttribute("aria-pressed", String(btn.dataset.s === filter)); });
      phases.querySelectorAll(".pj-node").forEach(function (n) { n.classList.toggle("dim", !!filter && n.dataset.state !== filter); });
    }

    var uid = 0;
    (b.phases || []).forEach(function (p) {
      var ul = h("ul", { class: "pj-nodes" });
      (p.nodes || []).forEach(function (n) {
        var id = "node-" + (++uid);
        var btn = h("button", { type: "button", "aria-expanded": "false", "aria-controls": id },
          h("span", { class: "pj-dot", "aria-hidden": "true" }),
          h("span", { class: "pj-nm" }, n.name, h("span", { class: "pj-lb", text: n.label || BL.stateWord(n.state, labels) })),
          n.note ? h("span", { class: "pj-chev", "aria-hidden": "true", text: "›" }) : null);
        var li = h("li", { class: "pj-node", "data-state": n.state }, btn);
        if (n.note) {
          var note = h("div", { class: "pj-note", id: id, hidden: true, text: n.note });
          li.append(note);
          btn.addEventListener("click", function () {
            var open = btn.getAttribute("aria-expanded") === "true";
            btn.setAttribute("aria-expanded", String(!open)); note.hidden = open;
          });
        } else { btn.style.cursor = "default"; }
        ul.append(li);
      });
      phases.append(h("li", { class: "pj-phase" }, h("h3", { text: p.title }), p.blurb ? h("p", { text: p.blurb }) : null, ul));
    });
    wrap.append(keybar, phases);
    sec.append(wrap);
    return sec;
  }

  function list(title, items, cls) {
    return h("div", { class: "pj-list " + (cls || "") }, h("h3", { text: title }), h("ul", null, items.map(function (t) { return h("li", { text: t }); })));
  }

  function renderActivity(s, sec) {
    var feed = h("ul", { class: "pj-feed" });
    var note = h("p", { class: "pj-feed-note" });
    sec.append(feed, note);
    sec.hidden = true;
    BL.gh("/repos/" + s.repo + "/commits?per_page=8").then(function (commits) {
      if (!Array.isArray(commits) || !commits.length) return;
      commits.forEach(function (c) {
        var msg = (c.commit && c.commit.message || "").split("\n")[0];
        var when = c.commit && c.commit.author && c.commit.author.date;
        feed.append(h("li", null,
          h("time", { datetime: when || "", title: when ? BL.dateLabel(when) : "", text: when ? BL.ago(when) : "" }),
          h("a", { href: BL.safeUrl(c.html_url), target: "_blank", rel: "noopener", text: msg })));
      });
      note.textContent = "Pulled live from GitHub when you opened this page.";
      sec.hidden = false;
    });
  }

  function render(s) {
    document.title = s.title + " | The Bohrer Lab";
    var links = (s.links || []).map(function (l, i) {
      return h("a", { class: "btn" + (l.primary || i === 0 ? " special" : ""), href: BL.safeUrl(l.href, statusUrl.href),
        target: /^https?:\/\//.test(l.href) && l.href.indexOf(location.origin) !== 0 ? "_blank" : null, rel: "noopener", text: l.label });
    });
    if (s.live && s.live.href) links.unshift(h("a", { class: "btn special", href: BL.safeUrl(s.live.href, statusUrl.href), text: s.live.label || "Try it" }));
    links.forEach(function (a, i) { if (i) a.classList.remove("special"); });

    var hero = h("div", null,
      h("p", { class: "pg-eyebrow" }, h("a", { href: "/projects.html", style: "text-decoration:none" }, "← All projects")),
      h("div", { class: "pj-hero-meta" },
        s.stage ? h("span", { class: "pj-stage", text: s.stage }) : null,
        s.kind ? h("span", { class: "pj-stage", text: s.kind }) : null,
        s.as_of ? h("span", { class: "pj-asof", text: "Status as of " + BL.dateLabel(s.as_of) }) : null),
      h("h1", { text: s.title }),
      h("p", { class: "pg-lede", text: s.tagline }),
      (s.about || []).map(function (p) { return h("p", { class: "pg-lede", style: "margin-top:.8rem;font-size:1.05rem", text: p }); }),
      links.length ? h("div", { class: "pg-actions" }, links) : null);

    var out = [hero];

    if ((s.facts || []).length) {
      var f = section("At a glance", null, "glance");
      f.append(h("div", { class: "pj-facts" }, s.facts.map(function (x) {
        return h("div", { class: "pj-fact" }, h("b", { text: x.value }), h("span", { text: x.label }));
      })));
      out.push(f);
    }
    if (s.board && (s.board.phases || []).length) out.push(renderBoard(s));

    if ((s.works || []).length || (s.limits || []).length) {
      var two = section("Honest status", "What you can rely on today, and what is still open.", "honest");
      two.append(h("div", { class: "pj-two" },
        (s.works || []).length ? list("Works today", s.works) : null,
        (s.limits || []).length ? list("Not yet, or use with care", s.limits) : null));
      out.push(two);
    }

    if ((s.gallery || []).length) {
      var g = section("A look inside", null, "look");
      g.append(h("ul", { class: "pj-gallery" }, s.gallery.map(function (x) {
        var src = new URL(x.src, statusUrl.href).href;
        return h("li", null, h("figure", null,
          h("a", { href: src, target: "_blank", rel: "noopener" }, h("img", { src: src, alt: x.alt || x.caption || "", loading: "lazy" })),
          x.caption ? h("figcaption", { text: x.caption }) : null));
      })));
      out.push(g);
    }

    if (s.repo) {
      var a = section("Recent activity", "The latest commits to the code.", "activity");
      renderActivity(s, a);
      out.push(a);
    }

    if (s.source_note) out.push(h("p", { class: "pj-feed-note", style: "margin-top:44px", text: s.source_note }));
    root.replaceChildren.apply(root, out);
  }

  BL.getJSON(statusUrl.href).then(render).catch(function () {
    root.replaceChildren(h("div", { class: "pg-noscript" }, "This page could not load its status just now. ",
      h("a", { href: "/projects.html", text: "See all projects" }), "."));
  });
})();
