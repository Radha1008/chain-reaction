// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// ChainReaction: habit & attack-chain data
// This is the actual security-engineering substance of the app: every habit is
// tagged with a role in a kill chain (entry / weakness / signal), each role has
// hand-written narrative fragments, and a generic assembler (see app.js) can
// build a coherent, plausible attack chain from *any* combination that includes
// at least one entry point and one weakness, not just a fixed list of combos.
// A small set of named, hand-authored scenarios below still take priority when
// they apply, for extra narrative richness on common combinations.
//
// Each habit also carries a primaryThreat tag, used by the separate Threat
// Model view: a different lens on the same selections, surfacing which kind
// of attacker your specific combination is most relevant to.

const HABITS = [
  // --- ENTRY: how an attacker first gets a foothold ---
  {
    id: "public_wifi",
    fixAdvice: "Use a reputable VPN on any network you don't control, or tether to your phone instead. It removes the shared-network step entirely.",
    attackerView: "Traffic on this network could be observed; login attempts may be visible to others nearby.",
    label: "I connect to public wifi without a VPN",
    stage: "initial_access",
    role: "entry",
    primaryThreat: "opportunistic_scammer",
    shortName: "Public Wifi",
    entryStep: "You connect to public wifi without a VPN.",
    entryConsequence: "Anyone else on that network can intercept your unencrypted traffic, including login attempts.",
  },
  {
    id: "qr_scan",
    fixAdvice: "Preview the destination before opening. Most phone cameras show the URL first. Treat a code on a public surface the same way you'd treat a link from a stranger.",
    attackerView: "A printed code can be swapped for one pointing anywhere, with no preview before it opens.",
    label: "I scan QR codes I find in public places",
    stage: "initial_access",
    role: "entry",
    primaryThreat: "opportunistic_scammer",
    shortName: "QR Code Scan",
    entryStep: "You scan a QR code you found in public: a parking meter, a flyer, a menu.",
    entryConsequence: "It opens a cloned login page, built to look exactly like the real thing.",
  },
  {
    id: "unknown_links",
    fixAdvice: "Open nothing from an unknown number. If it claims to be a service you use, go to that app or site directly instead of through the link.",
    attackerView: "A message that gets opened confirms the number is live and the person engages.",
    label: "I click links in texts from unknown numbers",
    stage: "initial_access",
    role: "entry",
    primaryThreat: "opportunistic_scammer",
    shortName: "Unknown Links",
    entryStep: "You click a link in a text from a number you don't recognize.",
    entryConsequence: "It leads to a convincing fake page, built to harvest whatever you type into it.",
  },
  {
    id: "sideload_apps",
    fixAdvice: "Install from official stores only. If something can't be found there, that absence is itself the signal.",
    attackerView: "An app outside store review could request permissions a reviewed app would not get.",
    label: "I install apps from outside official app stores",
    stage: "initial_access",
    role: "entry",
    primaryThreat: "opportunistic_scammer",
    shortName: "Sideloaded Apps",
    entryStep: "You install an app from outside the official app store.",
    entryConsequence: "That app can request far more access to your device than a store-reviewed app would.",
  },
  {
    id: "no_verify_sender",
    fixAdvice: "Check the actual sending address, not the display name, before replying or clicking, especially on anything referencing money, credentials or urgency.",
    attackerView: "A spoofed sender name may be enough; the real address is rarely checked.",
    label: "I don't check sender addresses before replying",
    stage: "behavior",
    role: "entry",
    primaryThreat: "opportunistic_scammer",
    shortName: "Unverified Senders",
    entryStep: "You reply to an email without checking whether the sender's address is actually legitimate.",
    entryConsequence: "A spoofed sender address is often all it takes to make a phishing attempt convincing.",
  },
  {
    id: "auto_login_public",
    fixAdvice: "Sign out fully and use a private window on any machine that isn't yours, then close it when you're done.",
    attackerView: "Whoever uses that machine next may inherit any still-open session.",
    label: "I stay logged into accounts on shared or public computers",
    stage: "behavior",
    role: "entry",
    primaryThreat: "someone_who_knows_you",
    shortName: "Shared-Device Logins",
    entryStep: "You stay logged into your accounts on a shared or public computer.",
    entryConsequence: "The next person to sit down has standing access to everything you were logged into.",
  },

  // --- PUBLIC INFORMATION: what is visible before anyone interacts with you ---
  {
    id: "public_employer",
    fixAdvice: "Trim employer and role detail on profiles that don't need it, and be deliberate about which ones are indexable by search engines.",
    attackerView: "Organisation, role and seniority may be inferable, along with a likely corporate email pattern.",
    label: "My employer is visible on my public profiles",
    stage: "exposure",
    role: "signal",
    primaryThreat: "someone_who_knows_you",
    shortName: "Public Employer",
    signalStep: "Your employer, role and seniority are visible on a public profile.",
    finalImpact: "With the organisation known, a message referencing your actual team and work becomes far easier to construct.",
  },
  {
    id: "active_job_search",
    fixAdvice: "Use the recruiter-only visibility setting rather than a public 'open to work' badge. The same signal reaches recruiters without reaching everyone.",
    attackerView: "Someone actively job-hunting is measurably more likely to open an unexpected recruiter message.",
    label: "I'm job hunting, and it's publicly visible",
    stage: "exposure",
    role: "signal",
    primaryThreat: "opportunistic_scammer",
    shortName: "Visible Job Search",
    signalStep: "Your profile signals that you're open to work, so an unexpected recruiter message is expected rather than suspicious.",
    finalImpact: "A convincing recruiter approach lands on someone primed to engage with it.",
  },
  {
    id: "public_phone",
    fixAdvice: "Remove your number from public profiles and use in-app messaging for marketplace and similar contact instead.",
    attackerView: "A number tied to a name enables direct contact and can seed carrier-account attempts.",
    label: "My phone number is publicly attached to a profile",
    stage: "exposure",
    role: "signal",
    primaryThreat: "opportunistic_scammer",
    shortName: "Public Phone Number",
    signalStep: "Your phone number is publicly attached to a profile, giving a direct, unfiltered channel.",
    finalImpact: "Contact can move to a channel with no spam filtering and a much higher answer rate.",
  },
  {
    id: "shared_recovery_email",
    attackerView: "One inbox controlling recovery for many services concentrates the whole account graph.",
    label: "I use the same recovery email across most services",
    stage: "credential",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "Shared Recovery Email",
    weaknessStep: "Because one recovery address sits behind most of your accounts, reaching it reaches all of them at once.",
    fixAdvice: "Use a separate, private recovery address that isn't published anywhere and isn't used for day-to-day mail, and protect it with an authenticator app. It turns one shared key into a much smaller target.",
  },
  {
    id: "marketplace_listing",
    fixAdvice: "Photograph items against a neutral background, keep contact in-app, and arrange pickup somewhere public rather than at home.",
    attackerView: "Listing photos and pickup arrangements can narrow an area and establish a repeat contact.",
    label: "I sell things on marketplace apps under my real profile",
    stage: "exposure",
    role: "signal",
    primaryThreat: "someone_who_knows_you",
    shortName: "Marketplace Listings",
    signalStep: "Your marketplace listings carry your real name, photos taken at home, and a pickup arrangement.",
    finalImpact: "A legitimate-looking transaction becomes a reason to learn your neighbourhood and make repeated contact.",
  },
  {
    id: "dating_profile",
    fixAdvice: "Use photos that appear nowhere else, so there's nothing to match a pseudonymous profile back to.",
    attackerView: "A reused photo can be matched across platforms, linking an anonymous profile to a real identity.",
    label: "My dating profile photos also appear on my other accounts",
    stage: "exposure",
    role: "signal",
    primaryThreat: "someone_who_knows_you",
    shortName: "Reused Profile Photos",
    signalStep: "The same photo appears on your dating profile and your public accounts, letting the two be matched.",
    finalImpact: "A profile meant to be anonymous can be connected to your full name, employer and location.",
  },

  // --- WEAKNESS: what turns a foothold into real compromise ---
  {
    id: "password_reuse",
    attackerView: "One leaked credential pair could be replayed across many unrelated services.",
    label: "I reuse the same password across multiple accounts",
    stage: "credential",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "Password Reuse",
    weaknessStep: "Because you reuse that password elsewhere, whatever was just captured now unlocks other accounts too.",
    fixAdvice: "Use a password manager (several reputable ones are free) to generate and store a unique password for every account. That one change alone means a leak anywhere no longer unlocks everything else.",
  },
  {
    id: "no_email_2fa",
    attackerView: "The account that resets every other account may be protected by a password alone.",
    label: "I don't have two-factor authentication on my email",
    stage: "credential",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "No Email 2FA",
    weaknessStep: "Because your email has no two-factor authentication, a captured or guessed password is all it takes to fully take it over.",
    fixAdvice: "Turn on two-factor authentication on your email today, ideally an authenticator app or hardware key, not SMS. Your email is the recovery path for almost every other account you own, so it deserves the strongest protection you have.",
  },
  {
    id: "browser_only_passwords",
    attackerView: "Brief access to an unlocked device could expose the whole saved list.",
    label: "I only save passwords in my browser, nothing else",
    stage: "credential",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "Browser-Only Passwords",
    weaknessStep: "Because your passwords only live in your browser, a few minutes of access to your unlocked device is enough to read them straight out.",
    fixAdvice: "Move to a dedicated password manager instead of relying on browser-only storage, it syncs safely across your devices and isn't tied to whoever has physical access to this one browser session.",
  },
  {
    id: "stale_password",
    attackerView: "A years-old password is more likely to already appear in a public breach corpus.",
    label: "I haven't changed some passwords in years",
    stage: "credential",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "Stale Passwords",
    weaknessStep: "Because that password hasn't changed in years, there's a real chance it's already sitting in an old breach dump an attacker can just look up.",
    fixAdvice: "Rotate any password you haven't changed in years, starting with email, banking, and anywhere it's reused. Check it against a breach database like Have I Been Pwned first, to see if it's already exposed.",
  },
  {
    id: "sms_only_2fa",
    attackerView: "Codes delivered by text could be redirected by porting the number.",
    label: "My only 2FA backup method is SMS to my phone",
    stage: "credential",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "SMS-Only 2FA",
    weaknessStep: "Because your only backup 2FA is SMS, a SIM-swap or intercepted text is enough to bypass it entirely.",
    fixAdvice: "Add an authenticator-app or hardware-key backup instead of relying on SMS alone. SIM-swap attacks specifically target text-message codes, and they're more common than most people realize.",
  },
  {
    id: "same_pin",
    attackerView: "A PIN observed once may unlock more than the device it was typed into.",
    label: "I use the same PIN for multiple accounts or devices",
    stage: "behavior",
    role: "weakness",
    primaryThreat: "automated_credential_attacker",
    shortName: "Reused PIN",
    weaknessStep: "Because you reuse that PIN elsewhere, it now doubles as the key to whatever else you protect with it.",
    fixAdvice: "Use a different PIN for each device or account, especially anywhere that PIN also doubles as a fallback for something more sensitive, like a phone unlock code that matches a banking app PIN.",
  },
  {
    id: "default_router_password",
    attackerView: "Default admin credentials for most router models are published and searchable.",
    label: "My home wifi still uses the default router password",
    stage: "iot",
    role: "weakness",
    primaryThreat: "opportunistic_scammer",
    shortName: "Default Router Password",
    weaknessStep: "Because your home router still uses its default password, anyone within range can get onto your network and see what's on it.",
    fixAdvice: "Log into your router's admin panel and set a unique admin and wifi password. Default credentials for most router models are public knowledge, searchable in seconds by anyone who knows your brand.",
  },

  // --- SIGNAL: what tells an attacker where to aim ---
  {
    id: "share_location",
    fixAdvice: "Post travel after you're home rather than during. The content is identical; the timing is what carries the signal.",
    attackerView: "Posted dates could indicate when the home address is unoccupied.",
    label: "I post travel plans or my location publicly",
    stage: "exposure",
    role: "signal",
    primaryThreat: "someone_who_knows_you",
    shortName: "Public Travel Posts",
    signalStep: "Posting your travel plans tells an attacker exactly when your home is likely empty.",
    finalImpact: "Combined with knowing you're away, this isn't just a digital breach: it's a signal that your home is an easy physical target too.",
  },
  {
    id: "old_forgotten_account",
    fixAdvice: "Close accounts you no longer use and remove saved payment details from the ones you keep. Fewer doors is fewer doors.",
    attackerView: "A dormant account may still hold payment details and go unmonitored.",
    label: "I have an old account I forgot about, with a card saved",
    stage: "exposure",
    role: "signal",
    primaryThreat: "automated_credential_attacker",
    shortName: "Forgotten Account",
    signalStep: "You have an old account you forgot about, still holding a saved card: an easy, unmonitored target.",
    finalImpact: "They reach your saved card and whatever data was left sitting in that forgotten account.",
  },
  {
    id: "public_email",
    fixAdvice: "Use a separate public-facing address for anything listed publicly, and keep your account-recovery address private and unpublished.",
    attackerView: "A known address gives a fixed target for reset attempts and phishing.",
    label: "My email address is easy to guess or publicly listed",
    stage: "exposure",
    role: "signal",
    primaryThreat: "opportunistic_scammer",
    shortName: "Public Email",
    signalStep: "Your email address is easy to find or guess, giving an attacker a known target to aim the whole attack at.",
    finalImpact: "They now control the one account most of your other accounts trust to verify \"it's really you.\"",
  },
  {
    id: "overshare_social",
    fixAdvice: "Treat pet names, birthdays, schools and hometowns as credentials rather than small talk, and never use them as real recovery answers.",
    attackerView: "Pets, dates and schools are common security-question answers.",
    label: "I overshare personal details on social media",
    stage: "exposure",
    role: "signal",
    primaryThreat: "someone_who_knows_you",
    shortName: "Social Oversharing",
    signalStep: "Sharing personal details (birthdate, pet's name, schools) hands over exactly the answers to common security questions.",
    finalImpact: "They use those answers to walk past security questions on whatever this attack doesn't reach directly.",
  },
  {
    id: "smart_lock_email",
    fixAdvice: "Put smart-home accounts on their own address with its own strong second factor, so your main inbox isn't the key to your front door.",
    attackerView: "Control of the linked inbox could extend to the devices bound to it.",
    label: "I have a smart lock or camera app tied to my main email",
    stage: "iot",
    role: "signal",
    primaryThreat: "someone_who_knows_you",
    shortName: "Smart Lock Tied to Email",
    signalStep: "Your smart lock app is tied to that same email, so email access becomes physical-world access.",
    finalImpact: "They reach the smart lock app tied to it: a digital breach becomes a way into your physical space.",
  },
];

