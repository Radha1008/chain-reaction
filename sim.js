// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// Chain Reaction: optional attacker simulation (the recon game from the full
// site). Targets are fictional; everything stays in memory.

(function () {
  "use strict";
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

  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The glossary pop-ups are not part of this view: keep the words, drop the buttons.
  const plain = (html) => html.replace(/<button[^>]*class="gl"[^>]*>(.*?)<\/button>/g, "$1");
  const ABOUT = {
    sue: "Job hunting. Say it out loud: \"sudo\".",
    justin: "On holiday. Posts everything, just in case.",
    simone: "New crypto investor. Her name is a hint.",
  };
  const out = $("simOut");
  const cmdsEl = $("simCmds");
  let key = "sue";
  let found = new Set();
  let busy = false;
  let finaled = false;
  let runId = 0;

  // One instruction at a time: recon, attack, defend, done.
  // He plays the attacker until you switch sides; then the hood comes off.
  let mood = "";
  function mission(step, text) {
    $("simStep").textContent = step;
    $("simMission").innerHTML = text;
    const next = /Defend|Done/.test(step) ? "guide" : "attacker";
    $("simMissionRow").classList.toggle("attacker", next === "attacker");
    if (next !== mood) {
      mood = next;
      const fig = $("simFig");
      fig.innerHTML = window.CRFigure(next);
      fig.classList.remove("swap");
      fig.getBoundingClientRect();
      fig.classList.add("swap");
    }
  }

  function print(cls, text) {
    const p = document.createElement("p");
    p.className = "t-" + cls;
    p.textContent = text;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
  }

  function run(lines, done) {
    busy = true;
    const mine = runId;
    let i = 0;
    const step = () => {
      if (mine !== runId) return;
      if (i >= lines.length) { busy = false; if (done) done(); return; }
      print(lines[i][0], lines[i][1]);
      i++;
      setTimeout(step, reduced ? 0 : 320);
    };
    step();
  }

  function addCmd(label, cls, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "t-cmd" + (cls ? " " + cls : "");
    b.textContent = label;
    b.addEventListener("click", handler);
    cmdsEl.appendChild(b);
    return b;
  }

  function board() {
    document.querySelectorAll("#simSlots .clue[data-slot]").forEach((s) => s.classList.toggle("on", found.has(s.dataset.slot)));
  }

  function load(k) {
    runId++;
    busy = false;
    finaled = false;
    key = k;
    found = new Set();
    const t = TARGETS[k];
    $("simTarget").innerHTML = window.CRFigure(k, "calm");
    const first = NAMES[k].split(" ")[0];
    document.querySelectorAll("#simTargets .tg").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === k)));
    $("simAbout").textContent = ABOUT[k];
    // Clues stay redacted until recon uncovers them.
    // A flow: each clue, then an arrow saying what the attacker can do with it.
    // A flow: above each clue's arrow, what the attacker can do with it.
    $("simSlots").innerHTML = Object.entries(t.slots).map(([id, s], i) =>
      `<li class="clue" data-slot="${id}"><em class="use">${s[1]}</em><i class="ln" aria-hidden="true"></i><small>Clue ${i + 1}</small><span>${s[0]}</span></li>`).join("") +
      `<li class="clue end" id="simEnd"><em class="use" id="simEndSub">Locked until all 4 clues are found</em><i class="ln" aria-hidden="true"></i><small>Outcome</small><span class="o-main">${t.end[0]}</span></li>`;
    cmdsEl.innerHTML = "";
    t.cmds.forEach((c) => {
      const b = addCmd(c.label, "", () => {
        if (busy) return;
        b.disabled = true;
        print("cmd", c.cmd);
        run(c.lines, () => {
          if (c.link) found.add(c.id);
          board();
          if (found.size === 4 && !finaled) finale();
          else mission("Step 1 of 3 · Recon", `Find 4 useful details about ${first}. <b>${found.size} of 4</b> found.`);
        });
      });
    });
    out.innerHTML = "";
    print("cmd", "target " + t.handle);
    print("res", "public profile loaded: 6 details visible");
    mission("Step 1 of 3 · Recon", `You are the attacker. Click commands below to find 4 useful details about ${first}. Two of them find nothing.`);
    board();
  }

  function finale() {
    finaled = true;
    const t = TARGETS[key];
    const first = NAMES[key].split(" ")[0];
    const end = $("simEnd");
    cmdsEl.innerHTML = "";
    mission("Step 2 of 3 · Attack", `All 4 details found. Use them: launch the attack.`);
    $("simEndSub").textContent = "Ready: launch the attack";
    const atk = addCmd(t.attack.label, "go", () => {
      if (busy) return;
      atk.disabled = true;
      print("cmd", t.attack.cmd);
      run(t.attack.lines, () => {
        end.classList.add("on");
        $("simTarget").innerHTML = window.CRFigure(key, "worried");
        $("simEndSub").textContent = t.end[1];
        cmdsEl.innerHTML = "";
        mission("Step 3 of 3 · Defend", `${first} has been hacked. Now switch sides: one change blocks it.`);
        const fix = addCmd(t.fix.label.replace(/\s*\(play the defender\)/, ""), "fix", () => {
          if (busy) return;
          fix.disabled = true;
          print("cmd", t.fix.cmd);
          run(t.fix.lines, () => {
            end.classList.add("broken");
            $("simTarget").innerHTML = window.CRFigure(key, "happy");
            $("simEndSub").textContent = "Blocked by one change";
            cmdsEl.innerHTML = "";
            const lesson = plain(t.twist).replace(/<b>The twist:<\/b>\s*/, "");
            mission("Done · Chain broken", lesson.charAt(0).toUpperCase() + lesson.slice(1));
            const next = ORDER[(ORDER.indexOf(key) + 1) % ORDER.length];
            addCmd("try " + NAMES[next].toLowerCase(), "", () => load(next));
            addCmd("check my own habits", "", () => document.querySelector('.step[data-view="scan"]').click());
            addCmd("replay", "", () => load(key));
          });
        });
      });
    });
  }

  $("simTargets").innerHTML = ORDER.map((k) => `<button type="button" class="tg" data-t="${k}" aria-pressed="false">${NAMES[k]}</button>`).join("");
  $("simTargets").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) load(b.dataset.t); });
  load("sue");
})();
