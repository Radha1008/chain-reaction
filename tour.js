// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// Chain Reaction: a doodle guide for the Analysis screen. A small line-drawn
// figure walks along the bottom of the screen, points a hand-drawn arrow at
// each section and explains it in plain words. Runs once per visit; "Guide me"
// replays it. Nothing is stored.

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STEPS = [
    { sel: ".chain-head", text: "This is one way your habits could be used against you. The label on the right says how risky it is." },
    { sel: "#pathKey", text: "Start here. Fix this one habit and this whole attack stops." },
    { sel: "#graph", text: "Each dot is a step in the attack. The // mark is where the chain breaks once you fix it." },
    { sel: "#stepList", text: "Read it top to bottom. \"You\" is something you do. \"Attacker\" is what they do next." },
    { sel: ".fixes", text: "These fixes cover all your attack paths, not just this one. Do the first one first." },
    { sel: ".pathlist", text: "You may have more than one attack path. Open this strip to see them all." },
  ];

  const FIGURE = window.CRFigure("guide");

  let layer, man, arrow, bubble, idx = 0, active = false, seen = false, moveTimer = 0;

  function build() {
    layer = document.createElement("div");
    layer.className = "dood";
    layer.innerHTML = `<svg class="dood-arrow" aria-hidden="true"><path class="d-shaft"/><path class="d-head"/></svg>
      <div class="dood-walker">${FIGURE}</div>
      <div class="dood-bubble" role="dialog" aria-live="polite" aria-label="Guide">
        <p class="db-n"></p><p class="db-t"></p>
        <div class="db-row"><button type="button" class="ghost" data-skip>Skip tour</button><button type="button" class="ghost db-next" data-next>Next &rarr;</button></div>
      </div>`;
    document.body.appendChild(layer);
    man = layer.querySelector(".dood-walker");
    arrow = layer.querySelector(".dood-arrow");
    bubble = layer.querySelector(".dood-bubble");
    layer.addEventListener("click", (e) => {
      if (e.target.closest("[data-skip]")) end();
      if (e.target.closest("[data-next]")) go(idx + 1);
    });
    document.addEventListener("keydown", (e) => { if (active && e.key === "Escape") end(); });
    addEventListener("resize", () => { if (active) place(false); });
  }

  // A slightly wobbly curve from the figure's hand to the target, like a pen stroke.
  function drawArrow(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const bend = Math.min(90, len * 0.22) * (x2 > x1 ? -1 : 1);
    const cx = (x1 + x2) / 2 + (-dy / len) * bend, cy = (y1 + y2) / 2 + (dx / len) * bend;
    const shaft = arrow.querySelector(".d-shaft");
    shaft.setAttribute("d", `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`);
    const ang = Math.atan2(y2 - cy, x2 - cx);
    const h = 12, spread = 0.45;
    arrow.querySelector(".d-head").setAttribute("d",
      `M${x2 - h * Math.cos(ang - spread)} ${y2 - h * Math.sin(ang - spread)} L${x2} ${y2} L${x2 - h * Math.cos(ang + spread)} ${y2 - h * Math.sin(ang + spread)}`);
    arrow.classList.remove("draw");
    arrow.getBoundingClientRect();
    arrow.classList.add("draw");
  }

  function target() {
    const el = document.querySelector(STEPS[idx].sel);
    return el && el.offsetParent !== null ? el : null;
  }

  function place(walk) {
    const el = target();
    document.querySelectorAll(".tour-on").forEach((x) => x.classList.remove("tour-on"));
    if (!el) return go(idx + 1);
    el.classList.add("tour-on");
    const r = el.getBoundingClientRect();
    const floor = innerHeight - 34 - 65; // stand just above the status bar
    // Stand under the target, a little to the side, staying on screen.
    let x = r.left + r.width / 2 + (r.width > 500 ? r.width * 0.18 : 40);
    x = Math.max(70, Math.min(innerWidth - 110, x));
    const from = parseFloat(man.dataset.x || x);
    man.classList.toggle("flip", x < from);
    man.style.transform = `translate(${x - 25}px, ${floor}px)`;
    man.dataset.x = x;
    const walking = walk && !reduced && Math.abs(x - from) > 4;
    man.classList.toggle("walking", walking);
    arrow.classList.remove("draw");
    bubble.classList.remove("show");
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      man.classList.remove("walking");
      man.classList.add("point");
      // Hand is at the top of the raised arm; aim at the nearest edge of the target.
      const hx = x + (man.classList.contains("flip") ? -8 : 8), hy = floor + 21;
      const tx = Math.max(r.left + 16, Math.min(r.right - 16, hx));
      const ty = r.bottom < floor - 30 ? r.bottom + 8 : Math.max(r.top + 30, floor - 200);
      drawArrow(hx, hy, tx, ty);
      const n = layer.querySelector(".db-n");
      n.textContent = `${idx + 1} / ${STEPS.length}`;
      layer.querySelector(".db-t").textContent = STEPS[idx].text;
      layer.querySelector(".db-next").innerHTML = idx === STEPS.length - 1 ? "Done" : "Next &rarr;";
      const bw = 300;
      const left = x > innerWidth / 2 ? x - bw - 40 : x + 40;
      bubble.style.left = Math.max(16, Math.min(innerWidth - bw - 16, left)) + "px";
      bubble.style.top = Math.max(80, floor - 40) + "px";
      bubble.classList.add("show");
      layer.querySelector(".db-next").focus({ preventScroll: true });
    }, walking ? 1100 : 60);
  }

  function go(i) {
    if (i >= STEPS.length) return end();
    idx = i;
    man.classList.remove("point");
    place(true);
  }

  function start() {
    if (!layer) build();
    if (innerWidth < 920) return; // phones: the layout stacks, so no tour
    active = true;
    layer.classList.add("on");
    if (!man.dataset.x) { man.dataset.x = innerWidth - 120; man.style.transform = `translate(${innerWidth - 145}px, ${innerHeight - 99}px)`; }
    go(0);
  }

  function end() {
    active = false;
    clearTimeout(moveTimer);
    if (layer) layer.classList.remove("on");
    document.querySelectorAll(".tour-on").forEach((x) => x.classList.remove("tour-on"));
  }

  // A small card under "Guide me" offers the tour instead of starting it unasked.
  let tipDismissed = false;
  const tip = $("tourTip");
  const hideTip = () => { if (tip) tip.hidden = true; };
  const showTip = () => {
    if (!tip || tipDismissed || active || innerWidth < 920) return;
    $("tipFig").innerHTML = window.CRFigure("guide");
    tip.hidden = false;
  };
  document.addEventListener("cr:view", (e) => {
    if (e.detail !== "analysis") { hideTip(); return end(); }
    setTimeout(showTip, seen ? 200 : 900);
    seen = true;
  });
  const btn = $("tourBtn");
  if (btn) btn.addEventListener("click", () => { hideTip(); start(); });
  if ($("tipClose")) $("tipClose").addEventListener("click", () => { tipDismissed = true; hideTip(); });
})();
