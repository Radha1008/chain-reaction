# Chain Reaction

A privacy-first attack-path simulator. It shows how ordinary habits chain together into an attack path, and the smallest change that breaks the chain.

**Live demo:** https://radha1008.github.io/chainreaction-ewgh-2026/

## What it is

Most security advice is a list of rules with no visible cause and effect. Chain Reaction shows the cause and effect. You pick habits a person actually has, and the app draws the path an attacker could walk from one habit to the next. Then it points at the single link that costs the least to break and shows what happens to the path when you break it.

## Who it is for

Everyday people, not security teams. It was built with women facing harassment, impersonation and scams in mind, since those chains usually start from public profile details rather than from malware.

## How it works

- **Recon terminal on the home page.** Play the attacker for 30 seconds against one of three made-up targets, each showing a different attack: Sue Doe (phishing), Justin Case (an old breached password plus a smart lock) and Simone Swap (a SIM swap). Click commands, watch the chain build, then play the defender and break it.
- **A guide on every page.** A short "what this page does" line and numbered steps that follow you as you scroll, so someone with no security background always knows where they are and what to do next.
- **Plain-English jargon.** Terms like phishing, 2FA and SIM swap are tappable and explain themselves.
- **Field notes.** Small, sourced facts from the FBI, FTC, FCC, Microsoft Research and Lockheed Martin, one per section.
- **Deterministic rules engine.** Every chain, score and recommendation comes from hand-written rules in `data.js`. The same inputs always produce the same output. There is no model call and nothing is generated at runtime.
- **Guided job-seeker walkthrough.** A step-by-step scenario that follows one person through a fake recruiter approach and shows each link as it forms.
- **Attacker view.** The same profile rewritten as what an attacker sees and can use, instead of what the defender is told to fix.
- **Simulate MFA.** Toggle multi-factor authentication on and watch which paths survive and which collapse.
- **Cipher.** A rule-based assistant that explains terms and the current chain. Rule-based, not a chatbot.

## Privacy

Everything runs in the browser. No accounts, no uploads, no tracking, no analytics, and nothing is stored. The demo profiles are fictional. Close the tab and there is nothing left behind.

## Limitations

- Scenarios are hand-authored, so coverage is limited to what has been written.
- The guided walkthrough only covers the job-seeker chain.
- It is educational. It is not a professional risk assessment and should not be treated as one.

## Background

Chain Reaction started in September 2026 as my project for the Elevate Women Global Hackathon. I've since kept building it as an independent personal project.

Built with Claude Code. I directed every decision: scope, scenarios, rules, copy and design. The logo art was generated with Gemini. No third-party libraries are used. The Fraunces font is bundled in `fonts/` under the SIL Open Font License (see `fonts/OFL.txt`), so the page still makes no third-party network requests.

## Running the tests

The tests drive the real page in headless Chrome over the DevTools protocol. They need Node 22+ and Chrome, and have no npm dependencies.

```
npm test
```

If Chrome isn't in a standard location, set `CHROME_PATH` first.

## Next steps

- More women-focused scenarios, especially harassment and impersonation chains.
- A Quick exit button.
- Slower pacing through the walkthrough.
- People-aware risk modeling that accounts for who else is in the picture, not just the account.

## License

MIT. See [LICENSE](LICENSE).
