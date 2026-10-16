"use strict";
// Re-checks every technique in ATTACK_CATALOG against attack.mitre.org in a
// real browser: the ID still resolves to itself (not a redirect), and the name
// and tactics still match. Needs network, so it is not part of `npm test`.
// Run after each new ATT&CK release: node tests/check-attack-live.js
const fs = require("fs");
const path = require("path");
const { launch, openTab } = require("./cdp");

const root = path.resolve(__dirname, "..");
const { ATTACK_CATALOG, ATTACK_VERSION } = new Function(fs.readFileSync(path.join(root, "data.js"), "utf8") + ";return {ATTACK_CATALOG, ATTACK_VERSION};")();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// runs inside attack.mitre.org
const probe = function () {
  const lines = document.body.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
  const field = (re) => {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (m) return (m[1] || lines[i + 1] || "").trim();
    }
    return "";
  };
  return {
    name: ((document.querySelector("h1") || {}).textContent || "").replace(/\s+/g, " ").trim(),
    id: field(/^ID:\s*(.*)$/),
    tactics: field(/^Tactics?:\s*(.*)$/),
    version: (document.body.innerText.match(/ATT&CK v[0-9.]+/) || [""])[0],
  };
};

(async () => {
  const port = 9333 + Math.floor(Math.random() * 1000);
  const proc = await launch(port);
  let problems = 0, seenVersion = "";
  try {
    const tab = await openTab(port);
    for (const [id, [name, tactics]] of Object.entries(ATTACK_CATALOG)) {
      await tab.navigate("https://attack.mitre.org/techniques/" + id.replace(".", "/") + "/");
      await sleep(1200);
      const r = await tab.evaluate("(" + probe.toString() + ")()");
      seenVersion = r.version || seenVersion;
      const issues = [];
      if (r.id !== id) issues.push("now " + (r.id || "missing"));
      if (r.name !== name.replace(/ \(Mobile\)$/, "")) issues.push('name "' + r.name + '"');
      if (r.tactics !== tactics) issues.push('tactics "' + r.tactics + '"');
      if (issues.length) problems++;
      console.log((issues.length ? "  FAIL - " : "  ok   - ") + id + " " + name + (issues.length ? "  (" + issues.join("; ") + ")" : ""));
    }
  } finally {
    proc.kill();
  }
  console.log(`\nSite is on ${seenVersion || "an unknown version"}; data.js says ${ATTACK_VERSION}.`);
  console.log(problems ? `${problems} technique(s) changed` : "Every technique still matches.");
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
