"use strict";
// Rules engine and content checks. No browser needed. Run: node tests/test-engine.js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const load = (f) => fs.readFileSync(path.join(root, f), "utf8");
const C = new Function(
  load("data.js") + "\n" + load("engine.js") +
  ";return {HABITS, CHAINS, QUICK_CHECK, DAY_MOMENTS, ATTACK_TECHNIQUES, DEFENDER_VIEW, FIX_ACTIONS, FIX_MINUTES, FIX_GUIDES, GUIDES, RECOVERY, ATTACK_CATALOG, HABIT_ATTACK, STEP_ATTACK, STEP_DEFEND, E: globalThis.CREngine};"
)();

let failures = 0;
function check(cond, msg) {
  console.log((cond ? "  ok   - " : "  FAIL - ") + msg);
  if (!cond) failures++;
}

console.log("\n[1] chain data");
const lastStepWeakest = C.CHAINS.filter((c) => c.weakestLinkStepIndex >= c.steps.length - 1).map((c) => c.id);
check(lastStepWeakest.length === 0, `no chain ends on its weakest link (${lastStepWeakest.join(", ") || "none"})`);
const badStepHabits = C.CHAINS.filter((c) => c.stepHabits && c.stepHabits.length !== c.steps.length).map((c) => c.id);
check(badStepHabits.length === 0, `stepHabits lines up with steps (${badStepHabits.join(", ") || "none"})`);

console.log("\n[2] content covers every habit");
const ids = C.HABITS.map((h) => h.id);
for (const [name, map] of Object.entries({ ATTACK_TECHNIQUES: C.ATTACK_TECHNIQUES, DEFENDER_VIEW: C.DEFENDER_VIEW, FIX_ACTIONS: C.FIX_ACTIONS, FIX_MINUTES: C.FIX_MINUTES, FIX_GUIDES: C.FIX_GUIDES })) {
  const missing = ids.filter((id) => !(id in map));
  check(missing.length === 0, `${name} has every habit (${missing.join(", ") || "none missing"})`);
}
const badIds = Object.values(C.ATTACK_TECHNIQUES).filter((a) => a && !/^T\d{4}(\.\d{3})?$/.test(a[0]));
check(badIds.length === 0, "every ATT&CK id is well formed");
check(Object.values(C.FIX_GUIDES).every((g) => C.GUIDES[g]), "every fix points at a guide that exists");
check(C.DAY_MOMENTS.map((m) => m.id).sort().join() === C.QUICK_CHECK.map((q) => q.habitId).sort().join(), "day moments use exactly the quick-check habits");

console.log("\n[3] MITRE ATT&CK on every step");
const catIds = Object.keys(C.ATTACK_CATALOG);
check(catIds.every((id) => /^T\d{4}(\.\d{3})?$/.test(id) && C.ATTACK_CATALOG[id].length === 3), "catalog entries are well formed [name, tactics, tactic used]");
check(catIds.every((id) => C.ATTACK_CATALOG[id][1].split(", ").includes(C.ATTACK_CATALOG[id][2])), "the tactic used is one ATT&CK lists for that technique");
check(!catIds.includes("T1656"), "T1656 is gone (ATT&CK v20 moved Impersonation to T1684.001)");
const used = new Set();
const unknown = [];
C.CHAINS.forEach((c) => (C.STEP_ATTACK[c.id] || []).forEach((t, i) => {
  if (typeof t === "string") { used.add(t); if (!C.ATTACK_CATALOG[t]) unknown.push(c.id + ":" + i + " " + t); }
}));
Object.values(C.HABIT_ATTACK).forEach((t) => { if (t) { used.add(t); if (!C.ATTACK_CATALOG[t]) unknown.push("habit " + t); } });
check(unknown.length === 0, `every technique used is in the verified catalog (${unknown.join(", ") || "all known"})`);
const lenOff = C.CHAINS.filter((c) => !C.STEP_ATTACK[c.id] || C.STEP_ATTACK[c.id].length !== c.steps.length || !C.STEP_DEFEND[c.id] || C.STEP_DEFEND[c.id].length !== c.steps.length).map((c) => c.id);
check(lenOff.length === 0, `every named chain maps every step (${lenOff.join(", ") || "all 15"})`);
const everyPath = C.E.buildPaths(new Set(C.HABITS.map((h) => h.id)));
const blank = [];
everyPath.forEach((p) => p.steps.forEach((_, i) => {
  const t = p.stepTech[i];
  if (!t || (t.gap ? t.gap.length < 20 : !t.id)) blank.push(p.id + ":" + i + " technique");
  if (!p.stepDefend[i]) blank.push(p.id + ":" + i + " defender");
}));
check(blank.length === 0, `all ${everyPath.length} possible paths: every step has a technique or a stated reason, and a defender note (${blank.slice(0, 5).join(", ") || "none blank"})`);
const gaps = everyPath.flatMap((p) => p.stepTech.filter((t) => t.gap));
check(gaps.length / everyPath.reduce((n, p) => n + p.steps.length, 0) < 0.1, `honest gaps stay rare (${gaps.length} steps)`);
check(everyPath.every((p) => p.tactics.length > 0 && p.tactics.every((t, i) => t !== p.tactics[i - 1])), "each path has a tactic strip with no repeats in a row");

console.log("\n[4] no promotion, only allowed sources");
const advice = C.HABITS.map((h) => h.fixAdvice).join(" ");
check(!/Bitwarden|1Password|LastPass|Dashlane|NordVPN|Authy/i.test(advice), "no product brand names in fix advice");
const allowed = /^https:\/\/(www\.)?(cisa\.gov|consumer\.ftc\.gov|ftc\.gov|reportfraud\.ftc\.gov|identitytheft\.gov|ic3\.gov|fcc\.gov|haveibeenpwned\.com|staysafeonline\.org|techsafety\.org)\//;
const urls = Object.values(C.GUIDES).map((g) => g[2]).concat(C.RECOVERY.flatMap((r) => r.links.map((l) => l[1])));
const odd = urls.filter((u) => !allowed.test(u));
check(odd.length === 0, `every guide and recovery link is an approved https source (${odd.join(", ") || "all approved"})`);

console.log("\n[5] engine");
const job = new Set(["public_employer", "active_job_search", "public_email", "no_email_2fa", "password_reuse"]);
const jobPaths = C.E.buildPaths(job);
check(jobPaths.length === 1 && jobPaths[0].id === "fake_recruiter_chain", `job seeker forms the fake recruiter chain (${jobPaths.map((p) => p.id).join(", ")})`);
const jobPlan = C.E.plan(job);
check(jobPlan.left === 0 && jobPlan.steps.length === 1, `one change closes every job-seeker path (${jobPlan.steps.map((s) => s.id).join(", ")})`);
const student = new Set(["public_wifi", "password_reuse", "auto_login_public", "browser_only_passwords", "overshare_social"]);
const iv = C.E.interventions(student);
check(iv.list.every((x) => x.removed > 0 && x.removed <= iv.base && x.after === iv.base - x.removed), "intervention counts are consistent");
const sp = C.E.plan(student);
check(sp.steps.every((s, i) => i === 0 || s.openBefore <= sp.steps[i - 1].openBefore), "plan only counts paths still open after earlier fixes");
check(C.E.buildPaths(new Set(["share_location", "smart_lock_email"])).length === 0, "signals alone form no path");
check(JSON.stringify(C.E.buildPaths(student)) === JSON.stringify(C.E.buildPaths(new Set([...student].reverse()))), "same habits in any order give the same paths");

console.log(failures ? `\n${failures} failure(s)` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
