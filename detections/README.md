# Detection Pack

Chain Reaction shows how everyday habits link into an attack, and the one change that breaks the chain. The Detection Pack adds the third view: **if this chain hit a work account, how would a security team catch it?**

Each rule is a [Sigma](https://sigmahq.io/) detection, a vendor-neutral format that converts to Microsoft Sentinel (KQL), Splunk (SPL) and other SIEMs. Each rule is tied to the chain steps it would catch and tested against sample logs on every change.

> Personal email accounts don't give their owners these logs. Companies running Microsoft Entra ID and Exchange Online do. That's also why the site's fixes matter: at home, nobody is watching for you.

## Rules

| Code | Detects | ATT&CK | Log | Kind |
|---|---|---|---|---|
| CR-001 | A sign-in that succeeds with a password alone, from a device the tenant has never registered | T1078.004 | SigninLogs | Single event |
| CR-002 | Five or more wrong passwords on one account in ten minutes, then a successful sign-in within thirty | T1110.004 | SigninLogs | Correlation |
| CR-006 | A new or changed inbox rule that deletes, hides or marks as read mail about security, passwords or sign-ins | T1564.008 | OfficeActivity | Single event |

The chain steps each rule covers live in the rule itself, in its `chainreaction` block. [`coverage.json`](coverage.json) is generated from those blocks, so the site and the rules can't disagree.

## How it's tested

Every push runs [`.github/workflows/detections.yml`](../.github/workflows/detections.yml):

1. **Validation.** `sigma check` runs every SigmaHQ validator and fails on any issue. The few exceptions are per rule, each with its reason, in [`sigma-check.yml`](sigma-check.yml).
2. **Behaviour.** [`test_detections.py`](test_detections.py) converts each rule with pySigma's SQLite backend and runs it against two sample files in `samples/<code>/`:
   - `attack.ndjson`: every event (or, for a correlation, every account) must alert.
   - `normal.ndjson`: nothing may alert. Each event is a near miss chosen to break one specific part of the rule, such as four typos instead of five, a success before the failures, or a rule removed rather than created.
3. **Real field names.** Every field a rule or sample uses must exist in Microsoft's published schema for its Sentinel table (from the pySigma Azure Monitor pipeline), and `DeviceDetail` sub-fields must match Microsoft Graph's [deviceDetail](https://learn.microsoft.com/en-us/graph/api/resources/devicedetail).
4. **Links.** Every chain step a rule claims must exist in the site's `data.js`.
5. **Queries.** KQL (with the [Sentinel pipeline](sentinel-pipeline.yml)) and SPL are built and uploaded as a CI artifact.

Each test was checked by deliberately breaking each rule (removing a condition, lowering a threshold, widening a window, dropping the ordering). The tests caught every break except one that removes a redundant signal, which is expected.

Run it locally:

```
pip install -r detections/requirements.txt
sigma check --fail-on-issues --validation-config detections/sigma-check.yml detections/rules
python detections/test_detections.py --build build/queries
```

## Limits, stated plainly

- **Sample logs are synthetic.** They follow Microsoft's documented schemas and the shape of Microsoft's own [sample inbox-rule telemetry](https://github.com/Azure/Azure-Sentinel/tree/master/Solutions/Training/Azure-Sentinel-Training-Lab/Artifacts/Telemetry). They are not exports from a real tenant, and the KQL has not been run in a live Sentinel workspace.
- **CR-002 has no KQL or SPL yet.** pySigma's Kusto backend doesn't support correlation rules, and its Splunk backend doesn't support ordered ones. The rule is fully tested in SQLite. The build output records the gap rather than shipping a hand-written query nobody tested.
- **CR-001** relies on `DeviceDetail.trustType` being empty for unregistered devices. It's a signal for review, not proof of compromise: people who aren't enrolled in MFA yet trip it too, which is the gap it exists to show.
- **CR-006** reads `New-InboxRule` and `Set-InboxRule`. Rules made in Outlook desktop are logged as `UpdateInboxRules` with a different shape and aren't covered yet.
- **Some steps leave no log at all.** Reading a public profile, a lookalike website or a SIM swap at a carrier happen outside any company's systems. The coverage map will say so for each one.

## Related work

CR-001 is close to SigmaHQ's [Suspicious SignIns From A Non Registered Device](https://github.com/SigmaHQ/sigma/blob/master/rules/cloud/azure/signin_logs/azure_ad_risky_sign_ins_with_singlefactorauth_from_unknown_devices.yml) and is marked `related: similar`. That rule also requires Identity Protection to have flagged the sign-in as at risk; CR-001 alerts without that, because a reused password typed correctly often looks normal to risk scoring. CR-006 follows the idea of Microsoft Sentinel's [Malicious Inbox Rule](https://github.com/Azure/Azure-Sentinel/blob/master/Solutions/Microsoft%20365/Analytic%20Rules/Malicious_Inbox_Rule.yaml), extended to rules that move mail out of sight or mark it as read.

© 2026 Radha Prabhakaran. All rights reserved. See [LICENSE](../LICENSE).
