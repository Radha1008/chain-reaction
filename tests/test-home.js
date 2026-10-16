"use strict";
// Home page, page guide and glossary. Run: npm test (or node tests/test-home.js)
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
    if (await tab.evaluate(expr)) return true;
    await sleep(120);
  }
  throw new Error("timed out waiting for " + (label || expr));
}

const FILE_URL = "file:///" + path.resolve(__dirname, "..", "index.html").split(path.sep).join("/");

async function playTarget(tab, key) {
  await tab.evaluate(`document.querySelector('.h-pick[data-p="${key}"]').click()`);
  const n = await tab.evaluate(`document.querySelectorAll('#hCmds .h-cmd').length`);
  for (let i = 0; i < n; i++) {
    await tab.evaluate(`document.querySelectorAll('#hCmds .h-cmd')[${i}].click()`);
    await waitFor(tab, `!document.querySelectorAll('#hCmds .h-cmd')[${i}].disabled === false`, 3000);
    await sleep(700);
  }
  await waitFor(tab, `!!document.querySelector('#hCmds .h-cmd.go')`, 3000, "attack command");
  await tab.evaluate(`document.querySelector('#hCmds .h-cmd.go').click()`);
  await waitFor(tab, `!!document.querySelector('#hCmds .h-cmd.fix')`, 5000, "defender command");
  await tab.evaluate(`document.querySelector('#hCmds .h-cmd.fix').click()`);
  await waitFor(tab, `document.getElementById('hEndSlot').classList.contains('broken')`, 5000, "chain broken");
  return tab.evaluate(`({
    links: document.getElementById('hCount').textContent,
    last: [...document.querySelectorAll('#hOut p')].pop().textContent,
    twist: !document.getElementById('hFoot').hidden
  })`);
}

async function main() {
  const port = 9333 + Math.floor(Math.random() * 1000);
  const proc = await launch(port);
  try {
    const tab = await openTab(port);
    const errors = [];
    const external = [];
    await tab.send("Runtime.enable");
    await tab.send("Network.enable");
    tab.ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || "exception");
      if (m.method === "Network.requestWillBeSent") {
        const u = m.params.request.url;
        if (!/^(file|data|about|blob):/.test(u)) external.push(u);
      }
    });
    await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await tab.navigate(FILE_URL);

    console.log("\n[1] home loads with the terminal and guide");
    check(await tab.evaluate(`document.querySelectorAll('#hCmds .h-cmd').length === 6`), "Sue's 6 commands are shown");
    check(await tab.evaluate(`document.querySelectorAll('#gSteps .g-step').length === 4`), "home guide has 4 steps");
    check(await tab.evaluate(`document.querySelector('#gSteps .g-step[aria-current=step]').textContent.includes('Play the attacker')`), "step 1 is current at the top");
    check(await tab.evaluate(`document.fonts.check('italic 600 24px Fraunces')`), "bundled Fraunces font loads");
    check(await tab.evaluate(`[...document.querySelectorAll('[data-count]')].every(e => /^\\d+ habits?$/.test(e.textContent) && !e.textContent.startsWith('0'))`), "map counts come from the habit data");

    console.log("\n[2] all three targets play to a broken chain");
    for (const key of ["sue", "justin", "simone"]) {
      const r = await playTarget(tab, key);
      check(r.links === "4 of 4 links" && /BLOCKED/.test(r.last) && r.twist, `${key}: 4 links, attack, then blocked (last line: "${r.last}")`);
    }
    await tab.evaluate(`document.querySelector('.h-pick[data-p="sue"]').click()`);
    await tab.evaluate(`document.querySelectorAll('#hCmds .h-cmd')[0].click()`);
    await tab.evaluate(`document.querySelector('.h-pick[data-p="justin"]').click()`);
    await sleep(800);
    check(await tab.evaluate(`document.getElementById('hCount').textContent === '0 of 4 links' && document.querySelectorAll('#hOut p').length === 3`), "switching target mid-command resets cleanly");

    console.log("\n[3] glossary and map");
    await tab.evaluate(`document.querySelector('.gl[data-term="2fa"]').click()`);
    check(await tab.evaluate(`!document.querySelector('.gl-pop').hidden && document.querySelector('.gl-pop').textContent.startsWith('2FA')`), "2FA definition opens");
    await tab.evaluate(`document.body.click()`);
    check(await tab.evaluate(`document.querySelector('.gl-pop').hidden`), "clicking elsewhere closes it");
    await tab.evaluate(`document.querySelector('.h-district[data-d="credential"]').dispatchEvent(new MouseEvent('click', {bubbles: true}))`);
    check(await tab.evaluate(`document.getElementById('hMapInfo').textContent.includes('Your passwords')`), "map area click shows its habits");

    console.log("\n[4] guide follows scrolling and page changes");
    await tab.evaluate(`document.querySelector('[data-gjump="hMap"]').click()`);
    await sleep(1200);
    check(await tab.evaluate(`document.querySelector('#gSteps .g-step[aria-current=step]').textContent.includes("Where you're exposed")`), "scrolling to the map lights step 3");
    check(await tab.evaluate(`document.querySelector('.topbar').classList.contains('compact')`), "header goes compact after scrolling");
    const headerOk = await tab.evaluate(`(() => { const h = document.querySelector('.topbar').getBoundingClientRect().bottom; return document.getElementById('hMap').getBoundingClientRect().top >= h - 2; })()`);
    check(headerOk, "jumped-to section is not hidden under the sticky header");
    await tab.evaluate(`document.querySelector('.navlink[data-page="quick"]').click()`);
    await sleep(300);
    check(await tab.evaluate(`document.getElementById('gPage').textContent.startsWith('Quick check:') && document.querySelectorAll('#gSteps .g-step').length === 3`), "quick check guide replaces the home guide");
    for (let i = 0; i < 6; i++) await tab.evaluate(`document.querySelector('#pageQuick .yn [data-a="yes"]').click(); document.getElementById('qNext').click();`);
    await sleep(300);
    check(await tab.evaluate(`document.querySelector('#gSteps .g-step[aria-current=step]').textContent.includes('Your dominoes')`), "showing the result moves the quick guide to step 2");
    check(await tab.evaluate(`!/12 more/.test(document.body.textContent)`), "no stale '12 more habits' copy");
    await tab.evaluate(`document.querySelector('.navlink[data-page="full"]').click()`);
    await sleep(300);
    check(await tab.evaluate(`document.getElementById('gPage').textContent.startsWith('Full assessment:')`), "full assessment guide text shows");
    await tab.evaluate(`document.querySelector('#gSteps .g-toggle').click()`);
    check(await tab.evaluate(`document.getElementById('gGuide').classList.contains('collapsed') && !document.getElementById('gShow').offsetParent === false`), "guide can be hidden and offers Show again");
    await tab.evaluate(`document.getElementById('gShow').click()`);

    console.log("\n[5] phone width and privacy");
    await tab.evaluate(`document.querySelector('.navlink[data-page="home"]').click()`);
    await tab.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(400);
    check(await tab.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), "no sideways scroll at 390px");
    check(external.length === 0, `no third-party network requests (${external.length ? external.join(", ") : "none"})`);
    check(errors.length === 0, `no script errors (${errors.length ? errors.join(" | ") : "none"})`);
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
