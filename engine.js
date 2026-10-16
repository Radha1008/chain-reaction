// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
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

  // One step's ATT&CK entry: a technique from the catalog or a { gap } reason.
  function tech(t) {
    if (!t) return null;
    if (typeof t !== "string") return { gap: t.gap };
    const c = ATTACK_CATALOG[t];
    return { id: t, name: c[0], tactics: c[1], tactic: c[2] };
  }

  // ATT&CK technique and defender note for every step of a path.
  function annotate(p, attack, defend) {
    p.stepTech = p.steps.map((_, i) => {
      if (attack[i] !== undefined) return tech(attack[i]);
      const h = p.stepHabits[i];
      return HABIT_ATTACK[h] ? tech(HABIT_ATTACK[h]) : HABIT_ATTACK_GAP[h] ? { gap: HABIT_ATTACK_GAP[h] } : null;
    });
    p.stepDefend = p.steps.map((_, i) => (defend[i] != null ? defend[i] : DEFENDER_VIEW[p.stepHabits[i]] || null));
    // the path through ATT&CK tactics, in step order, without repeats in a row
    p.tactics = p.stepTech.filter((t) => t && t.tactic).map((t) => t.tactic).filter((t, i, a) => t !== a[i - 1]);
    return p;
  }

  // Every attack path the selection forms: hand-authored chains whose habits are
  // all present, plus entry x weakness pairs no named chain already covers.
  function buildPaths(selected) {
    const sel = selected instanceof Set ? selected : new Set(selected);
    const paths = [];
    CHAINS.forEach((c) => {
      if (!c.requiredHabits.every((h) => sel.has(h))) return;
      paths.push(annotate({
        id: c.id, kind: "named", name: c.name, steps: c.steps, stepHabits: c.stepHabits || [],
        weakestLink: c.weakestLink, objective: c.objective || "Account compromise", realWorld: c.realWorld, habits: c.requiredHabits.slice(),
      }, STEP_ATTACK[c.id] || [], STEP_DEFEND[c.id] || []));
    });
    const entries = HABITS.filter((h) => h.role === "entry" && sel.has(h.id));
    const weaknesses = HABITS.filter((h) => h.role === "weakness" && sel.has(h.id));
    const signal = HABITS.find((h) => h.role === "signal" && sel.has(h.id));
    entries.forEach((e) => weaknesses.forEach((w) => {
      if (paths.some((p) => p.kind === "named" && p.habits.includes(e.id) && p.habits.includes(w.id))) return;
      const steps = [e.entryStep, e.entryConsequence, w.weaknessStep];
      const stepHabits = [e.id, null, w.id];
      const habits = [e.id, w.id];
      const attack = [undefined, ENTRY_FOLLOWUP[e.id][0], undefined];
      const defend = [null, ENTRY_FOLLOWUP[e.id][1], null];
      const end = signal ? SIGNAL_IMPACT[signal.id] : GENERIC_FINAL_ATTACK;
      if (signal) { steps.push(signal.signalStep, signal.finalImpact); stepHabits.push(signal.id, null); habits.push(signal.id); attack.push(undefined); defend.push(null); }
      else { steps.push(GENERIC_FINAL_IMPACT); stepHabits.push(null); }
      attack.push(end[0]);
      defend.push(end[1]);
      paths.push(annotate({
        id: "gen_" + e.id + "_" + w.id, kind: "generated",
        name: e.shortName + " → " + w.shortName + (signal ? " → " + signal.shortName : ""),
        steps, stepHabits, weakestLink: w.id, objective: signal ? signal.shortName + " exposure" : "Account takeover", habits,
      }, attack, defend));
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

  root.CREngine = { habit, severity, tech, buildPaths, interventions, plan };
})(typeof window !== "undefined" ? window : globalThis);
