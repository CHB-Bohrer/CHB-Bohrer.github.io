/* The Fun Code hub (projects.html).
   data/projects.json says WHICH projects to show and in what order. Each project's own status.json
   (kept in its repo, so it can be updated alongside the code) says WHERE IT STANDS. The hub reads
   those live; if a project's page is not published yet it falls back to a plain card that links to GitHub. */
(function () {
  "use strict";
  var BL = window.BL;
  var h = BL.h;

  function ghUrl(repo) { return "https://github.com/" + repo; }

  function resolve(entry) {
    var base = entry.page.replace(/\/?$/, "/");
    return BL.getJSON(base + "status.json")
      .then(function (s) { return { entry: entry, status: s, base: base }; })
      .catch(function () { return { entry: entry, status: null, base: base }; });
  }

  function card(r) {
    var e = r.entry, s = r.status || {};
    var title = s.title || e.title, tagline = s.tagline || e.tagline;
    var nodes = BL.allNodes(s.board);
    var labels = s.board && s.board.state_labels;
    var href = r.status ? r.base : ghUrl(e.repo);
    var tags = (s.tags || e.tags || []).slice(0, 4);

    var links = [];
    if (r.status) links.push(h("a", { href: r.base, text: "Where it stands" }));
    if (s.live && s.live.href) links.push(h("a", { href: BL.safeUrl(s.live.href, location.origin + r.base), text: s.live.label || "Try it" }));
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