// Severity weights per habit (1 = minor contributor, 2 = moderate, 3 = severe),
// used to compute a CVSS-style scorecard for whatever chain actually forms,
// not a generic "risk: high" label, but a real weighted breakdown of why.
const SEVERITY_WEIGHTS = {
  // entry points: how easy this is for an attacker to exploit at scale
  public_wifi: 2, qr_scan: 2, unknown_links: 2, sideload_apps: 2,
  no_verify_sender: 2, auto_login_public: 2,
  // weaknesses: how much this amplifies a foothold into real compromise
  password_reuse: 3, no_email_2fa: 3, browser_only_passwords: 2,
  stale_password: 2, sms_only_2fa: 2, same_pin: 2, default_router_password: 1,
  // signals: how severe the resulting impact is once the attacker has a target
  share_location: 3, smart_lock_email: 3, old_forgotten_account: 1,
  public_email: 1, overshare_social: 2,
  // public-information factors
  public_employer: 2, active_job_search: 2, public_phone: 2,
  marketplace_listing: 2, dating_profile: 2,
  shared_recovery_email: 3,
};

const GENERIC_FINAL_IMPACT =
  "From there, it's a standard account takeover, and a foothold to try the same trick on whatever else you own.";

const STAGE_META = {
  initial_access: {
    label: "Initial Access",
    color: "#d9a441",
    icon: "wifi",
    blurb: "How an attacker first reaches you: wifi, links, QR codes, sideloaded apps.",
  },
  credential: {
    label: "Credential Weakness",
    color: "#c85a34",
    icon: "lock",
    blurb: "What lets a single foothold spread across your accounts.",
  },
  exposure: {
    label: "Exposure",
    color: "#a13d2d",
    icon: "eye",
    blurb: "What's visible before anyone even interacts with you.",
  },
  iot: {
    label: "IoT / Physical",
    color: "#6b8299",
    icon: "home",
    blurb: "Devices and physical access points around you.",
  },
  behavior: {
    label: "Behavior",
    color: "#8a9a7b",
    icon: "person",
    blurb: "Habits that make an approach easier to trust or overlook.",
  },
};

