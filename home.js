// ChainReaction: home page recon game, page guide, glossary pop-ups.
// Runs after data.js and app.js. Like the rest of the site it keeps
// everything in memory: nothing is stored, sent or persisted.

(function () {
  const $ = (id) => document.getElementById(id);
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // =====================================================================
  // Recon terminal: three fictional targets, three different attacks.
  // All emails use the reserved .example domain and the phone number is
  // in the 555-01xx range set aside for fiction.
  // =====================================================================
  const SUE_EMAIL = "sue.doe@larkfield.example";
  const JUSTIN_EMAIL = "justin.case@inboxly.example";
  const SIMONE_PHONE = "+1 555-0142";

  const TARGETS = {
    sue: {
      handle: "sue_doe",
      title: "The chain against Sue",
      cmds: [
        { id: "status", label: "check status", cmd: "check status sue_doe", lines: [["res", "status: #OpenToWork  (looking for analyst roles)"], ["why", "// useful: a recruiter message is exactly what she hopes to get"]], link: true },
        { id: "employer", label: "lookup employer", cmd: "lookup employer sue_doe", lines: [["res", "Finance Analyst, Accounts Payable @ Larkfield Logistics"], ["why", "// useful: a fake email can name her real team"]], link: true },
        { id: "skills", label: "list skills", cmd: "list skills sue_doe", lines: [["res", "Excel, SQL, Power BI"], ["meh", "// not useful: thousands of profiles say the same thing"]] },
        { id: "email", label: "find email", cmd: "find email sue_doe", lines: [["res", SUE_EMAIL + "  (listed on profile)"], ["why", "// useful: now they know exactly where to send it"]], link: true },
        { id: "banner", label: "view banner", cmd: "view banner sue_doe", lines: [["res", "image: mountain landscape, no location tag"], ["meh", "// not useful: says nothing about where or when"]] },
        { id: "posts", label: "read posts", cmd: "read posts sue_doe --latest", lines: [["res", "\"Biscuit turned 5 today. Best dog in Leeds.\""], ["why", "// useful: pet name + city = common security-question answers"]], link: true },
      ],
      slots: {
        status: ["She is job hunting", "A recruiter message will not look strange."],
        employer: ["Her company and team", "The message can mention real details."],
        email: ["Where to send it", "Her email is public. No guessing."],
        posts: ["Her dog's name and city", "Common password-reset answers."],
      },
      end: ["Email account taken over", "Fake recruiter, fake login page, real password."],
      attack: {
        label: "launch phish",
        cmd: "launch phish --as recruiter --to " + SUE_EMAIL,
        lines: [["res", "email sent: \"Analyst role at a partner firm. Sign in to view the offer.\""], ["res", "Sue opened the link -> fake login page"], ["res", "password captured"], ["bad", "ACCESS GRANTED: Sue's email account is taken over"]],
      },
      fix: {
        label: "enable 2fa  (play the defender)",
        cmd: "enable 2fa " + SUE_EMAIL,
        lines: [["res", "2FA on: new sign-ins need a code from Sue's phone"], ["cmd", "replay attack"], ["res", "password accepted ... code required"], ["ok", "BLOCKED: the stolen password is not enough. chain broken."]],
      },
      twist: '<b>The twist:</b> nothing you found decides whether this works. Two hidden things do: does Sue reuse that password, and does her email ask for a second code (<button type="button" class="gl" data-term="2fa">2FA</button>)?',
    },

    justin: {
      handle: "justin_case",
      title: "The chain against Justin",
      cmds: [
        { id: "status", label: "check status", cmd: "check status justin_case", lines: [["res", "auto-reply: \"Out of office until the 14th. Off to Lisbon!\""], ["why", "// useful: his home is empty for two weeks"]], link: true },
        { id: "hobbies", label: "list hobbies", cmd: "list hobbies justin_case", lines: [["res", "chess, sourdough, sci-fi films"], ["meh", "// not useful: fun facts, not a way in"]] },
        { id: "posts", label: "read posts", cmd: "read posts justin_case --latest", lines: [["res", "\"New smart lock installed. Front door opens from my phone now!\""], ["why", "// useful: his door is controlled by an app account"]], link: true },
        { id: "banner", label: "view banner", cmd: "view banner justin_case", lines: [["res", "image: city skyline at night, no location tag"], ["meh", "// not useful: could be any city"]] },
        { id: "email", label: "find email", cmd: "find email justin_case", lines: [["res", JUSTIN_EMAIL + "  (in his bio)"], ["why", "// useful: the lock app most likely signs in with this email"]], link: true },
        { id: "breach", label: "check breaches", cmd: "check breaches " + JUSTIN_EMAIL, lines: [["res", "found in an old 2019 data breach: password Summer2019!"], ["why", "// useful: if he never changed it, it may still work"]], link: true },
      ],
      slots: {
        status: ["He is away until the 14th", "His home is empty."],
        posts: ["His front door runs on an app", "Whoever controls the app controls the lock."],
        email: ["Which account to target", "His email is public."],
        breach: ["An old leaked password", "Never changed since 2019."],
      },
      end: ["Front door app taken over", "Old password, email reset, lock app access."],
      attack: {
        label: "try old password",
        cmd: "login " + JUSTIN_EMAIL + " --password Summer2019!",
        lines: [["res", "login successful (password never changed)"], ["res", "smart-lock app: \"forgot password\" -> reset link sent to that inbox"], ["res", "lock app access: granted"], ["bad", "ACCESS GRANTED: Justin's front door can be opened while he is in Lisbon"]],
      },
      fix: {
        label: "change password + enable 2fa  (play the defender)",
        cmd: "change password && enable 2fa " + JUSTIN_EMAIL,
        lines: [["res", "old password retired. 2FA on: new sign-ins need a code from Justin's phone"], ["cmd", "replay attack"], ["res", "login failed: password incorrect"], ["ok", "BLOCKED: the leaked password is useless now. chain broken."]],
      },
      twist: '<b>The twist:</b> posting a holiday photo is normal. What decides this is invisible: a password from a <button type="button" class="gl" data-term="breach">data breach</button> that was never changed, and no <button type="button" class="gl" data-term="2fa">2FA</button> on the email that controls his front door.',
    },

    simone: {
      handle: "simone_swap",
      title: "The chain against Simone",
      cmds: [
        { id: "status", label: "check status", cmd: "check status simone_swap", lines: [["res", "bio: \"New to crypto! Just moved my savings into a trading app.\""], ["why", "// useful: there is real money behind this account"]], link: true },
        { id: "phone", label: "find phone", cmd: "find phone simone_swap", lines: [["res", SIMONE_PHONE + "  (listed for \"business inquiries\")"], ["why", "// useful: her login codes are sent to this number"]], link: true },
        { id: "hobbies", label: "list hobbies", cmd: "list hobbies simone_swap", lines: [["res", "pilates, true-crime podcasts, houseplants"], ["meh", "// not useful: nothing an attacker can use"]] },
        { id: "carrier", label: "lookup carrier", cmd: "lookup carrier " + SIMONE_PHONE, lines: [["res", "carrier: Bluewave Mobile"], ["why", "// useful: now they know which company to call"]], link: true },
        { id: "banner", label: "view banner", cmd: "view banner simone_swap", lines: [["res", "image: beach sunset, no location tag"], ["meh", "// not useful: could be any beach"]] },
        { id: "posts", label: "read posts", cmd: "read posts simone_swap --latest", lines: [["res", "\"29 today! Celebrating in the new flat on Maple Street.\""], ["why", "// useful: birthday + street = what a phone store may ask to \"verify\" her"]], link: true },
      ],
      slots: {
        status: ["She has crypto savings", "Worth an attacker's effort."],
        phone: ["Her phone number", "Where her login codes are sent."],
        carrier: ["Her mobile carrier", "Who to call, pretending to be her."],
        posts: ["Her birthday and street", "Enough to pass a weak identity check."],
      },
      end: ["Crypto account taken over", "Number moved, codes stolen, account emptied."],
      attack: {
        label: "call carrier as simone",
        cmd: "call bluewave --pretend simone_swap --request new-sim",
        lines: [["res", "rep: \"Can you confirm your date of birth and address?\" -> confirmed"], ["res", "her number now rings on the attacker's SIM card. Simone's phone: no service"], ["res", "crypto app: \"forgot password\" -> code sent by text -> arrives on attacker's phone"], ["bad", "ACCESS GRANTED: Simone's crypto account is taken over"]],
      },
      fix: {
        label: "authenticator app + carrier PIN  (play the defender)",
        cmd: "set 2fa --method authenticator-app && carrier lock --pin",
        lines: [["res", "login codes now come from an app on Simone's own phone, not by text"], ["res", "carrier account locked: number changes need her secret PIN"], ["cmd", "replay attack"], ["res", "carrier: PIN required ... request refused"], ["ok", "BLOCKED: no new SIM, no codes. chain broken."]],
      },
      twist: '<b>The twist:</b> codes sent by text follow your phone number wherever it goes. What decides this is invisible: login codes by <button type="button" class="gl" data-term="sms2fa">text message only</button>, and no PIN on her phone account to stop a <button type="button" class="gl" data-term="simswap">SIM swap</button>.',
    },
  };
  const ORDER = ["sue", "justin", "simone"];
  const NAMES = { sue: "Sue Doe", justin: "Justin Case", simone: "Simone Swap" };

  const out = $("hOut");
  const cmdsEl = $("hCmds");
  const slotsEl = $("hSlots");
  const foot = $("hFoot");
  let targetKey = "sue";
  let found = new Set();
  let busy = false;
  let runId = 0;

  function print(cls, text) {
    const p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
  }

  function run(lines, done) {
    busy = true;
    const mine = runId;
    let i = 0;
    const step = () => {
      if (mine !== runId) return; // target switched mid-run
      if (i >= lines.length) {
        busy = false;
        if (done) done();
        return;
      }
      print(lines[i][0], lines[i][1]);
      i++;
      setTimeout(step, reduced ? 0 : 260);
    };
    step();
  }

  function addCmd(label, cls, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "h-cmd" + (cls ? " " + cls : "");
    b.textContent = label;
    b.addEventListener("click", handler);
    cmdsEl.appendChild(b);
    return b;
  }

  function updateBoard() {
    $("hCount").textContent = found.size + " of 4 links";
    $("hMeter").style.width = (found.size / 4) * 100 + "%";
    slotsEl.querySelectorAll(".h-slot[data-slot]").forEach((s) => {
      s.classList.toggle("on", found.has(s.dataset.slot));
    });
  }

  function loadTarget(key) {
    runId++;
    busy = false;
    targetKey = key;
    found = new Set();
    const t = TARGETS[key];

    document.querySelectorAll(".h-pick").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.p === key ? "true" : "false");
    });
    $("hBoardTitle").textContent = t.title;

    slotsEl.innerHTML =
      Object.entries(t.slots)
        .map(
          ([id, s], i) =>
            `<li class="h-slot" data-slot="${id}"><div class="h-rail"><span class="h-dot">${i + 1}</span><span class="h-stem"></span></div><div class="h-slot-body"><strong>${s[0]}</strong><span>${s[1]}</span></div></li>`
        )
        .join("") +
      `<li class="h-slot" id="hEndSlot"><div class="h-rail"><span class="h-dot">!</span><span class="h-stem"></span></div><div class="h-slot-body"><strong>${t.end[0]}</strong><span>${t.end[1]}</span></div></li>`;

    foot.hidden = true;
    foot.innerHTML = "";

    cmdsEl.innerHTML = '<span class="h-cmds-label">Commands</span>';
    t.cmds.forEach((c) => {
      const b = addCmd(c.label, "", () => {
        if (busy) return;
        b.disabled = true;
        print("cmd", c.cmd);
        run(c.lines, () => {
          if (c.link) found.add(c.id);
          updateBoard();
          if (found.size === 4) finale();
        });
      });
      b.dataset.c = c.id;
    });

    out.innerHTML = "";
    print("cmd", "target " + t.handle);
    print("res", "public profile loaded: 6 details visible");
    print("meh", "// you are playing the attacker. pick a command below.");
    updateBoard();
  }

  function finale() {
    const t = TARGETS[targetKey];
    const end = $("hEndSlot");
    print("ok", "// 4 links found. the chain is complete.");

    const attackBtn = addCmd(t.attack.label, "go", () => {
      if (busy) return;
      attackBtn.disabled = true;
      print("cmd", t.attack.cmd);
      run(t.attack.lines, () => {
        end.classList.add("on");
        foot.innerHTML = "<p>" + t.twist + "</p>";
        foot.hidden = false;

        const fixBtn = addCmd(t.fix.label, "fix", () => {
          if (busy) return;
          fixBtn.disabled = true;
          print("cmd", t.fix.cmd);
          run(t.fix.lines, () => {
            end.classList.add("broken");
            end.querySelector(".h-dot").textContent = "✓";

            const nextKey = ORDER[(ORDER.indexOf(targetKey) + 1) % ORDER.length];
            const row = document.createElement("div");
            row.className = "h-handoff";
            row.style.marginTop = "0";
            const nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.className = "h-next-btn side";
            nextBtn.textContent = "Now try " + NAMES[nextKey];
            nextBtn.addEventListener("click", () => loadTarget(nextKey));
            const mine = document.createElement("button");
            mine.type = "button";
            mine.className = "h-next-btn side";
            mine.dataset.page = "quick";
            mine.textContent = "Check your own habits";
            mine.addEventListener("click", () => clickNav("quick"));
            row.append(nextBtn, mine);
            foot.appendChild(row);

            addCmd("reset", "", () => loadTarget(targetKey));
          });
        });
      });
    });
  }

  // Route through the existing nav buttons so app.js stays the one router.
  function clickNav(page) {
    const link = document.querySelector('.navlink[data-page="' + page + '"]');
    if (link) link.click();
  }

  if (out) {
    document.querySelectorAll(".h-pick").forEach((b) => b.addEventListener("click", () => loadTarget(b.dataset.p)));
    loadTarget("sue");
  }

  // =====================================================================
  // Exposure map: counts come straight from HABITS so they never drift.
  // =====================================================================
  const AREAS = {
    exposure: { tag: "Exposure", title: "Your public profile", text: "What anyone can see about you without logging in. On its own it is harmless. Combined, it tells an attacker who to pretend to be.", ex: "Example: \"Open to work\" plus your company name is enough for a believable fake recruiter, like Sue's." },
    credential: { tag: "Credentials", title: "Your passwords", text: "How your accounts are locked. This is usually where a chain either stops or turns into a takeover.", ex: "Example: one leaked password opens every account that shares it, like Justin's." },
    initial_access: { tag: "Way in", title: "Phone and wifi", text: "The first door an attacker can knock on: networks you join, codes you scan, links you tap, apps you install.", ex: "Example: a QR sticker on a parking meter that opens a fake payment page." },
    behavior: { tag: "Behaviour", title: "Daily habits", text: "Small routines that make a trick easier to pull off.", ex: "Example: an email that shows your manager's name but comes from a stranger's address." },
    iot: { tag: "Smart home", title: "Smart home", text: "Devices that connect your home to the internet, and the accounts that control them.", ex: "Example: whoever takes over your email may also control your front door app." },
  };

  function habitsIn(stage) {
    return typeof HABITS === "undefined" ? [] : HABITS.filter((h) => h.stage === stage);
  }

  function showArea(key) {
    const a = AREAS[key];
    const info = $("hMapInfo");
    if (!a || !info) return;
    document.querySelectorAll(".h-district").forEach((d) => d.classList.toggle("active", d.dataset.d === key));
    const items = habitsIn(key).map((h) => "<li>" + h.label + "</li>").join("");
    info.innerHTML =
      `<span class="tag" style="color:var(--stage-${key})">${a.tag}</span><h3>${a.title}</h3><p>${a.text}</p>` +
      `<ul>${items}</ul><p class="ex">${a.ex}</p>`;
  }

  document.querySelectorAll(".h-district").forEach((d) => {
    d.addEventListener("click", () => showArea(d.dataset.d));
    d.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showArea(d.dataset.d);
      }
    });
  });
  document.querySelectorAll("[data-count]").forEach((el) => {
    const n = habitsIn(el.dataset.count).length;
    el.textContent = n + (n === 1 ? " habit" : " habits");
  });
  if (typeof HABITS !== "undefined") {
    document.querySelectorAll("[data-habit-total]").forEach((el) => (el.textContent = HABITS.length));
    if (typeof QUICK_CHECK !== "undefined") {
      document.querySelectorAll("[data-habit-extra]").forEach((el) => (el.textContent = HABITS.length - QUICK_CHECK.length));
    }
  }
  if (typeof CHAINS !== "undefined") {
    document.querySelectorAll("[data-chain-total]").forEach((el) => (el.textContent = CHAINS.length));
  }
  showArea("exposure");

  // =====================================================================
  // Glossary pop-ups: tap a dotted word for a plain-English definition.
  // =====================================================================
  const TERMS = {
    recon: ["Reconnaissance", "Quietly gathering information about a target before doing anything. Often just reading what is public."],
    phishing: ["Phishing", "A fake message, usually email or text, designed to trick you into clicking a link or giving up a password."],
    harvest: ["Credential harvesting", "Collecting usernames and passwords, usually with a fake login page that looks real."],
    ato: ["Account takeover", "When someone else gets into your account and can act as you: read mail, reset other passwords, lock you out."],
    "2fa": ["2FA (two-factor authentication)", "A second check after your password, like a code on your phone. A stolen password alone is then not enough."],
    breach: ["Data breach", "When a company's customer data leaks. Old passwords from breaches get shared and tried on other sites for years."],
    sms2fa: ["Text-message codes", "Login codes sent by SMS. Better than nothing, but anyone who hijacks your phone number receives them too."],
    simswap: ["SIM swap", "Tricking a mobile carrier into moving your phone number onto the attacker's SIM card, so your calls and texts go to them."],
  };
  const pop = document.createElement("div");
  pop.className = "gl-pop";
  pop.setAttribute("role", "tooltip");
  pop.hidden = true;
  document.body.appendChild(pop);
  let popFor = null;

  function closePop() {
    pop.hidden = true;
    if (popFor) popFor.setAttribute("aria-expanded", "false");
    popFor = null;
  }

  document.addEventListener("click", (e) => {
    const g = e.target.closest(".gl");
    if (!g) {
      if (!e.target.closest(".gl-pop")) closePop();
      return;
    }
    if (popFor === g) {
      closePop();
      return;
    }
    closePop();
    const t = TERMS[g.dataset.term];
    if (!t) return;
    pop.innerHTML = "<b>" + t[0] + "</b>" + t[1];
    pop.hidden = false;
    const r = g.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const w = Math.min(280, vw - 32);
    pop.style.left = Math.max(16, Math.min(r.left, vw - w - 16)) + window.scrollX + "px";
    pop.style.top = r.bottom + window.scrollY + 8 + "px";
    g.setAttribute("aria-expanded", "true");
    popFor = g;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePop();
  });
  window.addEventListener("scroll", closePop, { passive: true });

  // =====================================================================
  // Page guide: one plain sentence and the steps for whichever page is
  // open. Lives in the sticky header; the hide choice lasts this visit only.
  // =====================================================================
  const header = document.querySelector(".topbar");
  const guide = $("gGuide");
  const pageText = $("gPage");
  const stepsEl = $("gSteps");
  let currentPage = "home";

  const GUIDES = {
    home: {
      text: "",
      steps: [
        { label: "Play the attacker", target: "hGame" },
        { label: "How chains work", target: "hHow" },
        { label: "Where you're exposed", target: "hMap" },
        { label: "Check yourself", target: "hWays" },
      ],
    },
    quick: {
      text: "<b>Quick check:</b> six yes-or-no questions about things you actually do. You get a risk score, the chain your answers form, and the first habit to fix.",
      steps: [
        { label: "Answer 6 questions", target: "quickQuestions" },
        { label: "See your result", target: "quickResult" },
        { label: "Go deeper", action: () => { const b = $("quickToFullBtn"); const r = $("quickResult"); if (b && r && !r.hidden) b.click(); else clickNav("full"); } },
      ],
    },
    full: {
      text: "<b>Full assessment:</b> tick the habits that are true for you and run the simulation. Then explore every attack path, flip to the attacker's view, and test which single fix breaks the most paths. The three numbered tabs below walk you through it.",
      steps: [],
    },
  };

  function renderGuide(page) {
    currentPage = page;
    const g = GUIDES[page] || GUIDES.home;
    pageText.innerHTML = g.text;
    pageText.hidden = !g.text;
    stepsEl.innerHTML = "";
    if (g.steps.length) {
      const lbl = document.createElement("span");
      lbl.className = "g-lbl";
      lbl.textContent = "On this page";
      stepsEl.appendChild(lbl);
    }
    g.steps.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "g-step";
      b.innerHTML = `<span class="g-step-n">${i + 1}</span>${s.label}`;
      b.addEventListener("click", () => {
        if (s.action) return s.action();
        const el = $(s.target);
        if (el && !el.hidden) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      });
      stepsEl.appendChild(b);
    });
    const hide = document.createElement("button");
    hide.type = "button";
    hide.className = "g-toggle";
    hide.textContent = "Hide guide";
    hide.addEventListener("click", () => {
      guide.classList.add("collapsed");
      measure();
    });
    stepsEl.appendChild(hide);
    updateSteps();
    measure();
  }

  function updateSteps() {
    const steps = stepsEl.querySelectorAll(".g-step");
    if (!steps.length) return;
    let idx = 0;
    if (currentPage === "home") {
      const line = window.innerHeight * 0.35;
      GUIDES.home.steps.forEach((s, i) => {
        const el = $(s.target);
        if (el && el.getBoundingClientRect().top <= line) idx = i;
      });
    } else if (currentPage === "quick") {
      const r = $("quickResult");
      idx = r && !r.hidden ? 1 : 0;
    }
    steps.forEach((b, i) => {
      if (i === idx) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
      b.classList.toggle("done", i < idx);
    });
  }

  // Keep in-page jumps from landing under the sticky header.
  function measure() {
    if (!header) return;
    document.documentElement.style.setProperty("--chrome-offset", header.offsetHeight + 16 + "px");
  }

  function onScroll() {
    if (header) {
      const compact = window.scrollY > 120;
      if (compact !== header.classList.contains("compact")) {
        header.classList.toggle("compact", compact);
        measure();
      }
    }
    updateSteps();
  }

  if (guide && stepsEl) {
    $("gShow").addEventListener("click", () => {
      guide.classList.remove("collapsed");
      measure();
    });
    document.addEventListener("cr:navigate", (e) => renderGuide(e.detail));
    document.querySelectorAll("[data-gjump]").forEach((b) =>
      b.addEventListener("click", () => {
        const el = $(b.dataset.gjump);
        if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      })
    );
    const result = $("quickResult");
    if (result && "MutationObserver" in window) {
      new MutationObserver(updateSteps).observe(result, { attributes: true, attributeFilter: ["hidden"] });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      updateSteps();
    });
    const active = document.querySelector(".page.active");
    renderGuide(active && active.id === "pageQuick" ? "quick" : active && active.id === "pageFull" ? "full" : "home");
  }
})();
