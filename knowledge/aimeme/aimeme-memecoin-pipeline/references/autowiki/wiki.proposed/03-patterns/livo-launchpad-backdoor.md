---
id: 30
category: patterns
function: Recognize Livo Launchpad Backdoor
status: active
related: [22, 24]
---
# Livo Launchpad Backdoor

A recurring rug template surfaced on ETH via the Livo launchpad: tokens deploy with a **permanent unlimited allowance** granted to the launchpad over every holder's balance. The launchpad address can drain any wallet at any time without further user interaction. ARMA and NICE are confirmed instances of the same template; the OnchainExpat AI safety scan flags this as `launchpad allowance` and the pipeline hard-kills at step 3.

The pattern is dangerous because the contract otherwise looks clean to surface scanners — there is no honeypot tax, no proxy obfuscation, no obvious owner-can-change-balance hook. The kill condition is the AI flag itself, not a numeric threshold, which is why the pipeline treats the OnchainExpat output as a hard gate rather than a soft input.

## Claims

- Implements [[../pipeline.md]] step 3 hard-kill flag `"launchpad allowance"` listed alongside `"supply chain attack"`, `"trojan"`, `"hidden_owner"`, `"owner_can_change_balance"`.
- Supports [[../portfolio.md]] ARMA rejection: "Livo launchpad backdoor (permanent allowance over all holders)".
- Supports [[../portfolio.md]] NICE rejection: "Livo launchpad clone (same template as ARMA)".
- Supports [[../onepager.md]] catch table: ARMA / NICE → REJECT, "Livo launchpad clones — permanent unlimited allowance over all holders. Built-in rug."
- Extends [[../pipeline.md]] step 3 proxy-allowlist logic: `is_proxy=true AND impl not in known-launchpad allowlist → REJECT` — Livo's pattern is the case that motivates not-trusting unknown proxy implementations even when they look like a "launchpad".
- Contradicts a naive read of "trending + clean tax + LP locked" as sufficient for entry — Livo tokens can pass all three.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
- ../onepager.md sha256:ba1406fa670f91b11aa098665076efb1a7c00cedd45d05695abdf47377517379
-->
