"use strict";
// Quick check and Full assessment in a real browser. Run: npm test (or node tests/test-assess.js)
const path = require("path");
const { launch, openTab } = require("./cdp");

let failures = 0;
function check(cond, msg) {
  console.log((cond ? "  ok   - " : "  FAIL - ") + msg);
  if (!cond) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(tab, expr, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await tab.evaluate(expr)) return true; await sleep(120); }
  throw new Error("timed out waiting for " + (label || expr));
}
const BASE = "file:///" + path.resolve(__dirname, "..", "index.html").split(path.sep).join("/");
const go = (tab, page) => tab.evaluate(`document.querySelector('.navlink[data-page="${page}"]').click()`);
const answer = (tab, a) => tab.evaluate(`document.querySelector('#pageQuick .yn [data-a="${a}"]').click()`);
const next = (tab) => tab.evaluate(`document.getElementById('qNext').click()`);

async function main() {
  const port = 9333 + Math.floor(Math.random() * 1000);
  const proc = await launch(port);
  try {
    const tab = await openTab(port);
    const errors = [], external = [];
    await tab.send("Runtime.enable");
    await tab.send("Network.enable");
    tab.ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || "exception");
      if (m.method === "Network.requestWillBeSent" && !/^(file|data|about|blob):/.test(m.params.request.url)) external.push(m.params.request.url);
    });
    await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await tab.navigate(BASE);

    console.log("\n[1] quick check: one ordinary day");
    check(await tab.evaluate(`document.getElementById('anSwitch').hidden`), "analyst switch is hidden on the home page");
    await go(tab, "quick"); await sleep(300);
    check(!(await tab.evaluate(`document.getElementById('anSwitch').hidden`)), "analyst switch appears on the quick check");
    check(await tab.evaluate(`document.querySelectorAll('#qMoments .moment').length === 6`), "six moments in the timeline");
    const heights = new Set();
    for (const a of ["yes", "no", "yes", "yes", "no", "no"]) {
      heights.add(await tab.evaluate(`Math.round(document.querySelector('#pageQuick .qleft').getBoundingClientRect().height)`));
      await answer(tab, a);
      heights.add(await tab.evaluate(`Math.round(document.querySelector('#pageQuick .qleft').getBoundingClientRect().height)`));
      if (a === "yes" && heights.size <= 2) {
        check(await tab.evaluate(`document.getElementById('aStick').classList.contains('gotcha')`), "Phil gets excited on a yes");
        check(await tab.evaluate(`document.getElementById('qStick').classList.contains('panic')`), "Dee panics on a yes");
      }
      await next(tab);
    }
    check(heights.size === 1, `question column never changes height (${[...heights].join(", ")}px)`);
    await waitFor(tab, `!document.getElementById('qResult').hidden`, 3000, "result");
    check(await tab.evaluate(`document.getElementById('dTitle').textContent.includes('dominoes')`), "answers with a chain show the dominoes");
    await waitFor(tab, `document.getElementById('dMsg').textContent.includes("That's the chain")`, 5000, "dominoes fall");
    await tab.evaluate(`document.querySelector('#dLane .domino.mine').click()`);
    await waitFor(tab, `document.getElementById('dMsg').textContent.includes('stops at the gap')`, 5000, "pulled domino");
    check(true, "pulling a domino stops the fall");
    check(await tab.evaluate(`document.getElementById('tAct').textContent.startsWith('Do this today')`), "takeaway card gives one action");
    check(await tab.evaluate(`document.querySelector('#gSteps .g-step[aria-current=step]').textContent.includes('Your dominoes')`), "page guide moves to step 2");
    await tab.evaluate(`document.getElementById('tFull').click()`); await sleep(300);
    check(await tab.evaluate(`document.getElementById('pageFull').classList.contains('active') && CRAssess.hasPaths`), "'See the full assessment' carries the answers over");

    console.log("\n[2] quick check: no chain explains why");
    await go(tab, "quick"); await sleep(200);
    await tab.evaluate(`document.getElementById('tRetake').click()`);
    const yesIdx = [4, 5];
    for (let i = 0; i < 6; i++) { await answer(tab, yesIdx.includes(i) ? "yes" : "no"); await next(tab); }
    await sleep(300);
    check(await tab.evaluate(`document.getElementById('dTitle').textContent.startsWith('No complete chain')`), "signals only: no chain");
    check(await tab.evaluate(`/no way in/.test(document.getElementById('dSub').textContent) && /needs both/.test(document.getElementById('dSub').textContent)`), "explains what is missing");
    check(await tab.evaluate(`document.querySelector('details.story').hidden`), "empty story drawer is hidden");

    console.log("\n[3] full assessment: four steps");
    await go(tab, "full"); await sleep(200);
    await tab.evaluate(`document.getElementById('clearMap').click()`);
    check(await tab.evaluate(`[...document.querySelectorAll('#gSteps .g-step')].slice(1).every(b => b.disabled)`), "later steps are locked until there is a path");
    check(await tab.evaluate(`document.querySelectorAll('#aTabs .atab').length === 5`), "five areas to pick from");
    await tab.evaluate(`document.querySelector('[data-sample="job"]').click()`); await sleep(200);
    check(await tab.evaluate(`/5/.test(document.querySelector('#caseBar dl dd').textContent) && document.querySelectorAll('#caseBar dd')[1].textContent === '1'`), "case file bar updates live (5 habits, 1 path)");
    await tab.evaluate(`document.getElementById('toBoard').click()`);
    await sleep(500);
    check(await tab.evaluate(`document.getElementById('t2title').textContent === 'Your 5 habits form 1 attack path. One change closes them all.'`), "board headline is one plain sentence");
    check(await tab.evaluate(`document.querySelectorAll('#cBoard .note').length === 7`), "every step is pinned on the board");
    await tab.evaluate(`document.querySelectorAll('#cBoard .note')[2].click()`);
    check(await tab.evaluate(`document.getElementById('caption').textContent.includes('Step 3 of 7')`), "tapping a note reads that step");
    await tab.evaluate(`document.querySelector('#pins .pin[data-h="no_email_2fa"]').click()`); await sleep(200);
    check(await tab.evaluate(`/to 0/.test(document.getElementById('pullResult').textContent)`), "pulling the 2FA pin closes the path");
    await tab.evaluate(`CRAssess.goTab(3)`); await sleep(300);
    check(await tab.evaluate(`document.getElementById('t3title').textContent === 'One change to unchain yourself.'`), "plan headline counts the fewest changes");
    check(await tab.evaluate(`[...document.querySelectorAll('#plan .a-res')].every(a => a.href.startsWith('https://'))`), "every fix links an official guide");
    await tab.evaluate(`document.querySelector('#plan .pitem input').click()`); await sleep(300);
    check(await tab.evaluate(`!document.getElementById('stamp').hidden && document.getElementById('links').classList.contains('loose')`), "ticking the fix breaks the chain and stamps the case closed");
    await tab.evaluate(`document.querySelector('#t3 [data-go="4"]').click()`); await sleep(300);
    check(await tab.evaluate(`!document.getElementById('t4').hidden && document.querySelectorAll('#t4 .recover a').length === 6`), "step 4 lists the six recovery links");

    console.log("\n[4] analyst mode");
    check(await tab.evaluate(`getComputedStyle(document.getElementById('tStrip')).display === 'none'`), "attacker log hidden for everyday visitors");
    await tab.evaluate(`document.getElementById('anSwitch').click(); CRAssess.goTab(2);`); await sleep(400);
    check(await tab.evaluate(`getComputedStyle(document.getElementById('tStrip')).display !== 'none' && document.getElementById('cBoard').nextElementSibling.id === 'tStrip'`), "log appears inline right under the case board");
    check(await tab.evaluate(`getComputedStyle(document.getElementById('tStrip')).position === 'static'`), "log never floats over content");
    check(await tab.evaluate(`document.querySelectorAll('#cBoard .note .code').length > 0 && getComputedStyle(document.querySelector('#cBoard .note .an')).display !== 'none'`), "ATT&CK codes show on the notes");
    await tab.evaluate(`CRAssess.goTab(1)`); await sleep(200);
    check(await tab.evaluate(`document.querySelectorAll('#attCov tr').length === 5`), "ATT&CK coverage panel lists the techniques");
    await tab.evaluate(`document.getElementById('anSwitch').click()`);

    console.log("\n[5] scenario library, Cipher and the demo link");
    await go(tab, "home"); await sleep(200);
    await tab.evaluate(`document.querySelector('[data-modal="libraryModal"]').click()`);
    await tab.evaluate(`document.querySelector('#libraryGrid .library-card-clickable').click()`); await sleep(400);
    check(await tab.evaluate(`document.getElementById('pageFull').classList.contains('active') && CRAssess.tab === 2 && document.getElementById('libraryModal').hidden`), "library card opens its scenario on the case board");
    await tab.evaluate(`document.getElementById('cipherToggle').click()`); await sleep(200);
    await tab.evaluate(`document.getElementById('cipherInput').value = 'I reuse the same password'; document.getElementById('cipherForm').requestSubmit();`);
    await waitFor(tab, `!!document.querySelector('#cipherMessages .cipher-options .cipher-msg-action')`, 3000, "cipher options");
    await tab.evaluate(`document.querySelector('#cipherMessages .cipher-options .cipher-msg-action').click()`); await sleep(200);
    check(await tab.evaluate(`/Added/.test(document.getElementById('cipherMessages').textContent) && /full assessment/.test(document.getElementById('cipherMessages').textContent)`), "Cipher adds habits to the full assessment");
    await tab.navigate(BASE + "?demo=1"); await sleep(600);
    check(await tab.evaluate(`document.getElementById('pageFull').classList.contains('active') && CRAssess.tab === 2`), "?demo=1 opens the demo on the case board");

    console.log("\n[6] phone width and privacy");
    await tab.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const pg of ["quick", "full"]) {
      await go(tab, pg); await sleep(300);
      check(await tab.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), `no sideways scroll on ${pg} at 390px`);
    }
    check(external.length === 0, `no third-party requests (${external.join(", ") || "none"})`);
    check(errors.length === 0, `no script errors (${errors.join(" | ") || "none"})`);
  } finally {
    proc.kill();
  }
  console.log(failures ? `\n${failures} failure(s)` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
