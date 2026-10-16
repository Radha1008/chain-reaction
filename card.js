// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// ChainReaction: "Save my chain" image. Draws a result as a printable
// flowchart on a canvas and hands it to the visitor as a PNG download.
// Everything happens in this tab: no upload, no third-party code, no storage.
// Only hand-authored content from data.js is drawn (never free text typed by
// the visitor), and it is drawn as canvas text, so nothing can be injected.

(function () {
  "use strict";

  // Walnut palette (the light theme), so the image prints well either way.
  const C = {
    bg: "#f4ede4", card: "#fffaf3", ink: "#2a1c14", dim: "#6a594c", line: "#ddd0bf",
    edge: "#8b7666", accent: "#8f2f22", accentSoft: "#f3e1da", safe: "#2e6b52", safeSoft: "#e2eee6", goal: "#2a1c14",
  };
  const W = 1080, PAD = 64, SANS = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';

  function wrap(ctx, text, max) {
    const words = String(text).split(/\s+/), lines = [];
    let cur = "";
    words.forEach((w) => {
      const next = cur ? cur + " " + w : w;
      if (ctx.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Lay out (measure) and paint in one routine, so heights always match.
  function layout(ctx, d, paint) {
    let y = PAD;
    const inner = W - PAD * 2;
    const text = (str, font, color, x, max, lh) => {
      ctx.font = font;
      const lines = wrap(ctx, str, max);
      if (paint) { ctx.fillStyle = color; lines.forEach((l, i) => ctx.fillText(l, x, y + lh * (i + 1) - lh * 0.28)); }
      return lines.length * lh;
    };

    // header
    y += text("CHAIN REACTION", "600 20px " + MONO, C.accent, PAD, inner, 28) + 6;
    y += text(d.title, "700 46px " + SANS, C.ink, PAD, inner, 56) + 8;
    y += text(d.sub, "400 24px " + SANS, C.dim, PAD, inner, 34) + 36;

    // flowchart of the path
    const boxX = PAD + 44, boxW = inner - 44;
    d.steps.forEach((s, i) => {
      const tone = s.goal ? "goal" : s.pull ? "pull" : s.mine ? "mine" : "move";
      const fg = tone === "goal" ? C.card : C.ink;
      ctx.font = "400 24px " + SANS;
      const body = wrap(ctx, s.text, boxW - 48 - (s.code ? 150 : 0));
      const h = 30 + 30 + body.length * 33 + (s.note ? 34 : 0) + 18;
      if (paint) {
        // step number on the rail
        ctx.fillStyle = tone === "goal" ? C.accent : tone === "pull" ? C.safe : tone === "mine" ? C.accent : C.edge;
        ctx.beginPath(); ctx.arc(PAD + 16, y + 34, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.card; ctx.font = "700 17px " + MONO; ctx.textAlign = "center";
        ctx.fillText(s.goal ? "!" : String(i + 1), PAD + 16, y + 40); ctx.textAlign = "left";
        // box
        roundRect(ctx, boxX, y, boxW, h, 14);
        ctx.fillStyle = tone === "goal" ? C.goal : tone === "pull" ? C.safeSoft : tone === "mine" ? C.accentSoft : C.card;
        ctx.fill();
        ctx.lineWidth = tone === "pull" ? 4 : 2;
        if (tone === "move") ctx.setLineDash([8, 7]);
        ctx.strokeStyle = tone === "pull" ? C.safe : tone === "mine" ? C.accent : tone === "goal" ? C.goal : C.edge;
        ctx.stroke(); ctx.setLineDash([]);
        ctx.font = "600 17px " + MONO;
        ctx.fillStyle = tone === "goal" ? "#e8a090" : tone === "pull" ? C.safe : tone === "mine" ? C.accent : C.dim;
        ctx.fillText(s.tag.toUpperCase(), boxX + 24, y + 40);
        if (s.code) {
          ctx.textAlign = "right"; ctx.fillStyle = tone === "goal" ? C.card : C.dim;
          ctx.fillText(s.code, boxX + boxW - 24, y + 40); ctx.textAlign = "left";
        }
        ctx.font = "400 24px " + SANS; ctx.fillStyle = fg;
        body.forEach((l, k) => ctx.fillText(l, boxX + 24, y + 78 + k * 33));
        if (s.note) {
          ctx.font = "600 20px " + SANS; ctx.fillStyle = C.safe;
          ctx.fillText(s.note, boxX + 24, y + 78 + body.length * 33 + 6);
        }
        // connector to the next box
        if (i < d.steps.length - 1) {
          ctx.strokeStyle = C.edge; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(PAD + 16, y + 52); ctx.lineTo(PAD + 16, y + h + 22); ctx.stroke();
          ctx.fillStyle = C.edge; ctx.beginPath();
          ctx.moveTo(PAD + 8, y + h + 12); ctx.lineTo(PAD + 24, y + h + 12); ctx.lineTo(PAD + 16, y + h + 22); ctx.fill();
        }
      }
      y += h + 22;
    });
    y += 18;

    // sections: the one thing to do, the plan, where to get help
    d.sections.forEach((sec) => {
      const top = y;
      let hh = 28;
      const measureOnly = () => {
        let t = 28;
        ctx.font = "600 18px " + MONO; t += 30;
        sec.items.forEach((it) => {
          ctx.font = "700 26px " + SANS; t += wrap(ctx, it.head, inner - 56).length * 36;
          if (it.body) { ctx.font = "400 22px " + SANS; t += wrap(ctx, it.body, inner - 56).length * 31; }
          if (it.link) { ctx.font = "400 19px " + MONO; t += wrap(ctx, it.link, inner - 56).length * 28; }
          t += 18;
        });
        return t + 10;
      };
      hh = measureOnly();
      if (paint) {
        roundRect(ctx, PAD, top, inner, hh, 16);
        ctx.fillStyle = sec.tone === "safe" ? C.safeSoft : C.card; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = sec.tone === "safe" ? C.safe : C.line; ctx.stroke();
      }
      y += 28;
      y += text(sec.title.toUpperCase(), "600 18px " + MONO, sec.tone === "safe" ? C.safe : C.accent, PAD + 28, inner - 56, 30);
      sec.items.forEach((it) => {
        y += text(it.head, "700 26px " + SANS, C.ink, PAD + 28, inner - 56, 36);
        if (it.body) y += text(it.body, "400 22px " + SANS, C.dim, PAD + 28, inner - 56, 31);
        if (it.link) y += text(it.link, "400 19px " + MONO, C.accent, PAD + 28, inner - 56, 28);
        y += 18;
      });
      y = top + hh + 24;
    });

    // footer
    if (paint) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y + 4); ctx.lineTo(W - PAD, y + 4); ctx.stroke(); }
    y += 22;
    y += text(d.footer, "400 18px " + MONO, C.dim, PAD, inner, 27);
    return y + PAD - 20;
  }

  function render(d) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const h = layout(ctx, d, false);
    const scale = 2; // crisp when zoomed or printed
    canvas.width = W * scale; canvas.height = Math.ceil(h * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, h);
    ctx.textBaseline = "alphabetic";
    layout(ctx, d, true);
    return canvas;
  }

  // Wait for the bundled fonts, draw, then offer the PNG as a download.
  function save(d, filename) {
    const ready = document.fonts && document.fonts.load
      ? Promise.all(["700 46px \"IBM Plex Sans\"", "400 24px \"IBM Plex Sans\"", "600 18px \"IBM Plex Mono\""].map((f) => document.fonts.load(f))).catch(() => {})
      : Promise.resolve();
    return ready.then(() => new Promise((resolve) => {
      const canvas = render(d);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve(canvas);
      }, "image/png");
    }));
  }

  window.CRCard = { render, save };
})();
