"use strict";
const path = require("path");
const { launch, openTab } = require("./cdp");

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  ok -", msg);
}

async function waitFor(tab, expr, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await tab.evaluate(expr);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("FAIL: timed out waiting for " + (label || expr));
}

async function main() {
  const port = 9333 + Math.floor(Math.random() * 1000);
  const proc = await launch(port);
  try {
    const tab = await openTab(port);
    const fileUrl =
      "file:///" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/") + "?demo=1";
    console.log("Loading", fileUrl);
    await tab.navigate(fileUrl);

    // Tour card appears once the calm one-time draw finishes and startTour() lands on step 1.
    await waitFor(
      tab,
      `(() => { const p = document.getElementById('nodeDetail'); return p && !p.hidden && p.classList.contains('tour-mode') && p.querySelector('.tour-step-counter') ? p.querySelector('.tour-step-counter').textContent : null; })()`,
      15000,
      "tour card to appear at step 1"
    );
    const counter0 = await tab.evaluate(
      `document.querySelector('#nodeDetail .tour-step-counter').textContent`
    );
    assert(counter0 === "Step 1 of 7", `initial counter is "Step 1 of 7" (got "${counter0}")`);

    // No auto-advance: wait 3s and confirm still step 1.
    await new Promise((r) => setTimeout(r, 3000));
    const counter1 = await tab.evaluate(
      `document.querySelector('#nodeDetail .tour-step-counter').textContent`
    );
    assert(counter1 === "Step 1 of 7", "still at step 1 after 3s of no interaction (no auto-advance)");

    // Also confirm Attacker View / Simulate MFA never auto-ran.
    const attackerAutoRan = await tab.evaluate(
      `document.querySelector('.view-opt[data-view="attacker"]').getAttribute('aria-pressed')`
    );
    assert(attackerAutoRan === "false", "Attacker View did not auto-run");
    const anyBroken = await tab.evaluate(
      `document.querySelectorAll('.flow-node.broken').length`
    );
    assert(anyBroken === 0, "Simulate MFA did not auto-run (no .broken nodes yet)");

    // Click Next through all steps, asserting card text changes and counter updates.
    let prevTitle = await tab.evaluate(`document.querySelector('#nodeDetail .tour-title').textContent`);
    for (let step = 2; step <= 7; step++) {
      await tab.evaluate(`document.getElementById('tourNext').click()`);
      await new Promise((r) => setTimeout(r, 120));
      const counter = await tab.evaluate(
        `document.querySelector('#nodeDetail .tour-step-counter').textContent`
      );
      assert(counter === `Step ${step} of 7`, `counter updates to "Step ${step} of 7" (got "${counter}")`);
      const titleEl = await tab.evaluate(
        `(() => { const t = document.querySelector('#nodeDetail .tour-title'); return t ? t.textContent : null; })()`
      );
      if (step <= 6) {
        assert(!!titleEl && titleEl !== prevTitle, `card title changed on step ${step} (was "${prevTitle}", now "${titleEl}")`);
        prevTitle = titleEl;
      }
    }

    // Step 7 is the fix step: Simulate MFA button should be present.
    const hasFixBtn = await tab.evaluate(`!!document.getElementById('tourFixBtn')`);
    assert(hasFixBtn, "Simulate MFA button is present on the final step");

    // Hover a node and assert the tooltip shows.
    await tab.evaluate(
      `(() => { const n = document.querySelector('.flow-node[data-index="1"]'); n.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); })()`
    );
    await new Promise((r) => setTimeout(r, 200));
    const tooltipVisible = await tab.evaluate(
      `(() => { const t = document.querySelector('.node-tooltip'); return !!t && t.classList.contains('visible'); })()`
    );
    assert(tooltipVisible, "hovering a node shows the tooltip");
    await tab.evaluate(
      `(() => { const n = document.querySelector('.flow-node[data-index="1"]'); n.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })); })()`
    );

    // Click Simulate MFA and assert "The chain broke."
    await tab.evaluate(`document.getElementById('tourFixBtn').click()`);
    await waitFor(
      tab,
      `(() => { const h = document.querySelector('#nodeDetail .tour-conclusion-headline'); return h && h.textContent.includes('The chain broke.'); })()`,
      4000,
      '"The chain broke." conclusion to appear'
    );
    const brokenCount = await tab.evaluate(`document.querySelectorAll('.flow-node.broken').length`);
    assert(brokenCount > 0, `Simulate MFA marks downstream nodes broken (${brokenCount} broken)`);

    // Fictional-data label stays visible throughout.
    const bannerVisible = await tab.evaluate(
      `(() => { const b = document.getElementById('demoBanner'); return b && !b.hidden; })()`
    );
    assert(bannerVisible, "fictional-data demo banner is still visible");

    console.log("\nALL ASSERTIONS PASSED");
  } finally {
    proc.kill();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
