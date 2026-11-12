/* The Fun Code hub (projects.html).
   data/projects.json says WHICH projects to show and in what order. Each project's own status.json
   (kept in its repo, so it can be updated alongside the code) says WHERE IT STANDS. The hub reads
   those live. If the project's own page is not published yet (GitHub Pages not turned on for that repo), the card still
   shows its status, read straight from the repo's status.json on GitHub, and links to the code instead. */
(function () {
  "use strict";
  var BL = window.BL;
  var h = BL.h;

  function ghUrl(repo) { return "https://github.com/" + repo; }

  function resolve(entry) {
    var base = entry.page.replace(/\/?$/, "/");
    var sub = base.replace(/^\/[^/]+\//, "");   // "/marchland/about/" -> "about/": where status.json sits inside the repo
    var raw = "https://raw.githubusercontent.com/" + entry.repo + "/main/" + sub + "status.json";
    return BL.getJSON(base + "status.json")
      .then(function (s) { return { entry: entry, status: s, base: base, live: true }; })
      .catch(function () {
        /* page not published: the repo's own status.json still tells us where the project stands */
        return fetch(raw).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (s) { return { entry: entry, status: s, base: base, live: false }; });
      })
      .catch(function () { return { entry: entry, status: null, base: base, live: false }; });
  }

  function card(r) {
    var e = r.entry, s = r.status || {};
    var title = s.title || e.title, tagline = s.tagline || e.tagline;
    var nodes = BL.allNodes(s.board);
    var labels = s.board && s.board.state_labels;
    /* The way in that explains the project: its tutorial (the link marked primary in status.json), else its live demo.
       Only offered once the project's own page is published, because that is where the tutorial is served from. */
    var way = r.live ? ((s.links || []).filter(function (l) { return l.primary; })[0] || (s.live && s.live.href ? s.live : null)) : null;
    var wayHref = way && BL.safeUrl(way.href, location.origin + r.base);
    /* A tutorial listed in data/projects.json is hosted on this site (tutorials.html), so it works whether or not the project's own page is published. */
    var tut = e.tutorial && e.tutorial.href ? { href: BL.safeUrl(e.tutorial.href, location.origin + "/"), label: e.tutorial.label || "Watch the tutorial" } : null;
    if (tut) { wayHref = tut.href; way = tut; }
    /* The card itself (its title, and so a click anywhere on it) leads to the tutorial when there is one. */
    var href = wayHref || (r.live ? r.base : ghUrl(e.repo));
    var tags = (s.tags || e.tags || []).slice(0, 4);

    /* Tutorial first, then status, then code. */
    var links = [];
    if (wayHref) links.push(h("a", { class: "pj-go", href: wayHref, text: (way.label || "Open the tutorial") + " \u2192" }));
    if (r.live) links.push(h("a", { href: r.base, text: "Project status" }));
    links.push(h("a", { href: ghUrl(e.repo), target: "_blank", rel: "noopener", text: "Code on GitHub" }));

    var pushed = h("span", { class: "pj-pushed" });
    var meta = h("div", { class: "pj-meta" }, s.as_of ? h("span", { text: "Status as of " + BL.dateLabel(s.as_of) }) : null, pushed);

    var el = h("article", { class: "pj-card", "data-group": e.group },
      h("div", { class: "pj-top" },
        h("span", { class: "pj-stage", text: s.stage || e.stage || "Project" })),
      h("h3", null, h("a", { href: href }, title)),
      h("p", { class: "pj-tagline", text: tagline }),
      nodes.length ? BL.strip(nodes) : null,
      nodes.length ? BL.counts(nodes, labels) : null,
      tags.length ? h("div", { class: "pj-tags" }, tags.map(function (t) { return h("span", { text: t }); })) : null,
      meta,
      h("div", { class: "pj-links" }, links));

    BL.gh("/repos/" + e.repo).then(function (d) {
      if (d && d.pushed_at) pushed.textContent = "Code updated " + BL.ago(d.pushed_at);
    });
    return el;
  }

  function load() {
    return BL.getJSON("/data/projects.json").then(function (cfg) {
      var list = (cfg.projects || []).filter(function (p) { return p.listed !== false; });
      return Promise.all(list.map(resolve)).then(function (rs) { return { cfg: cfg, items: rs }; });
    });
  }

  function mountHub(root) {
    load().then(function (d) {
      var groups = d.cfg.groups || [];
      var used = groups.filter(function (g) { return d.items.some(function (r) { return r.entry.group === g.id; }); });
      var active = null;

      var chips = h("div", { class: "pj-filters", role: "group", "aria-label": "Filter projects" });
      var body = h("div", { class: "pj-body" });
      root.replaceChildren(used.length > 1 ? chips : "", body);

      function draw() {
        chips.replaceChildren();
        [null].concat(used).forEach(function (g) {
          var n = g ? d.items.filter(function (r) { return r.entry.group === g.id; }).length : d.items.length;
          chips.append(h("button", { type: "button", class: "pj-chip", "aria-pressed": String(active === (g && g.id)),
            onclick: function () { active = g ? g.id : null; draw(); }, text: (g ? g.title : "All") + " (" + n + ")" }));
        });
        body.replaceChildren();
        used.forEach(function (g) {
          if (active && active !== g.id) return;
          var items = d.items.filter(function (r) { return r.entry.group === g.id; });
          body.append(h("section", { class: "pj-group", "aria-labelledby": "g-" + g.id },
            h("h2", { id: "g-" + g.id }, g.title, g.blurb ? h("small", { text: g.blurb }) : null),
            h("div", { class: "pj-grid" }, items.map(card))));
        });
        if (!body.children.length) body.append(h("p", { class: "pj-empty", text: "No projects to show yet." }));
      }
      draw();
    }).catch(function () {
      root.replaceChildren(h("p", { class: "pj-empty" }, "Could not load the project list just now. The code is on ",
        h("a", { href: "https://github.com/CHB-Bohrer", target: "_blank", rel: "noopener", text: "GitHub" }), "."));
    });
  }

  window.Projects = { mountHub: mountHub };
})();
