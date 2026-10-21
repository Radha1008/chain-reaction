# Chain Reaction

A privacy-first attack-path simulator. It shows how ordinary habits chain together into an attack path, and the smallest change that breaks the chain.

**Live demo:** https://radha1008.github.io/chain-reaction/

**This is version 2**, a calmer redesign live since October 2026. The original version is kept, not live, under [Versions](#versions).

**Viewing is welcome. Copying or reusing any part needs my written permission.** © 2026 Radha Prabhakaran, all rights reserved. See [Copyright](#copyright).

## What it is

Most security advice is a list of rules with no visible cause and effect. Chain Reaction shows the cause and effect. You pick habits a person actually has, and the app draws the path an attacker could walk from one habit to the next. Then it points at the single link that costs the least to break and shows what happens to the path when you break it.

## Who it is for

Everyday people first, without leaving security professionals out. It was built with women facing harassment, impersonation and scams in mind, since those chains usually start from public profile details rather than from malware. An analyst mode adds the technical layer for people who work in security.

## How it works

- **Start.** One screen that says what the site does, with a live animation of a real chain from the scenario library: each link lights up in turn, then one fix cuts the chain.
- **Scan.** Switch on the habits that are true for you: 24 everyday habits in 5 areas, or start from a sample profile. **Your own** lets you describe a habit in your own words. It suggests the closest habits the site models; if nothing fits, it explains how to judge the habit and keeps it as an unscored note, since there is no chain written for it.
- **Run analysis.** A short log of what the engine actually did with your answers, with real counts: chains checked, paths found, techniques mapped, fixes chosen.
- **Analysis.** Every attack path your habits form, scored out of 10 and labelled High, Medium or Low risk. Each path opens with one plain line, **To stop this path**, naming the weakest link and the change that breaks it, then a chain diagram and the steps in order, tagged You, Attacker or Result. **Fixes for all paths** lists the fewest changes that close the most paths, each with the time needed and a free official guide. A small line-drawn guide offers a walkthrough of the page.
- **Attacker sim** (optional). Play the attacker against one of three made-up targets, each showing a different attack: Sue Doe (phishing), Justin Case (an old breached password plus a smart lock) and Simone Swap (a SIM swap). Find four clues, launch the attack, then switch sides and block it. Each clue shows what an attacker could do with it.
- **Analyst mode.** One switch adds a MITRE ATT&CK technique and a detection note to every step of every path, the attacker's own moves included, plus the path's route through ATT&CK tactics. Where no technique honestly fits (spotting an empty house, meeting in person) the step says so and why, rather than forcing a code. Mapped to ATT&CK v20; `node tests/check-attack-live.js` re-checks every ID, name and tactic against attack.mitre.org.
- **Already hacked?** The official places to report it and recover.
- **Deterministic rules engine.** Every chain, score and recommendation comes from hand-written content in `data.js` and the rules in `engine.js`. The same inputs always produce the same output. There is no model call and nothing is generated at runtime.

## Detection Pack

If a chain hit a work account, how would a security team catch it? [`detections/`](detections/) holds Sigma rules for the attacker steps that leave a trace in Microsoft Entra ID and Exchange Online logs, each linked to the chain steps it covers and tested on every push against attack and near-miss sample logs. The first three:

- **CR-001** a sign-in that succeeds with a password alone from an unregistered device (T1078.004)
- **CR-002** a burst of wrong passwords on one account, then a success (T1110.004, a correlation rule)
- **CR-006** an inbox rule that hides or deletes security emails (T1564.008)

CI validates every rule with all SigmaHQ validators, checks every field against Microsoft's Sentinel table schemas, and builds KQL and SPL. The [Detection Pack README](detections/README.md) covers how it's tested and its limits.

## Safety by design

An attack-path tool can be misread as a how-to, so the content follows four rules:

- **What, never how.** Steps describe what happens at the level of FTC and CISA consumer guidance. The content names no attack or stalkerware tools and contains no commands or instructions. The attacker sim's commands are invented.
- **No real targets.** There is no way to enter a real person. Every character and scenario is fictional.
- **Every chain ends in a fix.** Each path is paired with the change that breaks it and a free official guide.
- **Enforced, not promised.** `tests/test-engine.js` fails if the content ever names a known attack or stalkerware tool, includes a shell command, or has a chain without a fix.

## Sources and links

Every guide and recovery link points at a free, official or non-profit source (CISA, FTC, FCC, FBI IC3, the National Cybersecurity Alliance, NNEDV, Have I Been Pwned). Each one was loaded in a real browser to confirm it works and is current. There are no sponsored or affiliate links, and the advice names no commercial products.

## Privacy

Everything runs in the browser. No accounts, no uploads, no tracking, no analytics, and nothing is stored. Fonts are bundled, so the page makes no third-party requests. The people in the scenarios are fictional. Close the tab and there is nothing left behind.

## Limitations

- Scenarios are hand-authored, so coverage is limited to what has been written.
- Fix times are rough estimates, not measurements.
- It is educational. It is not a professional risk assessment and should not be treated as one.

## Background

Chain Reaction started in September 2026 as my project for the Elevate Women Global Hackathon. I've since kept building it as an independent personal project.

Built with Claude Code. I directed every decision: scope, scenarios, rules, copy and design. The favicon art was generated with Gemini. No third-party libraries are used. Chakra Petch, Inter and JetBrains Mono are bundled in `fonts/` under the SIL Open Font License (see the `fonts/OFL-*.txt` files).

## Project layout

| File | What it holds |
|---|---|
| `data.js` | All content: habits, scenarios, ATT&CK mappings, guides, recovery links |
| `engine.js` | The rules: attack paths, severity, fixes, the fix plan |
| `index.html` / `style.css` | The page and its styles (Ember Copper theme, light and dark) |
| `app.js` | Start, Scan, Analysis, the run log and Your own habits |
| `sim.js` | The attacker sim |
| `tour.js` / `figure.js` | The page guide and the line-drawn figures |
| `detections/` | Sigma rules, sample logs and their tests (the Detection Pack) |

## Running the tests

The content, safety and engine checks need only Node 22+:

```
npm test
```

`node tests/check-attack-live.js` re-checks the ATT&CK catalog in headless Chrome over the DevTools protocol. If Chrome isn't in a standard location, set `CHROME_PATH` first.

The Detection Pack has its own Python tests; see [detections/README.md](detections/README.md#how-its-tested).

## Versions

- **Version 2 (live).** This redesign, from October 2026: one calm screen at a time, plain-language results, an optional attacker sim and a page guide. Same content, rules and Detection Pack as version 1.
- **Version 1 (kept, not live).** The original site from September to October 2026: the home recon game, the Quick check day and the four-step Full assessment with its case board. Its code is preserved exactly as it was at the tag [`v1-original`](https://github.com/Radha1008/chain-reaction/tree/v1-original). It is no longer served as a website.

## Next steps

- More women-focused scenarios, especially harassment and impersonation chains.
- A Quick exit button.
- People-aware risk modeling that accounts for who else is in the picture, not just the account.

## Copyright

© 2026 Radha Prabhakaran. All rights reserved.

Chain Reaction is my original work: the concept, scenarios, characters, rules, writing and design. You are welcome to read the code and use the live site, but no part of it may be copied, reused, modified or republished without my written permission. See [LICENSE](LICENSE).

Versions published before 16 October 2026 were released under the MIT License; that applies only to copies of those earlier versions. The bundled fonts keep their own SIL Open Font License.

MITRE ATT&CK® technique IDs and names belong to The MITRE Corporation and are used for reference under MITRE's terms of use; they are not part of my copyright claim. MITRE ATT&CK is a registered trademark of The MITRE Corporation.
