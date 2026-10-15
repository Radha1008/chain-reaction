"use strict";
// Regression tests for the five engine bugs listed in PROGRESS.md.
// Run: npm test (or node tests/test-bugfixes.js)
const path = require("path");
const { launch, openTab } = require("./cdp");

let failures = 0;
function check(cond, msg) {
  if (cond) console.log("  ok   -", msg);
  else {
    failures++;
    console.log("  FAIL -", msg);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(tab, expr, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await tab.evaluate(expr);
    if (v) return v;
    await sleep(150);
  }
  throw new Error("timed out waiting for " + (label || expr));
}

const FILE_URL =
  "file:///" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");

async function fresh(tab) {
  await tab.navigate(FILE_URL + "?t=" + Date.now());
  await tab.evaluate(`document.querySelector('[data-page="full"]').click()`);
}

async function selectHabits(tab, ids) {
  await tab.evaluate(`(() => {
    ${JSON.stringify(ids)}.forEach((id) => {
      const c = document.querySelector('.habit-card[data-habit-id="' + id + '"]');
      if (!c) throw new Error("no habit card " + id);
      c.click();
    });
  })()`);
}

async function runAndWait(tab) {
  await tab.evaluate(`document.getElementById('runBtn').click()`);
  await waitFor(tab, `!document.getElementById('resultsChain').hidden`, 8000, "results");
  await sleep(300);
}

async function main() {
  const port = 9333 + Math.floor(Math.random() * 1000);
  const proc = await launch(port);
  try {
    const tab = await openTab(port);

    // 1. Weakest link must sit before the final-impact step in every chain.
    console.log("\n[1] weakest link is never the final step");
    await fresh(tab);
    const bad = await tab.evaluate(
      `CHAINS.filter((c) => c.weakestLinkStepIndex >= c.steps.length - 1).map((c) => c.id)`
    );
    check(bad.length === 0, `no chain ends on its weakest link (offenders: ${bad.join(", ") || "none"})`);
    const lenMismatch = await tab.evaluate(
      `CHAINS.filter((c) => c.stepHabits && c.stepHabits.length !== c.steps.length).map((c) => c.id)`
    );
    check(lenMismatch.length === 0, `stepHabits length matches steps (offenders: ${lenMismatch.join(", ") || "none"})`);

    // 2. Changing habits after a run must not leak into the intervention math.
    console.log("\n[2] intervention simulation uses the run snapshot");
    await fresh(tab);
    await selectHabits(tab, ["public_wifi", "password_reuse"]);
    await runAndWait(tab);
    await selectHabits(tab, ["qr_scan", "same_pin"]); // edit AFTER the run
    await tab.evaluate(`document.querySelector('#interventionList .intervention').click()`);
    const sim = await tab.evaluate(`(() => {
      const n = [...document.querySelectorAll('#simResult .sim-num')].map((e) => +e.textContent);
      return { before: n[0], after: n[1] };
    })()`);
    check(sim.after <= sim.before, `after (${sim.after}) is not more than before (${sim.before})`);
    await tab.evaluate(`document.querySelector('.path-card').click()`);
    const fix = await tab.evaluate(`document.querySelector('#fixResult .fix-result-detail').textContent.replace(/\\s+/g, ' ')`);
    const mPaths = await tab.evaluate(`document.getElementById('mPaths').textContent`);
    check(fix.includes(`of ${mPaths} matched`), `weakest-link fix counts against the ${mPaths} shown paths ("${fix.trim().slice(0, 140)}")`);

    // 3. Attacker view must survive switching paths.
    console.log("\n[3] attacker view survives path switch");
    await fresh(tab);
    await selectHabits(tab, ["public_wifi", "unknown_links", "password_reuse", "no_email_2fa"]);
    await runAndWait(tab);
    const pathCount = await tab.evaluate(`document.querySelectorAll('.path-card').length`);
    check(pathCount >= 2, `selection gives multiple paths (${pathCount})`);
    await tab.evaluate(`document.querySelector('.view-opt[data-view="attacker"]').click()`);
    await tab.evaluate(`document.querySelectorAll('.path-card')[1].click()`);
    await sleep(100);
    const modes = await tab.evaluate(`(() => {
      const nodes = [...document.querySelectorAll('#chainFlow .flow-node')];
      return { total: nodes.length, attacker: nodes.filter((n) => n.classList.contains('attacker-mode')).length };
    })()`);
    check(modes.total > 0 && modes.attacker === modes.total, `all ${modes.total} nodes in attacker mode (got ${modes.attacker})`);

    // 4. Quick check and full assessment agree on the top path.
    console.log("\n[4] quick check matches full assessment");
    await fresh(tab);
    await tab.evaluate(`document.querySelector('[data-page="quick"]').click()`);
    const yes = new Set(["public_wifi", "password_reuse", "no_email_2fa", "share_location"]);
    await tab.evaluate(`(() => {
      const yes = new Set(${JSON.stringify([...yes])});
      document.querySelectorAll('.quick-q').forEach((row) => {
        const id = row.querySelector('.quick-opt').dataset.habit;
        row.querySelector('.quick-opt[data-answer="' + (yes.has(id) ? 'yes' : 'no') + '"]').click();
      });
      document.getElementById('quickRunBtn').click();
    })()`);
    const quickName = await tab.evaluate(`document.getElementById('quickChainName').textContent`);
    await tab.evaluate(`document.getElementById('quickToFullBtn').click()`);
    await waitFor(tab, `!document.getElementById('resultsChain').hidden`, 8000, "full results");
    const fullName = await tab.evaluate(`document.getElementById('chainName').textContent`);
    check(quickName === fullName, `same top path ("${quickName}" vs "${fullName}")`);

    // 5. Run button is locked while analyzing; Clear wipes path state.
    console.log("\n[5] run is not re-entrant, reset clears state");
    await fresh(tab);
    await selectHabits(tab, ["public_wifi", "password_reuse"]);
    await tab.evaluate(`document.getElementById('runBtn').click()`);
    const disabledDuring = await tab.evaluate(`document.getElementById('runBtn').disabled`);
    check(disabledDuring === true, "run button disabled during analysis");
    await waitFor(tab, `!document.getElementById('resultsChain').hidden`, 8000, "results");
    const enabledAfter = await tab.evaluate(`document.getElementById('runBtn').disabled`);
    check(enabledAfter === false, "run button re-enabled after analysis");
    await tab.evaluate(`document.getElementById('clearBtn').click()`);
    await tab.evaluate(`document.getElementById('replayBtn').click()`);
    const nodesAfterClear = await tab.evaluate(`document.querySelectorAll('#chainFlow .flow-node').length`);
    check(nodesAfterClear === 0, `replay after Clear draws nothing (drew ${nodesAfterClear} nodes)`);
    // Clear during analysis must cancel the pending run.
    await selectHabits(tab, ["public_wifi", "password_reuse"]);
    await tab.evaluate(`document.getElementById('runBtn').click()`);
    await tab.evaluate(`document.getElementById('clearBtn').click()`);
    await sleep(1800);
    const shownAfterCancel = await tab.evaluate(`!document.getElementById('resultsChain').hidden`);
    check(shownAfterCancel === false, "Clear during analysis cancels the pending run");
  } finally {
    proc.kill();
  }
  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
