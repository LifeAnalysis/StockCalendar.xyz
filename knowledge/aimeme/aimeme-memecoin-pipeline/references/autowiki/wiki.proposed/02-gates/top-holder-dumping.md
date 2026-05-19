---
id: 23
category: gates
function: Detect Top-Holder Distribution
status: active
related: [40, 20, 21, 22]
---
# Top-Holder Dumping (Step 3.5)

v3.9 step 3.5 inspects each top-10 holder's 24h balance change. If any top holder's balance has dropped more than 10% of their position in the last day, the token is flagged `TOP_HOLDER_DUMPING` and either hard-killed or strongly penalized. The rule catches devs and early whales distributing into a "trending" UI where aggregate metrics still look bullish.

This is a direct instantiation of the aggregate-vs-instantaneous meta-rule applied to the holder table: top-10 ownership percentage is itself an aggregate snapshot that hides motion. A wallet sitting at 8% today after dumping from 18% yesterday looks healthier than a stable 8% holder, but the trajectory is the actual signal.

## Claims

- Implements [[../pipeline.md]] step 3.5: "for each top10 holder, balance_change_24h < -10% balance → flag TOP_HOLDER_DUMPING → hard kill or strong penalty".
- Implements [[aggregate-vs-instantaneous-meta-rule]] — applies the meta-rule to the holders endpoint as a step-3.5 cheap gate.
- Implements [[cheap-gate-ordering]] — step 3.5 runs on the free `/holders` endpoint, the canonical free-tier cheap gate before any paid Nansen call.
- Supports [[../pipeline.md]] explanatory note: "catches devs distributing while UI looks 'trending'".
- Supports [[lp-locked-tristate]] — both are step-3/5 cheap structural gates that can hard-kill before the paid SM call.
- Supports [[drained-pool-honeypot]] — NYANDOG (94.48% top10 + drained pool) is the shared canonical instance; reciprocal cross-link.
- Extends [[../pipeline.md]] step 5 hard gate `creator address in top 10 holders (dev sniped own pool)` — step 3.5 catches the next-stage version where the sniping dev is now exiting.
- Contradicts trusting trending-list ranking — [[../onepager.md]] explicitly notes "Trending h24 +200% is dead if h6 < h1" and top-holder dumping is the same pathology in the holders dimension.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../onepager.md sha256:ba1406fa670f91b11aa098665076efb1a7c00cedd45d05695abdf47377517379
-->
