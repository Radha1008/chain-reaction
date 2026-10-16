// ChainReaction: app logic
// Everything here runs client-side only. Selections are kept in memory in a
// Set and are never persisted, transmitted, or written to storage of any kind.

(function () {
  const selected = new Set();
  let hasRun = false;
  let pendingRun = null; // timeout id while the "analyzing" delay is running

  const habitGrid = document.getElementById("habitGrid");
  const clearBtn = document.getElementById("clearBtn");
  const runBtn = document.getElementById("runBtn");
  const selectionCount = document.getElementById("selectionCount");

  const resultsEmpty = document.getElementById("resultsEmpty");
  const analyzing = document.getElementById("analyzing");
  const resultsChain = document.getElementById("resultsChain");
  const resultsNoChain = document.getElementById("resultsNoChain");
  const noChainText = document.getElementById("noChainText");

  const chainBadge = document.getElementById("chainBadge");
  const chainName = document.getElementById("chainName");
  const chainExtra = document.getElementById("chainExtra");
  const chainFlow = document.getElementById("chainFlow");
  const realWorldNote = document.getElementById("realWorldNote");
  const realWorldText = document.getElementById("realWorldText");
  const weakestLinkPanel = document.getElementById("weakestLinkPanel");
  const weakestLinkText = document.getElementById("weakestLinkText");
  const fixResult = document.getElementById("fixResult");
  let fixBtn = document.getElementById("fixBtn");

  const threatEmpty = document.getElementById("threatEmpty");
  const threatModel = document.getElementById("threatModel");
  const threatBars = document.getElementById("threatBars");

  const checkSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  // Hand-drawn, dependency-free icon set (no external images/fonts). One
  // per kill-chain stage. All use currentColor so they inherit stage color.
  const ICONS = {
    wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5.5 12a10 10 0 0 1 13 0"/><path d="M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-9"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.2-6.5 7-6.5S19 16 19 20"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2 20.5h20L12 3.5Z"/><path d="M12 10v4"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2 3 14h7l-1 8 11-14h-7l0-6Z"/></svg>',
  };

  function iconSpan(iconKey, color) {
    return `<span class="stage-icon-wrap" style="--stage-color:${color}">${ICONS[iconKey] || ""}</span>`;
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // --- Live attack surface map ---
  const SURFACE_RADIUS = 89;

  function renderSurfaceMap() {
    const container = document.getElementById("surfaceMap");
    if (!container) return;
    container.innerHTML = "";

    const mapScale = parseFloat(getComputedStyle(container).getPropertyValue("--map-scale")) || 1;
    const radius = SURFACE_RADIUS * mapScale;

    const center = document.createElement("div");
    center.id = "surfaceCenter";
    center.className = "surface-center";
    center.setAttribute("tabindex", "0");
    center.setAttribute("role", "button");
    center.setAttribute("aria-haspopup", "true");
    center.innerHTML = `
      ${iconSpan("person", "currentColor")}
      <span class="surface-center-label">You</span>
      <span class="surface-center-count">0</span>
    `;
    center.addEventListener("mouseenter", () => showCenterPopover(center));
    center.addEventListener("focus", () => showCenterPopover(center));
    center.addEventListener("mouseleave", hideStagePopover);
    center.addEventListener("blur", hideStagePopover);
    center.addEventListener("touchstart", () => showCenterPopover(center), { passive: true });
    container.appendChild(center);

    const stageOrder = Object.keys(STAGE_META);
    const n = stageOrder.length;

    stageOrder.forEach((stageId, i) => {
      const meta = STAGE_META[stageId];
      const angleDeg = -90 + (360 / n) * i;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = radius * Math.cos(angleRad);
      const y = radius * Math.sin(angleRad);

      const line = document.createElement("div");
      line.className = "surface-line";
      line.dataset.stage = stageId;
      line.style.width = radius + "px";
      line.style.transform = `translateY(-50%) rotate(${angleDeg}deg)`;
      container.appendChild(line);

      const node = document.createElement("div");
      node.className = "surface-node";
      node.dataset.stage = stageId;
      node.dataset.x = x.toFixed(1);
      node.dataset.y = y.toFixed(1);
      node.style.left = `calc(50% + ${x}px)`;
      node.style.top = `calc(50% + ${y}px)`;
      node.style.cursor = "pointer";
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      node.setAttribute("aria-haspopup", "true");
      node.title = `Jump to ${meta.label} habits`;
      node.innerHTML = `
        ${iconSpan(meta.icon, meta.color)}
        <span class="surface-node-label">${meta.label}</span>
        <span class="surface-node-count"></span>
      `;
      node.addEventListener("mouseenter", () => showStagePopover(stageId, node));
      node.addEventListener("focus", () => showStagePopover(stageId, node));
      node.addEventListener("mouseleave", hideStagePopover);
      node.addEventListener("blur", hideStagePopover);
      node.addEventListener("touchstart", () => showStagePopover(stageId, node), { passive: true });
      node.addEventListener("click", () => activateStage(stageId, node));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateStage(stageId, node);
        }
      });
      container.appendChild(node);
    });

    updateSurfaceMap();
  }

  function activateStage(stageId, node) {
    jumpToStage(stageId);
    if (!prefersReducedMotion()) {
      node.classList.add("surface-node-pulse");
      setTimeout(() => node.classList.remove("surface-node-pulse"), 700);
    }
  }

  let stagePopoverEl = null;

  function getStagePopover(container) {
    if (!stagePopoverEl || !container.contains(stagePopoverEl)) {
      stagePopoverEl = document.createElement("div");
      stagePopoverEl.className = "stage-popover";
      stagePopoverEl.id = "stagePopover";
      stagePopoverEl.setAttribute("role", "status");
      stagePopoverEl.hidden = true;
      container.appendChild(stagePopoverEl);
    }
    return stagePopoverEl;
  }

  function showStagePopover(stageId, node) {
    const container = document.getElementById("surfaceMap");
    if (!container) return;
    const meta = STAGE_META[stageId];
    const total = HABITS.filter((h) => h.stage === stageId).length;
    const count = HABITS.filter((h) => h.stage === stageId && selected.has(h.id)).length;
    const pop = getStagePopover(container);
    pop.innerHTML = `
      <strong class="stage-popover-title">${meta.label}</strong>
      <span class="stage-popover-blurb">${meta.blurb || ""}</span>
      <span class="stage-popover-count">${count} of ${total} of your selected habits</span>
    `;
    positionPopover(pop, node);
    pop.hidden = false;
    highlightHabitsForStage(stageId, true);
    setSurfaceNodeHighlight(stageId, true);
  }

  function showCenterPopover(node) {
    const container = document.getElementById("surfaceMap");
    if (!container) return;
    const pop = getStagePopover(container);
    const n = selected.size;
    const line =
      n === 0
        ? "No habits selected yet: the map has nothing to trace."
        : `${n} habit${n === 1 ? "" : "s"} selected. Hover a ring to see how each one connects.`;
    pop.innerHTML = `<span class="stage-popover-blurb">${line}</span>`;
    positionPopover(pop, node);
    pop.hidden = false;
  }

  function positionPopover(pop, node) {
    const x = parseFloat(node.dataset.x || "0");
    const y = parseFloat(node.dataset.y || "0");
    pop.style.left = node.style.left;
    pop.style.top = node.style.top;
    pop.style.transform = y <= 0 ? "translate(-50%, calc(-100% - 14px))" : "translate(-50%, 14px)";
  }

  function hideStagePopover() {
    if (stagePopoverEl) stagePopoverEl.hidden = true;
    Object.keys(STAGE_META).forEach((stageId) => {
      highlightHabitsForStage(stageId, false);
      setSurfaceNodeHighlight(stageId, false);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && stagePopoverEl && !stagePopoverEl.hidden) {
      hideStagePopover();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
  });

  function highlightHabitsForStage(stageId, on) {
    document.querySelectorAll(`.habit-card[data-stage="${stageId}"]`).forEach((card) => {
      card.classList.toggle("chip-highlight", on);
    });
  }

  function updateSurfaceMap() {
    const stageOrder = Object.keys(STAGE_META);

    stageOrder.forEach((stageId) => {
      const meta = STAGE_META[stageId];
      const total = HABITS.filter((h) => h.stage === stageId).length;
      const count = HABITS.filter((h) => h.stage === stageId && selected.has(h.id)).length;
      const intensity = total > 0 ? count / total : 0;

      const node = document.querySelector(`.surface-node[data-stage="${stageId}"]`);
      const line = document.querySelector(`.surface-line[data-stage="${stageId}"]`);
      if (!node) return;

      const scale = 1 + intensity * 0.45;
      node.style.setProperty("--node-scale", scale.toFixed(2));
      node.style.borderColor = intensity > 0 ? meta.color : "var(--border)";
      node.style.boxShadow =
        intensity > 0
          ? `0 0 ${12 + intensity * 22}px ${hexToRgba(meta.color, 0.18 + intensity * 0.3)}`
          : "none";

      const countEl = node.querySelector(".surface-node-count");
      if (countEl) countEl.textContent = count > 0 ? count : "";

      const groupCountEl = document.querySelector(`[data-stage-count="${stageId}"]`);
      if (groupCountEl) {
        groupCountEl.textContent = count > 0 ? `${count} of ${total} selected` : "";
      }

      if (line) {
        line.style.opacity = intensity > 0 ? (0.35 + intensity * 0.65).toFixed(2) : 0.18;
        line.style.background = intensity > 0 ? meta.color : "var(--border)";
      }
    });

    const centerNode = document.getElementById("surfaceCenter");
    if (centerNode) {
      centerNode.classList.toggle("active", selected.size > 0);
      const countEl = centerNode.querySelector(".surface-center-count");
      if (countEl) countEl.textContent = selected.size;
    }

    updateSurfaceSummary();
    renderLivePreview();
  }

  const LIVE_PREVIEW_EMPTY_TEXT =
    "Hover a ring to see what each category exposes, then pick a few habits and watch a chain form.";

  function renderLivePreview() {
    const emptyEl = document.getElementById("livePreviewEmpty");
    const bodyEl = document.getElementById("livePreviewBody");
    const summaryEl = document.getElementById("livePreviewSummary");
    const chainEl = document.getElementById("livePreviewChain");
    const weakestEl = document.getElementById("livePreviewWeakest");
    if (!emptyEl || !bodyEl) return;

    if (selected.size === 0) {
      emptyEl.textContent = LIVE_PREVIEW_EMPTY_TEXT;
      emptyEl.hidden = false;
      bodyEl.hidden = true;
      return;
    }

    const paths = buildPaths(selected);
    if (paths.length === 0) {
      emptyEl.textContent = `${selected.size} habit${selected.size === 1 ? "" : "s"} selected, no attack path yet: add an entry point and a weakness to form a chain.`;
      emptyEl.hidden = false;
      bodyEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    bodyEl.hidden = false;
    const top = paths[0];
    summaryEl.textContent = `${selected.size} habit${selected.size === 1 ? "" : "s"} selected → ${paths.length} possible attack path${paths.length === 1 ? "" : "s"}`;
    chainEl.innerHTML = top.name
      .split(" → ")
      .map((n) => `<span class="live-preview-node">${n}</span>`)
      .join('<span class="live-preview-arrow" aria-hidden="true">→</span>');
    weakestEl.textContent = `Weakest link: ${habitLabel(top.weakestLink)}`;
  }

  function updateSurfaceSummary() {
    const summaryEntry = document.getElementById("summaryEntry");
    const summaryWeakness = document.getElementById("summaryWeakness");
    const summarySignal = document.getElementById("summarySignal");
    const summaryHint = document.getElementById("summaryHint");
    if (!summaryEntry) return;

    const entryCount = HABITS.filter((h) => h.role === "entry" && selected.has(h.id)).length;
    const weaknessCount = HABITS.filter((h) => h.role === "weakness" && selected.has(h.id)).length;
    const signalCount = HABITS.filter((h) => h.role === "signal" && selected.has(h.id)).length;

    summaryEntry.textContent = entryCount;
    summaryWeakness.textContent = weaknessCount;
    summarySignal.textContent = signalCount;

    if (entryCount > 0 && weaknessCount > 0) {
      summaryHint.textContent = "A chain is ready. Scroll down and hit Run to see it unfold.";
    } else if (entryCount === 0 && weaknessCount === 0) {
      summaryHint.textContent = "Select at least one entry point and one weakness to unlock a chain.";
    } else if (entryCount === 0) {
      summaryHint.textContent = "Add an entry point (how an attacker first reaches you) to unlock a chain.";
    } else {
      summaryHint.textContent = "Add a weakness (what lets it escalate) to unlock a chain.";
    }
  }

  function jumpToStage(stageId) {
    const cards = document.querySelectorAll(`.habit-card[data-stage="${stageId}"]`);
    if (cards.length === 0) return;
    cards[0].scrollIntoView({ behavior: "smooth", block: "center" });
    cards.forEach((card) => {
      card.classList.add("stage-flash");
      setTimeout(() => card.classList.remove("stage-flash"), 900);
    });
  }

  function loadCombo(habitIds) {
    selected.clear();
    document
      .querySelectorAll('.habit-card[aria-pressed="true"]')
      .forEach((card) => card.setAttribute("aria-pressed", "false"));

    habitIds.forEach((id) => selected.add(id));
    document.querySelectorAll(".habit-card").forEach((card) => {
      if (selected.has(card.dataset.habitId)) {
        card.setAttribute("aria-pressed", "true");
      }
    });

    updateRunState();
    updateSurfaceMap();
    resetResults();

    // Loading a combo usually comes from the scenario-library modal. Close it
    // and return to the profile view so the selection is visible landing.
    document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
    navigate("full");
    activateTab("profile");
  }

  function setSurfaceNodeHighlight(stageId, on) {
    const node = document.querySelector(`.surface-node[data-stage="${stageId}"]`);
    if (node) node.classList.toggle("hover-preview", on);
  }

  function renderPersonaPicker() {
    const grid = document.getElementById("personaGrid");
    if (!grid) return;
    grid.innerHTML = "";
    PERSONAS.forEach((persona) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "persona-card";
      card.innerHTML = `
        <span class="persona-card-label">${persona.label}</span>
        <span class="persona-card-blurb">${persona.blurb}</span>
      `;
      card.addEventListener("click", () => loadCombo(persona.habits));
      grid.appendChild(card);
    });
  }

  function renderHabitGrid() {
    habitGrid.innerHTML = "";

    Object.keys(STAGE_META).forEach((stageId) => {
      const meta = STAGE_META[stageId];
      const habitsInStage = HABITS.filter((h) => h.stage === stageId);
      if (habitsInStage.length === 0) return;

      const panel = document.createElement("div");
      panel.className = "habit-group";
      panel.dataset.stage = stageId;
      panel.style.setProperty("--stage-color", meta.color);

      const heading = document.createElement("div");
      heading.className = "habit-group-label";
      heading.innerHTML = `
        ${iconSpan(meta.icon, meta.color)}
        <span class="habit-group-name">${meta.label}</span>
        <span class="habit-group-rule"></span>
        <span class="habit-group-count" data-stage-count="${stageId}"></span>
      `;
      panel.appendChild(heading);

      const cardsWrap = document.createElement("div");
      cardsWrap.className = "habit-chips";

      habitsInStage.forEach((habit) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "habit-card chip";
        card.style.setProperty("--stage-color", meta.color);
        card.setAttribute("aria-pressed", "false");
        card.dataset.habitId = habit.id;
        card.dataset.stage = habit.stage;
        card.innerHTML = `
          <span class="chip-check">${checkSvg}</span>
          <span class="chip-label">${habit.label}</span>
        `;
        card.addEventListener("click", () => toggleHabit(habit.id, card));
        card.addEventListener("mouseenter", () => setSurfaceNodeHighlight(habit.stage, true));
        card.addEventListener("mouseleave", () => setSurfaceNodeHighlight(habit.stage, false));
        attachHabitTooltip(card, habit);
        cardsWrap.appendChild(card);
      });

      panel.appendChild(cardsWrap);
      habitGrid.appendChild(panel);
    });
  }

  function toggleHabit(id, card) {
    if (selected.has(id)) {
      selected.delete(id);
      card.setAttribute("aria-pressed", "false");
    } else {
      selected.add(id);
      card.setAttribute("aria-pressed", "true");
    }
    updateRunState();
    updateSurfaceMap();
  }

  function updateRunState() {
    const n = selected.size;
    selectionCount.textContent = `${n} habit${n === 1 ? "" : "s"} selected`;
    runBtn.disabled = n < 2 || pendingRun !== null;
  }

  function clearAll() {
    selected.clear();
    hasRun = false;
    document
      .querySelectorAll('.habit-card[aria-pressed="true"]')
      .forEach((card) => card.setAttribute("aria-pressed", "false"));
    updateRunState();
    updateSurfaceMap();
    resetResults();
  }

  function resetResults() {
    if (pendingRun !== null) {
      clearTimeout(pendingRun);
      pendingRun = null;
      updateRunState();
    }
    endTour();
    currentPaths = [];
    currentPathIndex = 0;
    simulationState = null;
    runSelection = new Set();

    resultsEmpty.hidden = false;
    analyzing.hidden = true;
    resultsChain.hidden = true;
    resultsNoChain.hidden = true;
    realWorldNote.hidden = true;
    weakestLinkPanel.hidden = true;
    fixResult.hidden = true;
    fixResult.textContent = "";
    chainFlow.innerHTML = "";
    const summaryEl = document.getElementById("profileSummary");
    if (summaryEl) summaryEl.innerHTML = "";

    threatEmpty.hidden = false;
    threatModel.hidden = true;
    threatBars.innerHTML = "";
  }

  function habitLabel(id) {
    const h = HABITS.find((x) => x.id === id);
    return h ? h.label : id;
  }

  // ---------------------------------------------------------------------
  // Attack-path engine
  //
  // Returns EVERY path the selection matches, not just the best one. A path
  // is either a hand-authored scenario whose prerequisites are all present,
  // or one generated from an entry x weakness pairing that no named scenario
  // already covers. Everything downstream (path counts, intervention impact,
  // the before/after simulation) is derived from this one function.
  // ---------------------------------------------------------------------
  function buildPaths(selectedIds) {
    const sel = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    const paths = [];

    CHAINS.forEach((chain) => {
      if (!chain.requiredHabits.every((h) => sel.has(h))) return;
      paths.push({
        id: chain.id,
        kind: "named",
        name: chain.name,
        steps: chain.steps,
        stepHabits: chain.stepHabits || [],
        weakestLink: chain.weakestLink,
        weakestLinkStepIndex: chain.weakestLinkStepIndex,
        objective: chain.objective || "Account compromise",
        realWorld: chain.realWorld,
        habits: chain.requiredHabits.slice(),
        tourSteps: chain.tourSteps,
      });
    });

    const entries = HABITS.filter((h) => h.role === "entry" && sel.has(h.id));
    const weaknesses = HABITS.filter((h) => h.role === "weakness" && sel.has(h.id));
    const signals = HABITS.filter((h) => h.role === "signal" && sel.has(h.id));

    entries.forEach((entry) => {
      weaknesses.forEach((weak) => {
        const alreadyCovered = paths.some(
          (p) =>
            p.kind === "named" &&
            p.habits.includes(entry.id) &&
            p.habits.includes(weak.id)
        );
        if (alreadyCovered) return;

        const steps = [entry.entryStep, entry.entryConsequence, weak.weaknessStep];
        const stepHabits = [entry.id, null, weak.id];
        const habits = [entry.id, weak.id];
        const signal = signals[0];

        if (signal) {
          steps.push(signal.signalStep, signal.finalImpact);
          stepHabits.push(signal.id, null);
          habits.push(signal.id);
        } else {
          steps.push(GENERIC_FINAL_IMPACT);
          stepHabits.push(null);
        }

        paths.push({
          id: `gen_${entry.id}_${weak.id}`,
          kind: "generated",
          name: `${entry.shortName} → ${weak.shortName}${signal ? " → " + signal.shortName : ""}`,
          steps,
          stepHabits,
          weakestLink: weak.id,
          weakestLinkStepIndex: 2,
          objective: signal ? signal.shortName + " exposure" : "Account takeover",
          habits,
        });
      });
    });

    paths.forEach((p) => {
      p.severity = computeSeverity(p.habits);
    });
    paths.sort((a, b) => b.severity.score - a.severity.score);
    return paths;
  }

  // For each selected factor: how many matched paths stop matching if it goes.
  function computeInterventions(selectedIds) {
    const sel = new Set(selectedIds);
    const basePaths = buildPaths(sel);
    const base = basePaths.length;
    const interventions = [];

    sel.forEach((id) => {
      const reduced = new Set(sel);
      reduced.delete(id);
      const after = buildPaths(reduced).length;
      const removed = base - after;
      if (removed <= 0) return;

      const habit = HABITS.find((h) => h.id === id);
      if (!habit) return;
      interventions.push({
        habitId: id,
        label: habit.label,
        shortName: habit.shortName,
        role: habit.role,
        removed,
        after,
        fixAdvice: habit.fixAdvice || "",
      });
    });

    interventions.sort((a, b) => b.removed - a.removed || a.label.localeCompare(b.label));
    return { base, basePaths, interventions };
  }

  function fallbackMessage(entries, weaknesses) {
    if (entries.length === 0 && weaknesses.length === 0) {
      return "Select at least one way an attacker could first reach you (an entry point, like public wifi or an unknown link) and one weakness that would let it escalate (like password reuse or missing 2FA) to see a full chain.";
    }
    if (entries.length === 0) {
      return "You've selected real weaknesses, but no entry point yet. Add a habit like public wifi, QR scanning, or clicking unknown links so we can show how an attacker would actually get in first.";
    }
    return "You've selected an entry point, but nothing that would let it escalate. Add a weakness like password reuse, missing 2FA, or a reused PIN to see the full chain.";
  }

  function runSimulation() {
    if (pendingRun !== null) return;
    activateTab("chain");

    resultsEmpty.hidden = true;
    resultsChain.hidden = true;
    resultsNoChain.hidden = true;
    analyzing.hidden = false;

    const selectedSnapshot = new Set(selected);

    pendingRun = setTimeout(() => {
      pendingRun = null;
      updateRunState();
      try {
        analyzing.hidden = true;
        hasRun = true;
        executeChain(selectedSnapshot);
        renderThreatModel(selectedSnapshot);
      } catch (err) {
        analyzing.hidden = true;
        resultsNoChain.hidden = false;
        noChainText.textContent =
          "Something went wrong running the simulation: " + err.message +
          "; try a hard refresh (Ctrl+Shift+R) of this page.";
        console.error("ChainReaction simulation error:", err);
      }
    }, 1350);
    updateRunState();
  }

  function renderProfileSummary(selectedIds) {
    const summaryEl = document.getElementById("profileSummary");
    if (!summaryEl) return;
    const labels = Array.from(selectedIds).map((id) => habitLabel(id));
    if (labels.length === 0) {
      summaryEl.innerHTML = "";
      return;
    }
    const list =
      labels.length <= 3
        ? labels.map((l) => `<strong>${l}</strong>`).join("; ")
        : labels
            .slice(0, 3)
            .map((l) => `<strong>${l}</strong>`)
            .join("; ") + `, plus ${labels.length - 3} more`;
    summaryEl.innerHTML = `Built from your exact ${labels.length}-habit profile: ${list}.`;
  }

  function executeChain(selectedIds) {
    renderProfileSummary(selectedIds);

    const paths = buildPaths(selectedIds);

    if (paths.length === 0) {
      const entries = HABITS.filter((h) => h.role === "entry" && selectedIds.has(h.id));
      const weaknesses = HABITS.filter((h) => h.role === "weakness" && selectedIds.has(h.id));
      resultsChain.hidden = true;
      resultsNoChain.hidden = false;
      noChainText.textContent = fallbackMessage(entries, weaknesses);
      return;
    }

    const interventionData = computeInterventions(selectedIds);

    runSelection = new Set(selectedIds);
    currentPaths = paths;
    currentPathIndex = 0;
    currentPerspective = "my";
    document.querySelectorAll(".view-opt").forEach((b) => {
      const on = b.dataset.view === "my";
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    resultsNoChain.hidden = true;
    resultsChain.hidden = false;
    showCipherTip("results");

    renderFindings(selectedIds, paths, interventionData);
    renderPathList(paths);
    renderSelectedPath();
    renderInterventions(interventionData);
  }


  // =====================================================================
  // Attack-path results view
  // =====================================================================
  let currentPaths = [];
  let currentPathIndex = 0;
  let currentPerspective = "my";
  let simulationState = null;
  // The selection the visible results were built from. Post-run math (fix
  // counts, interventions, MFA preview) must use this, not the live
  // `selected` set, which the user can keep editing after a run.
  let runSelection = new Set();

  function pathNodeCount(paths) {
    const nodes = new Set();
    paths.forEach((p) => p.habits.forEach((h) => nodes.add(h)));
    return nodes.size + paths.length; // factors plus one objective node per path
  }

  function renderFindings(selectedIds, paths, interventionData) {
    const title = document.getElementById("findingsTitle");
    if (title) {
      title.textContent =
        paths.length === 1
          ? "We found 1 connected attack path."
          : `We found ${paths.length} connected attack paths.`;
    }
    setMetric("mFactors", selectedIds.size);
    setMetric("mPaths", paths.length);
    setMetric("mNodes", pathNodeCount(paths));
    setMetric("mRemovable", interventionData.interventions[0]?.removed || 0);
  }

  function setMetric(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.classList.remove("metric-bump");
    void el.offsetWidth;
    el.classList.add("metric-bump");
  }

  function renderPathList(paths) {
    const list = document.getElementById("pathList");
    if (!list) return;
    list.innerHTML = "";

    paths.forEach((path, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "path-card" + (i === currentPathIndex ? " active" : "");
      btn.dataset.index = i;
      btn.style.setProperty("--sev-color", path.severity.color);
      btn.innerHTML = `
        <span class="path-card-id">Path ${String(i + 1).padStart(2, "0")}</span>
        <span class="path-card-name">${path.name}</span>
        <span class="path-card-meta">${path.steps.length} nodes &middot; ${path.severity.score}/10</span>
        <span class="path-card-obj">${path.objective}</span>
      `;
      btn.addEventListener("click", () => selectPath(i));
      list.appendChild(btn);
    });
  }

  function selectPath(index) {
    if (!currentPaths[index]) return;
    currentPathIndex = index;
    document.querySelectorAll(".path-card").forEach((c, i) => {
      c.classList.toggle("active", i === index);
    });
    renderSelectedPath();
  }

  function renderSelectedPath() {
    const path = currentPaths[currentPathIndex];
    if (!path) return;

    chainBadge.textContent = path.kind === "named" ? "Reference scenario" : "Generated path";
    chainName.textContent = path.name;
    chainExtra.textContent =
      path.kind === "named"
        ? `Potential objective: ${path.objective}. This scenario matched because every factor it needs is present in your selection.`
        : `Potential objective: ${path.objective}. Assembled by the rules engine from factors you selected.`;

    renderChainFlow(path.steps, path.weakestLinkStepIndex, path);
    renderSeverityCard(path.habits);
    showRealWorldNote(path.realWorld || "");
    hideNodeDetail();
    if (path.weakestLink != null && path.weakestLinkStepIndex != null) {
      setupWeakestLink(path.weakestLink, path.weakestLinkStepIndex);
    } else if (weakestLinkPanel) {
      weakestLinkPanel.hidden = true;
    }
    if (currentPerspective === "attacker") applyPerspective();
  }

  // --- perspective toggle -------------------------------------------------
  function attackerLineFor(path, index) {
    if (index === path.steps.length - 1) {
      return `Potential objective: ${path.objective.toLowerCase()}.`;
    }
    const habitId = path.stepHabits && path.stepHabits[index];
    const habit = habitId ? HABITS.find((h) => h.id === habitId) : null;
    return habit && habit.attackerView
      ? habit.attackerView
      : "This step could be inferred from what is already visible.";
  }

  function applyPerspective() {
    const path = currentPaths[currentPathIndex];
    if (!path) return;
    const note = document.getElementById("viewNote");

    chainFlow.querySelectorAll(".flow-node").forEach((node, i) => {
      const textEl = node.querySelector(".flow-node-text");
      const kickerEl = node.querySelector(".flow-node-kicker");
      if (!textEl) return;
      textEl.classList.add("text-swap");
      setTimeout(() => textEl.classList.remove("text-swap"), 260);

      if (currentPerspective === "attacker") {
        textEl.textContent = attackerLineFor(path, i);
        if (kickerEl) kickerEl.textContent = `Step ${i + 1} · inference`;
        node.classList.add("attacker-mode");
      } else {
        textEl.textContent = path.steps[i];
        if (kickerEl) kickerEl.textContent = `Step ${i + 1}`;
        node.classList.remove("attacker-mode");
      }
    });

    if (note) {
      note.textContent =
        currentPerspective === "attacker"
          ? "Same information, read as inferences someone else could draw from it."
          : "Same information, from your side.";
    }

    if (tourState) renderTourStep();
  }

  function setupPerspectiveToggle() {
    document.querySelectorAll(".view-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentPerspective = btn.dataset.view;
        document.querySelectorAll(".view-opt").forEach((b) => {
          const on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        applyPerspective();
      });
    });

    const replay = document.getElementById("replayBtn");
    if (replay) {
      replay.addEventListener("click", () => {
        const path = currentPaths[currentPathIndex];
        if (!path) return;
        renderChainFlow(path.steps, path.weakestLinkStepIndex, path);
        if (currentPerspective === "attacker") setTimeout(applyPerspective, 30);
      });
    }
  }

  // --- node detail --------------------------------------------------------
  function showNodeDetail(path, index) {
    const panel = document.getElementById("nodeDetail");
    if (!panel) return;
    const isFinal = index === path.steps.length - 1;
    const habitId = !isFinal && path.stepHabits ? path.stepHabits[index] : null;
    const habit = habitId ? HABITS.find((h) => h.id === habitId) : null;
    const fromUser = !isFinal && !!habit;

    panel.hidden = false;
    panel.innerHTML = `
      <div class="node-detail-head">
        <div>
          <span class="node-detail-kicker">${fromUser ? "Factor you selected" : "Attacker inference"}</span>
          <h3>${isFinal ? path.objective : (habit ? habit.shortName : "Step " + (index + 1))}</h3>
        </div>
        <button type="button" class="node-detail-close" aria-label="Close">&times;</button>
      </div>
      <dl class="node-detail-body">
        <dt>What this step is</dt>
        <dd>${path.steps[index]}</dd>
        <dt>What someone could infer</dt>
        <dd>${attackerLineFor(path, index)}</dd>
        <dt>Why this link exists</dt>
        <dd>${
          path.kind === "named"
            ? `Reference scenario <strong>${path.id}</strong> matched: it requires ${path.habits
                .map((h) => habitLabel(h))
                .join("; ")}, all present in your selection.`
            : `The engine paired an entry point with an escalating weakness from your selection. Neither alone produces this path.`
        }</dd>
        ${
          habit && habit.fixAdvice
            ? `<dt>Break this link</dt><dd>${habit.fixAdvice}</dd>`
            : ""
        }
      </dl>
    `;
    panel.querySelector(".node-detail-close").addEventListener("click", hideNodeDetail);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideNodeDetail() {
    const panel = document.getElementById("nodeDetail");
    if (panel) {
      panel.hidden = true;
      panel.innerHTML = "";
      panel.classList.remove("tour-mode");
    }
    chainFlow.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("node-selected"));
  }

  // --- guided walkthrough (job-seeker demo) --------------------------------
  // User-paced only: nothing here auto-advances. `startTour` is invoked once,
  // after the initial calm draw finishes, to land on step 1 and wait.
  let tourState = null;

  function computeMfaRemovedCount(path) {
    const base = buildPaths(runSelection).length;
    const reducedSet = new Set(runSelection);
    reducedSet.delete(path.weakestLink);
    const after = buildPaths(reducedSet).length;
    return base - after;
  }

  function setMfaPreview(weakestLinkStepIndex, on) {
    chainFlow.querySelectorAll(".flow-node").forEach((n, i) => {
      if (i >= weakestLinkStepIndex) n.classList.toggle("mfa-preview", on);
    });
  }

  function attachMfaHoverPreview(btn, weakestLinkStepIndex, removedCount) {
    const prevBadge = btn.nextElementSibling;
    if (prevBadge && prevBadge.classList.contains("mfa-preview-badge")) prevBadge.remove();
    const badge = document.createElement("span");
    badge.className = "mfa-preview-badge";
    badge.hidden = true;
    badge.textContent = `-${removedCount} path${removedCount === 1 ? "" : "s"}`;
    btn.insertAdjacentElement("afterend", badge);
    const on = () => {
      setMfaPreview(weakestLinkStepIndex, true);
      badge.hidden = false;
    };
    const off = () => {
      setMfaPreview(weakestLinkStepIndex, false);
      badge.hidden = true;
    };
    btn.addEventListener("mouseenter", on);
    btn.addEventListener("mouseleave", off);
    btn.addEventListener("focus", on);
    btn.addEventListener("blur", off);
  }

  function startTour(path, startIndex) {
    const nodes = Array.from(chainFlow.querySelectorAll(".flow-node"));
    if (nodes.length === 0) return;
    const index = Math.min(Math.max(startIndex || 0, 0), nodes.length - 1);
    tourState = { path, index, nodes };
    document.addEventListener("keydown", tourKeydownHandler);
    renderTourStep();
  }

  function endTour() {
    if (!tourState) return;
    tourState.nodes.forEach((n) => n.classList.remove("tour-dim", "tour-active"));
    document.removeEventListener("keydown", tourKeydownHandler);
    tourState = null;
    hideNodeDetail();
  }

  function tourKeydownHandler(e) {
    if (!tourState) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      tourNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      tourBack();
    } else if (e.key === "Escape") {
      e.preventDefault();
      endTour();
    }
  }

  function tourNext() {
    if (!tourState) return;
    if (tourState.index < tourState.nodes.length - 1) {
      tourState.index++;
      renderTourStep();
    }
  }

  function tourBack() {
    if (!tourState) return;
    if (tourState.index > 0) {
      tourState.index--;
      renderTourStep();
    }
  }

  function renderTourStep() {
    if (!tourState) return;
    const { path, index, nodes } = tourState;
    const step = path.tourSteps[index];
    nodes.forEach((n, i) => {
      n.classList.toggle("tour-active", i === index);
      n.classList.toggle("tour-dim", i !== index);
      n.classList.toggle("node-selected", i === index);
    });

    const panel = document.getElementById("nodeDetail");
    if (!panel) return;
    panel.classList.add("tour-mode");
    panel.hidden = false;

    const attackerEmphasis = currentPerspective === "attacker";
    const isLast = index === nodes.length - 1;

    panel.innerHTML = `
      <div class="tour-head-row">
        <span class="tour-step-counter">Step ${index + 1} of ${nodes.length}</span>
        <button type="button" class="tour-skip" id="tourSkip">Skip tour</button>
      </div>
      <h3 class="tour-title">${step.title}</h3>
      <div class="tour-section">
        <span class="tour-section-label">What happens</span>
        <p>${step.whatHappens}</p>
      </div>
      <div class="tour-section">
        <span class="tour-section-label">Why it's connected</span>
        <p>${step.whyConnected}</p>
      </div>
      <div class="tour-section tour-section-attacker${attackerEmphasis ? " tour-emphasis" : ""}">
        <span class="tour-section-label">What an attacker sees</span>
        <p>${step.whatAttackerSees}</p>
      </div>
      <div class="tour-section tour-section-fix">
        <span class="tour-section-label">What breaks it</span>
        <p>${step.whatBreaksIt}</p>
      </div>
      ${
        step.isFixStep
          ? `<div class="tour-fix-prompt">
               <p class="tour-fix-headline">Now try the smallest fix.</p>
               <div class="tour-fix-row">
                 <button type="button" class="btn btn-fix" id="tourFixBtn">Simulate MFA</button>
               </div>
             </div>`
          : ""
      }
      <div class="tour-controls">
        <div class="tour-nav-group">
          <button type="button" class="btn btn-quiet btn-sm" id="tourBack"${index === 0 ? " disabled" : ""}>Back</button>
          <button type="button" class="btn btn-sm" id="tourNext">${isLast ? "Done" : "Next"}</button>
        </div>
      </div>
    `;

    const skipBtn = panel.querySelector("#tourSkip");
    if (skipBtn) skipBtn.addEventListener("click", endTour);
    const backBtn = panel.querySelector("#tourBack");
    if (backBtn) backBtn.addEventListener("click", tourBack);
    const nextBtn = panel.querySelector("#tourNext");
    if (nextBtn) nextBtn.addEventListener("click", () => (isLast ? endTour() : tourNext()));
    const fixBtnInCard = panel.querySelector("#tourFixBtn");
    if (fixBtnInCard) {
      attachMfaHoverPreview(fixBtnInCard, path.weakestLinkStepIndex, computeMfaRemovedCount(path));
      fixBtnInCard.addEventListener("click", () => runTourFix(path));
    }

    const reduced = prefersReducedMotion();
    nodes[index].scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  function runTourFix(path) {
    const btn = document.getElementById("tourFixBtn");
    if (btn) btn.disabled = true;
    const reduced = prefersReducedMotion();
    setMfaPreview(path.weakestLinkStepIndex, true);

    const base = buildPaths(runSelection).length;
    const reducedSet = new Set(runSelection);
    reducedSet.delete(path.weakestLink);
    const after = buildPaths(reducedSet).length;
    const removedCount = base - after;

    setTimeout(
      () => {
        chainFlow.querySelectorAll(".flow-node").forEach((n, i) => {
          n.classList.remove("mfa-preview");
          if (i >= path.weakestLinkStepIndex) n.classList.add("broken");
        });
        concludeTour(removedCount, base, after);
      },
      reduced ? 0 : 1500
    );
  }

  function concludeTour(removed, base, after) {
    if (tourState) tourState.nodes.forEach((n) => n.classList.remove("tour-dim", "tour-active"));
    const path = tourState ? tourState.path : null;
    document.removeEventListener("keydown", tourKeydownHandler);
    tourState = null;

    const panel = document.getElementById("nodeDetail");
    if (!panel) return;
    panel.classList.add("tour-mode");
    panel.hidden = false;
    panel.innerHTML = `
      <p class="tour-conclusion-headline">The chain broke.</p>
      <p class="tour-conclusion-detail">${removed} of ${base} matched path${base === 1 ? "" : "s"} no longer match, leaving ${after}.</p>
      <button type="button" class="btn btn-sm" id="tourReplay">Replay the tour</button>
    `;
    const replayBtn = panel.querySelector("#tourReplay");
    if (replayBtn && path) {
      replayBtn.addEventListener("click", () => {
        chainFlow.querySelectorAll(".flow-node").forEach((n) => {
          n.classList.remove("broken", "mfa-preview", "tour-dim", "tour-active", "node-selected");
        });
        renderChainFlow(path.steps, path.weakestLinkStepIndex, path);
      });
    }
  }

  // --- interventions ------------------------------------------------------
  function renderInterventions(data) {
    const list = document.getElementById("interventionList");
    const sim = document.getElementById("simResult");
    if (!list) return;
    list.innerHTML = "";
    if (sim) {
      sim.hidden = true;
      sim.innerHTML = "";
    }

    if (data.interventions.length === 0) {
      list.innerHTML =
        '<p class="intervention-empty">No single change removes a whole path from this selection. Each matched path here has more than one independent route.</p>';
      return;
    }

    data.interventions.slice(0, 6).forEach((item, i) => {
      const pct = Math.round((item.removed / data.base) * 100);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "intervention" + (i === 0 ? " intervention-top" : "");
      card.innerHTML = `
        <span class="intervention-bar" style="width:${pct}%"></span>
        <span class="intervention-body">
          <span class="intervention-label">${item.shortName}</span>
          <span class="intervention-detail">${item.label}</span>
        </span>
        <span class="intervention-impact">
          <strong>${item.removed}</strong>
          <span>of ${data.base} paths</span>
        </span>
      `;
      card.addEventListener("click", () => simulateIntervention(item, data));
      list.appendChild(card);
    });

    const best = data.interventions[0];
    const five = document.createElement("div");
    five.className = "min-effort";
    five.innerHTML = `
      <span class="min-effort-kicker">If you only have five minutes</span>
      <p class="min-effort-body">
        <strong>${best.shortName}.</strong> ${best.fixAdvice}
      </p>
      <p class="min-effort-math">
        In this simulation that removes ${best.removed} of your ${data.base} matched paths, leaving ${best.after}.
      </p>
    `;
    list.appendChild(five);
  }

  function simulateIntervention(item, data) {
    const sim = document.getElementById("simResult");
    if (!sim) return;

    const reduced = new Set(runSelection);
    reduced.delete(item.habitId);
    const afterPaths = buildPaths(reduced);
    const afterIds = new Set(afterPaths.map((p) => p.id));
    const removedPaths = data.basePaths.filter((p) => !afterIds.has(p.id));

    simulationState = { item, afterPaths, removedPaths };

    sim.hidden = false;
    sim.innerHTML = `
      <div class="sim-head">
        <span class="sim-kicker">Simulated: nothing has actually been changed on your accounts</span>
        <h3>${item.shortName}</h3>
      </div>
      <div class="sim-compare">
        <div class="sim-side">
          <span class="sim-num">${data.base}</span>
          <span class="sim-cap">matched before</span>
        </div>
        <span class="sim-arrow" aria-hidden="true">&rarr;</span>
        <div class="sim-side sim-side-after">
          <span class="sim-num">${afterPaths.length}</span>
          <span class="sim-cap">match after</span>
        </div>
      </div>
      <p class="sim-note">
        In this simulation, ${removedPaths.length} path${removedPaths.length === 1 ? "" : "s"} no longer
        match the rules. That is a change in the model, not a guarantee of safety.
      </p>
      <button type="button" class="btn btn-quiet btn-sm" id="showRemovedBtn">
        Show the ${removedPaths.length} removed path${removedPaths.length === 1 ? "" : "s"}
      </button>
      <div id="removedList" class="removed-list" hidden></div>
    `;

    const showBtn = sim.querySelector("#showRemovedBtn");
    const removedList = sim.querySelector("#removedList");
    showBtn.addEventListener("click", () => {
      const open = !removedList.hidden;
      removedList.hidden = open;
      showBtn.textContent = open
        ? `Show the ${removedPaths.length} removed path${removedPaths.length === 1 ? "" : "s"}`
        : "Hide removed paths";
      if (!open && removedList.innerHTML === "") {
        removedList.innerHTML = removedPaths
          .map(
            (p) => `
          <div class="removed-item">
            <span class="removed-name">${p.name}</span>
            <span class="removed-obj">${p.objective}</span>
          </div>`
          )
          .join("");
      }
    });

    // dim the path cards that would stop matching
    document.querySelectorAll(".path-card").forEach((card, i) => {
      const path = currentPaths[i];
      card.classList.toggle("path-removed", path && !afterIds.has(path.id));
    });

    sim.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function computeSeverity(habitIds) {
    const breakdown = habitIds
      .map((id) => {
        const habit = HABITS.find((h) => h.id === id);
        const weight = SEVERITY_WEIGHTS[id] || 0;
        return habit ? { label: habit.shortName || habit.label, weight } : null;
      })
      .filter(Boolean);

    const score = Math.min(10, breakdown.reduce((sum, b) => sum + b.weight, 0));

    let band, color, soft;
    if (score <= 3) {
      band = "Low"; color = "#8a9a7b"; soft = "rgba(138, 154, 123, 0.18)";
    } else if (score <= 6) {
      band = "Moderate"; color = "#d9a441"; soft = "rgba(217, 164, 65, 0.18)";
    } else if (score <= 9) {
      band = "High"; color = "#c85a34"; soft = "rgba(200, 90, 52, 0.2)";
    } else {
      band = "Critical"; color = "#a13d2d"; soft = "rgba(161, 61, 45, 0.24)";
    }

    return { score, band, color, soft, breakdown };
  }

  function renderSeverityCard(habitIds) {
    const card = document.getElementById("severityCard");
    const numberEl = document.getElementById("severityNumber");
    const bandEl = document.getElementById("severityBand");
    const breakdownEl = document.getElementById("severityBreakdown");
    if (!card) return;

    const { score, band, color, soft, breakdown } = computeSeverity(habitIds);
    card.style.setProperty("--severity-color", color);
    card.style.setProperty("--severity-soft", soft);
    numberEl.textContent = score;
    bandEl.textContent = band;

    breakdownEl.innerHTML = "";
    breakdown.forEach((b) => {
      const row = document.createElement("div");
      row.className = "severity-row";
      row.innerHTML = `<span>${b.label}</span><span class="severity-row-weight">+${b.weight}</span>`;
      breakdownEl.appendChild(row);
    });
  }

  function showRealWorldNote(text) {
    if (!text) {
      realWorldNote.hidden = true;
      return;
    }
    realWorldNote.hidden = false;
    realWorldText.textContent = text;
  }

  function stepColor(index, total, weakestIdx) {
    if (index === total - 1) return "#a13d2d"; // final impact
    if (index < weakestIdx) return "#d9a441"; // pre-escalation
    return "#c85a34"; // escalation onward
  }

  function stepIcon(index, total, weakestIdx) {
    if (index === total - 1) return "alert";
    if (index < weakestIdx) return "wifi";
    return "lock";
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function collapseCipherPanel() {
    const panel = document.getElementById("cipherPanel");
    if (panel && !panel.hidden) panel.classList.add("cipher-compact");
  }

  function expandCipherPanel() {
    const panel = document.getElementById("cipherPanel");
    if (panel) panel.classList.remove("cipher-compact");
  }

  function focusResultsSection() {
    const heading = resultsChain.hidden
      ? document.getElementById("noChainText")
      : document.getElementById("findingsTitle");
    if (!heading) return;
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    heading.scrollIntoView({ behavior, block: "start" });
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  function renderChainFlow(stepTexts, weakestLinkStepIndex, path) {
    chainFlow.innerHTML = "";
    endTour();
    const tourEligible = !!(path && Array.isArray(path.tourSteps) && path.tourSteps.length === stepTexts.length);

    stepTexts.forEach((text, i) => {
      const color = stepColor(i, stepTexts.length, weakestLinkStepIndex);
      const icon = stepIcon(i, stepTexts.length, weakestLinkStepIndex);
      const node = document.createElement("button");
      node.type = "button";
      node.className = "flow-node";
      node.dataset.index = i;
      node.style.setProperty("--node-color", color);
      const isLast = i === stepTexts.length - 1;
      node.innerHTML = `
        <div class="flow-node-rail">
          <div class="flow-node-dot">${ICONS[icon]}</div>
          ${isLast ? "" : '<div class="flow-node-line"></div>'}
        </div>
        <div class="flow-node-card">
          <div class="flow-node-kicker">Step ${i + 1}</div>
          <div class="flow-node-text">${text}</div>
          <span class="flow-node-more">Why this link?</span>
        </div>
      `;
      if (path) {
        node.addEventListener("click", () => {
          chainFlow.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("node-selected"));
          node.classList.add("node-selected");
          if (tourEligible) startTour(path, i);
          else showNodeDetail(path, i);
        });
        attachNodeTooltip(node, path, i);
      }
      chainFlow.appendChild(node);
    });

    const nodes = chainFlow.querySelectorAll(".flow-node");
    const reduced = prefersReducedMotion();
    const stagger = tourEligible ? 700 : 340;

    nodes.forEach((node, i) => {
      const reveal = () => {
        node.classList.add("revealed");
        if (i === nodes.length - 1) {
          setTimeout(() => {
            resultsChain.classList.add("chain-complete-flash");
            setTimeout(() => resultsChain.classList.remove("chain-complete-flash"), 500);
          }, reduced ? 0 : 300);
          if (tourEligible) {
            setTimeout(() => startTour(path, 0), reduced ? 0 : 350);
          }
        }
      };
      if (reduced) reveal();
      else setTimeout(reveal, i * stagger);
    });
  }

  // --- node hover / focus preview tooltip -------------------------------
  let nodeTooltipEl = null;
  function attachNodeTooltip(node, path, i) {
    const isFinal = i === path.steps.length - 1;
    const habitId = !isFinal && path.stepHabits ? path.stepHabits[i] : null;
    const habit = habitId ? HABITS.find((h) => h.id === habitId) : null;
    const label = isFinal ? path.objective : habit ? habit.shortName : `Step ${i + 1}`;

    const show = () => {
      if (!nodeTooltipEl) {
        nodeTooltipEl = document.createElement("div");
        nodeTooltipEl.className = "node-tooltip";
        document.body.appendChild(nodeTooltipEl);
      }
      nodeTooltipEl.innerHTML = `<strong>${label}</strong>Click for the full breakdown`;
      const r = node.getBoundingClientRect();
      nodeTooltipEl.style.left = Math.max(8, r.left) + "px";
      nodeTooltipEl.style.top = r.bottom + 8 + "px";
      requestAnimationFrame(() => nodeTooltipEl.classList.add("visible"));
    };
    const hide = () => {
      if (nodeTooltipEl) nodeTooltipEl.classList.remove("visible");
    };
    node.addEventListener("mouseenter", show);
    node.addEventListener("mouseleave", hide);
    node.addEventListener("focus", show);
    node.addEventListener("blur", hide);
    node.addEventListener("touchstart", show, { passive: true });
  }

  function attachHabitTooltip(card, habit) {
    if (!habit.attackerView) return;
    const show = () => {
      if (!nodeTooltipEl) {
        nodeTooltipEl = document.createElement("div");
        nodeTooltipEl.className = "node-tooltip";
        document.body.appendChild(nodeTooltipEl);
      }
      nodeTooltipEl.innerHTML = `<strong>${habit.shortName}</strong>${habit.attackerView}`;
      const r = card.getBoundingClientRect();
      nodeTooltipEl.style.left = Math.max(8, r.left) + "px";
      nodeTooltipEl.style.top = r.bottom + 8 + "px";
      requestAnimationFrame(() => nodeTooltipEl.classList.add("visible"));
    };
    const hide = () => {
      if (nodeTooltipEl) nodeTooltipEl.classList.remove("visible");
    };
    card.addEventListener("mouseenter", show);
    card.addEventListener("mouseleave", hide);
    card.addEventListener("focus", show);
    card.addEventListener("blur", hide);
    card.addEventListener("touchstart", show, { passive: true });
  }

  const MFA_HABIT_IDS = ["no_email_2fa", "sms_only_2fa"];

  function setupWeakestLink(weakestLinkId, weakestLinkStepIndex) {
    weakestLinkPanel.hidden = false;
    weakestLinkText.textContent = habitLabel(weakestLinkId);
    const iconEl = document.getElementById("weakestLinkIcon");
    if (iconEl) iconEl.innerHTML = ICONS.bolt;

    chainFlow.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("broken"));

    const isMfaFix = MFA_HABIT_IDS.includes(weakestLinkId);

    // Content is populated immediately (so a printed/shared summary is complete
    // even if "fixed" was never clicked interactively) but stays visually
    // hidden on-screen until the button reveals it, preserving the reveal.
    const habit = HABITS.find((h) => h.id === weakestLinkId);
    const advice = habit && habit.fixAdvice ? habit.fixAdvice : "";
    const base = buildPaths(runSelection).length;
    const reduced = new Set(runSelection);
    reduced.delete(weakestLinkId);
    const after = buildPaths(reduced).length;
    const removed = base - after;
    fixResult.innerHTML = `
      <p class="fix-result-headline">The chain broke.</p>
      <p class="fix-result-detail">
        Fixing "${habitLabel(weakestLinkId)}" breaks the chain at step ${weakestLinkStepIndex + 1}.
        Everything after that point stops being possible. ${removed} of ${base} matched path${base === 1 ? "" : "s"}
        no longer match, leaving ${after}.
      </p>
      ${advice ? `<p class="fix-result-advice"><strong>How to actually fix it:</strong> ${advice}</p>` : ""}
    `;
    fixResult.hidden = true;

    const newFixBtn = fixBtn.cloneNode(true);
    newFixBtn.textContent = isMfaFix ? "Simulate MFA" : "What if you fixed this?";
    fixBtn.parentNode.replaceChild(newFixBtn, fixBtn);
    fixBtn = newFixBtn;

    if (isMfaFix) attachMfaHoverPreview(fixBtn, weakestLinkStepIndex, removed);

    fixBtn.addEventListener("click", () => {
      const nodes = chainFlow.querySelectorAll(".flow-node");
      nodes.forEach((node, i) => {
        if (i >= weakestLinkStepIndex) {
          node.classList.add("broken");
        }
      });
      fixResult.hidden = false;
    });
  }

  // --- Threat model (different lens on the same selections) ---
  function renderThreatModel(selectedIds) {
    const counts = {};
    Object.keys(THREAT_ARCHETYPES).forEach((k) => (counts[k] = 0));

    HABITS.forEach((h) => {
      if (selectedIds.has(h.id) && h.primaryThreat) {
        counts[h.primaryThreat] = (counts[h.primaryThreat] || 0) + 1;
      }
    });

    const maxCount = Math.max(...Object.values(counts));
    threatEmpty.hidden = true;
    threatModel.hidden = false;
    threatBars.innerHTML = "";

    const ordered = Object.keys(THREAT_ARCHETYPES).sort((a, b) => counts[b] - counts[a]);

    ordered.forEach((key) => {
      const archetype = THREAT_ARCHETYPES[key];
      const count = counts[key];
      const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
      const isTop = maxCount > 0 && count === maxCount;

      const row = document.createElement("div");
      row.className = "threat-bar-row" + (isTop ? " top-match" : "");
      row.style.setProperty("--tbar-color", archetype.color);
      row.innerHTML = `
        <div class="threat-bar-top">
          <span class="threat-bar-name">${archetype.label}</span>
          ${isTop && maxCount > 0 ? '<span class="threat-bar-badge">Most Relevant</span>' : `<span class="threat-bar-badge" style="opacity:.55">${count} habit${count === 1 ? "" : "s"}</span>`}
        </div>
        <div class="threat-bar-track"><div class="threat-bar-fill" style="width:0%"></div></div>
        <p class="threat-bar-desc">${archetype.description}</p>
      `;
      threatBars.appendChild(row);

      const fill = row.querySelector(".threat-bar-fill");
      requestAnimationFrame(() => {
        setTimeout(() => {
          fill.style.width = pct + "%";
        }, 60);
      });
    });
  }

  function renderLibrary() {
    const libraryGrid = document.getElementById("libraryGrid");
    if (!libraryGrid) return;

    libraryGrid.innerHTML = "";

    CHAINS.forEach((chain) => {
      const card = document.createElement("div");
      card.className = "library-card library-card-clickable";
      card.innerHTML = `
        <div class="library-card-kicker">Named Scenario</div>
        <h3>${chain.name}</h3>
        <p>${chain.steps[0]}</p>
        <div class="library-card-steps">${chain.steps.length} steps &middot; weakest link: ${habitLabel(chain.weakestLink)}</div>
        <div class="library-card-try">Try this combo &rarr;</div>
      `;
      card.addEventListener("click", () => loadCombo(chain.requiredHabits));
      libraryGrid.appendChild(card);
    });

    const entryCount = HABITS.filter((h) => h.role === "entry").length;
    const weaknessCount = HABITS.filter((h) => h.role === "weakness").length;
    const signalCount = HABITS.filter((h) => h.role === "signal").length;
    const combos = entryCount * weaknessCount;

    const engineCard = document.createElement("div");
    engineCard.className = "library-card";
    engineCard.innerHTML = `
      <div class="library-card-kicker">Rules Engine</div>
      <h3>Everything else</h3>
      <p>${entryCount} entry points &times; ${weaknessCount} escalating weaknesses: at least ${combos} other realistic chains the engine can assemble on the fly, further shaped by ${signalCount} exposure signals.</p>
      <div class="library-card-steps">Generated, not hand-written</div>
    `;
    libraryGrid.appendChild(engineCard);
  }

  // --- Cipher: rule-based assistant (no external API, deterministic matching
  // against FAQ triggers, the glossary, and the habit keyword map only) ---
  function cipherRespond(userText) {
    const text = userText.toLowerCase();
    const isDefinitionQuestion = /what (is|does|are)|define|meaning of/.test(text);

    for (const item of FAQ) {
      if (item.triggers.some((t) => text.includes(t))) {
        return { text: item.answer };
      }
    }

    function matchGlossary() {
      for (const entry of GLOSSARY) {
        const termLower = entry.term.toLowerCase();
        const candidates = [termLower];
        const parenMatch = termLower.match(/\(([^)]+)\)/);
        if (parenMatch) {
          candidates.push(parenMatch[1]);
          candidates.push(termLower.split("(")[0].trim());
        }
        if (candidates.some((c) => c.length > 1 && text.includes(c))) {
          return { text: `${entry.term}: ${entry.definition}` };
        }
      }
      return null;
    }

    function matchKeywords() {
      const found = new Set();
      KEYWORD_MAP.forEach((km) => {
        if (km.keywords.some((k) => text.includes(k))) {
          km.habitIds.forEach((id) => found.add(id));
        }
      });
      if (found.size === 0) return null;
      const habitIds = Array.from(found).filter((id) => HABITS.some((h) => h.id === id));
      return {
        text:
          habitIds.length === 1
            ? `That sounds like it maps to one habit in the library. Here it is:`
            : `That could map to a few things in the library. Pick whichever actually apply:`,
        actionHabitIds: habitIds,
      };
    }

    const first = isDefinitionQuestion ? matchGlossary() : matchKeywords();
    if (first) return first;
    const second = isDefinitionQuestion ? matchKeywords() : matchGlossary();
    if (second) return second;

    return {
      text:
        "I don't have an exact match for that yet in my library. Try describing it a different way, " +
        "pick a habit directly from the list above, or ask me what a specific term means, like \"what is 2FA\".",
    };
  }

  function appendCipherMessage(role, text, actionHabitIds) {
    const messages = document.getElementById("cipherMessages");
    if (!messages) return;
    const msg = document.createElement("div");
    msg.className = "cipher-msg cipher-msg-" + role;

    const body = document.createElement("div");
    body.textContent = text;
    msg.appendChild(body);

    if (actionHabitIds === "RUN_ASSESSMENT") {
      const runBtnAction = document.createElement("button");
      runBtnAction.type = "button";
      runBtnAction.className = "cipher-msg-action";
      runBtnAction.textContent = "Run assessment now";
      runBtnAction.addEventListener("click", () => {
        navigate("full");
        runSimulation();
        runBtnAction.disabled = true;
        runBtnAction.textContent = "Running...";
        setTimeout(() => {
          runBtnAction.textContent = "Done";
          collapseCipherPanel();
          focusResultsSection();
          appendCipherMessage("bot", "Done. You're on the results now.");
        }, 1350);
      });
      msg.appendChild(runBtnAction);
    } else if (Array.isArray(actionHabitIds) && actionHabitIds.length > 0) {
      const optionsWrap = document.createElement("div");
      optionsWrap.className = "cipher-options";

      actionHabitIds.forEach((id) => {
        const habit = HABITS.find((h) => h.id === id);
        if (!habit) return;
        const meta = STAGE_META[habit.stage];
        const row = document.createElement("label");
        row.className = "cipher-option-row";
        row.innerHTML = `
          <input type="checkbox" checked data-habit-id="${id}" />
          <span class="cipher-option-dot" style="background:${meta.color}"></span>
          <span>${habit.label}</span>
        `;
        optionsWrap.appendChild(row);
      });

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "cipher-msg-action";
      confirmBtn.textContent = actionHabitIds.length === 1 ? "Add to simulation" : "Add selected to simulation";
      confirmBtn.addEventListener("click", () => {
        const checked = Array.from(optionsWrap.querySelectorAll('input[type="checkbox"]:checked')).map(
          (cb) => cb.dataset.habitId
        );
        if (checked.length === 0) return;

        checked.forEach((id) => {
          selected.add(id);
          const card = document.querySelector(`.habit-card[data-habit-id="${id}"]`);
          if (card) card.setAttribute("aria-pressed", "true");
        });
        updateRunState();
        updateSurfaceMap();

        optionsWrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.disabled = true));
        confirmBtn.disabled = true;
        confirmBtn.textContent = `Added ${checked.length}`;

        const names = checked.map((id) => `"${habitLabel(id)}"`).join(", ");
        const canRun = selected.size >= 2;
        appendCipherMessage(
          "bot",
          `Added ${names} (${selected.size} total selected).` +
            (canRun
              ? " Ready to see the assessment: chain, severity score, and threat model?"
              : " Add at least one more habit above to unlock a full assessment."),
          canRun ? "RUN_ASSESSMENT" : null
        );
      });

      optionsWrap.appendChild(confirmBtn);
      msg.appendChild(optionsWrap);
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function setupCipher() {
    const toggle = document.getElementById("cipherToggle");
    const panel = document.getElementById("cipherPanel");
    const closeBtn = document.getElementById("cipherClose");
    const form = document.getElementById("cipherForm");
    const input = document.getElementById("cipherInput");
    if (!toggle || !panel) return;
    let greeted = false;

    function openPanel() {
      panel.hidden = false;
      cipherPanelOpen = true;
      hideCipherTip();
      if (!greeted) {
        appendCipherMessage(
          "bot",
          "Hi, I'm Cipher. Ask what a term means, or describe a habit or situation in your own words " +
            "and I'll try to match it to something in the simulator."
        );
        greeted = true;
      }
      input.focus();
    }

    function closePanel() {
      panel.hidden = true;
      cipherPanelOpen = false;
    }

    toggle.addEventListener("click", () => {
      if (panel.hidden) openPanel();
      else if (panel.classList.contains("cipher-compact")) expandCipherPanel();
      else closePanel();
    });
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    const header = panel.querySelector(".cipher-header");
    if (header) {
      header.addEventListener("click", (e) => {
        if (!panel.classList.contains("cipher-compact")) return;
        if (e.target.closest(".cipher-close")) return;
        expandCipherPanel();
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        appendCipherMessage("user", text);
        input.value = "";
        const response = cipherRespond(text);
        setTimeout(() => {
          appendCipherMessage("bot", response.text, response.actionHabitIds);
        }, 350);
      });
    }
  }

  // --- Reusable carousel ---
  function setupCarousel(trackId, prevId, nextId, dotsId, autoAdvanceMs) {
    const track = document.getElementById(trackId);
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const dotsWrap = document.getElementById(dotsId);
    if (!track) return;

    const items = track.children.length;
    let index = 0;
    let timer = null;

    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      for (let i = 0; i < items; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot" + (i === 0 ? " active" : "");
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.addEventListener("click", () => goTo(i, true));
        dotsWrap.appendChild(dot);
      }
    }

    function render() {
      track.style.transform = `translateX(-${index * 100}%)`;
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((dot, i) => {
          dot.classList.toggle("active", i === index);
        });
      }
    }

    function goTo(i, manual) {
      index = (i + items) % items;
      render();
      if (manual) restartTimer();
    }

    function next(manual) {
      goTo(index + 1, manual);
    }

    function prev(manual) {
      goTo(index - 1, manual);
    }

    function restartTimer() {
      if (!autoAdvanceMs) return;
      if (timer) clearInterval(timer);
      timer = setInterval(() => next(false), autoAdvanceMs);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => prev(true));
    if (nextBtn) nextBtn.addEventListener("click", () => next(true));

    if (autoAdvanceMs) {
      const carousel = track.closest(".carousel");
      if (carousel) {
        carousel.addEventListener("mouseenter", () => timer && clearInterval(timer));
        carousel.addEventListener("mouseleave", restartTimer);
      }
      restartTimer();
    }

    render();
  }

  // --- Situation selector: highlights the factors that matter for a given
  // threat model. It never filters anything out. Nothing is gated on it.
  let activeSituation = null;

  function renderSituations() {
    const grid = document.getElementById("situationGrid");
    if (!grid) return;
    grid.innerHTML = "";

    SITUATIONS.forEach((sit) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "situation";
      btn.dataset.situation = sit.id;
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = `
        <span class="situation-label">${sit.label}</span>
        <span class="situation-blurb">${sit.blurb}</span>
      `;
      btn.addEventListener("click", () => selectSituation(sit.id));
      grid.appendChild(btn);
    });
  }

  function selectSituation(id) {
    activeSituation = activeSituation === id ? null : id;
    const sit = SITUATIONS.find((s) => s.id === activeSituation);

    document.querySelectorAll(".situation").forEach((btn) => {
      const on = btn.dataset.situation === activeSituation;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    const highlight = new Set(sit ? sit.highlight : []);
    document.querySelectorAll(".habit-card").forEach((card) => {
      card.classList.toggle("habit-relevant", highlight.has(card.dataset.habitId));
    });

    if (sit && sit.highlight.length > 0) {
      const first = document.querySelector(`.habit-card[data-habit-id="${sit.highlight[0]}"]`);
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // --- Demo mode: a clearly fictional profile so the whole flow can be shown
  // in seconds without filling in an assessment live.
  function loadDemo() {
    loadCombo(DEMO_PROFILE.habits);

    const banner = document.getElementById("demoBanner");
    const desc = document.getElementById("demoDesc");
    if (desc) {
      desc.textContent = `${DEMO_PROFILE.name}, ${DEMO_PROFILE.role}. ${DEMO_PROFILE.habits.length} factors selected. ${DEMO_PROFILE.note}`;
    }
    if (banner) banner.hidden = false;

    if (DEMO_PROFILE.situation) {
      activeSituation = null;
      selectSituation(DEMO_PROFILE.situation);
    }

    setTimeout(runSimulation, 260);
  }

  function setupDemo() {
    const demoBtn = document.getElementById("demoBtn");
    if (demoBtn) demoBtn.addEventListener("click", loadDemo);

    const clearDemo = document.getElementById("demoClearBtn");
    if (clearDemo) {
      clearDemo.addEventListener("click", () => {
        clearAll();
        const banner = document.getElementById("demoBanner");
        if (banner) banner.hidden = true;
        activeSituation = null;
        selectSituation(null);
        activateTab("profile");
      });
    }
  }


  // --- Cipher tips: rule-based speech bubbles, one per page visit, memory only ---
  const CIPHER_TIPS = {
    home: "Try the attacker's terminal first. No typing needed.",
    quick: "Six quick questions, no wrong answers.",
    full: "Pick a few habits and I'll show you the chain.",
    results: "Hover any step to see why it's connected.",
  };
  const tipsSeen = new Set();
  let tipsDisabled = false;
  let cipherPanelOpen = false;

  function hideCipherTip() {
    const tip = document.getElementById("cipherTip");
    if (tip) tip.hidden = true;
  }

  function showCipherTip(key) {
    if (tipsDisabled || cipherPanelOpen) return;
    const text = CIPHER_TIPS[key];
    const tip = document.getElementById("cipherTip");
    const body = document.getElementById("cipherTipText");
    if (!text || !tip || !body || tipsSeen.has(key)) return;
    tipsSeen.add(key);
    body.textContent = text;
    tip.hidden = false;
  }

  function setupCipherTips() {
    const hide = document.getElementById("cipherTipHide");
    const close = document.getElementById("cipherTipClose");
    if (close) close.addEventListener("click", hideCipherTip);
    if (hide) {
      hide.addEventListener("click", () => {
        tipsDisabled = true;
        hideCipherTip();
      });
    }
    showCipherTip("home");
  }

  // --- Page routing (Home / Quick check / Full assessment) ---
  function navigate(pageName) {
    const pages = {
      home: document.getElementById("pageHome"),
      quick: document.getElementById("pageQuick"),
      full: document.getElementById("pageFull"),
    };

    Object.entries(pages).forEach(([key, p]) => {
      if (p) p.classList.toggle("active", key === pageName);
    });

    document.querySelectorAll(".navlink").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageName);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    showCipherTip(pageName);
    // home.js listens for this to swap the page guide.
    document.dispatchEvent(new CustomEvent("cr:navigate", { detail: pageName }));
  }

  function setupRouting() {
    document.querySelectorAll("[data-page]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.page));
    });
  }

  // --- Quick check ---
  const quickAnswers = new Map();

  function renderQuickCheck() {
    const wrap = document.getElementById("quickQuestions");
    if (!wrap) return;
    wrap.innerHTML = "";

    QUICK_CHECK.forEach((q, i) => {
      const habit = HABITS.find((h) => h.id === q.habitId);
      if (!habit) return;
      const meta = STAGE_META[habit.stage];

      const row = document.createElement("div");
      row.className = "quick-q";
      row.style.setProperty("--stage-color", meta.color);
      row.innerHTML = `
        <div class="quick-q-copy">
          <span class="quick-q-num">${String(i + 1).padStart(2, "0")}</span>
          <div>
            <p class="quick-q-text">${q.question}</p>
            <p class="quick-q-hint">${q.hint}</p>
          </div>
        </div>
        <div class="quick-q-answers">
          <button type="button" class="quick-opt" data-answer="yes" data-habit="${q.habitId}">Yes</button>
          <button type="button" class="quick-opt" data-answer="no" data-habit="${q.habitId}">No</button>
        </div>
      `;

      row.querySelectorAll(".quick-opt").forEach((btn) => {
        btn.addEventListener("click", () => {
          quickAnswers.set(q.habitId, btn.dataset.answer === "yes");
          row.querySelectorAll(".quick-opt").forEach((b) => {
            b.classList.toggle("selected", b === btn);
          });
          row.classList.add("answered");
          updateQuickState();
        });
      });

      wrap.appendChild(row);
    });
  }

  function updateQuickState() {
    const countEl = document.getElementById("quickCount");
    const runBtn = document.getElementById("quickRunBtn");
    const answered = quickAnswers.size;
    if (countEl) countEl.textContent = `${answered} of ${QUICK_CHECK.length} answered`;
    if (runBtn) runBtn.disabled = answered < QUICK_CHECK.length;
  }

  function runQuickCheck() {
    const yesIds = [];
    quickAnswers.forEach((isYes, habitId) => {
      if (isYes) yesIds.push(habitId);
    });

    // Carry the answers into the full assessment so both stay in sync.
    selected.clear();
    yesIds.forEach((id) => selected.add(id));
    document.querySelectorAll(".habit-card").forEach((card) => {
      card.setAttribute("aria-pressed", selected.has(card.dataset.habitId) ? "true" : "false");
    });
    updateRunState();
    updateSurfaceMap();

    const { score, band, color, soft } = computeSeverity(yesIds);
    const scoreNum = document.getElementById("quickScoreNum");
    const scoreBand = document.getElementById("quickScoreBand");
    const scoreCard = document.getElementById("quickScoreCard");
    if (scoreCard) {
      scoreCard.style.setProperty("--severity-color", color);
      scoreCard.style.setProperty("--severity-soft", soft);
    }
    if (scoreNum) scoreNum.textContent = score;
    if (scoreBand) scoreBand.textContent = band;

    const nameEl = document.getElementById("quickChainName");
    const summaryEl = document.getElementById("quickChainSummary");
    const weakestEl = document.getElementById("quickWeakest");

    const chain = buildPaths(selected)[0] || null;

    if (chain) {
      if (nameEl) nameEl.textContent = chain.name;
      if (summaryEl) {
        summaryEl.textContent =
          `Your answers form a real ${chain.steps.length}-step path. ` + chain.steps[0];
      }
      const fixHabit = HABITS.find((h) => h.id === chain.weakestLink);
      if (weakestEl && fixHabit) {
        weakestEl.hidden = false;
        weakestEl.innerHTML = `
          <span class="quick-weakest-kicker">Fix this first</span>
          <p class="quick-weakest-name">${fixHabit.label}</p>
          <p class="quick-weakest-advice">${fixHabit.fixAdvice || ""}</p>
        `;
      }
    } else {
      if (nameEl) nameEl.textContent = "No complete chain from these six";
      if (summaryEl) {
        summaryEl.textContent =
          yesIds.length === 0
            ? "You answered no to everything here. A good sign, though these six are only a slice of the picture."
            : "Your answers include risk factors but not a full entry-to-impact path. The full assessment covers " + (HABITS.length - QUICK_CHECK.length) + " more habits that often complete it.";
      }
      if (weakestEl) weakestEl.hidden = true;
    }

    document.getElementById("quickIntro").hidden = true;
    document.getElementById("quickResult").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupQuickCheck() {
    renderQuickCheck();
    updateQuickState();

    const runBtn = document.getElementById("quickRunBtn");
    if (runBtn) runBtn.addEventListener("click", runQuickCheck);

    const toFull = document.getElementById("quickToFullBtn");
    if (toFull) {
      toFull.addEventListener("click", () => {
        navigate("full");
        if (selected.size >= 2) runSimulation();
        else activateTab("profile");
      });
    }

    const retake = document.getElementById("quickRetakeBtn");
    if (retake) {
      retake.addEventListener("click", () => {
        quickAnswers.clear();
        renderQuickCheck();
        updateQuickState();
        document.getElementById("quickResult").hidden = true;
        document.getElementById("quickIntro").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  // --- Modals (How it works / Scenario library) ---
  function setupModals() {
    function closeAll() {
      document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
    }

    document.querySelectorAll("[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.modal);
        if (!target) return;
        closeAll();
        target.hidden = false;
      });
    });

    document.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeAll);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
    });
  }

  // --- Tabs ---
  function activateTab(tabName) {
    const tabBtns = document.querySelectorAll(".step");
    const views = {
      profile: document.getElementById("viewProfile"),
      chain: document.getElementById("panelChain"),
      threat: document.getElementById("panelThreat"),
    };

    tabBtns.forEach((b) => {
      const isMatch = b.dataset.tab === tabName;
      b.classList.toggle("active", isMatch);
      b.setAttribute("aria-selected", isMatch ? "true" : "false");
    });

    Object.entries(views).forEach(([key, v]) => {
      if (!v) return;
      v.classList.toggle("active", key === tabName);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupTabs() {
    document.querySelectorAll(".step").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });
  }

  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const printDate = document.getElementById("printDate");
      if (printDate) {
        printDate.textContent = "Generated " + new Date().toLocaleDateString(undefined, {
          year: "numeric", month: "long", day: "numeric",
        });
      }
      window.print();
    });
  }


  /* ---------- Theme: Ink / Paper ----------
     Held in memory only. Nothing is written to storage, so the
     "no storage" promise stays literally true; this is a single
     page, so the choice survives every in-app navigation. */

  var systemLight = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  var themeChoice = null; // null = follow the system

  function activeTheme() {
    if (themeChoice) return themeChoice;
    return systemLight && systemLight.matches ? "paper" : "ink";
  }

  function paintTheme() {
    var theme = activeTheme();
    var root = document.documentElement;
    if (themeChoice) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");

    var btn = document.getElementById("themeToggle");
    var label = document.getElementById("themeToggleLabel");
    if (label) label.textContent = theme === "paper" ? "Paper" : "Ink";
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "paper" ? "true" : "false");
      btn.setAttribute("aria-label",
        theme === "paper" ? "Theme: Paper. Switch to Ink." : "Theme: Ink. Switch to Paper.");
    }
  }

  function setupTheme() {
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        themeChoice = activeTheme() === "paper" ? "ink" : "paper";
        paintTheme();
      });
    }
    if (systemLight && systemLight.addEventListener) {
      systemLight.addEventListener("change", function () {
        if (!themeChoice) paintTheme();
      });
    }
    paintTheme();
  }

  clearBtn.addEventListener("click", clearAll);
  runBtn.addEventListener("click", runSimulation);

  setupCarousel("stepsTrack", "stepsPrev", "stepsNext", "stepsDots", 4500);

  setupTheme();
  renderPersonaPicker();
  renderHabitGrid();
  renderSituations();
  updateRunState();
  renderLibrary();
  setupCarousel("libraryGrid", "libraryPrev", "libraryNext", "libraryDots");
  renderSurfaceMap();
  setupQuickCheck();
  setupDemo();
  setupRouting();
  setupTabs();
  setupPerspectiveToggle();
  setupModals();
  setupCipher();
  setupCipherTips();

  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    navigate("full");
    setTimeout(loadDemo, 220);
  }
})();
