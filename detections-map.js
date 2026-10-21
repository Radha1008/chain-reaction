// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// Chain Reaction: which Detection Pack rules catch which chain steps.
// Generated from detections/coverage.json (steps are 0-based, like data.js);
// tests/test-engine.js fails if this ever drifts from that file.
const DETECTION_RULES = [
  {
    "code": "CR-001",
    "title": "Password-Only Sign-In Succeeds From An Unregistered Device",
    "catches": "A password that works on its own, typed on a device the company has never seen.",
    "level": "medium",
    "techniques": [
      "T1078.004"
    ],
    "file": "detections/rules/azure_signin_password_only_unregistered_device.yml",
    "steps": [
      {
        "chain": "fake_recruiter_chain",
        "step": 5
      },
      {
        "chain": "overshared_workspace",
        "step": 4
      },
      {
        "chain": "breach_dump_lookup",
        "step": 4
      },
      {
        "chain": "wifi_cafe_takeover",
        "step": 4
      },
      {
        "chain": "recovery_email_chain",
        "step": 2
      }
    ]
  },
  {
    "code": "CR-002",
    "title": "Burst Of Wrong Passwords Followed By A Successful Sign-In",
    "catches": "Several wrong passwords on one account, then the right one.",
    "level": "high",
    "techniques": [
      "T1110.004"
    ],
    "file": "detections/rules/correlation_azure_signin_password_burst_then_success.yml",
    "steps": [
      {
        "chain": "breach_dump_lookup",
        "step": 3
      },
      {
        "chain": "wifi_cafe_takeover",
        "step": 3
      },
      {
        "chain": "qr_code_trap",
        "step": 4
      }
    ]
  },
  {
    "code": "CR-006",
    "title": "Inbox Rule Hides Or Deletes Security Emails",
    "catches": "A mail rule that quietly bins the warnings meant for the owner.",
    "level": "high",
    "techniques": [
      "T1564.008"
    ],
    "file": "detections/rules/microsoft365_exchange_inbox_rule_hides_security_mail.yml",
    "steps": [
      {
        "chain": "recovery_email_chain",
        "step": 4
      },
      {
        "chain": "forgotten_account_cascade",
        "step": 3
      }
    ]
  }
];
