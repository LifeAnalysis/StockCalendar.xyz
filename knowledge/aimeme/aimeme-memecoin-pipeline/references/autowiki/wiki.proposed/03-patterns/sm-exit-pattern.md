---
id: 32
category: patterns
function: Identify Smart-Money Exit
status: active
related: [12, 13, 40, 23]
---
# SM-Exit Pattern (Distribution Detection)

The SM-exit rule (pipeline step 5.6) hard-kills tokens where smart-money has accumulated and then distributed, regardless of headline score. The rule fires when `exited_sm > active_sm AND exited_sm >= 3`. It exists because Nansen's `/smart-money/netflow` returns a **lifetime 30d trader_count** that conflates traders who entered-and-exited with traders still holding — a number that flatters distributing tokens and looks identical to genuine accumulation on the surface.

To verify, the pipeline always cross-checks `trader_count` against `/tgm/holders` filtered by smart_money label, splitting holders into `active_sm` (token_amount > 0) and `exited_sm` (full_outflow AND token_amount == 0). When the exited side dominates, the SM cohort has been distributing into retail buyers — the bearish exit signal that aggregate counters mask.

## Claims

- Implements [[../pipeline.md]] step 5.6 SM-exit verification rule (`exited_sm > active_sm AND exited_sm >= 3 → HARD KILL or downgrade to ALMOST`).
- DerivedFrom [[../portfolio.md]] LEVR rejection: `trader_count=16` lifetime resolved to **4 active vs 21 exited** on `/tgm/holders` verify — explicitly cited as the source of the v3.9 rule.
- DerivedFrom [[aggregate-vs-instantaneous-meta-rule]] — exit-dominated SM is the canonical instantiation of the meta-rule on the SM cohort dimension.
- Supports [[../pipeline.md]] validated case EMPLOYEE (eth, 4 SM touched, 0 active vs 4 exited → REJECT).
- Supports [[../pipeline.md]] validated case MAGA (sol, 18 trader_count, 2 active vs 16 exited → REJECT).
- Supports [[sm-conviction-floor]] — exit-dominated SM is the dynamic version of the zero-SM rule; the FROGE/EMPLOYEE pair are the same lesson at different points in the SM lifecycle.
- Supports [[top-holder-dumping]] — sibling instantiations of distribution-into-flattering-aggregate detection.
- Contradicts naive use of Nansen `trader_count` — [[../pipeline.md]] states "NEVER trust this alone".
- Refutes [[../pipeline.md]] earlier 9-component v4 score: scored EMPLOYEE 70/100 (BUY) when the correct call was REJECT; the SM-exit penalty is what reverses that ranking.
- Extends [[../onepager.md]] architectural learning that aggregate metrics lie about current dynamics — `trader_count` is the lifetime aggregate that this rule defuses.
- Supports [[../portfolio.md]] uPEG counter-example: 10+ active vs few exited → BUY (the asymmetric outcome the rule preserves).

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
- ../onepager.md sha256:ba1406fa670f91b11aa098665076efb1a7c00cedd45d05695abdf47377517379
-->