const THREAT_ARCHETYPES = {
  opportunistic_scammer: {
    label: "The Opportunistic Scammer",
    color: "#d9a441",
    description:
      "Casts a wide net: mass phishing, cloned QR codes, open wifi sniffing. Doesn't know who you are, just that your habits made you an easy catch.",
    realWorldNote:
      "This is high-volume, low-effort fraud: the attacker isn't targeting you personally, they're targeting anyone whose habits happen to leave the door open.",
  },
  automated_credential_attacker: {
    label: "The Automated Credential Attacker",
    color: "#c85a34",
    description:
      "A bot working through breach dumps and credential-stuffing lists at scale. Doesn't target you specifically. Targets everyone whose reused or stale credentials show up in a leak.",
    realWorldNote:
      "This runs entirely on automation: the same script trying millions of leaked username/password pairs against thousands of sites a minute, with no human ever choosing you specifically.",
  },
  someone_who_knows_you: {
    label: "Someone Who Knows You",
    color: "#a13d2d",
    description:
      "Not a stranger: an acquaintance, ex-partner, or someone with personal context. Uses what you've shared publicly and what you're connected to, not brute force.",
    realWorldNote:
      "This category is the one most personal-security advice skips entirely, because the tools it uses aren't malware: they're publicly visible information and existing trust.",
  },
};

// Six high-signal habits for the 60-second Quick Check. Deliberately spans
// entry / weakness / signal roles so a real chain can form from the answers,
// and every "yes" carries straight into the full assessment.
const QUICK_CHECK = [
  { habitId: "public_wifi", question: "Do you use public wifi without a VPN?", hint: "Cafés, airports, hotels, campus networks." },
  { habitId: "password_reuse", question: "Do you reuse a password anywhere?", hint: "Even a slight variation of the same one counts." },
  { habitId: "no_email_2fa", question: "Is your email missing two-factor authentication?", hint: "If you're not sure, it probably is." },
  { habitId: "unknown_links", question: "Do you open links from numbers you don't recognise?", hint: "Delivery texts, bank alerts, job offers." },
  { habitId: "share_location", question: "Do you post travel plans or locations publicly?", hint: "Stories and check-ins count too." },
  { habitId: "smart_lock_email", question: "Is a smart lock or camera tied to your main email?", hint: "Doorbells, indoor cameras, smart locks." },
];


// What the person is currently doing. Situations don't gate anything. They
// surface the factors most relevant to that threat model first.
const SITUATIONS = [
  { id: "job", label: "Looking for a job", blurb: "Recruiter impersonation, credential theft, identity harvesting.",
    highlight: ["public_employer", "active_job_search", "public_email", "password_reuse", "no_email_2fa"] },
  { id: "travel", label: "Traveling", blurb: "Oversharing, location exposure, physical and digital overlap.",
    highlight: ["share_location", "smart_lock_email", "public_wifi", "overshare_social"] },
  { id: "dating", label: "Dating online", blurb: "Unwanted discovery, identity correlation, privacy escalation.",
    highlight: ["dating_profile", "overshare_social", "public_employer", "public_phone"] },
  { id: "selling", label: "Selling something online", blurb: "Location exposure, social engineering, physical safety.",
    highlight: ["marketplace_listing", "public_phone", "share_location", "overshare_social"] },
  { id: "public", label: "Building a public profile", blurb: "Information aggregation and targeted social engineering.",
    highlight: ["public_employer", "public_email", "overshare_social", "public_phone"] },
  { id: "general", label: "Just checking my exposure", blurb: "General personal attack-path simulation.", highlight: [] },
];

// A clearly fictional profile for demoing the full flow in seconds.
const DEMO_PROFILE = {
  name: "Alex",
  role: "Job seeker",
  note: "Fictional demo data, not a real person.",
  situation: "job",
  habits: ["public_employer", "active_job_search", "public_email", "no_email_2fa", "password_reuse"],
};

// Quick-start personas for the habit picker: each a realistic starting
// point for a different kind of person, fully editable after loading.
const PERSONAS = [
  {
    id: "student",
    label: "Student",
    blurb: "Campus wifi, shared library computers, QR flyers everywhere.",
    habits: ["public_wifi", "qr_scan", "password_reuse", "auto_login_public", "browser_only_passwords"],
  },
  {
    id: "remote_worker",
    label: "Remote Worker",
    blurb: "Coffee-shop wifi, an overflowing inbox, years-old passwords.",
    habits: ["public_wifi", "no_email_2fa", "stale_password", "no_verify_sender", "sms_only_2fa"],
  },
  {
    id: "parent",
    label: "Parent / Family",
    blurb: "Smart home devices, family photos, QR codes at school events.",
    habits: ["qr_scan", "share_location", "smart_lock_email", "overshare_social", "default_router_password"],
  },
  {
    id: "small_business",
    label: "Small Business Owner",
    blurb: "Invoice emails, a public contact address, minimal security budget.",
    habits: ["no_verify_sender", "public_email", "old_forgotten_account", "default_router_password", "browser_only_passwords", "no_email_2fa"],
  },
];

// Keyword phrases mapped to the closest matching habit: lets someone
// describe a situation in their own words (via Cipher, the assistant) and
// still land on a real, matched habit instead of a dead end.
// Each entry maps a set of trigger phrases to one or more relevant habits:
// a broad term (like "password") deliberately surfaces several related
// habits at once, so Cipher can offer a real set of options, not just one.
const KEYWORD_MAP = [
  // broad topic entries: intentionally multi-match
  { keywords: ["password"], habitIds: ["password_reuse", "browser_only_passwords", "stale_password"] },
  { keywords: ["wifi"], habitIds: ["public_wifi", "default_router_password"] },
  { keywords: ["email"], habitIds: ["no_email_2fa", "public_email"] },
  { keywords: ["2fa", "two factor", "authentication code"], habitIds: ["no_email_2fa", "sms_only_2fa"] },
  { keywords: ["smart home", "iot"], habitIds: ["smart_lock_email", "default_router_password"] },
  { keywords: ["phone", "sim"], habitIds: ["sms_only_2fa", "same_pin"] },
  { keywords: ["link", "clicked on"], habitIds: ["unknown_links", "qr_scan", "no_verify_sender"] },
  // specific single-habit entries
  { keywords: ["camera", "smart lock", "doorbell"], habitIds: ["smart_lock_email"] },
  { keywords: ["instagram", "facebook", "social media", "twitter", "tiktok", "overshare", "pet's name", "pet is named", "my dog", "my cat", "birthday", "hometown", "security question"], habitIds: ["overshare_social"] },
  { keywords: ["old account", "forgot about", "unused account", "dormant account"], habitIds: ["old_forgotten_account"] },
  { keywords: ["coffee shop wifi", "airport wifi", "hotel wifi", "cafe wifi"], habitIds: ["public_wifi"] },
  { keywords: ["qr code", "qr"], habitIds: ["qr_scan"] },
  { keywords: ["text message link", "sms link", "unknown number", "random text"], habitIds: ["unknown_links"] },
  { keywords: ["apk", "sideload", "outside the app store", "third party app store"], habitIds: ["sideload_apps"] },
  { keywords: ["same password", "reuse password", "one password for everything", "forget my password", "forget passwords", "can't remember my password", "cant remember my password"], habitIds: ["password_reuse"] },
  { keywords: ["email security", "authenticator"], habitIds: ["no_email_2fa"] },
  { keywords: ["browser save password", "autofill", "chrome saves my password"], habitIds: ["browser_only_passwords"] },
  { keywords: ["old password", "haven't changed my password", "years old password"], habitIds: ["stale_password"] },
  { keywords: ["sim swap", "text code", "sms code", "sms 2fa"], habitIds: ["sms_only_2fa"] },
  { keywords: ["pin", "unlock code", "same pin"], habitIds: ["same_pin"] },
  { keywords: ["router", "home wifi password", "default password"], habitIds: ["default_router_password"] },
  { keywords: ["travel", "vacation", "posting my location", "away from home"], habitIds: ["share_location"] },
  { keywords: ["public email", "business email", "contact email"], habitIds: ["public_email"] },
  { keywords: ["shared computer", "library computer", "public computer", "hotel computer"], habitIds: ["auto_login_public"] },
  { keywords: ["sender address", "phishing email", "spoofed email"], habitIds: ["no_verify_sender"] },
];

// Canned FAQ triggers for Cipher, the assistant: deterministic, not an AI
// model, so answers are exact and reviewable rather than generated.
const FAQ = [
  {
    triggers: ["how does this work", "how does it work", "methodology", "how do you know"],
    answer: "No magic here: every habit is tagged as an entry point, an escalating weakness, or an exposure signal, and a rules engine checks your combination against a library of real attack patterns. Nothing is AI-generated security logic; it's hand-authored and deterministic. Check the \"How it works\" section for the full breakdown.",
  },
  {
    triggers: ["safe", "privacy", "store", "data", "tracked", "collect"],
    answer: "Nothing you tell me or select anywhere on this site is stored, sent to a server, or tied to your identity. It all lives in this browser tab and disappears when you close it. I'm not an exception to that.",
  },
  {
    triggers: ["who made", "who built", "who created", "creator"],
    answer: "Built by Radha as an independent security-education project. I'm the rule-based assistant bolted on at the end: think of me as the friendly front desk, not the security engine itself.",
  },
  {
    triggers: ["help", "start", "confused", "what do i do"],
    answer: "Easiest path: pick a persona above the habit list for a realistic starting point, or just tell me a habit or situation in your own words and I'll try to match it. Then hit Run and watch the chain assemble.",
  },
  {
    triggers: ["are you ai", "are you an ai", "chatgpt", "llm", "real ai"],
    answer: "Nope: I'm keyword-matching against a fixed glossary, FAQ list, and habit library, not a language model. Consider it a very opinionated search bar with a name.",
  },
];

