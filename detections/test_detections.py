# © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
"""Detection Pack tests.

Every rule in detections/rules is converted with pySigma's SQLite backend and run against its
sample logs in detections/samples/<code>/:

  attack.ndjson   every event (or, for a correlation, every account) must alert
  normal.ndjson   nothing may alert

It also checks that every field a rule or sample uses exists in the real Microsoft Sentinel
table, and that coverage.json, which the site reads, matches the rules.

  python detections/test_detections.py            run the tests
  python detections/test_detections.py --write    also regenerate coverage.json
  python detections/test_detections.py --build D  also write KQL and SPL for each rule into D
"""
import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

from sigma.backends.kusto import KustoBackend
from sigma.backends.splunk import SplunkBackend
from sigma.backends.sqlite import sqliteBackend
from sigma.collection import SigmaCollection
from sigma.correlations import SigmaCorrelationRule
from sigma.pipelines.azuremonitor.tables import AZURE_MONITOR_TABLES
from sigma.processing.pipeline import ProcessingPipeline
from sigma.rule import SigmaDetection

HERE = Path(__file__).resolve().parent
RULES = HERE / "rules"
SAMPLES = HERE / "samples"
COVERAGE = HERE / "coverage.json"

# Which Sentinel table holds each Sigma log source.
TABLES = {("azure", "signinlogs"): "SigninLogs", ("m365", "exchange"): "OfficeActivity"}
# Sub-fields of SigninLogs.DeviceDetail, from https://learn.microsoft.com/en-us/graph/api/resources/devicedetail
DEVICE_DETAIL = {"browser", "deviceId", "displayName", "isCompliant", "isManaged", "operatingSystem", "trustType"}

failures = 0


def check(cond, msg):
    global failures
    print(("  ok   - " if cond else "  FAIL - ") + msg)
    if not cond:
        failures += 1


def flatten(obj, prefix=""):
    """Flatten nested JSON to dotted columns, the way Zircolite builds its table."""
    out = {}
    for key, val in obj.items():
        name = prefix + key
        if isinstance(val, dict):
            out.update(flatten(val, name + "."))
        elif isinstance(val, bool):
            out[name] = "true" if val else "false"
        elif isinstance(val, list):
            out[name] = json.dumps(val)
        else:
            out[name] = val
    return out


def load_db(events, fields=()):
    """A table holding the events. `fields` adds columns a log may leave out, so they read as NULL."""
    rows = [flatten(e) for e in events]
    cols = sorted({c for r in rows for c in r} | set(fields))
    db = sqlite3.connect(":memory:")
    # Sigma compares strings case-insensitively, so every column is NOCASE.
    db.execute("CREATE TABLE logs (" + ", ".join(f'"{c}" COLLATE NOCASE' for c in cols) + ")")
    for r in rows:
        db.execute(f"INSERT INTO logs ({', '.join(chr(34) + c + chr(34) for c in r)}) VALUES ({', '.join('?' * len(r))})", list(r.values()))
    return db


