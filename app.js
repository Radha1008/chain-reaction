// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// Chain Reaction, console view: two screens (Scan, Analysis), same data.js and
// engine.js as the full site, so paths and fixes always match. No storage, no network.

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const selected = new Set();
  const SVGNS = "http://www.w3.org/2000/svg";

  // Plain-language names for the five areas.
  const SECTORS = [
    ["initial_access", "How someone reaches you"],
    ["credential", "Passwords and sign-ins"],
    ["exposure", "What is public about you"],
    ["iot", "Home and devices"],
    ["behavior", "Everyday habits"],
  ];
  const CODE = Object.fromEntries(HABITS.map((h, i) => [h.id, "H-" + pad(i + 1)]));
  let sector = 0;
  let paths = [];
  let pathIdx = 0;
  let nodeIdx = 0;

  /* ---------- Scan view ---------- */

  function renderSectors() {
    $("sectorList").innerHTML = SECTORS.map(([stage, name], i) => {
      const list = HABITS.filter((h) => h.stage === stage);
      const on = list.filter((h) => selected.has(h.id)).length;
      return `<li><button type="button" class="sector" data-i="${i}" aria-current="${i === sector}">
        <span class="s-name">${esc(name)}</span><span class="s-n">${on}/${list.length}</span>
        <span class="s-bar"><i style="width:${(on / list.length) * 100}%"></i></span></button></li>`;
    }).join("");
  }

  /* Your own habits: match free text to a modelled habit, or keep it as an
     unscored note. Notes live in memory only, like everything else here. */
  const notes = [];
  let ownQuery = "";
  let ownMatches = [];

  // Forgiving match: keyword phrases (plurals allowed) score high, shared
  // meaningful words with a habit's own wording score lower. Best first.
  const STOP = new Set("i me my mine we our you your the a an and or but to of in on at for with from by is are was were be been am do does did not no never always often usually sometimes just really very so that this it its they them their have has had can cant can't could would should will about all any some lot lots thing things stuff use using used get got".split(" "));
  const stem = (w) => w.replace(/'s$/, "").replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "");
  const words = (t) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem);
  const HABIT_WORDS = Object.fromEntries(HABITS.map((h) => [h.id, new Set(words(h.label + " " + h.shortName))]));

  function matchText(q) {
    const t = q.toLowerCase();
    const has = (w) => new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(s|es)?\\b").test(t);
    const score = {};
    const add = (id, n) => (score[id] = (score[id] || 0) + n);
    KEYWORD_MAP.forEach((k) => { if (k.keywords.some(has)) k.habitIds.forEach((id) => add(id, 3)); });
    const qw = new Set(words(q));
    HABITS.forEach((h) => {
      if (has(h.shortName.toLowerCase())) add(h.id, 3);
      HABIT_WORDS[h.id].forEach((w) => { if (w.length > 3 && qw.has(w)) add(h.id, 1); });
    });
    return Object.keys(score).sort((a, b) => score[b] - score[a]).slice(0, 4);
  }

  function renderOwn() {
    const q = ownQuery;
    if (!q || q.length < 3) $("ownResult").innerHTML = "";
    else if (ownMatches.length) {
      $("ownResult").innerHTML = `<p class="cap own-cap">Closest habits we model <span class="cap-r">switch on any that fit</span></p>
        <div class="sugg">${ownMatches.map((id) => { const h = CREngine.habit(id); return `<button type="button" class="sg" data-h="${id}" aria-pressed="${selected.has(id)}">
          <span class="sw" aria-hidden="true"></span><span><strong>${esc(h.label)}</strong><small>${esc(h.attackerView)}</small></span></button>`; }).join("")}</div>
        <button type="button" class="ghost" data-keep>None of these fit: keep it as a note</button>`;
    } else {
      $("ownResult").innerHTML = `<p class="cap own-cap">No close match yet <span class="cap-r">judge it like an attacker would</span></p>
        <p class="own-msg">This tool models 24 common habits. For anything else, ask the three questions it uses for every habit:</p>
        <ol class="qs">
          <li><b>Could it let a stranger reach you?</b><span>A link, a network, a device or an app they can use to get in.</span><button type="button" class="ghost" data-tab="0">See examples in Reach &rarr;</button></li>
          <li><b>Could one break-in spread from it?</b><span>A shared password, a missing second step, one account that resets the rest.</span><button type="button" class="ghost" data-tab="1">See examples in Passwords &rarr;</button></li>
          <li><b>Does it tell strangers about you?</b><span>Where you are, where you work, who you are close to, what your answers to security questions might be.</span><button type="button" class="ghost" data-tab="2">See examples in Public info &rarr;</button></li>
        </ol>
        <p class="own-msg">If you answered yes to any, it is worth fixing even though it is not scored here.</p>
        <button type="button" class="ghost" data-keep>Keep it as a note</button>`;
    }
    $("ownNotes").innerHTML = notes.length ? `<p class="cap">Your notes <span class="cap-r">not scored</span></p><ul class="note-list">${notes.map((n, i) =>
      `<li><span>${esc(n)}</span><button type="button" class="ghost" data-del="${i}" aria-label="Remove note">Remove</button></li>`).join("")}</ul>` : "";
  }

  function renderCards() {
    const own = sector === SECTORS.length;
    $("cards").hidden = own;
    $("own").hidden = !own;
    $("prevSector").disabled = sector === 0;
    $("nextSector").disabled = own;
    renderTabs();
    if (own) {
      $("sectorCode").textContent = "Your own";
      $("sectorName").textContent = "Something not on the list?";
      $("sectorBlurb").textContent = "Describe it and we will match it to a habit we model. If there is no match, keep it as a note.";
      $("sectorCount").textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;
      renderOwn();
      return;
    }
    const [stage, name] = SECTORS[sector];
    const list = HABITS.filter((h) => h.stage === stage);
    $("sectorCode").textContent = `Sector ${pad(sector + 1)} of ${pad(SECTORS.length)}`;
    $("sectorName").textContent = name;
    $("sectorBlurb").textContent = STAGE_META[stage].blurb;
    $("sectorCount").textContent = `${list.filter((h) => selected.has(h.id)).length} selected`;
    $("cards").innerHTML = list.map((h) => `<button type="button" class="card" data-h="${h.id}" aria-pressed="${selected.has(h.id)}">
      <span><span class="c-id">${CODE[h.id]}</span><span class="c-t">${esc(h.label)}</span></span><span class="sw" aria-hidden="true"></span></button>`).join("");
  }

  function renderTabs() {
    const SHORT = ["Reach", "Passwords", "Public info", "Home", "Habits"];
    $("secTabs").innerHTML = SECTORS.map(([st], i) => {
      const on = HABITS.filter((h) => h.stage === st && selected.has(h.id)).length;
      return `<button type="button" role="tab" class="sec-tab" data-i="${i}" aria-selected="${i === sector}"><i>${pad(i + 1)}</i>${SHORT[i]}${on ? `<b>${on}</b>` : ""}</button>`;
    }).join("") + `<button type="button" role="tab" class="sec-tab own-tab" data-i="${SECTORS.length}" aria-selected="${sector === SECTORS.length}"><i>+</i>Your own${notes.length ? `<b>${notes.length}</b>` : ""}</button>`;
  }

  function renderMonitor() {
    const n = paths.length;
    const worst = n ? paths[0].severity.score : 0;
    $("openCount").textContent = n;
    $("railOpen").textContent = n;
    $("railSel").textContent = selected.size;
    $("openLabel").textContent = n === 1 ? "open path" : "open paths";
    $("gFill").style.strokeDasharray = `${(worst / 10) * 377} 377`;
    document.querySelector(".gauge").classList.toggle("hot", n > 0);
    const level = !n ? "Clear" : worst >= 7 ? "High" : worst >= 5 ? "Elevated" : "Low";
    $("level").textContent = level;
    $("level").className = n ? "hot" : "ok";
    $("worst").textContent = `${worst} / 10`;
    $("selCount").textContent = `${selected.size} / ${HABITS.length}`;

    const plan = CREngine.plan(selected);
    $("priority").hidden = !plan.steps.length;
    if (plan.steps.length) {
      const s = plan.steps[0];
      $("pFix").textContent = FIX_ACTIONS[s.id];
      $("pMeta").textContent = `Closes ${s.removed} of ${s.openBefore} · about ${FIX_MINUTES[s.id] || 10} min`;
    }
    $("monitorHint").hidden = n > 0;
    $("monitorHint").textContent = selected.size
      ? "No path forms yet. A path needs a way in (such as public wifi) plus a weak spot (such as a reused password)."
      : "A path needs a way in (such as public wifi) and a weak spot (such as a reused password).";
    $("runAnalysis").disabled = !n;
    $("toAnalysisTab").disabled = !n;
  }

  function renderPresets() {
    $("presets").innerHTML = PERSONAS.map((p) => `<button type="button" class="chip" data-p="${p.id}" title="${esc(p.blurb)}">${esc(p.label)}</button>`).join("");
  }

  function syncPresets() {
    document.querySelectorAll("#presets .chip").forEach((b) => {
      const p = PERSONAS.find((x) => x.id === b.dataset.p);
      b.setAttribute("aria-pressed", String(p.habits.length === selected.size && p.habits.every((id) => selected.has(id))));
    });
  }

  function update() {
    paths = CREngine.buildPaths(selected);
    renderSectors();
    renderCards();
    renderMonitor();
    syncPresets();
  }

  /* ---------- Analysis view ---------- */

  function renderPathList() {
    $("pathList").innerHTML = paths.map((p, i) => {
      const s = p.severity.score;
      const bars = Array.from({ length: 10 }, (_, k) => `<i class="${k < s ? "on" : ""}"></i>`).join("");
      return `<li><button type="button" class="prow" data-i="${i}" aria-current="${i === pathIdx}">
        <span class="p-n">${esc(p.name)}</span><span class="p-s">${s}/10</span><span class="p-b" aria-hidden="true">${bars}</span></button></li>`;
    }).join("");
  }

  function wrapLabel(text, max) {
    const words = text.toUpperCase().split(/\s+/);
    const lines = [""];
    words.forEach((w) => {
      const cur = lines[lines.length - 1];
      if (cur && (cur + " " + w).length > max) lines.push(w);
      else lines[lines.length - 1] = cur ? cur + " " + w : w;
    });
    return lines.slice(0, 2);
  }

  function nodeLabel(p, i) {
    const t = p.stepTech[i];
    if (document.body.classList.contains("analyst") && t && t.id) return [t.id];
    const h = p.stepHabits[i] && CREngine.habit(p.stepHabits[i]);
    if (h) return wrapLabel(h.shortName, 16);
    return i === p.steps.length - 1 ? ["IMPACT"] : ["ATTACKER", "MOVE"];
  }

  function renderGraph() {
    const p = paths[pathIdx];
    const g = $("graph");
    const n = p.steps.length;
    // Narrow screens get a tighter canvas without labels.
    const W = g.clientWidth && g.clientWidth < 520 ? 340 : 720;
    const wide = W === 720;
    g.setAttribute("viewBox", `0 0 ${W} ${wide ? 96 : 56}`);
    const x0 = wide ? 50 : 20, x1 = W - x0, y = wide ? 34 : 28;
    const xs = p.steps.map((_, i) => (n === 1 ? W / 2 : x0 + ((x1 - x0) * i) / (n - 1)));
    const weak = p.stepHabits.indexOf(p.weakestLink);
    let out = "";
    for (let i = 0; i < n - 1; i++) {
      const after = i >= weak && weak > -1;
      out += `<line class="edge${after ? " after" : ""}" x1="${xs[i] + 8}" y1="${y}" x2="${xs[i + 1] - 8}" y2="${y}"/>`;
      if (i === weak) {
        // The break point: a small gap marked with two slashes.
        const mx = (xs[i] + xs[i + 1]) / 2;
        out += `<rect class="gap" x="${mx - 9}" y="${y - 3}" width="18" height="6"/><path class="slash" d="M${mx - 6} ${y + 6} L${mx - 1} ${y - 6} M${mx + 1} ${y + 6} L${mx + 6} ${y - 6}"/>`;
      }
    }
    xs.forEach((x, i) => {
      const cls = ["node", i === weak ? "weak" : "", i === n - 1 ? "end" : "", i === nodeIdx ? "active" : ""].join(" ");
      const lbl = wide ? nodeLabel(p, i).map((l, k) => `<tspan x="${x}" dy="${k ? 12 : 0}">${esc(l)}</tspan>`).join("") : "";
      out += `<g class="${cls}" data-n="${i}" tabindex="0" role="button" aria-label="Step ${i + 1}">
        <circle class="hit" cx="${x}" cy="${y}" r="16"/>
        <circle class="halo" cx="${x}" cy="${y}" r="10"/><circle class="dot" cx="${x}" cy="${y}" r="4"/>
        ${wide ? `<text class="num" x="${x}" y="${y - 18}">${pad(i + 1)}</text><text class="lbl" x="${x}" y="${y + 26}">${lbl}</text>` : ""}</g>`;
    });
    g.innerHTML = out;
  }

  function stepKind(p, i) {
    const h = p.stepHabits[i] && CREngine.habit(p.stepHabits[i]);
    if (p.stepHabits[i] === p.weakestLink) return ["weak", "You · weakest link"];
    if (h) return ["habit", "You"];
    return i === p.steps.length - 1 ? ["end", "Result"] : ["move", "Attacker"];
  }

  function renderNode() {
    const p = paths[pathIdx];
    $("stepList").innerHTML = p.steps.map((s, i) => {
      const [k, kind] = stepKind(p, i);
      const t = p.stepTech[i];
      const d = p.stepDefend[i];
      let tech = "";
      if (t && t.id) tech += `<b>${t.id}</b> ${esc(t.name)} / ${esc(t.tactic)}`;
      else if (t && t.gap) tech += `No ATT&amp;CK technique: ${esc(t.gap)}`;
      if (d) tech += `${tech ? "<br>" : ""}Detection: ${esc(d)}`;
      return `<li><button type="button" class="srow ${k}" data-n="${i}" aria-current="${i === nodeIdx}">
        <span class="s-num">${pad(i + 1)}</span>
        <span class="s-body"><span class="s-kind">${esc(kind)}</span><span class="s-text">${esc(s)}</span>${tech ? `<span class="s-tech">${tech}</span>` : ""}</span></button></li>`;
    }).join("");
    renderGraph();
  }

  const upperFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  // "Browser-Only Passwords" -> "browser-only passwords", keeping VPN, 2FA, PIN, SMS, QR.
  const plainName = (t) => t.split(" ").map((w) => (/^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase())).join(" ");

  function selectPath(i) {
    pathIdx = i;
    nodeIdx = 0;
    const p = paths[i];
    const sv = p.severity.score;
    const risk = sv >= 7 ? "High risk" : sv >= 5 ? "Medium risk" : "Low risk";
    $("pathGoal").textContent = `Attack path ${i + 1} of ${paths.length} · Aim: ${lowerFirst(p.objective)}`;
    // Generated paths are named by their habits; read them as a phrase, not arrows.
    $("pathName").textContent = p.kind === "generated" ? upperFirst(p.habits.map((id) => plainName(CREngine.habit(id).shortName)).join(" + ")) : p.name;
    $("pathSev").innerHTML = `<b class="${sv >= 7 ? "hi" : sv >= 5 ? "mid" : "lo"}">${risk}</b><span>${sv}/10</span><span class="sev-bar">${Array.from({ length: 10 }, (_, k) => `<i class="${k < sv ? "on" : ""}"></i>`).join("")}</span>`;
    // The one thing to take away: which link to break, and how.
    const wk = CREngine.habit(p.weakestLink);
    const tac = document.body.classList.contains("analyst") && p.tactics.length ? `<p class="key-why">${esc(ATTACK_VERSION)} tactics: ${p.tactics.map(esc).join(" &rarr; ")}</p>` : "";
    $("pathKey").innerHTML = `<p class="cap">To stop this path</p>
      <p class="key-main"><b>${esc(upperFirst(plainName(wk.shortName)))}.</b> ${esc(FIX_ACTIONS[wk.id])}, and this whole path stops.</p>
      ${p.realWorld ? `<p class="key-why">${esc(p.realWorld)}</p>` : ""}${tac}`;
    $("pathPos").textContent = `${pad(i + 1)} / ${pad(paths.length)}`;
    $("prevPath").disabled = i === 0;
    $("nextPath").disabled = i === paths.length - 1;
    $("railPaths").textContent = paths.length;
    renderPathList();
    renderNode();
  }

  function renderPlan() {
    const plan = CREngine.plan(selected);
    const n = paths.length;
    // Accordion: each fix shows its title and impact; details open on click.
    $("plan").innerHTML = plan.steps.map((s, i) => {
      const h = CREngine.habit(s.id);
      const g = GUIDES[FIX_GUIDES[s.id]];
      return `<li class="${i === 0 ? "first" : ""}"><button type="button" class="f-sum" aria-expanded="false">
        ${i === 0 ? `<span class="f-start">Start here</span>` : ""}<span class="f-top"><span>Closes ${s.removed} of ${s.openBefore} paths</span><span>${FIX_MINUTES[s.id] || 10} min</span></span>
        <strong>${esc(FIX_ACTIONS[s.id])}</strong></button>
        <div class="f-body"><p>${esc(h.fixAdvice)}</p>
        ${g ? `<a href="${g[2]}" target="_blank" rel="noopener">${esc(g[1])} guide: ${esc(g[0])}</a>` : ""}</div></li>`;
    }).join("");
    $("railFixes").textContent = plan.steps.length;
    $("anNotes").hidden = !notes.length;
    $("anNotes").innerHTML = notes.length ? `<p class="cap">Your notes <span class="cap-r">not scored</span></p><ul class="note-list">${notes.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul>` : "";
    const k = plan.steps.length;
    $("planAfter").innerHTML = plan.left === 0
      ? `${k === 1 ? "This fix closes" : "These " + k + " fixes close"} <b>all ${n}</b> ${n === 1 ? "path" : "paths"}.`
      : `After ${k === 1 ? "this fix" : "these " + k + " fixes"}, <b>${plan.left} of ${n}</b> ${plan.left === 1 ? "path stays" : "paths stay"} open.`;
    $("anPrompt").textContent = `${n} attack ${n === 1 ? "path" : "paths"} found from ${selected.size} ${selected.size === 1 ? "habit" : "habits"}. ${k === 1 ? "One fix" : k + " fixes"} ${plan.left === 0 ? "break every chain" : "break most of them"}.`;
  }

  function show(view) {
    const a = view === "analysis";
    $("viewBrief").hidden = view !== "brief";
    $("viewSim").hidden = view !== "sim";
    $("simBtn").setAttribute("aria-pressed", String(view === "sim"));
    $("viewScan").hidden = view !== "scan";
    $("viewAnalysis").hidden = !a;
    if (a) { renderPlan(); selectPath(0); }
    document.querySelectorAll(".step").forEach((b) => b.setAttribute("aria-current", String(b.dataset.view === view)));
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("cr:view", { detail: view }));
  }

  /* ---------- Run sequence ---------- */

  // A short, readable run log before the results. Every line reports what the
  // engine actually did with the real counts, so nothing on screen is invented.
  let lastRun = "";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runAnalysis() {
    const key = [...selected].sort().join(",");
    if (key === lastRun) return show("analysis");
    const named = paths.filter((p) => p.kind === "named").length;
    const gen = paths.length - named;
    const techs = new Set(paths.flatMap((p) => p.stepTech.filter((t) => t && t.id).map((t) => t.id))).size;
    const plan = CREngine.plan(selected);
    const lines = [
      `Read <b>${selected.size}</b> ${selected.size === 1 ? "habit" : "habits"} from your scan`,
      `Checked <b>${CHAINS.length}</b> hand-written attack chains: <b>${named}</b> match`,
      `Combined ways in with weak spots: <b>${gen}</b> more ${gen === 1 ? "path" : "paths"}`,
      `Mapped every step to <b>${techs}</b> MITRE ATT&amp;CK techniques`,
      `Scored severity and searched for the fewest fixes`,
      `<b>${paths.length}</b> attack ${paths.length === 1 ? "path" : "paths"} found. <b>${plan.steps.length}</b> ${plan.steps.length === 1 ? "fix" : "fixes"} ${plan.left === 0 ? "break every chain" : "break most of them"}.`,
    ];
    const fast = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const log = $("runLog");
    log.innerHTML = "";
    $("runBar").style.width = "0";
    $("runPct").textContent = "0%";
    $("runner").hidden = false;
    for (let i = 0; i < lines.length; i++) {
      await wait(fast ? 60 : i ? 420 : 200);
      const li = document.createElement("li");
      li.innerHTML = lines[i];
      if (i === lines.length - 1) li.className = "done";
      log.appendChild(li);
      const pct = Math.round(((i + 1) / lines.length) * 100);
      $("runBar").style.width = pct + "%";
      $("runPct").textContent = pct + "%";
    }
    await wait(fast ? 100 : 900);
    $("runner").hidden = true;
    lastRun = key;
    show("analysis");
  }

  /* ---------- Home: chain animation ---------- */

  // The Coffee Shop chain from data.js, drawn as a constellation: links light
  // up one by one, the takeover lands, then the fix cuts the reuse link.
  function constellation() {
    const svg = $("constellation");
    const c = CHAINS.find((x) => x.id === "wifi_cafe_takeover");
    const path = CREngine.buildPaths(c.requiredHabits).find((p) => p.id === c.id);
    const labels = ["Public wifi", "Traffic intercepted", "Password captured", "Password reused", "Account takeover"];
    const P = [[70, 330], [230, 250], [400, 290], [560, 180], [740, 120]];
    const weak = c.stepHabits.indexOf(c.weakestLink);
    let h = "";

    // Chain links along each segment, alternating face-on and side-on like a real chain.
    let gapIdx = -1;
    for (let i = 0; i < P.length - 1; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      const n = Math.max(3, Math.floor((len - 30) / 21));
      const step = (len - 30) / (n - 1);
      if (i === weak) gapIdx = Math.floor(n / 2);
      for (let k = 0; k < n; k++) {
        const d = 15 + k * step;
        const x = x1 + ((x2 - x1) * d) / len, y = y1 + ((y2 - y1) * d) / len;
        const face = k % 2 === 0;
        const cls = "ch" + (i === weak && k === gapIdx ? " gap" : "") + (i === weak && k > gapIdx ? " after" : "");
        h += `<rect class="${cls}" data-l="${i}" style="transition-delay:${k * 45}ms" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})"
          x="-14" y="${face ? -7 : -2.2}" width="28" height="${face ? 14 : 4.4}" rx="${face ? 7 : 2.2}"/>`;
      }
    }
    const [wx, wy] = P[weak], [nx, ny] = P[weak + 1];
    const mx = (wx + nx) / 2, my = (wy + ny) / 2 - 26;
    h += `<g class="k-cut"><path d="M${mx - 7} ${my - 7} L${mx + 7} ${my + 7} M${mx + 7} ${my - 7} L${mx - 7} ${my + 7}"/><text x="${mx}" y="${my - 16}">CHAIN BROKEN</text></g>`;
    P.forEach(([x, y], i) => {
      h += `<g class="k-node${i === weak ? " weak" : ""}${i === P.length - 1 ? " end" : ""}" data-n="${i}">
        <circle class="k-halo" cx="${x}" cy="${y}" r="24"/><circle class="k-core" cx="${x}" cy="${y}" r="7"/>
        <text x="${x}" y="${y + (i % 2 || i === P.length - 1 ? -38 : 42)}">${pad(i + 1)} ${labels[i].toUpperCase()}</text></g>`;
    });
    // Targeting reticle that follows the active step.
    h += `<g class="reticle" id="reticle"><g class="ret-spin"><path d="M-30 -18 V-30 H-18 M18 -30 H30 V-18 M30 18 V30 H18 M-18 30 H-30 V18"/></g></g>`;
    svg.innerHTML = h;

    const note = $("stageNote");
    const ticker = $("ticker");
    const reticle = $("reticle");
    const set = (sel, cls, on) => svg.querySelectorAll(sel).forEach((e) => e.classList.toggle(cls, on));
    let typing = 0;
    const type = (text) => {
      const mine = ++typing;
      let n = 0;
      const tick = () => {
        if (mine !== typing) return;
        ticker.textContent = text.slice(0, ++n);
        if (n < text.length) setTimeout(tick, 14);
      };
      tick();
    };
    const techLine = (i) => {
      const t = path.stepTech[i];
      return `Step ${pad(i + 1)} // ${t && t.id ? t.id + " " + t.name + " / " + t.tactic : "no ATT&CK technique"}`;
    };
    const aim = (i) => reticle.setAttribute("transform", `translate(${P[i][0]} ${P[i][1]})`);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      set(".k-node", "lit", true); set(".ch", "lit", true);
      svg.classList.add("fixed");
      aim(weak);
      note.textContent = "Fix the reused password and the takeover never happens.";
      ticker.textContent = techLine(weak);
      return;
    }
    const timeline = () => {
      // Snap back to the start without fading, so each loop begins clean.
      svg.classList.add("resetting");
      svg.classList.remove("fixed");
      set(".k-node", "lit", false); set(".ch", "lit", false);
      reticle.classList.remove("on");
      svg.getBoundingClientRect();
      setTimeout(() => svg.classList.remove("resetting"), 60);
      note.textContent = "Simulation: " + c.name;
      P.forEach((_, i) => {
        setTimeout(() => {
          svg.querySelector(`[data-n="${i}"]`).classList.add("lit");
          reticle.classList.add("on");
          aim(i);
          type(techLine(i));
          if (i < P.length - 1) setTimeout(() => svg.querySelectorAll(`.ch[data-l="${i}"]`).forEach((e) => e.classList.add("lit")), 200);
          if (i === P.length - 1) note.textContent = "5 small steps. One account takeover.";
        }, 600 + i * 1150);
      });
      setTimeout(() => {
        svg.classList.add("fixed");
        aim(weak);
        type("Fix // " + FIX_ACTIONS[c.weakestLink]);
        note.textContent = "One fix breaks the whole chain.";
      }, 600 + P.length * 1150 + 1300);
    };
    timeline();
    setInterval(timeline, 12500);
  }

  /* ---------- Home: carousel ---------- */

  function carousel() {
    const track = $("carTrack");
    const cards = [...track.children];
    let i = 0;
    let paused = false;
    // A visible pause control (WCAG 2.2.2); hover and focus pause too.
    let held = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pauseBtn = $("carPause");
    const syncPause = () => { pauseBtn.setAttribute("aria-pressed", String(held)); pauseBtn.setAttribute("aria-label", held ? "Play the slides" : "Pause the slides"); };
    pauseBtn.addEventListener("click", () => { held = !held; syncPause(); });
    syncPause();
    const perView = () => Math.max(1, Math.round(track.parentElement.clientWidth / (cards[0].offsetWidth + 14)));
    const max = () => Math.max(0, cards.length - perView());
    $("carDots").innerHTML = cards.map((_, k) => `<i data-k="${k}"></i>`).join("");
    const go = (k) => {
      i = k > max() ? 0 : k < 0 ? max() : k;
      track.style.transform = `translateX(${-i * (cards[0].offsetWidth + 14)}px)`;
      $("carDots").querySelectorAll("i").forEach((d, n) => {
        d.classList.toggle("on", n >= i && n < i + perView());
        d.hidden = n > max() + perView() - 1;
      });
    };
    $("carPrev").addEventListener("click", () => go(i - 1));
    $("carNext").addEventListener("click", () => go(i + 1));
    $("carDots").addEventListener("click", (e) => { if (e.target.dataset.k) go(Math.min(+e.target.dataset.k, max())); });
    const car = track.closest(".carousel");
    car.addEventListener("mouseenter", () => (paused = true));
    car.addEventListener("mouseleave", () => (paused = false));
    car.addEventListener("focusin", () => (paused = true));
    car.addEventListener("focusout", () => (paused = false));
    setInterval(() => { if (!held && !paused && !$("viewBrief").hidden) go(i + 1); }, 5000);
    window.addEventListener("resize", () => go(i));
    go(0);

    track.addEventListener("click", (e) => {
      const li = e.target.closest("[data-go]");
      if (!li) return;
      const a = li.dataset.go;
      if (a === "scan") show("scan");
      else if (a === "sim") show("sim");
      else if (a === "help") $("helpModal").showModal();
      else if (a === "analyst") { if ($("techToggle").getAttribute("aria-pressed") !== "true") $("techToggle").click(); show("scan"); }
      else if (a === "demo") {
        selected.clear();
        PERSONAS[0].habits.forEach((id) => selected.add(id));
        update();
        runAnalysis();
      }
    });
    cards.forEach((c) => { if (c.dataset.go !== "none") { c.tabIndex = 0; c.setAttribute("role", "button"); c.addEventListener("keydown", (e) => { if (e.key === "Enter") c.click(); }); } });
  }

  /* ---------- Events ---------- */

  function bind() {
    $("sectorList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (b) { sector = +b.dataset.i; renderSectors(); renderCards(); }
    });
    $("cards").addEventListener("click", (e) => {
      const b = e.target.closest("[data-h]");
      if (!b) return;
      const id = b.dataset.h;
      selected.has(id) ? selected.delete(id) : selected.add(id);
      update();
      if (e.detail === 0) document.querySelector(`[data-h="${id}"]`).focus();
    });
    // Suggestions update as you type; Enter or Check does the same.
    let typing = 0;
    const suggest = () => {
      ownQuery = $("ownInput").value.trim();
      ownMatches = ownQuery.length >= 3 ? matchText(ownQuery) : [];
      renderOwn();
    };
    $("ownInput").addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(suggest, 220); });
    $("ownForm").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(typing); suggest(); });
    $("own").addEventListener("click", (e) => {
      const card = e.target.closest("[data-h]");
      if (card) {
        const id = card.dataset.h;
        selected.has(id) ? selected.delete(id) : selected.add(id);
        update();
        return;
      }
      const tab = e.target.closest("[data-tab]");
      if (tab) { sector = +tab.dataset.tab; update(); return; }
      if (e.target.closest("[data-keep]") && ownQuery) {
        if (!notes.includes(ownQuery)) notes.push(ownQuery);
        ownQuery = "";
        ownMatches = [];
        $("ownInput").value = "";
        renderCards();
      }
      const del = e.target.closest("[data-del]");
      if (del) { notes.splice(+del.dataset.del, 1); renderCards(); }
    });
    $("prevSector").addEventListener("click", () => { sector--; update(); });
    $("nextSector").addEventListener("click", () => { sector++; update(); });
    $("presets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]");
      if (!b) return;
      selected.clear();
      PERSONAS.find((x) => x.id === b.dataset.p).habits.forEach((id) => selected.add(id));
      update();
    });
    $("clearAll").addEventListener("click", () => { selected.clear(); update(); });
    $("runAnalysis").addEventListener("click", runAnalysis);
    $("startScan").addEventListener("click", () => show("scan"));
    $("openSim").addEventListener("click", () => show("sim"));
    $("simBtn").addEventListener("click", () => show("sim"));
    $("backToScan").addEventListener("click", () => show("scan"));
    document.querySelectorAll(".step").forEach((b) => b.addEventListener("click", () => (b.dataset.view === "analysis" ? runAnalysis() : show(b.dataset.view))));

    $("secTabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (b) { sector = +b.dataset.i; renderSectors(); renderCards(); }
    });
    $("prevPath").addEventListener("click", () => selectPath(pathIdx - 1));
    $("nextPath").addEventListener("click", () => selectPath(pathIdx + 1));
    $("plan").addEventListener("click", (e) => {
      const b = e.target.closest(".f-sum");
      if (!b) return;
      const li = b.parentElement;
      const open = !li.classList.contains("open");
      li.classList.toggle("open", open);
      b.setAttribute("aria-expanded", String(open));
    });
    // Foldable side panels: the rail opens a panel, the small arrow folds it.
    document.querySelectorAll(".foldable").forEach((p) => {
      const setFold = (folded) => {
        p.classList.toggle("folded", folded);
        if (!$("viewAnalysis").hidden) setTimeout(renderGraph, 380);
      };
      p.querySelector(".rail").addEventListener("click", () => setFold(false));
      p.querySelector(".fold-btn").addEventListener("click", () => setFold(true));
    });
    $("pathList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (b) selectPath(+b.dataset.i);
    });
    const pickNode = (e) => {
      const g = e.target.closest("[data-n]");
      if (!g) return;
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      nodeIdx = +g.dataset.n;
      renderNode();
      if (e.type === "keydown") $("graph").querySelector(`[data-n="${nodeIdx}"]`).focus();
    };
    $("graph").addEventListener("click", pickNode);
    $("graph").addEventListener("keydown", pickNode);
    $("stepList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-n]");
      if (b) { nodeIdx = +b.dataset.n; renderNode(); }
    });

    $("techToggle").addEventListener("click", (e) => {
      const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", String(on));
      document.body.classList.toggle("analyst", on);
      if (!$("viewAnalysis").hidden) { const keep = nodeIdx; selectPath(pathIdx); nodeIdx = keep; renderNode(); }
    });
    $("themeToggle").addEventListener("click", (e) => {
      const light = document.documentElement.dataset.theme !== "light";
      document.documentElement.dataset.theme = light ? "light" : "dark";
      e.currentTarget.setAttribute("aria-pressed", String(light));
    });

    // Top bar key: a small list of what each item does.
    const key = $("barKey"), keyBtn = $("barKeyBtn");
    const setKey = (open) => { key.hidden = !open; keyBtn.setAttribute("aria-expanded", String(open)); };
    keyBtn.addEventListener("click", (e) => { e.stopPropagation(); setKey(key.hidden); });
    document.addEventListener("click", (e) => { if (!key.hidden && !e.target.closest(".key-wrap")) setKey(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !key.hidden) { setKey(false); keyBtn.focus(); } });

    const dlg = $("helpModal");
    $("helpBtn").addEventListener("click", () => dlg.showModal());
    $("helpClose").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }

  $("recovery").innerHTML = RECOVERY.map((r) => `<li><strong>${esc(r.situation)}</strong><p>${esc(r.note)}</p>${r.links.map((l) => `<a href="${l[1]}" target="_blank" rel="noopener">${esc(l[0])}</a>`).join("")}</li>`).join("");
  window.addEventListener("resize", () => { if (!$("viewAnalysis").hidden) renderGraph(); });
  // Palette previews: index.html?p=emerald (read only from the URL, never stored).
  const pal = new URLSearchParams(location.search).get("p");
  if (pal) document.documentElement.dataset.palette = pal;
  $("attVer").textContent = ATTACK_VERSION;
  const tick = () => ($("clock").textContent = "Local time " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  tick();
  setInterval(tick, 1000);
  renderPresets();
  bind();
  update();
  constellation();
  carousel();
})();