// Plain-English glossary for the "New Here?" tab: every technical term used
// anywhere else in this app, defined with no prior knowledge assumed.
const GLOSSARY = [
  { term: "VPN", definition: "A tool that scrambles your internet traffic so people on the same network (like public wifi) can't read what you're sending." },
  { term: "Two-Factor Authentication (2FA)", definition: "A second proof of identity beyond just a password, usually a code from an app or a physical key. Even if someone steals your password, they still can't get in without it." },
  { term: "Phishing", definition: "A fake message or website built to trick you into typing in a password or personal info, disguised as something legitimate." },
  { term: "Quishing", definition: "Phishing delivered through a QR code instead of a link: you scan it without knowing where it actually leads until it's too late." },
  { term: "Credential Stuffing", definition: "An automated attack that takes usernames and passwords leaked from one breach and tries them on thousands of other sites, betting that people reuse passwords." },
  { term: "SIM-Swap", definition: "An attacker convinces your phone carrier to move your phone number onto their SIM card, so your calls and texts (including 2FA codes) go to them instead of you." },
  { term: "Breach Dump", definition: "A large file of leaked usernames, passwords, or personal data from a hacked company, often traded or sold online." },
  { term: "IoT (Internet of Things)", definition: "Everyday physical devices connected to the internet (smart locks, cameras, thermostats), each one a potential way in if it's not secured." },
  { term: "Entry Point", definition: "The very first way an attacker gets any kind of foothold: a phishing link, an open wifi network, a cloned QR code." },
  { term: "Attack Chain / Kill Chain", definition: "The step-by-step sequence an attacker follows, from first foothold to final impact. Breaking any one link in the chain stops the rest from happening." },
  { term: "Attack Surface", definition: "Everything about you or your systems that could potentially be exploited: every account, device, and habit combined." },
  { term: "MITRE ATT&CK", definition: "A widely used, publicly documented framework that catalogs real-world attacker techniques, used by security teams to describe and defend against them." },
  { term: "Password Manager", definition: "An app that generates and stores a unique, strong password for every account, so you never have to reuse one or remember them all." },
  { term: "Threat Actor", definition: "Whoever is doing the attacking: could be an automated bot, an opportunistic scammer, or someone who personally knows you." },
];

