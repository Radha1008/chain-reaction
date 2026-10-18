// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// ChainReaction: Quick check ("one ordinary day") and Full assessment
// (habits, case board, unchain plan, recovery). Uses the content in data.js
// and the shared rules in engine.js. Like the rest of the site it keeps
// everything in memory: nothing is stored, sent or persisted.

(function () {
  "use strict";
  if (!document.getElementById("pageQuick") || typeof CREngine === "undefined") return;
  const $ = (id) => document.getElementById(id);
  const H = Object.fromEntries(HABITS.map((h) => [h.id, h]));
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  // ---------- content from data.js ----------
  const ATTACK = ATTACK_TECHNIQUES, DEFEND = DEFENDER_VIEW, MINUTES = FIX_MINUTES, ACTION = FIX_ACTIONS;
  const RES = Object.fromEntries(Object.entries(FIX_GUIDES).map(([id, g]) => [id, GUIDES[g]]));
  const WHY = Object.fromEntries(DAY_MOMENTS.map((m) => [m.id, m.why]));
  // small line drawings for each moment of the day
  const ART = {
    public_wifi: '<rect x="20" y="58" width="44" height="34" rx="4" class="a"/><path d="M64 66 h8 a7 7 0 0 1 0 14 h-8" class="a"/><path d="M30 46 q6 -8 0 -14 M44 46 q6 -8 0 -14" class="d"/><path d="M96 48 q18 -18 36 0 M103 56 q11 -10 22 0" class="r"/><circle cx="114" cy="64" r="3.5" class="rf"/>',
    password_reuse: '<rect x="50" y="10" width="50" height="90" rx="8" class="a"/><rect x="58" y="40" width="34" height="12" rx="3" class="d"/><path d="M62 46 h3 m4 0 h3 m4 0 h3 m4 0 h3" class="r"/><circle cx="118" cy="66" r="9" class="r"/><path d="M118 75 v16 m0 -6 h6 m-6 6 h5" class="r"/>',
    no_email_2fa: '<rect x="22" y="30" width="80" height="54" rx="5" class="a"/><path d="M22 34 l40 28 l40 -28" class="a"/><path d="M118 26 l16 6 v14 c0 12 -8 19 -16 22 c-8 -3 -16 -10 -16 -22 v-14 z" class="r"/><path d="M110 46 l16 0" class="r"/>',
    unknown_links: '<rect x="52" y="10" width="46" height="90" rx="8" class="a"/><rect x="58" y="28" width="34" height="20" rx="4" class="rs"/><path d="M62 38 h22" class="r"/><circle cx="75" cy="90" r="3" class="af"/><path d="M110 40 h22 v20 h-22 z M110 40 l11 8 l11 -8" class="d"/>',
    smart_lock_email: '<rect x="30" y="20" width="50" height="80" rx="3" class="a"/><circle cx="70" cy="62" r="3" class="af"/><rect x="100" y="34" width="30" height="54" rx="6" class="a"/><rect x="108" y="52" width="14" height="11" rx="2" class="rf"/><path d="M111 52 v-4 a4 4 0 0 1 8 0 v4" class="r"/>',
    share_location: '<path d="M24 84 h100 v14 h-100 z M30 84 v-22 h88 v22" class="a"/><rect x="58" y="18" width="34" height="28" rx="3" class="r"/><path d="M62 42 l9 -9 l7 7 l4 -4 l7 7" class="r"/>'
  };
  const DAY = DAY_MOMENTS.map((m) => ({ id: m.id, t: m.time, place: m.place, q: m.question, hint: m.hint, art: ART[m.id] }));
  const ART_STYLE = '<style>.a{fill:none;stroke:var(--text);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.af{fill:var(--text)}.d{fill:none;stroke:var(--dim);stroke-width:2;stroke-linecap:round}.r{fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}.rf{fill:var(--accent)}.rs{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5}</style>';
  const AREA = {
    exposure: { name: "Public profile", x: 200, y: 48, cls: "z-expo", why: "What anyone can see without logging in." },
    credential: { name: "Passwords", x: 338, y: 128, cls: "z-cred", why: "How your accounts are locked." },
    iot: { name: "Smart home", x: 290, y: 258, cls: "z-iot", why: "Devices and the accounts that control them." },
    behavior: { name: "Daily habits", x: 110, y: 258, cls: "z-beh", why: "Routines that make tricks easier." },
    initial_access: { name: "Phone & wifi", x: 62, y: 128, cls: "z-acc", why: "The first doors an attacker can knock on." }
  };
  const YOU = { x: 200, y: 160 };
  const STAGE_NAME = { initial_access: "Initial access", credential: "Credential access", exposure: "Reconnaissance", iot: "IoT / physical", behavior: "Social engineering" };

  function codeChip(id, plain) {
    const a = ATTACK[id];
    if (!a) return '<span class="code" title="No direct ATT&CK technique">no ATT&CK match</span>';
    if (plain) return '<span class="code" title="' + a[1] + '">' + a[0] + "</span>";
    return '<a class="code" href="https://attack.mitre.org/techniques/' + a[0].replace(".", "/") + '/" target="_blank" rel="noopener" title="' + a[1] + '">' + a[0] + "</a>";
  }
  function anLine(id) {
    const a = ATTACK[id];
    return (a ? "<b>" + a[0] + " " + a[1] + "</b>" : "<b>No ATT&CK technique</b> &middot; " + (HABIT_ATTACK_GAP[id] || "")) + " &middot; " + STAGE_NAME[H[id].stage] + "<br>Defender view: " + DEFEND[id];
  }

  // Per step: every step of a path carries its own technique (path.stepTech)
  // and defender note (path.stepDefend), including the attacker's own moves.
  function techLink(t, plain) {
    const url = "https://attack.mitre.org/techniques/" + t.id.replace(".", "/") + "/";
    return plain ? '<span class="code" title="' + t.name + '">' + t.id + "</span>"
      : '<a class="code" href="' + url + '" target="_blank" rel="noopener" title="' + t.name + '">' + t.id + "</a>";
  }
  function stepChip(p, i) {
    const t = p.stepTech[i];
    if (!t) return "";
    return t.gap ? '<span class="code gap" title="' + t.gap + '">no ATT&amp;CK match</span>' : techLink(t, true);
  }
  function stepLine(p, i) {
    const t = p.stepTech[i], d = p.stepDefend[i];
    const head = !t ? "" : t.gap ? "<b>No ATT&amp;CK technique</b> &middot; " + t.gap : techLink(t) + " <b>" + t.name + "</b> &middot; " + t.tactic;
    return head + (d ? (head ? "<br>" : "") + "Defender view: " + d : "");
  }
  function tacticStrip(p) {
    return '<span class="tac-lbl">' + ATTACK_VERSION + " path</span>" + p.tactics.map((t) => '<span class="tac">' + t + "</span>").join('<span class="tac-arr" aria-hidden="true">&rarr;</span>');
  }

  // ---------- engine: shared with every page (engine.js) ----------
  const buildPaths = CREngine.buildPaths, interventions = CREngine.interventions;

  // ---------- stick figure ----------
  const STICK = '<g class="all">' +
    '<path class="body leg leg-l" d="M35 64 L26 86"/><path class="body leg leg-r" d="M35 64 L44 86"/>' +
    '<circle cx="25" cy="87" r="2.6" fill="var(--skin)"/><circle cx="45" cy="87" r="2.6" fill="var(--skin)"/>' +
    '<path class="body" d="M35 40 V64"/>' +
    '<path class="body arm arm-l" d="M35 46 L23 57"/><path class="body arm arm-r" d="M35 46 L47 57"/>' +
    '<path class="body parm extra" d="M35 46 L22 44 L19 31"/><path class="body parm extra" d="M35 46 L48 44 L51 31"/>' +
    '<circle class="parm extra" cx="19" cy="30" r="2.8" fill="var(--skin)"/><circle class="parm extra" cx="51" cy="30" r="2.8" fill="var(--skin)"/>' +
    '<g class="headgrp"><circle class="head" cx="35" cy="24" r="16"/>' +
    '<path class="hoodie extra" d="M17 28 C15 3 55 3 53 28" fill="none" stroke="var(--accent)" stroke-width="4.5" stroke-linecap="round"/>' +
    '<path class="s-ink" d="M31 9 q4 -6 8 -1"/>' +
    '<ellipse class="blush" cx="24.5" cy="29" rx="3.6" ry="2.2"/><ellipse class="blush" cx="45.5" cy="29" rx="3.6" ry="2.2"/>' +
    '<rect class="mask extra" x="20" y="17" width="30" height="10" rx="5" fill="var(--skin)"/>' +
    '<g class="eyes"><circle class="eye" cx="29.5" cy="22" r="2.4"/><circle class="eye" cx="40.5" cy="22" r="2.4"/><circle class="glint" cx="30.4" cy="21.1" r=".9" fill="var(--bg)"/><circle class="glint" cx="41.4" cy="21.1" r=".9" fill="var(--bg)"/></g>' +
    '<g class="wide extra"><circle cx="29" cy="21" r="4.2" fill="var(--bg)" stroke="var(--skin)" stroke-width="1.6"/><circle cx="41" cy="21" r="4.2" fill="var(--bg)" stroke="var(--skin)" stroke-width="1.6"/>' +
    '<circle cx="30.6" cy="19.6" r="1.8" fill="var(--skin)"/><circle cx="42.6" cy="19.6" r="1.8" fill="var(--skin)"/></g>' +
    '<path class="s-ink smile" d="M31 29.5 Q35 33 39 29.5"/><ellipse class="omouth extra" cx="35" cy="32" rx="1.9" ry="2.5" fill="none" stroke="var(--skin)" stroke-width="1.8"/>' +
    '<path class="sweat extra" d="M53 13 q3.5 5.5 0 7.5 q-3.5 -2 0 -7.5" fill="var(--s-iot)"/><path class="sweat extra" d="M16 18 q2.5 4 0 5.5 q-2.5 -1.5 0 -5.5" fill="var(--s-iot)"/>' +
    '<text class="bang extra" x="56" y="6" fill="var(--accent)" font-size="16" font-weight="800">!</text></g></g>';
  document.querySelectorAll("svg.stick").forEach((s) => (s.innerHTML = STICK));
  function mood(svg, m) { svg.classList.remove("idle", "panic", "happy", "walk", "fallen", "sneak", "gotcha", "shrug"); if (m) svg.classList.add(m); }

  // ---------- exposure map svg ----------
  function drawMap(svg, lit, hops, brokenAt, focus) {
    let s = "";
    Object.values(AREA).forEach((a) => (s += `<line class="road" x1="${a.x}" y1="${a.y}" x2="${YOU.x}" y2="${YOU.y}"/>`));
    Object.entries(AREA).forEach(([k, a]) => (s += `<line class="link ${lit && lit[k] ? "is-on" : ""}" x1="${a.x}" y1="${a.y}" x2="${YOU.x}" y2="${YOU.y}" stroke="var(--s-${k})"/>`));
    if (hops && hops.length > 1) {
      const pts = hops.map((p) => p.x + "," + p.y);
      if (brokenAt == null) s += `<polyline class="hop" points="${pts.join(" ")}" id="${svg.id}Hop"/>`;
      else {
        s += `<polyline class="hop" points="${pts.slice(0, brokenAt + 1).join(" ")}"/>`;
        s += `<polyline class="hop is-broken" points="${pts.slice(brokenAt).join(" ")}"/>`;
        const b = hops[brokenAt];
        s += `<g class="wall is-on" transform="translate(${b.x + 8},${b.y - 30})"><rect width="26" height="22" rx="3" fill="var(--safe-soft)" stroke="var(--safe)" stroke-width="2"/><path d="M0 7 H26 M0 15 H26 M9 0 V7 M17 7 V15 M9 15 V22" stroke="var(--safe)" stroke-width="1.5"/></g>`;
      }
    }
    Object.entries(AREA).forEach(([k, a]) => {
      const n = lit ? lit[k] || 0 : 0;
      s += `<g class="area ${n ? "is-on" : ""} ${k === focus ? "focus" : ""}"><circle cx="${a.x}" cy="${a.y}" r="26" stroke="var(--s-${k})"/><text class="n" x="${a.x}" y="${a.y + 5}">${n || ""}</text><text x="${a.x}" y="${a.y + 44}">${a.name}</text></g>`;
    });
    s += `<g class="you"><circle cx="${YOU.x}" cy="${YOU.y}" r="30"/><text x="${YOU.x}" y="${YOU.y + 4}">YOU</text></g>`;
    svg.innerHTML = s;
  }
  function countByArea(ids) { const c = {}; ids.forEach((id) => (c[H[id].stage] = (c[H[id].stage] || 0) + 1)); return c; }
  function hopsFor(path) {
    const pts = [];
    path.stepHabits.forEach((id) => { if (id && H[id]) { const a = AREA[H[id].stage]; if (!pts.length || pts[pts.length - 1] !== a) pts.push(a); } });
    pts.push(YOU);
    if (pts.length === 1) pts.unshift(AREA.exposure);
    return pts;
  }

  // ---------- terminal strip ----------
  let tsTimer = 0, clock = 14 * 3600 + 2 * 60;
  function stamp() { clock += 7 + Math.floor(Math.random() * 20); const p = (n) => String(n).padStart(2, "0"); return `${p(Math.floor(clock / 3600))}:${p(Math.floor(clock / 60) % 60)}:${p(clock % 60)}`; }
  function say(who, text, cls, habitId) {
    clearTimeout(tsTimer);
    const analyst = document.body.classList.contains("analyst");
    const lines = $("tsLines");
    if (lines.lastElementChild) { const prev = lines.lastElementChild.querySelector(".txt"); if (prev.dataset.full) prev.textContent = prev.dataset.full; }
    let full = text, prompt;
    if (analyst) {
      prompt = "[" + stamp() + "]";
      const a = habitId && ATTACK[habitId];
      full = (a ? a[0] + " " : "") + (who === "defender" ? "mitigation: " : "") + text;
    } else prompt = who + ":~$";
    const ln = document.createElement("div");
    ln.className = "ln";
    ln.innerHTML = `<span class="pr ${who === "attacker" ? "is-atk" : ""}"></span><span class="txt ${cls || ""}"></span>`;
    ln.firstChild.textContent = prompt;
    const el = ln.lastChild;
    el.dataset.full = full;
    lines.appendChild(ln);
    while (lines.children.length > 4) lines.firstElementChild.remove();
    if (reduced || !analyst) { el.textContent = full; return 0; }
    const speed = 32;
    let i = 0;
    const tick = () => { el.textContent = full.slice(0, ++i); if (i < full.length) tsTimer = setTimeout(tick, speed); };
    tick();
    return full.length * speed;
  }
  // keep the log next to whatever it is narrating
  function placeLog() {
    const log = $("tStrip");
    let anchor;
    if (page === "quick") anchor = $("qResult").hidden ? document.querySelector("#qAsk .qgrid") : document.querySelector("#qResult .dwrap");
    else anchor = tab === 1 ? document.querySelector("#t1 .pgrid") : tab === 2 ? $("cBoard") : tab === 3 ? document.querySelector("#t3 .chainbar") : document.querySelector("#t4 .recover");
    if (anchor && anchor.nextElementSibling !== log) anchor.after(log);
  }

  // ---------- routing: app.js owns navigation and announces it with cr:navigate ----------
  let page = "home";
  // home.js draws the page guide; tell it whenever our state changes
  function guide() {
    document.dispatchEvent(new CustomEvent("cr:assess", { detail: { page } }));
  }
  function gotoPage(p) {
    const link = document.querySelector('.navlink[data-page="' + p + '"]');
    if (link) link.click();
  }
  function onPage(p) {
    page = p;
    const sw = $("anSwitch");
    if (sw) sw.hidden = p === "home";
    if (p === "home") return;
    if (p === "full") renderBigMap();
    say("attacker", p === "quick" ? "watching an ordinary day. answer honestly, I'm taking notes..." : "building a target profile. tap the habits that are true for you...");
    placeLog();
    guide();
  }
  document.addEventListener("cr:navigate", (e) => onPage(e.detail));
  const anSwitchBtn = $("anSwitch");
  if (anSwitchBtn) anSwitchBtn.addEventListener("click", (e) => {
    const on = document.body.classList.toggle("analyst");
    e.currentTarget.setAttribute("aria-pressed", on ? "true" : "false");
  });

  // =================== QUICK CHECK ===================
  const answers = new Map();
  let qi = 0;
  const qStick = $("qStick");
  let qMoodT = 0, aMoodT = 0;
  const aStick = $("aStick");
  function renderClues(newId) {
    const yes = DAY.filter((d) => answers.get(d.id)).map((d) => d.id);
    $("clues").innerHTML = yes.map((id) => `<span class="clue ${id === newId ? "new" : ""}">${H[id].shortName}</span>`).join("");
    $("atkCount").textContent = yes.length + (yes.length === 1 ? " clue" : " clues");
  }
  function renderQ() {
    const m = DAY[qi], h = H[m.id];
    $("qMoments").innerHTML = DAY.map((d, i) => {
      const a = answers.get(d.id), reachable = i <= qi || answers.has(DAY[Math.max(0, i - 1)].id);
      return `<button type="button" class="moment ${a === true ? "yes" : a === false ? "no" : ""}" data-i="${i}" aria-current="${i === qi}" ${reachable ? "" : "disabled"}><b>${d.t}</b><span>${d.place}</span></button>`;
    }).join("");
    $("qMoments").querySelectorAll(".moment").forEach((b) => b.addEventListener("click", () => { qi = +b.dataset.i; renderQ(); }));
    $("qArt").innerHTML = ART_STYLE + m.art;
    $("qWhen").textContent = `${m.t} \u00b7 ${m.place} \u00b7 moment ${qi + 1} of ${DAY.length}`;
    $("qText").textContent = m.q;
    $("qHint").textContent = m.hint;
    const a = answers.get(m.id);
    $("pageQuick").querySelectorAll(".yn button").forEach((b) => b.setAttribute("aria-pressed", a !== undefined && (b.dataset.a === "yes") === a ? "true" : "false"));
    $("qWhy").innerHTML = a === undefined ? '<div class="a-why idle"><b>Why it matters</b>Pick an answer to see why this moment matters.</div>' : `<div class="a-why"><b>Why it matters</b>${WHY[m.id] || h.attackerView}<div class="anline an">${anLine(m.id)}</div></div>`;
    $("qNext").disabled = a === undefined;
    $("qNext").textContent = qi === DAY.length - 1 ? "See my dominoes" : "Next moment";
    $("qBack").disabled = qi === 0;
    const yes = [...answers].filter(([, v]) => v).map(([k]) => k);
    drawMap($("qMap"), countByArea(yes));
  }
  $("pageQuick").querySelectorAll(".yn button").forEach((b) => b.addEventListener("click", () => {
    const q = { habitId: DAY[qi].id }, yes = b.dataset.a === "yes";
    answers.set(q.habitId, yes);
    clearTimeout(qMoodT);
    mood(qStick, yes ? "panic" : "happy");
    const yesIds = [...answers].filter(([, v]) => v).map(([k]) => k);
    const links = buildPaths(new Set(yesIds)).length;
    $("qBubble").textContent = yes
      ? (links ? `Uh oh! ${AREA[H[q.habitId].stage].name} lit up. That makes ${links} attack path${links === 1 ? "" : "s"}!` : `Eek! ${AREA[H[q.habitId].stage].name} just lit up on the map.`)
      : "Phew. One less door open.";
    qMoodT = setTimeout(() => mood(qStick, "idle"), yes ? 2600 : 1400);
    clearTimeout(aMoodT);
    mood(aStick, yes ? "gotcha" : "shrug");
    renderClues(yes ? q.habitId : null);
    $("atkSay").textContent = yes
      ? `Phil: "${H[q.habitId].shortName}. Perfect. That's going on my board."`
      : `Phil: "Tch. Nothing I can use at the ${DAY[qi].place.toLowerCase()}."`;
    aMoodT = setTimeout(() => mood(aStick, "sneak"), 1800);
    if (yes) say("attacker", H[q.habitId].attackerView.replace(/\.$/, "").toLowerCase() + ". noted.", "warn", q.habitId);
    else say("attacker", "dead end at " + DAY[qi].place.toLowerCase() + ". moving on.");
    renderQ();
  }));
  $("qNext").addEventListener("click", () => { if (qi < DAY.length - 1) { qi++; renderQ(); } else showResult(); });
  $("qBack").addEventListener("click", () => { if (qi > 0) { qi--; renderQ(); } });

  let qPath = null, qSel = new Set();
  function showResult() {
    qSel = new Set([...answers].filter(([, v]) => v).map(([k]) => k));
    const ps = buildPaths(qSel);
    qPath = ps[0] || null;
    $("qAsk").hidden = true; $("qResult").hidden = false;
    guide();
    placeLog();
    window.scrollTo(0, 0);
    const lane = $("dLane");
    if (!qPath) {
      $("dTitle").textContent = qSel.size ? "No complete chain from these six. Good sign." : "You said no to everything. Nice.";
      const hasEntry = [...qSel].some((id) => H[id].role === "entry"), hasWeak = [...qSel].some((id) => H[id].role === "weakness");
      const why = !qSel.size ? "Phil found nothing to start with: no way in and no weak lock."
        : !hasEntry && !hasWeak ? "Phil learned a little about you, but has no way in (like open wifi or a link in a text) and no weak lock to finish with (like a reused password)."
        : !hasEntry ? "You have a weak lock, but none of these six gave Phil a way in to reach it, like joining open wifi or tapping a link in a text."
        : "Phil has a way in, but nothing weak to unlock with it, like a reused password or an email with no second sign-in step.";
      $("dSub").textContent = why + ` A chain needs both. The full assessment checks ${HABITS.length - QUICK_CHECK.length} more habits that often complete one.`;
      $("dStory").parentElement.hidden = true;
      lane.innerHTML = [...qSel].map((id, i) => `<div class="domino mine"><span class="num">${i + 1}</span><span class="lbl">${H[id].shortName}</span><span class="pip" style="background:var(--s-${H[id].stage})"></span></div>`).join("") + '<svg class="stick happy" viewBox="0 0 70 96" aria-hidden="true">' + STICK + "</svg>";
      $("dMsg").innerHTML = "<b>Nothing falls.</b> Standing dominoes with gaps between them can't knock each other over.";
      $("dReplay").hidden = true; $("dStory").innerHTML = "";
      takeaway(null);
      return;
    }
    $("dReplay").hidden = false;
    $("dStory").parentElement.hidden = false;
    const mine = qPath.habits.filter((h) => qSel.has(h)).map((h) => H[h].shortName);
    $("dTitle").textContent = `Your habits could fall like dominoes.`;
    $("dSub").textContent = `${mine.join(", ").replace(/, ([^,]*)$/, " and $1")} connect into a ${qPath.steps.length}-step path ending in: ${qPath.objective.toLowerCase()}. Tap one of your highlighted dominoes to pull it out and see what happens.`;
    lane.innerHTML = qPath.steps.map((s, i) => {
      const id = qPath.stepHabits[i], last = i === qPath.steps.length - 1, own = id && qSel.has(id);
      const lbl = last ? qPath.objective : id ? H[id].shortName : "Attacker move";
      return `<button type="button" class="domino ${own ? "mine" : ""} ${last ? "final" : ""}" data-i="${i}" ${own ? "" : 'tabindex="-1"'} aria-label="Step ${i + 1}: ${lbl}"><span class="num">${i + 1}</span><span class="lbl">${lbl}</span><span class="an">${stepChip(qPath, i)}</span><span class="pip" style="background:${id ? "var(--s-" + H[id].stage + ")" : "var(--line-strong)"}"></span></button>`;
    }).join("") + '<svg class="stick idle" id="dStick" viewBox="0 0 70 96" aria-hidden="true">' + STICK + "</svg>";
    $("dStory").innerHTML = qPath.steps.map((s, i) => `<li data-i="${i}">${s}<div class="anline an">${stepLine(qPath, i)}</div></li>`).join("");
    const sv = qPath.severity;
    $("dSev").innerHTML = `Severity <b>${sv.score}/10</b> = ` + sv.breakdown.map((b) => `${b.label} +${b.weight}`).join(" + ");
    lane.querySelectorAll(".domino").forEach((d) => {
      d.addEventListener("mouseenter", () => hl(+d.dataset.i)); d.addEventListener("focus", () => hl(+d.dataset.i));
      if (d.classList.contains("mine")) d.addEventListener("click", () => topple(+d.dataset.i));
    });
    takeaway(null);
    setTimeout(() => topple(null), reduced ? 0 : 500);
  }
  function hl(i) {
    $("dLane").querySelectorAll(".domino").forEach((d) => d.classList.toggle("hl", +d.dataset.i === i));
    $("dStory").querySelectorAll("li").forEach((l) => l.classList.toggle("hl", +l.dataset.i === i));
  }
  let toppleRun = 0;
  async function topple(pull) {
    const run = ++toppleRun;
    const ds = [...$("dLane").querySelectorAll(".domino")], st = $("dStick");
    ds.forEach((d) => d.classList.remove("fallen", "pulled"));
    mood(st, "idle");
    $("dMsg").textContent = "";
    await wait(250);
    if (pull != null) ds[pull].classList.add("pulled");
    for (let i = 0; i < ds.length; i++) {
      if (run !== toppleRun) return;
      if (pull != null && i >= pull) break;
      ds[i].classList.add("fallen");
      await wait(230);
    }
    if (run !== toppleRun) return;
    if (pull == null) {
      mood(st, "fallen");
      say("attacker", "chain complete. " + qPath.objective.toLowerCase() + ".", "warn");
      $("dMsg").innerHTML = `<b>That's the chain.</b> Every step knocks over the next, all the way to ${qPath.objective.toLowerCase()}.`;
    } else {
      mood(st, "happy");
      say("defender", "removed a domino: " + H[qPath.stepHabits[pull]].shortName.toLowerCase() + ". the fall stops at the gap.", "is-ok", qPath.stepHabits[pull]);
      const id = qPath.stepHabits[pull], iv = interventions(qSel), hit = iv.list.find((x) => x.id === id);
      const n = hit ? hit.removed : 0;
      $("dMsg").className = "dmsg is-ok";
      $("dMsg").innerHTML = `<b>The fall stops at the gap.</b> Changing "${H[id].shortName}" breaks ${n} of the ${iv.base} attack path${iv.base === 1 ? "" : "s"} your answers form.`;
      takeaway(id);
    }
  }
  $("dReplay").addEventListener("click", () => { $("dMsg").className = "dmsg"; topple(null); });
  let tId = "no_email_2fa";
  function takeaway(chosen) {
    let id = chosen;
    if (!id) { const iv = interventions(qSel); id = iv.list.length ? iv.list[0].id : (qSel.has("no_email_2fa") ? "no_email_2fa" : null); }
    const h = id ? H[id] : H.no_email_2fa;
    tId = h.id;
    const mine = qPath ? qPath.habits.filter((x) => qSel.has(x)).map((x) => H[x].shortName) : [];
    $("tLesson").textContent = qPath ? `Your risk isn't one habit. It's how ${mine.slice(0, 2).join(" and ")} connect.` : "Keep it that way, and lock the account that unlocks everything.";
    $("tAct").textContent = `Do this today (about ${MINUTES[h.id]} min): ${h.fixAdvice}`;
    $("tWhy").textContent = qPath ? "Fixing this one habit pulls out the domino that breaks the most paths for you." : "Your email resets every other password you own, so it deserves the strongest protection.";
    $("tAn").innerHTML = anLine(h.id);
  }
  // ---------- "Save my chain": the result as a picture people can keep ----------
  const SITE = "radha1008.github.io/chain-reaction";
  const today = () => new Date().toISOString().slice(0, 10);
  const analystOn = () => document.body.classList.contains("analyst");
  function flowSteps(p, mine, pullId, pullNote) {
    return p.steps.map((s, i) => {
      const id = p.stepHabits[i], last = i === p.steps.length - 1, t = p.stepTech && p.stepTech[i];
      const own = !!(id && mine.has(id)), pull = own && id === pullId;
      return {
        text: s, goal: last, mine: own, pull,
        tag: last ? "The goal: " + p.objective : pull ? "Pull this one: " + H[id].shortName : own ? "Your habit: " + H[id].shortName : "Attacker move",
        note: pull ? pullNote : "",
        code: analystOn() && t && t.id ? t.id : "",
      };
    });
  }
  const FOOT = "© 2026 Radha Prabhakaran, " + SITE + ". Drawn in your browser; nothing was sent to any server. Educational simulation, not professional security advice.";
  function quickCard() {
    const h = H[tId], g = RES[tId];
    const steps = qPath ? flowSteps(qPath, qSel, tId, "Change this and the chain stops here.") : [];
    return {
      title: qPath ? "How my habits could fall like dominoes" : "My chain check",
      sub: (qPath ? qPath.steps.length + "-step attack path ending in: " + qPath.objective.toLowerCase() + ". " : "No complete attack path from my answers. ") + "Checked " + today() + ".",
      steps,
      sections: [{ title: "My one thing", tone: "safe", items: [{ head: ACTION[h.id] + " (about " + MINUTES[h.id] + " min)", body: h.fixAdvice, link: g ? "Free guide: " + g[1] + ", " + g[2] : "" }] }],
      footer: FOOT,
    };
  }
  function saveCard(btn, data, name) {
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Drawing...";
    window.CRCard.save(data, "chain-reaction-" + name + "-" + today() + ".png").then(() => { btn.textContent = "Saved"; }, () => { btn.textContent = "Could not draw it"; })
      .then(() => setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 1800));
  }
  $("tSave").addEventListener("click", (e) => saveCard(e.currentTarget, quickCard(), "dominoes"));
  $("tCopy").addEventListener("click", () => {
    const d = quickCard();
    const text = "Chain Reaction: " + d.title + "\n" + d.sub + "\n\n" + d.steps.map((s, i) => (i + 1) + ". [" + s.tag + "] " + s.text).join("\n") +
      "\n\nMy one thing: " + d.sections[0].items[0].head + "\n" + d.sections[0].items[0].body + (d.sections[0].items[0].link ? "\n" + d.sections[0].items[0].link : "") + "\n\n© 2026 Radha Prabhakaran, " + SITE;
    const done = () => { $("tCopied").hidden = false; setTimeout(() => ($("tCopied").hidden = true), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done)); else fallbackCopy(text, done);
  });
  function fallbackCopy(text, done) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) {} t.remove(); }
  $("tRetake").addEventListener("click", () => { answers.clear(); qi = 0; renderClues(); $("atkSay").textContent = 'Phil: "Let\'s see what this ordinary day gives me..."'; $("qResult").hidden = true; $("qAsk").hidden = false; renderQ(); guide(); placeLog(); });
  $("tFull").addEventListener("click", () => { sel = new Set(qSel); ai = 0; gotoPage("full"); goTab(1); });
  renderQ();

  // =================== FULL ASSESSMENT ===================
  let sel = new Set(), paths = [], tab = 1, pIdx = 0, ai = 0, pulled = null, capIdx = 0;
  const AREA_ORDER = ["exposure", "initial_access", "credential", "behavior", "iot"];
  const SAMPLES = { job: ["public_employer", "active_job_search", "public_email", "no_email_2fa", "password_reuse"], travel: ["share_location", "public_wifi", "smart_lock_email", "no_email_2fa", "qr_scan"], student: ["public_wifi", "password_reuse", "auto_login_public", "browser_only_passwords", "overshare_social"] };

  // greedy plan: fewest changes that close the most paths
  function greedy(set) {
    const p = CREngine.plan(set);
    return { top: p.steps, left: p.left };
  }
  function suspects() {
    const counts = {};
    Object.keys(THREAT_ARCHETYPES).forEach((k) => (counts[k] = [...sel].filter((id) => H[id].primaryThreat === k)));
    const max = Math.max(...Object.values(counts).map((c) => c.length));
    return { counts, tops: Object.keys(counts).filter((k) => max > 0 && counts[k].length === max) };
  }

  // ---- analyst: which ATT&CK techniques the ticked habits enable ----
  function renderCoverage() {
    const byTech = {};
    [...sel].forEach((id) => { const a = ATTACK[id]; const key = a ? a[0] : "none"; (byTech[key] = byTech[key] || { a, ids: [] }).ids.push(id); });
    const rows = Object.entries(byTech).sort((x, y) => y[1].ids.length - x[1].ids.length);
    $("attCov").innerHTML = `<b class="attcov-h">ATT&amp;CK coverage</b><p class="attcov-sub">Techniques your ticked habits would hand an attacker. ${rows.length ? "" : "Tick a habit to start the map."}</p>` +
      (rows.length ? `<table><tbody>${rows.map(([k, v]) => `<tr><td>${v.a ? `<a class="code" href="https://attack.mitre.org/techniques/${k.replace(".", "/")}/" target="_blank" rel="noopener">${k}</a>` : '<span class="code">none</span>'}</td><td>${v.a ? v.a[1] : "No direct ATT&amp;CK technique"}</td><td>${v.ids.map((id) => H[id].shortName).join(", ")}</td></tr>`).join("")}</tbody></table>` : "");
  }

  // ---- live case-file bar ----
  function caseBar() {
    const g = greedy(sel), s = suspects();
    const likely = s.tops.length ? s.tops.map((k) => CHAR[k].name.replace("The ", "")).join(" / ") : "nobody yet";
    $("caseBar").innerHTML = `<div class="cb-label">Case file</div>
      <dl><dt>Habits</dt><dd>${sel.size}</dd></dl>
      <dl><dt>Attack paths</dt><dd class="${paths.length ? "hot" : ""}">${paths.length}</dd></dl>
      <dl><dt>Most likely after you</dt><dd>${likely}</dd></dl>
      <dl><dt>Best first fix</dt><dd class="${g.top.length ? "cool" : ""}">${g.top.length ? H[g.top[0].id].shortName : "none needed yet"}</dd></dl>`;
  }

  // ---- step 1: pick habits, one area at a time ----
  function renderBigMap() {
    paths = buildPaths(sel);
    const k = AREA_ORDER[ai], a = AREA[k], c = countByArea([...sel]);
    $("aTabs").innerHTML = AREA_ORDER.map((key, i) => `<button type="button" class="atab" data-i="${i}" aria-current="${i === ai}" style="--tc:var(--s-${key})"><b>${AREA[key].name}</b><span>${c[key] ? c[key] + " ticked" : "–"}</span></button>`).join("");
    $("aTabs").querySelectorAll(".atab").forEach((b) => b.addEventListener("click", () => { ai = +b.dataset.i; renderBigMap(); }));
    $("aWhen").textContent = `Area ${ai + 1} of ${AREA_ORDER.length}`;
    $("aName").textContent = a.name;
    $("aWhy").textContent = a.why + " Tick anything that sounds like you.";
    $("hList").style.setProperty("--tc", `var(--s-${k})`);
    $("hList").innerHTML = HABITS.filter((h) => h.stage === k).map((h) => `<button type="button" class="hrow" data-h="${h.id}" aria-pressed="${sel.has(h.id)}"><span class="box" aria-hidden="true">&#10003;</span><span>${h.label}</span></button>`).join("");
    $("hList").querySelectorAll(".hrow").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.h, adding = !sel.has(id);
      adding ? sel.add(id) : sel.delete(id);
      renderBigMap();
      say("attacker", adding ? `added to target profile: ${H[id].shortName.toLowerCase()}. ${paths.length} attack path${paths.length === 1 ? "" : "s"} so far.` : `lost a lead: ${H[id].shortName.toLowerCase()}.`, adding ? "warn" : "", id);
    }));
    $("aPrev").disabled = ai === 0;
    $("aNext").textContent = ai === AREA_ORDER.length - 1 ? (paths.length ? "See your case board" : "Back to the first area") : "Next area";
    drawMap($("fMap"), c, null, null, k);
    $("t1hint").textContent = paths.length ? `${sel.size} habits form ${paths.length} attack path${paths.length === 1 ? "" : "s"}.` : sel.size ? "No complete path yet. A path needs a way in plus a weak lock." : "Nothing ticked yet.";
    $("toBoard").disabled = paths.length === 0;
    renderCoverage();
    caseBar();
    guide();
  }
  $("aPrev").addEventListener("click", () => { if (ai > 0) { ai--; renderBigMap(); } });
  $("aNext").addEventListener("click", () => {
    if (ai < AREA_ORDER.length - 1) { ai++; renderBigMap(); }
    else if (paths.length) goTab(2); else { ai = 0; renderBigMap(); }
  });
  document.querySelectorAll("[data-sample]").forEach((b) => b.addEventListener("click", () => { sel = new Set(SAMPLES[b.dataset.sample]); renderBigMap(); }));
  $("clearMap").addEventListener("click", () => { sel = new Set(); ai = 0; renderBigMap(); });
  $("toBoard").addEventListener("click", () => goTab(2));
  $("pageFull").querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => goTab(+b.dataset.go)));
  function drawBigLines() {}

  function goTab(n) {
    if (n > 1 && !paths.length) n = 1;
    tab = n;
    for (let i = 1; i <= 4; i++) $("t" + i).hidden = i !== n;
    caseBar();
    guide();
    placeLog();
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (n === 2) { if (pIdx >= paths.length) pIdx = 0; pulled = null; renderBoard(true); }
    if (n === 3) { renderPlan(); say("defender", "drafting your unchain plan. fewest changes, most paths closed.", "is-ok"); }
    if (n === 4) say("defender", "recovery mode: report it, lock it down, get help.", "is-ok");
  }

  // ---- detective board helpers ----
  function layoutBoard(board, p) {
    const W = board.clientWidth || 900, n = p.steps.length;
    const nw = W < 480 ? 104 : 136, gapX = 18, padX = 20;
    const cols = Math.max(2, Math.min(n, Math.floor((W - padX * 2 + gapX) / (nw + gapX))));
    const rows = Math.ceil(n / cols), rowH = 112;
    board.style.height = rows * rowH + 34 + "px";
    board.style.setProperty("--nw", nw + "px");
    board.querySelectorAll(".note").forEach((x) => x.remove());
    const spanX = cols > 1 ? (W - padX * 2 - nw) / (cols - 1) : 0;
    const pts = [];
    p.steps.forEach((step, i) => {
      const r = Math.floor(i / cols), c0 = i % cols, c = r % 2 ? cols - 1 - c0 : c0;
      const x = padX + c * spanX, y = 24 + r * rowH + ((i * 37) % 13) - 6;
      const id = p.stepHabits[i], last = i === n - 1, own = id && sel.has(id);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "note" + (own ? " mine" : "") + (last ? " goal" : "") + (i === capIdx ? " sel" : "") + (pulled && id === pulled ? " pulled" : "");
      el.dataset.i = i;
      el.style.left = x + "px"; el.style.top = y + "px"; el.style.textAlign = "left"; el.style.border = "0";
      el.style.transform = `rotate(${((i * 53) % 9) - 4}deg)`;
      el.innerHTML = `<small>${last ? "the goal" : own ? "your habit" : "attacker move"}</small>${last ? p.objective : id ? H[id].shortName : "Step " + (i + 1)}<div class="an">${stepChip(p, i)}</div>`;
      el.addEventListener("click", () => { capIdx = i; showCaption(); board.querySelectorAll(".note").forEach((x) => x.classList.toggle("sel", +x.dataset.i === i)); });
      board.appendChild(el);
      pts.push([x + nw / 2, y + 2]);
    });
    return pts;
  }
  function drawStrings(board, pts, upto, slackFrom) {
    const svg = board.querySelector("svg.strings");
    let out = "";
    for (let i = 0; i < Math.min(upto, pts.length - 1); i++) {
      const a = pts[i], b = pts[i + 1], sag = Math.abs(a[0] - b[0]) > 40 ? 34 : 18;
      const slack = slackFrom != null && i >= slackFrom - 1;
      out += `<path class="string ${slack ? "slack" : ""}" d="M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${Math.max(a[1], b[1]) + sag + (slack ? 26 : 0)} ${b[0]} ${b[1]}"/>`;
    }
    svg.innerHTML = out;
  }
  function showCaption() {
    const p = paths[pIdx], i = capIdx, id = p.stepHabits[i], last = i === p.steps.length - 1, own = id && sel.has(id);
    $("caption").innerHTML = `<span class="tagline ${own ? "mine" : ""}">Step ${i + 1} of ${p.steps.length} &middot; ${last ? "the goal: " + p.objective : own ? "your habit: " + H[id].shortName : "attacker move"}</span><p>${p.steps[i]}</p><div class="anline an">${stepLine(p, i)}</div>`;
  }

  // ---- step 2: case board ----
  let pinRun = 0;
  function renderBoard(animate) {
    const g = greedy(sel);
    const closer = g.left === 0 && g.top.length ? (g.top.length === 1 ? " One change closes them all." : ` ${g.top.length === 2 ? "Two" : "Three"} changes close them all.`) : "";
    $("t2title").textContent = `Your ${sel.size} habits form ${paths.length} attack path${paths.length === 1 ? "" : "s"}.${closer}`;
    $("pTabs").innerHTML = paths.map((p, i) => `<button type="button" class="ptab" data-i="${i}" aria-pressed="${i === pIdx}"><b>${p.name}</b><small>${p.steps.length} steps &middot; severity ${p.severity.score}/10</small></button>`).join("");
    $("pTabs").hidden = paths.length < 2;
    $("pTabs").querySelectorAll(".ptab").forEach((b) => b.addEventListener("click", () => { pIdx = +b.dataset.i; capIdx = 0; renderBoard(true); }));
    const p = paths[pIdx];
    $("tacStrip").innerHTML = tacticStrip(p);
    $("aSteps").innerHTML = p.steps.map((s, i) => {
      const id = p.stepHabits[i], last = i === p.steps.length - 1, own = id && sel.has(id);
      return `<li class="${own ? "yours" : ""} ${last ? "final" : ""}"><span class="n">${last ? "!" : i + 1}</span><span><span class="tagline">${last ? "the goal: " + p.objective : own ? "your habit: " + H[id].shortName : "attacker move"}</span>${s}<div class="anline an">${stepLine(p, i)}</div></span></li>`;
    }).join("");
    $("aMath").innerHTML = `<b>Scoring</b> &middot; ${p.severity.breakdown.map((b) => `${b.label} +${b.weight}`).join(" + ")} = ${p.severity.score} (capped at 10). ${p.kind === "named" ? "Matched hand-authored scenario <b>" + p.id + "</b>." : "Assembled by the rules engine from an entry point and a weakness."}`;
    $("moreBody").innerHTML = `<div class="brk">${paths.map((q) => `<div><span>${q.name}</span><b>${q.severity.score}/10</b></div>`).join("")}</div><p class="anline an" style="margin-top:10px">Severity = sum of per-habit weights on the path, capped at 10. Pins are measured by re-running the rules engine with one habit removed.</p>`;
    const iv = interventions(sel);
    $("pins").innerHTML = iv.list.map((x) => `<button type="button" class="pin" data-h="${x.id}" aria-pressed="${x.id === pulled}">${H[x.id].shortName}<small>breaks ${x.removed}</small></button>`).join("") || '<span class="qhint">No single pin breaks a whole path here.</span>';
    $("pins").querySelectorAll(".pin").forEach((b) => b.addEventListener("click", () => {
      pulled = pulled === b.dataset.h ? null : b.dataset.h;
      renderBoard(false);
      if (pulled) say("defender", "pulled the pin on " + H[pulled].shortName.toLowerCase() + ". the string goes slack.", "is-ok", pulled);
    }));
    if (pulled) {
      const r = new Set(sel); r.delete(pulled);
      const after = buildPaths(r).length, onPath = p.stepHabits.includes(pulled);
      $("pullResult").hidden = false;
      $("pullResult").innerHTML = `Pulling <b>${H[pulled].shortName}</b> takes you from ${paths.length} attack path${paths.length === 1 ? "" : "s"} to <b>${after}</b>.${onPath ? "" : " That pin isn't on this path, but it breaks others."} <span class="qhint">How: ${H[pulled].fixAdvice}</span>`;
    } else $("pullResult").hidden = true;
    if (animate) pinString(); else drawStatic();
  }
  function drawStatic() {
    const p = paths[pIdx], board = $("cBoard"), pts = layoutBoard(board, p);
    const idx = pulled ? p.stepHabits.indexOf(pulled) : -1;
    drawStrings(board, pts, pts.length, idx >= 0 ? Math.max(1, idx) : null);
    showCaption();
  }
  async function pinString() {
    const run = ++pinRun, p = paths[pIdx], board = $("cBoard");
    const pts = layoutBoard(board, p);
    for (let i = 0; i < p.steps.length; i++) {
      if (run !== pinRun) return;
      drawStrings(board, pts, i);
      capIdx = i; showCaption();
      board.querySelectorAll(".note").forEach((x) => x.classList.toggle("sel", +x.dataset.i === i));
      const id = p.stepHabits[i], last = i === p.steps.length - 1;
      const typing = say("attacker", last ? "objective reached: " + p.objective.toLowerCase() + "." : id && sel.has(id) ? "using your habit: " + H[id].shortName.toLowerCase() + "." : p.steps[i].replace(/\.$/, "").toLowerCase() + ".", last ? "warn" : "", id);
      // in analyst mode, hold each line until it has finished typing plus time to read it
      await wait(document.body.classList.contains("analyst") ? Math.max(2600, typing + 1800) : 1000);
    }
    if (run !== pinRun) return;
    drawStrings(board, pts, pts.length);
  }
  $("replay").addEventListener("click", () => { pulled = null; renderBoard(true); });
  window.addEventListener("resize", () => { if (!$("pageFull").hidden && tab === 2) drawStatic(); });

  // ---- characters (used in the case bar and the plan) ----
  const CHAR = {
    opportunistic_scammer: { name: "The Mass Scammer", want: "Quick money from whoever bites.", find: "Sends the same trap to thousands of people: fake texts, QR stickers, open wifi.", defend: "Slow down. Don't tap links or scan codes you weren't expecting.",
      art: '<circle cx="40" cy="22" r="10" class="h"/><path d="M40 32 V60 M40 40 L26 52 M40 40 L58 34 M40 60 L30 82 M40 60 L50 82" class="b"/><path d="M58 34 L84 10" class="p"/><path d="M84 10 V40 q0 8 -6 6" class="p"/>' },
    automated_credential_attacker: { name: "The Password Bot", want: "Any account that still opens with a leaked password.", find: "Runs huge lists of breached passwords against thousands of sites a minute.", defend: "A different password for every account (a password manager does this), plus 2FA on your email.",
      art: '<rect x="26" y="10" width="28" height="24" rx="4" class="h"/><path d="M40 10 V2" class="b"/><circle cx="40" cy="2" r="2.5" class="pf"/><circle cx="34" cy="21" r="2.5" class="pf"/><circle cx="46" cy="21" r="2.5" class="pf"/><rect x="28" y="38" width="24" height="24" rx="3" class="b"/><path d="M28 46 H16 M52 46 H64 M34 62 V82 M46 62 V82" class="b"/><path d="M60 70 h22 M60 76 h16" class="p"/>' },
    someone_who_knows_you: { name: "Someone You Know", want: "Access to you specifically: your messages, location or accounts.", find: "Already knows your life, and fills the gaps from what you post.", defend: "Tighten what's public, sign out of shared devices, and keep key accounts off your main email.",
      art: '<circle cx="40" cy="22" r="10" class="h"/><path d="M40 32 V60 M40 40 L26 52 M40 40 L54 50 M40 60 L30 82 M40 60 L50 82" class="b"/><rect x="54" y="42" width="12" height="20" rx="2" class="p"/><circle cx="72" cy="20" r="9" class="p"/><circle cx="72" cy="20" r="3" class="pf"/>' }
  };
  const CHAR_STYLE = '<style>.h{fill:var(--bg);stroke:var(--skin);stroke-width:3}.b{fill:none;stroke:var(--skin);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.p{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linecap:round}.pf{fill:var(--accent)}</style>';
  function renderChars(s) {
    $("chars").innerHTML = Object.keys(THREAT_ARCHETYPES).map((k) => {
      const c = CHAR[k], mine = s.counts[k], isTop = s.tops.includes(k);
      return `<article class="card char ${isTop ? "top" : ""} ${mine.length ? "" : "none"}">${isTop ? `<span class="badge">${s.tops.length > 1 ? "Tied for most likely" : "Most likely for you"}</span>` : ""}
        <svg viewBox="0 0 90 90" aria-hidden="true">${CHAR_STYLE}${c.art}</svg><h3>${c.name}</h3>
        <dl><dt>What they want</dt><dd>${c.want}</dd><dt>How they'd find you</dt><dd>${c.find}</dd>
        <dt>Your habits that attract them</dt><dd class="yourhabits">${mine.length ? mine.map((id) => `<span class="chip">${H[id].shortName}</span>`).join("") : "None of your picks."}</dd>
        <dt>Your best defense</dt><dd>${c.defend}</dd></dl><p class="anline an">${THREAT_ARCHETYPES[k].realWorldNote}</p></article>`;
    }).join("");
  }

  // ---- step 3: unchain plan ----
  function resLink(id) {
    const r = RES[id];
    return `<a class="a-res" href="${r[2]}" target="_blank" rel="noopener"><span>Step-by-step guide</span><b>${r[0]}</b><small>${r[1]} &#8599;</small></a>`;
  }
  function renderPlan() {
    const s = suspects(), iv = interventions(sel), g = greedy(sel);
    renderChars(s);
    const t = s.tops[0];
    $("suspect").innerHTML = t
      ? `<svg viewBox="0 0 90 90" aria-hidden="true">${CHAR_STYLE}${CHAR[t].art}</svg><div><span class="kicker">${s.tops.length > 1 ? "Tied for most likely after you" : "Most likely after you"}</span><h3>${s.tops.map((k) => CHAR[k].name).join(" and ")}</h3><p>Because you picked ${s.counts[t].map((id) => H[id].shortName).join(", ").replace(/, ([^,]*)$/, " and $1")}. ${CHAR[t].defend}</p></div>`
      : `<div></div><div><h3>No obvious attacker yet</h3><p>Your picks don't attract any one kind of attacker.</p></div>`;
    $("t3title").textContent = g.top.length ? (g.left === 0 ? `${["", "One change", "Two changes", "Three changes"][g.top.length]} to unchain yourself.` : "Your best three changes, in order.") : "Start with the basics.";
    const chainIds = [...sel].filter((id) => paths.some((p) => p.habits.includes(id)));
    $("links").innerHTML = chainIds.map((id, k) => `<div class="link-w" data-h="${id}" style="--rot:${(k % 2 ? -1 : 1) * (6 + (k * 7) % 10)}deg"><i class="link-i"></i><small>${H[id].shortName}</small></div>`).join("");
    const mins = g.top.reduce((m, x) => m + MINUTES[x.id], 0);
    const rest = iv.list.filter((x) => !g.top.some((y) => y.id === x.id));
    $("plan").innerHTML = g.top.length
      ? g.top.map((x, i) => `<article class="card pitem" data-h="${x.id}">
          <div class="pnum">${i + 1}</div>
          <div class="pbody"><h3>${ACTION[x.id]}</h3>
            <div class="pmeta"><span>${MINUTES[x.id]} min</span><span>${i === 0 ? `closes ${x.removed} of ${iv.base} path${iv.base === 1 ? "" : "s"}` : `closes ${x.removed} of the ${x.openBefore} still open`}</span><span>because you picked: ${H[x.id].shortName}</span></div>
            <p class="phow">${H[x.id].fixAdvice}</p>${resLink(x.id)}<div class="anline an">${anLine(x.id)}</div></div>
          <label class="pdone"><input type="checkbox" id="plan_${x.id}"><span>Done</span></label></article>`).join("") +
        (rest.length ? `<details class="card pmore"><summary>Also worth doing: ${rest.length} more change${rest.length === 1 ? "" : "s"} that each break paths on their own</summary><ul>${rest.map((x) => `<li><span><b>${ACTION[x.id]}</b> <small>${MINUTES[x.id]} min &middot; alone breaks ${x.removed} of ${iv.base}</small></span><a href="${RES[x.id][2]}" target="_blank" rel="noopener">${RES[x.id][1]} guide &#8599;</a></li>`).join("")}</ul></details>` : "") +
        `<div class="row"><button type="button" class="a-btn safe" id="pSave">Save my plan as an image</button><button type="button" class="a-btn" id="pCopy">Copy as text</button><span class="copied" id="pCopied" hidden>Copied</span></div><p class="qhint share-note">The image lists your habits. Share it only with people you trust.</p>`
      : `<div class="card empty">No single change breaks a whole path here, so start with the two habits that protect everything else.<div class="res-row">${resLink("no_email_2fa")}${resLink("password_reuse")}</div></div>`;
    const meta = (n) => {
      const done = new Set([...$("plan").querySelectorAll(".pitem")].filter((it) => it.querySelector("input").checked).map((it) => it.dataset.h));
      $("links").querySelectorAll(".link-w").forEach((l) => l.classList.toggle("snap", done.has(l.dataset.h)));
      $("links").classList.toggle("loose", n === 0);
      $("chainMeta").innerHTML = n === 0 ? `<b class="cool">Chain broken.</b> All ${iv.base} attack path${iv.base === 1 ? " is" : "s are"} closed in this simulation.` : `<b>${n}</b> of ${iv.base} attack path${iv.base === 1 ? "" : "s"} still open. ${g.top.length ? `Your plan: ${g.top.length} change${g.top.length === 1 ? "" : "s"}, about ${mins} minutes.` : ""}`;
      $("stamp").hidden = n !== 0;
    };
    meta(iv.base);
    $("plan").querySelectorAll(".pitem input").forEach((c) => c.addEventListener("change", () => {
      const left = new Set(sel);
      $("plan").querySelectorAll(".pitem").forEach((it) => { const on = it.querySelector("input").checked; it.classList.toggle("is-done", on); if (on) left.delete(it.dataset.h); });
      meta(buildPaths(left).length);
      if (c.checked) say("defender", "fixed: " + H[c.id.replace("plan_", "")].shortName.toLowerCase() + ". a link snaps.", "is-ok", c.id.replace("plan_", ""));
    }));
    const saveBtn = $("pSave");
    if (saveBtn) saveBtn.addEventListener("click", () => {
      const p = paths[pIdx] || paths[0];
      saveCard(saveBtn, {
        title: "My unchain plan",
        sub: sel.size + " habits, " + iv.base + " attack path" + (iv.base === 1 ? "" : "s") + ". " + (g.left === 0 ? (g.top.length === 1 ? "One change" : g.top.length + " changes") + " close" + (g.top.length === 1 ? "s" : "") + " them all." : "") + " Checked " + today() + ".",
        steps: p ? flowSteps(p, sel, g.top.length ? g.top[0].id : null, "My first fix breaks the chain here.") : [],
        sections: [
          { title: "My plan, in order", tone: "safe", items: g.top.map((x, i) => ({ head: (i + 1) + ". " + ACTION[x.id] + " (about " + MINUTES[x.id] + " min)", body: H[x.id].fixAdvice, link: "Free guide: " + RES[x.id][1] + ", " + RES[x.id][2] })) },
          { title: "If it already happened", items: [{ head: "Report it and get a recovery plan", link: "identitytheft.gov  /  reportfraud.ftc.gov  /  ic3.gov" }] },
        ],
        footer: FOOT,
      }, "plan");
    });
    const copy = $("pCopy");
    if (copy) copy.addEventListener("click", () => {
      const text = "My Chain Reaction unchain plan\n\n" + g.top.map((x, i) => `${i + 1}. ${ACTION[x.id]} (about ${MINUTES[x.id]} min)\n   ${H[x.id].fixAdvice}\n   Guide: ${RES[x.id][0]} (${RES[x.id][1]}) ${RES[x.id][2]}`).join("\n\n") + "\n\nIf it already happened: https://www.identitytheft.gov/";
      const done = () => { $("pCopied").hidden = false; setTimeout(() => ($("pCopied").hidden = true), 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done)); else fallbackCopy(text, done);
    });
  }

  // ---------- public hooks for the scenario library, Cipher and the page guide ----------
  window.CRAssess = {
    get tab() { return tab; },
    get hasPaths() { return paths.length > 0; },
    get resultShown() { return !$("qResult").hidden; },
    goTab,
    loadHabits(ids, opts) {
      sel = new Set(ids.filter((id) => H[id]));
      ai = 0;
      renderBigMap();
      goTab(opts && opts.board && paths.length ? 2 : 1);
    },
    addHabits(ids) {
      ids.forEach((id) => { if (H[id]) sel.add(id); });
      renderBigMap();
    },
  };

  renderBigMap();
  placeLog();
  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    gotoPage("full");
    window.CRAssess.loadHabits(DEMO_PROFILE.habits, { board: true });
  }
})();
