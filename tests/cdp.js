// Minimal CDP driver, no puppeteer. Launches headless Chrome, exposes
// navigate + evaluate helpers over the raw CDP WebSocket protocol.
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

function findChrome() {
  for (const p of CHROME_PATHS) if (p && fs.existsSync(p)) return p;
  throw new Error("Chrome not found; set CHROME_PATH to your Chrome or Chromium binary");
}

async function launch(port) {
  const chrome = findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-profile-"));
  const proc = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  // wait for devtools to be ready
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) break;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return proc;
}

class Tab {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async navigate(url) {
    await this.send("Page.enable");
    await this.send("Page.navigate", { url });
    // poll for load via Runtime evaluate on document.readyState
    for (let i = 0; i < 100; i++) {
      const r = await this.send("Runtime.evaluate", { expression: "document.readyState" });
      if (r.result && r.result.value === "complete") break;
      await new Promise((res) => setTimeout(res, 100));
    }
    // settle for any async render/JS init
    await new Promise((res) => setTimeout(res, 400));
  }
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  }
}

async function openTab(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const info = await res.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return new Tab(ws);
}

module.exports = { launch, openTab };