// Hand-authored flagship scenarios. Checked first, before the generic
// assembler, for extra narrative richness on common real-world combinations.
// Each carries a realWorld line grounding it in general, well-documented
// attacker behavior rather than any single invented incident.
const CHAINS = [
  {
    id: "wifi_cafe_takeover",
    objective: "Credential harvesting",
    name: "The Coffee Shop Credential Trap",
    requiredHabits: ["public_wifi", "password_reuse"],
    weakestLink: "password_reuse",
    weakestLinkStepIndex: 3,
    stepHabits: ["public_wifi", null, null, "password_reuse", null],
    realWorld: "Password reuse is consistently the single most exploited weakness in account takeovers: one leaked password rarely stays contained to one account.",
    steps: [
      "You connect to public wifi at a coffee shop without a VPN.",
      "An attacker on the same network intercepts your unencrypted login traffic.",
      "They capture the password you just used for one account.",
      "Because you reuse that password, they try it on your email, banking, and social accounts.",
      "One of them lets them in: full account takeover.",
    ],
  },
  {
    id: "forgotten_account_cascade",
    objective: "Unauthorised account and payment access",
    name: "The Forgotten Account Cascade",
    requiredHabits: ["no_email_2fa", "old_forgotten_account"],
    weakestLink: "no_email_2fa",
    weakestLinkStepIndex: 2,
    stepHabits: ["old_forgotten_account", "no_email_2fa", null, null, null],
    realWorld: "Your email is the master key to almost every other account you own: it's the single highest-leverage account to lock down, precisely because everything else trusts it.",
    steps: [
      "You have an old, forgotten account with a saved card and weak security.",
      "Your email has no two-factor authentication: just a password.",
      "An attacker who gets your email password (breach, phishing, or a guess) resets it.",
      "With email access, they trigger \"forgot password\" on your old forgotten account.",
      "They reach your saved card and whatever data is still sitting there.",
    ],
  },
  {
    id: "empty_house_signal",
    objective: "Physical and digital targeting",
    name: "The Empty House Signal",
    requiredHabits: ["share_location", "smart_lock_email", "no_email_2fa"],
    weakestLink: "no_email_2fa",
    weakestLinkStepIndex: 3,
    stepHabits: ["share_location", null, "smart_lock_email", "no_email_2fa", null],
    realWorld: "This is where a purely digital weakness stops staying digital: the same account gap that risks your inbox can risk your actual front door once smart devices are tied to it.",
    steps: [
      "You post that you're traveling, or away from home.",
      "An attacker now has a strong signal that your house is empty.",
      "Your smart lock app is tied to your main email, which has no two-factor authentication.",
      "They target your email through phishing or a password reset.",
      "With email access, they can reach the smart lock app tied to it.",
    ],
  },
  {
    id: "qr_code_trap",
    objective: "Credential harvesting",
    name: "The QR Code Trap",
    requiredHabits: ["qr_scan", "password_reuse"],
    weakestLink: "password_reuse",
    weakestLinkStepIndex: 4,
    stepHabits: ["qr_scan", null, null, null, "password_reuse", null],
    realWorld: "QR-code phishing (\"quishing\") has surged precisely because it skips every filter built to catch suspicious links. Nothing scans a code sitting on a parking meter before you do.",
    steps: [
      "You scan a QR code on a parking meter or flyer without checking where it leads.",
      "It opens a fake login page, cloned to look exactly like the real one.",
      "You enter your usual password out of habit.",
      "The attacker now has that password.",
      "Because you reuse it, they try it across your other accounts.",
      "Every account that shares that password is now open to them, all from one scan.",
    ],
  },
  {
    id: "shared_laptop_heist",
    objective: "Session and credential theft",
    name: "The Shared Laptop Heist",
    requiredHabits: ["auto_login_public", "browser_only_passwords"],
    weakestLink: "browser_only_passwords",
    weakestLinkStepIndex: 2,
    stepHabits: ["auto_login_public", "browser_only_passwords", null, null, null],
    realWorld: "No hacking skill required for this one: just autofill and thirty seconds alone with an unlocked browser, which is exactly why it's so common on shared and public machines.",
    steps: [
      "You stay logged into your accounts on a shared or public computer: a library, a hotel business center.",
      "Your passwords are only saved in that browser, nowhere else.",
      "The next person to sit down opens the browser's saved-password list and reads them directly.",
      "No hacking required: just autofill and a few minutes alone with the machine.",
      "They now have standing access to every account whose password was saved there.",
    ],
  },
  {
    id: "sim_swap_bypass",
    objective: "Account takeover via intercepted codes",
    name: "The SIM-Swap Bypass",
    requiredHabits: ["public_email", "sms_only_2fa"],
    weakestLink: "sms_only_2fa",
    weakestLinkStepIndex: 2,
    stepHabits: ["public_email", null, "sms_only_2fa", null, null],
    realWorld: "SIM-swap fraud specifically targets SMS-based two-factor authentication: the moment your number gets ported, every code meant to protect you gets delivered straight to the attacker instead.",
    steps: [
      "Your email address is easy to find or guess.",
      "An attacker uses it to figure out your likely carrier and social-engineers a SIM swap, porting your number to their own device.",
      "Your only backup two-factor method is SMS, so the swapped SIM now receives your verification codes.",
      "They use an intercepted code to reset your email password.",
      "Full email takeover, and your real phone never even rings to warn you.",
    ],
  },
  {
    id: "sideloaded_spyware",
    objective: "Device compromise and PIN capture",
    name: "The Sideloaded Spyware",
    requiredHabits: ["sideload_apps", "same_pin"],
    weakestLink: "same_pin",
    weakestLinkStepIndex: 2,
    stepHabits: ["sideload_apps", null, null, "same_pin", null],
    realWorld: "Apps installed outside an official store skip the review process that normally catches exactly this kind of behavior: permissions a legitimate app would never be granted.",
    steps: [
      "You install an app from outside the official app store.",
      "It requests permissions no store-reviewed app would get away with, including reading what you type.",
      "It logs the PIN you use to unlock your phone.",
      "Because you reuse that PIN elsewhere, it now doubles as the key to whatever else you protect with it.",
      "A device, a safe, a banking app. Whatever else that PIN guards is exposed too.",
    ],
  },
  {
    id: "fake_recruiter_chain",
    name: "The Fake Recruiter Chain",
    requiredHabits: ["public_employer", "active_job_search", "public_email", "no_email_2fa", "password_reuse"],
    weakestLink: "no_email_2fa",
    weakestLinkStepIndex: 5,
    stepHabits: ["public_employer", "public_email", null, "active_job_search", null, "no_email_2fa", "password_reuse"],
    realWorld: "Recruiter impersonation works because every piece it needs is already published on purpose: the employer, the role, the openness to being approached.",
    objective: "Credential harvesting",
    steps: [
      "Your public profile shows your employer, your role, and that you're open to work.",
      "From the organisation, a likely corporate email pattern can be inferred and checked against your visible address.",
      "An approach arrives referencing your actual team and a plausible next step in your career.",
      "Because you're genuinely job hunting, an unexpected recruiter message is expected rather than suspicious.",
      "The 'application portal' asks you to sign in to verify your identity.",
      "Because your email has no two-factor authentication, that captured password logs straight in.",
      "Because that password is reused, what you just typed is not limited to the fake site either.",
    ],
    // Guided-walkthrough content for the job-seeker demo. One entry per step
    // above (same length/order as `steps`). Only the last step carries
    // `isFixStep`, which is where the tour card offers "Simulate MFA".
    tourSteps: [
      {
        title: "Your profile names your employer",
        whatHappens: "Your public profile lists where you work, your role, and that you're open to new opportunities. None of that is private: it's the point of the profile.",
        whyConnected: "This is the starting point: everything that follows is built from details you've already published.",
        whatAttackerSees: "Organisation, role and seniority: enough to guess a likely email pattern and pick a believable angle.",
        whatBreaksIt: "Trimming employer and role detail, or keeping the profile out of search indexing, removes this starting point.",
      },
      {
        title: "Your email pattern can be guessed",
        whatHappens: "From your employer, a likely corporate email format can be inferred and checked against the address you've made public.",
        whyConnected: "The last step supplied the organisation; this step turns that into a specific, reachable target.",
        whatAttackerSees: "A working email address to send the approach to, and a fixed target for every attempt after this one.",
        whatBreaksIt: "Use a separate address for anything public, and keep your real recovery email unpublished.",
      },
      {
        title: "A believable approach arrives",
        whatHappens: "A message arrives referencing your actual team and a plausible next step in your career, not a generic cold pitch.",
        whyConnected: "It uses the employer and email details from the two steps before it to sound specific instead of random.",
        whatAttackerSees: "Enough real detail to skip the questions that usually give a scam away.",
        whatBreaksIt: "No single habit removes this step on its own. It only works because the two before it succeeded.",
      },
      {
        title: "You're primed to expect this message",
        whatHappens: "Because your profile shows you're actively job hunting, an unexpected recruiter message reads as expected rather than suspicious.",
        whyConnected: "The same visibility that helps real recruiters find you also tells a scammer exactly when you're most receptive.",
        whatAttackerSees: "Someone measurably more likely to open, and act on, an unsolicited approach.",
        whatBreaksIt: "Use a recruiter-only visibility setting instead of a public \"open to work\" badge.",
      },
      {
        title: "The 'portal' asks you to sign in",
        whatHappens: "The fake application link leads to a sign-in page asking you to verify your identity before continuing.",
        whyConnected: "This is where the chain turns from gathering information into an actual credential-capture attempt.",
        whatAttackerSees: "A login form built to look exactly like the one you already trust.",
        whatBreaksIt: "Treat any unexpected \"verify to continue\" link as suspicious, and go to the real site directly instead.",
      },
      {
        title: "No second factor stops the login",
        whatHappens: "Your email account has no two-factor authentication, so the password you just typed logs straight in.",
        whyConnected: "Every step before this one existed to get a real password typed into a fake page: this is where that payoff lands.",
        whatAttackerSees: "One captured password is all it takes; there's no second check to fail.",
        whatBreaksIt: "Turning on two-factor authentication breaks the chain at exactly this point, whether or not a password was ever caught.",
      },
      {
        title: "One password, many accounts",
        whatHappens: "Because that password is reused, what was just typed isn't limited to the fake site: it opens whatever else uses the same password.",
        whyConnected: "This is where one captured credential turns into broader account takeover, extending everything the chain built up to here.",
        whatAttackerSees: "A single working password to try across your other accounts before you've even noticed.",
        whatBreaksIt: "A unique password per account (via a password manager) means this step never happens, even if the one before it does.",
        isFixStep: true,
      },
    ],
  },
  {
    id: "public_profile_puzzle",
    name: "The Public Profile Puzzle",
    requiredHabits: ["public_employer", "overshare_social", "password_reuse"],
    weakestLink: "password_reuse",
    weakestLinkStepIndex: 4,
    stepHabits: ["public_employer", "overshare_social", null, null, "password_reuse", null],
    realWorld: "No single post here is sensitive. The aggregate is, which is exactly why this pattern is so easy to miss while it's being assembled.",
    objective: "Account takeover via recovery questions",
    steps: [
      "Your employer and role are publicly visible.",
      "Your posts add the ordinary details: a pet's name, a hometown, a school, a birthday.",
      "Those are the same values commonly used as account recovery answers.",
      "A recovery flow that relies on those questions can be attempted rather than guessed blindly.",
      "Because the resulting password is reused, one recovered account may open several.",
      "Several accounts can be taken over using nothing but details you posted in public.",
    ],
  },
  {
    id: "marketplace_pickup",
    name: "The Marketplace Pickup",
    requiredHabits: ["marketplace_listing", "public_phone", "share_location"],
    weakestLink: "public_phone",
    weakestLinkStepIndex: 2,
    stepHabits: ["marketplace_listing", null, "public_phone", null, "share_location"],
    realWorld: "This chain crosses out of the browser. The digital details are ordinary; the pickup arrangement is what makes them physical.",
    objective: "Location exposure and repeated contact",
    steps: [
      "Your listing carries your real name and photos taken inside your home.",
      "Background details in those photos can narrow the building or street.",
      "Your publicly attached phone number moves contact to an unfiltered channel.",
      "A pickup is arranged at or near your address, confirming the area.",
      "Posted travel or routine updates then indicate when you're likely to be there, or not.",
    ],
  },
  {
    id: "dating_profile_trail",
    name: "The Dating Profile Trail",
    requiredHabits: ["dating_profile", "public_employer", "overshare_social"],
    weakestLink: "dating_profile",
    weakestLinkStepIndex: 1,
    stepHabits: ["dating_profile", null, "public_employer", "overshare_social", null],
    realWorld: "The profile is meant to be pseudonymous. A reused photo is usually the single thread that undoes that.",
    objective: "Unwanted identification and discovery",
    steps: [
      "Your dating profile uses a photo that also appears on a public account.",
      "A reverse image match links the pseudonymous profile to your real name.",
      "That profile lists your employer and role.",
      "Your other posts fill in routine, neighbourhood and regular places.",
      "Someone you chose to share a first name with could end up knowing where to find you.",
    ],
  },
  {
    id: "recovery_email_chain",
    name: "The Recovery Email Chain",
    requiredHabits: ["shared_recovery_email", "public_email", "stale_password"],
    weakestLink: "shared_recovery_email",
    weakestLinkStepIndex: 3,
    stepHabits: ["public_email", "stale_password", null, "shared_recovery_email", null],
    realWorld: "Recovery addresses are chosen for convenience and then quietly become the most valuable account a person owns.",
    objective: "Cascading account takeover",
    steps: [
      "Your main address is public, so the target is known without any guessing.",
      "An old password for it may already appear in a breach corpus.",
      "If it still works, or still resembles the current one, that inbox opens.",
      "Because the same address is the recovery route for most of your other services, they can be reset one by one.",
      "Each reset confirmation arrives in the inbox already under someone else's control.",
    ],
  },
  {
    id: "overshared_workspace",
    name: "The Overshared Workspace",
    requiredHabits: ["public_employer", "no_verify_sender", "no_email_2fa"],
    weakestLink: "no_email_2fa",
    weakestLinkStepIndex: 4,
    stepHabits: ["public_employer", null, null, "no_verify_sender", "no_email_2fa", null],
    realWorld: "Internal-looking mail is convincing precisely because the org chart it imitates is usually public.",
    objective: "Workplace credential compromise",
    steps: [
      "Your employer, team and role are publicly listed.",
      "Colleagues and reporting lines can be inferred from the same public profiles.",
      "A message arrives that appears to come from someone you actually work with.",
      "The sender address isn't checked, because the display name looks right.",
      "With no second factor on your email, a captured password is enough on its own.",
      "They are inside your work inbox and can message real colleagues as you.",
    ],
  },
  {
    id: "social_engineering_guess",
    objective: "Account takeover via recovery questions",
    name: "The Social Engineering Guess",
    requiredHabits: ["overshare_social", "password_reuse"],
    weakestLink: "password_reuse",
    weakestLinkStepIndex: 3,
    stepHabits: ["overshare_social", null, null, "password_reuse", null],
    realWorld: "Security questions were designed around information that used to be private: a pet's name, a hometown, a school. Social media quietly made most of that public by default.",
    steps: [
      "You post personal details: a pet's name, your hometown, where you went to school.",
      "An attacker collects those details from your public profile, no hacking involved.",
      "They use them to answer your account's security questions and reset a password.",
      "Because you reuse that password everywhere, resetting just one account effectively unlocks the rest.",
      "No phishing, no malware: just publicly available answers to \"private\" questions.",
    ],
  },
  {
    id: "breach_dump_lookup",
    objective: "Credential replay",
    name: "The Breach Dump Lookup",
    requiredHabits: ["public_email", "stale_password"],
    weakestLink: "stale_password",
    weakestLinkStepIndex: 2,
    stepHabits: ["public_email", null, "stale_password", null, null],
    realWorld: "This one requires no cleverness at all: just a search engine for leaked-credential databases and enough patience to try a few years-old passwords against your current accounts.",
    steps: [
      "Your email address is public or easy to guess.",
      "An attacker searches known breach dumps for that exact address.",
      "They find a password you haven't changed in years, still listed from an old leak.",
      "They try it directly on your current accounts: no phishing, no guessing.",
      "If you reused or barely modified it since, they're in.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Assessment content added in the 2026 redesign. Content only, no logic.
// ---------------------------------------------------------------------------

// MITRE ATT&CK techniques used anywhere on the site, as [name, tactics, the
// tactic this site uses it for]. Every entry was checked against
// attack.mitre.org (ATT&CK v20) on 2026-10-16; re-check with
// `node tests/check-attack-live.js`. Mobile techniques are marked (Mobile).
const ATTACK_VERSION = "ATT&CK v20";
const ATTACK_CATALOG = {
  "T1040": ["Network Sniffing", "Credential Access, Discovery", "Credential Access"],
  "T1078": ["Valid Accounts", "Stealth, Persistence, Privilege Escalation, Initial Access", "Initial Access"],
  "T1078.001": ["Valid Accounts: Default Accounts", "Stealth, Persistence, Privilege Escalation, Initial Access", "Initial Access"],
  "T1098": ["Account Manipulation", "Persistence, Privilege Escalation", "Persistence"],
  "T1110.004": ["Brute Force: Credential Stuffing", "Credential Access", "Credential Access"],
  "T1111": ["Multi-Factor Authentication Interception", "Credential Access", "Credential Access"],
  "T1114": ["Email Collection", "Collection", "Collection"],
  "T1417.001": ["Input Capture: Keylogging (Mobile)", "Collection, Credential Access", "Credential Access"],
  "T1451": ["SIM Card Swap (Mobile)", "Initial Access", "Initial Access"],
  "T1534": ["Internal Spearphishing", "Lateral Movement", "Lateral Movement"],
  "T1539": ["Steal Web Session Cookie", "Credential Access", "Credential Access"],
  "T1555.003": ["Credentials from Password Stores: Credentials from Web Browsers", "Credential Access", "Credential Access"],
  "T1557": ["Adversary-in-the-Middle", "Credential Access, Collection", "Credential Access"],
  "T1566": ["Phishing", "Initial Access", "Initial Access"],
  "T1586.002": ["Compromise Accounts: Email Accounts", "Resource Development", "Resource Development"],
  "T1589": ["Gather Victim Identity Information", "Reconnaissance", "Reconnaissance"],
  "T1589.001": ["Gather Victim Identity Information: Credentials", "Reconnaissance", "Reconnaissance"],
  "T1589.002": ["Gather Victim Identity Information: Email Addresses", "Reconnaissance", "Reconnaissance"],
  "T1589.003": ["Gather Victim Identity Information: Employee Names", "Reconnaissance", "Reconnaissance"],
  "T1591.004": ["Gather Victim Org Information: Identify Roles", "Reconnaissance", "Reconnaissance"],
  "T1593.001": ["Search Open Websites/Domains: Social Media", "Reconnaissance", "Reconnaissance"],
  "T1593.002": ["Search Open Websites/Domains: Search Engines", "Reconnaissance", "Reconnaissance"],
  "T1597": ["Search Closed Sources", "Reconnaissance", "Reconnaissance"],
  "T1598": ["Phishing for Information", "Reconnaissance", "Reconnaissance"],
  "T1598.003": ["Phishing for Information: Spearphishing Link", "Reconnaissance", "Reconnaissance"],
  "T1608.005": ["Stage Capabilities: Link Target", "Resource Development", "Resource Development"],
  "T1626.001": ["Abuse Elevation Control Mechanism: Device Administrator Permissions (Mobile)", "Privilege Escalation", "Privilege Escalation"],
  "T1655": ["Masquerading (Mobile)", "Defense Evasion", "Defense Evasion"],
  "T1657": ["Financial Theft", "Impact", "Impact"],
  "T1660": ["Phishing (Mobile)", "Initial Access", "Initial Access"],
  "T1684.001": ["Social Engineering: Impersonation", "Stealth", "Stealth"],
};

// The technique each habit hands an attacker. null means no technique honestly fits.
const HABIT_ATTACK = {
  public_wifi: "T1557",
  qr_scan: "T1660",
  unknown_links: "T1660",
  sideload_apps: "T1417.001",
  no_verify_sender: "T1684.001",
  auto_login_public: "T1539",
  public_employer: "T1591.004",
  active_job_search: "T1593.001",
  public_phone: "T1589",
  shared_recovery_email: "T1078",
  marketplace_listing: "T1593.001",
  dating_profile: "T1593.001",
  password_reuse: "T1110.004",
  no_email_2fa: "T1078",
  browser_only_passwords: "T1555.003",
  stale_password: "T1589.001",
  sms_only_2fa: "T1111",
  same_pin: null,
  default_router_password: "T1078.001",
  share_location: "T1593.001",
  old_forgotten_account: "T1078",
  public_email: "T1589.002",
  overshare_social: "T1593.001",
  smart_lock_email: "T1078",
};
// Why a habit has no technique, shown in place of a code.
const HABIT_ATTACK_GAP = {
  same_pin: "Reusing a PIN is a human habit, not an attacker action, so ATT&CK has no technique for it.",
};
// [id, name] per habit, the shape the pages read.
const ATTACK_TECHNIQUES = Object.fromEntries(
  Object.entries(HABIT_ATTACK).map(([h, id]) => [h, id ? [id, ATTACK_CATALOG[id][0]] : null])
);

// Where a defender could notice each step (analyst mode).
const DEFENDER_VIEW = {
  public_wifi: "Hard to see from the user side. HTTPS-only and a VPN remove the step; identity-provider logs may show one session used from two networks.",
  qr_scan: "Mobile URL filtering and newly-registered-domain alerts. Users reporting the sticker is often the first signal.",
  unknown_links: "SMS filtering and mobile threat defense; DNS logs show lookups of freshly registered lookalike domains.",
  sideload_apps: "MDM or mobile threat defense flags apps from unknown sources and accessibility-service abuse.",
  no_verify_sender: "Email gateway: display-name spoofing, lookalike domains and DMARC failures.",
  auto_login_public: "Identity-provider session logs: an old session still alive on a public device. Remote sign-out clears it.",
  public_employer: "Outside your logs: open-source exposure. Mitigated by awareness training and less org-chart detail in public.",
  active_job_search: "Outside your logs. Recruiter-themed lures show up in email gateway detections.",
  public_phone: "Outside your logs. Feeds SMS phishing and SIM-swap pretexting.",
  shared_recovery_email: "Identity provider: a burst of password-reset emails into one inbox across many services.",
  marketplace_listing: "Outside your logs. A doxxing and physical-safety risk more than a SOC alert.",
  dating_profile: "Outside your logs. Reverse image search links the identities.",
  password_reuse: "Sign-in logs: spikes of failed logins across accounts, then a success from breach-replay infrastructure.",
  no_email_2fa: "Identity provider: a successful sign-in from a new device or country with no MFA challenge.",
  browser_only_passwords: "Endpoint telemetry: unusual processes reading the browser credential store.",
  stale_password: "Breach monitoring flags the address in a dump. Force a reset.",
  sms_only_2fa: "Carrier SIM-change event followed closely by an SMS-verified login.",
  same_pin: "No log source. PIN reuse stays invisible until a device is lost.",
  default_router_password: "Router admin logins; scanners flag firmware still using default credentials.",
  share_location: "Outside your logs. Gives timing for physical or social attacks.",
  old_forgotten_account: "Nobody is watching this account's alerts at all.",
  public_email: "Outside your logs. Feeds phishing and credential-stuffing target lists.",
  overshare_social: "Outside your logs. Supplies security-question answers and pretext material.",
  smart_lock_email: "Smart-home app audit log: unlocks or new devices while the owner is away.",
};

// ATT&CK for every step of every named chain, in step order. A string is a
// technique ID; { gap } is a step no technique honestly fits, with the reason.
// The defender note for the same step follows in STEP_DEFEND (null there means
// "use the note for that step's habit" from DEFENDER_VIEW).
const STEP_ATTACK = {
  wifi_cafe_takeover: ["T1557", "T1040", "T1589.001", "T1110.004", "T1078"],
  forgotten_account_cascade: ["T1078", "T1078", "T1586.002", "T1098", "T1657"],
  empty_house_signal: ["T1593.001", { gap: "Physical-world inference. ATT&CK models attacks on computer systems and has no technique for spotting an empty house." }, "T1078", "T1566", "T1078"],
  qr_code_trap: ["T1660", "T1608.005", "T1598", "T1589.001", "T1110.004", "T1078"],
  shared_laptop_heist: ["T1539", "T1555.003", "T1555.003", { gap: "Physical access to an unlocked machine. ATT&CK begins once someone is at the keyboard, so there is no separate technique for sitting down." }, "T1078"],
  sim_swap_bypass: ["T1589.002", "T1451", "T1111", "T1098", "T1586.002"],
  sideloaded_spyware: ["T1655", "T1626.001", "T1417.001", { gap: "Reusing a PIN is a human habit, not an attacker action, so ATT&CK has no technique for it." }, "T1078"],
  fake_recruiter_chain: ["T1591.004", "T1589.002", "T1684.001", "T1593.001", "T1598.003", "T1078", "T1110.004"],
  public_profile_puzzle: ["T1591.004", "T1593.001", "T1589", "T1098", "T1110.004", "T1078"],
  marketplace_pickup: ["T1593.001", { gap: "Finding a person's street from photo backgrounds. ATT&CK's location technique covers organisations, not individuals." }, "T1589", { gap: "An in-person meeting. ATT&CK models attacks on computer systems, not physical contact." }, "T1593.001"],
  dating_profile_trail: ["T1593.001", "T1593.002", "T1591.004", "T1593.001", { gap: "Finding someone in person. ATT&CK models attacks on computer systems, not physical stalking." }],
  recovery_email_chain: ["T1589.002", "T1589.001", "T1078", "T1098", "T1114"],
  overshared_workspace: ["T1591.004", "T1589.003", "T1684.001", "T1566", "T1078", "T1534"],
  social_engineering_guess: ["T1593.001", "T1589", "T1098", "T1110.004", { gap: "A summary of the chain rather than a separate attacker action." }],
  breach_dump_lookup: ["T1589.002", "T1597", "T1589.001", "T1110.004", "T1078"],
};

const STEP_DEFEND = {
  wifi_cafe_takeover: [null,
    "Wireless intrusion detection spots rogue access points and ARP spoofing. From the user side, HTTPS everywhere makes the capture useless.",
    "Nothing to see yet: the password is used later. Breach monitoring and password checks can catch it before it is replayed.",
    null,
    "Identity provider: a sign-in from an unfamiliar device or location, or an impossible-travel alert."],
  forgotten_account_cascade: [null, null,
    "Identity provider: password and recovery details changed from a new device. The owner gets a 'password changed' email, if they can still read it.",
    "The old service sends its reset notice to the inbox the attacker now controls, so the owner never sees it.",
    "Card issuer fraud monitoring: a charge from a merchant or place you never use."],
  empty_house_signal: [null,
    "Outside any log. Post trips once you are home.",
    null, null,
    "Smart-home app audit log: a sign-in from a new phone, then an unlock while the owner is away."],
  qr_code_trap: [null,
    "Newly registered lookalike domains: DNS and certificate-transparency monitoring often flag them within hours.",
    "A password manager will not autofill on a lookalike domain, which is a warning in itself.",
    "Nothing visible yet: the stolen password is replayed later.",
    null,
    "Sign-in logs across services: one new device signing in to several accounts within a short time."],
  shared_laptop_heist: [null, null,
    "On a personal machine, endpoint telemetry can flag the saved-password store being read. Most public machines keep no such log.",
    "Kiosk software that wipes the session at sign-out removes the step.",
    "Identity provider: new sign-ins from a library or hotel network after you left."],
  sim_swap_bypass: [null,
    "Carrier: a SIM change or port-out request. Some banks and email providers check for a recent SIM change before trusting a text code.",
    null,
    "Email provider: a password reset by text from a new device, followed by changed recovery details.",
    "The real phone loses signal (emergency calls only), often the first and only visible sign."],
  sideloaded_spyware: [null,
    "Mobile threat defense or device management: an app asking for device administrator or accessibility access.",
    "Mobile threat defense flags accessibility-service abuse. On a personal phone, usually nothing is watching.",
    null,
    "Whatever the PIN unlocks sees a correct PIN, so nothing looks wrong."],
  fake_recruiter_chain: [null, null,
    "Email gateway: an external sender, recruiter-themed lure and a newly registered domain.",
    null,
    "Proxy or DNS logs show a lookalike login domain; the password manager refuses to autofill.",
    null, null],
  public_profile_puzzle: [null, null,
    "Outside your logs. The answers are public, so nobody sees them being collected.",
    "The service: repeated recovery attempts, or a recovery from a new device followed by changed security details.",
    null,
    "Several services report new-device sign-ins on the same day."],
  marketplace_pickup: [null,
    "Outside any log. Photograph items against a plain background.",
    null,
    "Outside any log. Meet in a public place, not at home.",
    null],
  dating_profile_trail: [null,
    "Outside your logs. Use a photo that appears nowhere else.",
    null, null,
    "Outside any log. A physical-safety risk; tell a friend where you are meeting."],
  recovery_email_chain: [null, null,
    "Email provider: a sign-in with an old password from a new device, and a 'new sign-in' alert to the owner.",
    null,
    "Email provider: reset emails read and deleted, or new mail rules, from an unfamiliar session."],
  overshared_workspace: [null,
    "Outside your logs. Public org charts and profiles.",
    "Email gateway: display-name impersonation of a colleague from an outside domain.",
    null, null,
    "Mail logs: internal messages with links sent to many colleagues from one account in a short time."],
  social_engineering_guess: [null,
    "Outside your logs. The details are public.",
    "The service: a reset by security questions from a new device, then changed recovery details.",
    null,
    "Made-up answers to security questions, stored like passwords, remove the whole chain."],
  breach_dump_lookup: [null,
    "Outside your logs. Breach-notification services tell you when your address appears in a dump.",
    null,
    "Sign-in logs: a correct but old password arriving from breach-replay infrastructure.",
    "Identity provider: a successful sign-in from a new device with no MFA challenge."],
};

// Paths the engine assembles itself (entry habit + weakness, plus an optional
// signal) have attacker steps too: what follows each entry habit, and how each
// signal habit ends the chain. [technique or { gap }, defender note].
const ENTRY_FOLLOWUP = {
  public_wifi: ["T1040", "Wireless intrusion detection spots rogue access points and ARP spoofing. HTTPS everywhere makes the capture useless."],
  qr_scan: ["T1608.005", "Newly registered lookalike domains: DNS and certificate-transparency monitoring often flag them within hours."],
  unknown_links: ["T1608.005", "Newly registered lookalike domains: DNS and certificate-transparency monitoring often flag them within hours."],
  sideload_apps: ["T1626.001", "Mobile threat defense or device management: an app asking for device administrator or accessibility access."],
  no_verify_sender: ["T1566", "Email gateway: DMARC failures and lookalike sender domains."],
  auto_login_public: ["T1078", "Identity provider: activity in your session after you left the machine. Remote sign-out ends it."],
};
const SIGNAL_IMPACT = {
  public_employer: ["T1684.001", "Email gateway: display-name impersonation and lures that name your real team."],
  active_job_search: ["T1598.003", "Email gateway: recruiter-themed lures linking to newly registered domains."],
  public_phone: ["T1660", "SMS filtering and mobile threat defense; carriers block some known scam numbers."],
  marketplace_listing: [{ gap: "Learning someone's neighbourhood through a sale is physical-world reconnaissance of an individual, outside ATT&CK." }, "Outside any log. Meet in a public place."],
  dating_profile: ["T1593.002", "Outside your logs. Use a photo that appears nowhere else."],
  share_location: [{ gap: "A physical break-in risk. ATT&CK models attacks on computer systems." }, "Outside any log. Post trips once you are home."],
  old_forgotten_account: ["T1657", "Card issuer fraud monitoring: a charge from a merchant or place you never use."],
  public_email: ["T1586.002", "Identity provider: recovery details changed from a new device."],
  overshare_social: ["T1098", "The service: a reset by security questions from a new device."],
  smart_lock_email: ["T1078", "Smart-home app audit log: a new phone added, then an unlock while the owner is away."],
};
const GENERIC_FINAL_ATTACK = ["T1078", "Identity provider: a sign-in from a new device or country, then the same trick tried on other accounts."];

// Plain action title for each fix, and a rough time it takes (an estimate).
const FIX_ACTIONS = {
  public_wifi: "Use a VPN or your phone's hotspot on public wifi",
  qr_scan: "Check where a QR code goes before you open it",
  unknown_links: "Stop tapping links in texts from unknown numbers",
  sideload_apps: "Only install apps from the official app store",
  no_verify_sender: "Check the real sender address before you reply",
  auto_login_public: "Sign out of shared and public computers",
  public_employer: "Trim job details on your public profile",
  active_job_search: "Show \"open to work\" to recruiters only",
  public_phone: "Remove your phone number from public profiles",
  shared_recovery_email: "Give your key accounts their own recovery email",
  marketplace_listing: "Sell under a first name, without photos of your home",
  dating_profile: "Use dating photos that aren't anywhere else online",
  password_reuse: "Give every account its own password",
  no_email_2fa: "Turn on two-step login for your email",
  browser_only_passwords: "Move your passwords into a password manager",
  stale_password: "Change passwords you haven't touched in years",
  sms_only_2fa: "Switch login codes from texts to an authenticator app",
  same_pin: "Use different PINs for your phone and your bank",
  default_router_password: "Change your router's factory password",
  share_location: "Post travel photos after you get home",
  old_forgotten_account: "Close accounts you no longer use",
  public_email: "Hide your email address from public profiles",
  overshare_social: "Make personal posts friends-only",
  smart_lock_email: "Put smart-home apps on a separate, protected email",
};
const FIX_MINUTES = {
  public_wifi: 10, qr_scan: 1, unknown_links: 1, sideload_apps: 10, no_verify_sender: 1, auto_login_public: 5,
  public_employer: 5, active_job_search: 5, public_phone: 5, shared_recovery_email: 20, marketplace_listing: 10, dating_profile: 10,
  password_reuse: 30, no_email_2fa: 5, browser_only_passwords: 30, stale_password: 15, sms_only_2fa: 10, same_pin: 5,
  default_router_password: 10, share_location: 2, old_forgotten_account: 15, public_email: 10, overshare_social: 10, smart_lock_email: 10,
};

// Free, official step-by-step guides. Every link loaded in a real browser
// (HTTP 200, current address) in October 2026. No sponsored or affiliate links.
const GUIDES = {
  mfa: ["How to turn on multi-factor authentication", "CISA", "https://www.cisa.gov/secure-our-world/turn-mfa"],
  passwords: ["Use strong passwords and a password manager", "CISA", "https://www.cisa.gov/secure-our-world/use-strong-passwords"],
  phishing: ["Recognize and report phishing", "CISA", "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing"],
  ftcPhishing: ["How to recognize and avoid phishing scams", "FTC", "https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams"],
  wifi: ["Are public wi-fi networks safe?", "FTC", "https://consumer.ftc.gov/articles/are-public-wi-fi-networks-safe-what-you-need-know"],
  qr: ["Scammers hide harmful links in QR codes", "FTC", "https://consumer.ftc.gov/consumer-alerts/2023/12/scammers-hide-harmful-links-qr-codes-steal-your-information"],
  phone: ["How to protect your phone from hackers", "FTC", "https://consumer.ftc.gov/articles/how-protect-your-phone-hackers"],
  jobs: ["Job scams: how to spot them", "FTC", "https://consumer.ftc.gov/articles/job-scams"],
  iot: ["Securing your internet-connected devices at home", "FTC", "https://consumer.ftc.gov/articles/securing-your-internet-connected-devices-home"],
  sim: ["Cell phone fraud and SIM swaps", "FCC", "https://www.fcc.gov/cell-phone-fraud"],
  breach: ["Check if your email was in a data breach", "Have I Been Pwned", "https://haveibeenpwned.com/"],
  privacy: ["Manage your privacy settings", "National Cybersecurity Alliance", "https://www.staysafeonline.org/articles/manage-your-privacy-settings"],
  safety: ["Technology safety and privacy guides", "NNEDV Safety Net", "https://www.techsafety.org/resources-survivors"],
};
const FIX_GUIDES = {
  public_wifi: "wifi", qr_scan: "qr", unknown_links: "ftcPhishing", sideload_apps: "phone", no_verify_sender: "phishing", auto_login_public: "passwords",
  public_employer: "jobs", active_job_search: "jobs", public_phone: "sim", shared_recovery_email: "mfa", marketplace_listing: "safety", dating_profile: "safety",
  password_reuse: "passwords", no_email_2fa: "mfa", browser_only_passwords: "passwords", stale_password: "breach", sms_only_2fa: "sim", same_pin: "passwords",
  default_router_password: "iot", share_location: "safety", old_forgotten_account: "breach", public_email: "privacy", overshare_social: "privacy", smart_lock_email: "iot",
};

// Quick check: the six questions as moments in one ordinary day.
// "Yes" always means the risky habit. Uses the same habit ids as QUICK_CHECK.
const DAY_MOMENTS = [
  { id: "public_wifi", time: "8:10 am", place: "Coffee shop", question: "The cafe wifi is free and open. Do you join it without a VPN?", hint: "Airports, hotels and campus networks count too.",
    why: "On shared wifi, others on the network can sometimes watch or tamper with your traffic. It's a classic first step in." },
  { id: "password_reuse", time: "10:30 am", place: "New app", question: "A new app asks you to make a password. Do you type the one you use everywhere?", hint: "Even a small variation of it counts.",
    why: "One leaked password is a key. Reuse turns it into a master key for every account that shares it." },
  { id: "no_email_2fa", time: "12:15 pm", place: "Inbox", question: "Your email offers to add a second sign-in step. Have you been skipping it?", hint: "Not sure if it's on? It probably isn't.",
    why: "Your email can reset almost every other password you have. It's the account attackers want most." },
  { id: "unknown_links", time: "6:05 pm", place: "Commute", question: "A text from an unknown number says your parcel is stuck. Do you tap the tracking link?", hint: "Delivery, bank and job texts all count.",
    why: "Texts are the new phishing email: short, urgent, and hard to check on a small screen." },
  { id: "smart_lock_email", time: "7:20 pm", place: "Home", question: "You unlock your front door from an app. Is that app tied to your main email?", hint: "Smart locks, doorbells and indoor cameras.",
    why: "If one email controls your front door app, taking the email means taking the door." },
  { id: "share_location", time: "9:40 pm", place: "Sofa", question: "You post: \"Off to Lisbon tomorrow for two weeks!\" Would you share that before you go?", hint: "Stories and check-ins count too.",
    why: "Posting where you are also tells strangers where you aren't. Like home." },
];

// "If it already happened": official places to report and recover.
const RECOVERY = [
  { situation: "Someone got into your accounts or is using your identity", links: [["IdentityTheft.gov (FTC)", "https://www.identitytheft.gov/"]], note: "Report it and get a step-by-step recovery plan." },
  { situation: "You lost money to a scam", links: [["ReportFraud.ftc.gov", "https://reportfraud.ftc.gov/"], ["IC3.gov (FBI)", "https://www.ic3.gov/"]], note: "Report to the FTC, and to the FBI for online crime." },
  { situation: "Your phone suddenly shows \"no service\"", links: [["FCC: cell phone fraud", "https://www.fcc.gov/cell-phone-fraud"]], note: "It can be a sign of a SIM swap. Call your carrier right away." },
  { situation: "You got a suspicious email or text", links: [["CISA: report phishing", "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing"]], note: "Don't click. Report it and delete it." },
  { situation: "You want to know if your email has leaked", links: [["Have I Been Pwned", "https://haveibeenpwned.com/"]], note: "Free check against known data breaches." },
];
