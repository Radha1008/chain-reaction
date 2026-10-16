# Chain Reaction

A privacy-first attack-path simulator. It shows how ordinary habits chain together into an attack path, and the smallest change that breaks the chain.

**Live demo:** https://radha1008.github.io/chainreaction-ewgh-2026/

## What it is

Most security advice is a list of rules with no visible cause and effect. Chain Reaction shows the cause and effect. You pick habits a person actually has, and the app draws the path an attacker could walk from one habit to the next. Then it points at the single link that costs the least to break and shows what happens to the path when you break it.

## Who it is for

Everyday people first, without leaving security professionals out. It was built with women facing harassment, impersonation and scams in mind, since those chains usually start from public profile details rather than from malware. An analyst mode adds the technical layer for people who work in security.

## How it works

- **Home: a recon terminal.** Play the attacker for 30 seconds against one of three made-up targets, each showing a different attack: Sue Doe (phishing), Justin Case (an old breached password plus a smart lock) and Simone Swap (a SIM swap). Click commands, watch the chain build, then play the defender and break it.
- **Quick check: one ordinary day.** Six moments from morning to night, from cafe wifi to a holiday post. Dee Fault, the victim, panics as their exposure map lights up, while Phil Ishing, the attacker, pins each "yes" to his board. The result is a row of dominoes: tap one of your habits to pull it out and watch the fall stop. You leave with one takeaway and one action.
- **Full assessment: four steps.**
  1. *Pick your habits*, one area of your life at a time, with the map filling in.
  2. *Your case board*: the attack pinned up like evidence, joined by red string. Tap a note to read the step; pull a pin and watch the string go slack.
  3. *Your unchain plan*: the fewest changes that close the most paths, each with a free official guide. Tick one off and a link in your chain snaps, until the case is closed.
  4. *If it already happened*: the official places to report it and get help.
- **A live case file.** One line that keeps score: habits, attack paths, who is most likely to come after you, and the best first fix.
- **Analyst mode.** One switch adds a MITRE ATT&CK technique and a Defender view (where it could be detected) to every step of every path, the attacker's own moves included, plus the path's route through ATT&CK tactics, a coverage panel, the scoring math and an attacker log. Where no technique honestly fits (spotting an empty house, meeting in person) the step says so and why, rather than forcing a code. Mapped to ATT&CK v20; `node tests/check-attack-live.js` re-checks every ID, name and tactic against attack.mitre.org.
- **A guide on every page**, plain-English jargon pop-ups, and **field notes**: small, sourced facts from the FBI, FTC, FCC, Microsoft Research and Lockheed Martin.
- **Deterministic rules engine.** Every chain, score and recommendation comes from hand-written content in `data.js` and the rules in `engine.js`. The same inputs always produce the same output. There is no model call and nothing is generated at runtime.
- **Cipher.** A rule-based assistant that explains terms and adds habits to your assessment. Rule-based, not a chatbot.

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

Built with Claude Code. I directed every decision: scope, scenarios, rules, copy and design. The logo art was generated with Gemini. No third-party libraries are used. IBM Plex Sans, IBM Plex Mono and Fraunces are bundled in `fonts/` under the SIL Open Font License (see `fonts/OFL-IBMPlex.txt` and `fonts/OFL-Fraunces.txt`).

## Project layout

| File | What it holds |
|---|---|
| `data.js` | All content: habits, scenarios, ATT&CK mappings, guides, recovery links |
| `engine.js` | The rules: attack paths, severity, fixes, the unchain plan |
| `home.js` / `home.css` | Home page, page guide, glossary pop-ups |
| `assess.js` / `assess.css` | Quick check and Full assessment |
| `app.js` | Theme, routing, modals, scenario library, Cipher |
| `styles.css` | Site-wide styles and the Espresso / Walnut colour tokens |

## Running the tests

The browser tests drive the real page in headless Chrome over the DevTools protocol. They need Node 22+ and Chrome, and have no npm dependencies.

```
npm test
```

If Chrome isn't in a standard location, set `CHROME_PATH` first.

## Next steps

- More women-focused scenarios, especially harassment and impersonation chains.
- A Quick exit button.
- People-aware risk modeling that accounts for who else is in the picture, not just the account.

## License

MIT. See [LICENSE](LICENSE).
