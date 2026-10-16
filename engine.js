// ChainReaction: the rules engine. Pure functions over the content in data.js,
// shared by every page so the Quick check and Full assessment always agree.
// No DOM, no storage, no network.

(function (root) {
  "use strict";

  function habit(id) {
    return HABITS.find((h) => h.id === id);
  }

  // Sum of per-habit weights on a path, capped at 10.
  function severity(ids) {
    const breakdown = ids.map((id) => ({ id, label: habit(id) ? habit(id).shortName : id, weight: SEVERITY_WEIGHTS[id] || 0 }));
    return { score: Math.min(10, breakdown.reduce((s, b) => s + b.weight, 0)), breakdown };
  }

  // Every attack path the selection forms: hand-authored chains whose habits are
  // all present, plus entry x weakness pairs no named chain already covers.
  function buildPaths(selected) {
    const sel = selected instanceof Set ? selected : new Set(selected);
    const paths = [];
    CHAINS.forEach((c) => {
      if (!c.requiredHabits.every((h) => sel.has(h))) return;
      paths.push({
        id: c.id, kind: "named", name: c.name, steps: c.steps, stepHabits: c.stepHabits || [],
        weakestLink: c.weakestLink, objective: c.objective || "Account compromise", realWorld: c.realWorld, habits: c.requiredHabits.slice(),
      });
    });
    const entries = HABITS.filter((h) => h.role === "entry" && sel.has(h.id));
    const weaknesses = HABITS.filter((h) => h.role === "weakness" && sel.has(h.id));
    const signal = HABITS.find((h) => h.role === "signal" && sel.has(h.id));
    entries.forEach((e) => weaknesses.forEach((w) => {
      if (paths.some((p) => p.kind === "named" && p.habits.includes(e.id) && p.habits.includes(w.id))) return;
      const steps = [e.entryStep, e.entryConsequence, w.weaknessStep];
      const stepHabits = [e.id, null, w.id];
      const habits = [e.id, w.id];
      if (signal) { steps.push(signal.signalStep, signal.finalImpact); stepHabits.push(signal.id, null); habits.push(signal.id); }
      else { steps.push(GENERIC_FINAL_IMPACT); stepHabits.push(null); }
      paths.push({
        id: "gen_" + e.id + "_" + w.id, kind: "generated",
        name: e.shortName + " → " + w.shortName + (signal ? " → " + signal.shortName : ""),
        steps, stepHabits, weakestLink: w.id, objective: signal ? signal.shortName + " exposure" : "Account takeover", habits,
      });
    }));
    paths.forEach((p) => (p.severity = severity(p.habits)));
    return paths.sort((a, b) => b.severity.score - a.severity.score);
  }

  // For each selected habit: how many paths stop matching if it goes.
  function interventions(selected) {
    const sel = new Set(selected);
    const base = buildPaths(sel).length;
    const list = [];
    sel.forEach((id) => {
      const reduced = new Set(sel);
      reduced.delete(id);
      const after = buildPaths(reduced).length;
      if (base - after > 0) list.push({ id, removed: base - after, after });
    });
    list.sort((a, b) => b.removed - a.removed || habit(a.id).label.localeCompare(habit(b.id).label));
    return { base, list };
  }

  // The fewest changes (up to three) that close the most paths, counting only
  // what is still open after each earlier change.
  function plan(selected) {
    const cur = new Set(selected);
    const steps = [];
    while (steps.length < 3) {
      const now = interventions(cur);
      if (!now.list.length || now.base === 0) break;
      const pick = now.list[0];
      steps.push({ id: pick.id, removed: pick.removed, openBefore: now.base });
      cur.delete(pick.id);
    }
    return { steps, left: buildPaths(cur).length };
  }

  root.CREngine = { habit, severity, buildPaths, interventions, plan };
})(typeof window !== "undefined" ? window : globalThis);
