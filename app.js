// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// ChainReaction: site shell. Theme, page routing, modals, the scenario
// library and Cipher the assistant. The Quick check and Full assessment live
// in assess.js; the attack-path rules live in engine.js.
// Everything here runs client-side only and nothing is persisted.

(function () {
  "use strict";

  function habitLabel(id) {
    const h = HABITS.find((x) => x.id === id);
    return h ? h.label : id;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
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

    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    showCipherTip(pageName);
    // assess.js and home.js listen for this.
    document.dispatchEvent(new CustomEvent("cr:navigate", { detail: pageName }));
  }

  function setupRouting() {
    document.querySelectorAll("[data-page]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.page));
    });
  }

  function closeModals() {
    document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
  }

  // Open the full assessment with a set of habits already ticked.
  function openAssessment(habitIds, toBoard) {
    closeModals();
    navigate("full");
    if (window.CRAssess) window.CRAssess.loadHabits(habitIds, { board: toBoard });
  }

  // --- Scenario library ---
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
        <div class="library-card-try">See it on the case board &rarr;</div>
      `;
      card.addEventListener("click", () => openAssessment(chain.requiredHabits, true));
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
        "or ask me what a specific term means, like \"what is 2FA\".",
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

    if (actionHabitIds === "OPEN_BOARD") {
      const boardBtn = document.createElement("button");
      boardBtn.type = "button";
      boardBtn.className = "cipher-msg-action";
      boardBtn.textContent = "Show me the case board";
      boardBtn.addEventListener("click", () => {
        navigate("full");
        if (window.CRAssess) window.CRAssess.goTab(2);
        boardBtn.disabled = true;
        boardBtn.textContent = "Done";
        collapseCipherPanel();
      });
      msg.appendChild(boardBtn);
    } else if (Array.isArray(actionHabitIds) && actionHabitIds.length > 0) {
      const optionsWrap = document.createElement("div");
      optionsWrap.className = "cipher-options";

      actionHabitIds.forEach((id) => {
        const habit = HABITS.find((h) => h.id === id);
        if (!habit) return;
        const row = document.createElement("label");
        row.className = "cipher-option-row";
        row.innerHTML = `
          <input type="checkbox" checked data-habit-id="${id}" />
          <span class="cipher-option-dot" style="background:var(--stage-${habit.stage})"></span>
          <span>${habit.label}</span>
        `;
        optionsWrap.appendChild(row);
      });

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "cipher-msg-action";
      confirmBtn.textContent = actionHabitIds.length === 1 ? "Add to my assessment" : "Add selected to my assessment";
      confirmBtn.addEventListener("click", () => {
        const checked = Array.from(optionsWrap.querySelectorAll('input[type="checkbox"]:checked')).map(
          (cb) => cb.dataset.habitId
        );
        if (checked.length === 0 || !window.CRAssess) return;

        window.CRAssess.addHabits(checked);
        optionsWrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.disabled = true));
        confirmBtn.disabled = true;
        confirmBtn.textContent = `Added ${checked.length}`;

        const names = checked.map((id) => `"${habitLabel(id)}"`).join(", ");
        const ready = window.CRAssess.hasPaths;
        appendCipherMessage(
          "bot",
          `Added ${names} to your full assessment.` +
            (ready
              ? " That's enough to form an attack path. Want to see it pinned on the case board?"
              : " Add a way in and a weak lock to form a full attack path."),
          ready ? "OPEN_BOARD" : null
        );
      });

      optionsWrap.appendChild(confirmBtn);
      msg.appendChild(optionsWrap);
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function collapseCipherPanel() {
    const panel = document.getElementById("cipherPanel");
    if (panel && !panel.hidden) panel.classList.add("cipher-compact");
  }

  function expandCipherPanel() {
    const panel = document.getElementById("cipherPanel");
    if (panel) panel.classList.remove("cipher-compact");
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

    function restartTimer() {
      if (!autoAdvanceMs) return;
      if (timer) clearInterval(timer);
      timer = setInterval(() => goTo(index + 1, false), autoAdvanceMs);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1, true));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1, true));

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

  // --- Cipher tips: rule-based speech bubbles, one per page visit, memory only ---
  const CIPHER_TIPS = {
    home: "Try the attacker's terminal first. No typing needed.",
    quick: "Six moments from one ordinary day. Watch what Phil collects.",
    full: "Go one area at a time. Most people tick four to six things.",
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

  // --- Modals (How it works / Scenario library) ---
  function setupModals() {
    document.querySelectorAll("[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.modal);
        if (!target) return;
        closeModals();
        target.hidden = false;
      });
    });

    document.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeModals);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModals();
    });
  }

  /* ---------- Theme: Espresso (dark) / Walnut (light) ----------
     Held in memory only. Nothing is written to storage, so the
     "no storage" promise stays literally true. The data-theme values
     stay "ink" / "paper" so existing CSS selectors keep working. */

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
    var name = theme === "paper" ? "Walnut" : "Espresso";
    var other = theme === "paper" ? "Espresso" : "Walnut";
    if (label) label.textContent = name;
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "paper" ? "true" : "false");
      btn.setAttribute("aria-label", "Theme: " + name + ". Switch to " + other + ".");
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

  setupTheme();
  renderLibrary();
  setupCarousel("stepsTrack", "stepsPrev", "stepsNext", "stepsDots", 4500);
  setupCarousel("libraryGrid", "libraryPrev", "libraryNext", "libraryDots");
  setupRouting();
  setupModals();
  setupCipher();
  setupCipherTips();
})();