def read_events(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def detection_fields(detection):
    for item in detection.detection_items:
        if isinstance(item, SigmaDetection):
            yield from detection_fields(item)
        elif item.field:
            yield item.field


def rule_fields(rule):
    if isinstance(rule, SigmaCorrelationRule):
        yield from rule.group_by or []
        for ref in rule.rules:
            yield from rule_fields(ref.rule)
    else:
        for det in rule.detection.detections.values():
            yield from detection_fields(det)


def logsource_of(rule):
    if isinstance(rule, SigmaCorrelationRule):
        return logsource_of(rule.rules[0].rule)
    return rule.logsource


def field_known(table, field):
    top, _, sub = field.partition(".")
    if top not in AZURE_MONITOR_TABLES[table]:
        return False
    return not sub or (top == "DeviceDetail" and sub in DEVICE_DETAIL)


def main_rule(collection):
    tagged = [r for r in collection.rules if "chainreaction" in (r.custom_attributes or {})]
    return tagged[0] if len(tagged) == 1 else None


def techniques(rule):
    return sorted(f"T{t.name[1:].upper()}" for t in rule.tags if t.namespace == "attack" and re.fullmatch(r"t\d{4}(\.\d{3})?", t.name))


def run_rule(path, chains, build_dir):
    collection = SigmaCollection.from_yaml(path.read_text(encoding="utf-8"))
    main = main_rule(collection)
    check(main is not None, f"{path.name}: exactly one rule carries the chainreaction block")
    if main is None:
        return None
    meta = main.custom_attributes["chainreaction"]
    code = meta["code"]
    print(f"\n[{code}] {main.title}")

    table = TABLES.get((logsource_of(main).product, logsource_of(main).service))
    check(table is not None, f"log source maps to a Sentinel table ({table})")
    unknown = sorted({f for f in rule_fields(main) if table and not field_known(table, f)})
    check(not unknown, f"every rule field exists in {table} ({', '.join(unknown) or 'all documented'})")

    attack = read_events(SAMPLES / code / "attack.ndjson")
    normal = read_events(SAMPLES / code / "normal.ndjson")
    sample_fields = sorted({k.split(".")[0] for e in attack + normal for k in flatten(e)} - set(AZURE_MONITOR_TABLES.get(table, {})))
    check(not sample_fields, f"every sample field exists in {table} ({', '.join(sample_fields) or 'all documented'})")

    queries = sqliteBackend(timestamp_field="TimeGenerated").convert(collection)
    check(len(queries) == 1, f"converts to one SQLite query ({len(queries)})")
    query = queries[0]
    fields = set(rule_fields(main))

    if isinstance(main, SigmaCorrelationRule):
        key = main.group_by[0]

        def alerted(events):
            rows = load_db(events, fields).execute(query).fetchall()
            return sorted({json.loads(r[1])[key].lower() for r in rows})

        want = sorted({e[key].lower() for e in attack})
        got = alerted(attack)
        check(got == want, f"alerts for every account in attack.ndjson ({', '.join(got) or 'none'})")
        got = alerted(normal)
        check(not got, f"no alert on normal.ndjson ({', '.join(got) or 'none'}, {len(normal)} events)")
    else:
        hits = [len(load_db([e], fields).execute(query).fetchall()) for e in attack]
        check(all(hits), f"every attack event alerts ({sum(1 for h in hits if h)}/{len(hits)})")
        hits = [len(load_db([e], fields).execute(query).fetchall()) for e in normal]
        check(not any(hits), f"no normal event alerts ({sum(1 for h in hits if h)}/{len(hits)})")

    steps = []
    for s in meta["steps"]:
        chain, _, idx = s.partition(":")
        steps.append({"chain": chain, "step": int(idx)})
    bad = [f"{s['chain']}:{s['step']}" for s in steps if chains is not None and (s["chain"] not in chains or s["step"] >= chains[s["chain"]])]
    if chains is not None:
        check(not bad, f"every linked chain step exists ({', '.join(bad) or len(steps)} steps)")

    if build_dir:
        build(collection, code, build_dir)

    return {
        "code": code,
        "title": main.title,
        "catches": meta["catches"],
        "sigma_id": str(main.id),
        "level": main.level.name.lower() if main.level else None,
        "techniques": techniques(main),
        "table": table,
        "kind": "correlation" if isinstance(main, SigmaCorrelationRule) else "single event",
        "file": "detections/rules/" + path.name,
        "steps": steps,
    }


def build(collection, code, out):
    out.mkdir(parents=True, exist_ok=True)
    sentinel = ProcessingPipeline.from_yaml((HERE / "sentinel-pipeline.yml").read_text(encoding="utf-8"))
    for ext, make in (("kql", lambda: KustoBackend(sentinel)), ("spl", lambda: SplunkBackend())):
        try:
            text = "\n\n".join(make().convert(collection))
        except Exception as err:  # the backend says what it can't express; record that honestly
            text = f"// Not generated: {err}"
        (out / f"{code}.{ext}").write_text(text + "\n", encoding="utf-8")


def chain_lengths():
    """Chain step counts from data.js, so a rule can't point at a step that doesn't exist."""
    data = (HERE.parent / "data.js").read_text(encoding="utf-8")
    m = re.search(r"const STEP_ATTACK = \{(.*?)\n\};", data, re.S)
    if not m:
        return None
    lengths = {}
    for line in m.group(1).splitlines():
        mm = re.match(r"\s*(\w+): \[(.*)\],?\s*$", line)
        if mm:
            lengths[mm.group(1)] = len(re.findall(r'"T\d{4}(?:\.\d{3})?"|\{ gap:', mm.group(2)))
    return lengths


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="regenerate coverage.json")
    ap.add_argument("--build", type=Path, help="write KQL and SPL here")
    args = ap.parse_args()

    chains = chain_lengths()
    check(bool(chains), f"read chain steps from data.js ({len(chains or {})} chains)")
    entries = [e for e in (run_rule(p, chains, args.build) for p in sorted(RULES.glob("*.yml"))) if e]
    entries.sort(key=lambda e: e["code"])

    print("\n[coverage]")
    codes = [e["code"] for e in entries]
    check(len(codes) == len(set(codes)), f"rule codes are unique ({', '.join(codes)})")
    text = json.dumps({"generated_by": "detections/test_detections.py --write", "rules": entries}, indent=2) + "\n"
    if args.write:
        COVERAGE.write_text(text, encoding="utf-8", newline="\n")
        print("  wrote coverage.json")
    check(COVERAGE.exists() and COVERAGE.read_text(encoding="utf-8") == text, "coverage.json matches the rules (run with --write after changing a rule)")

    print(f"\n{failures} failure(s)" if failures else "\nAll detection checks passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
