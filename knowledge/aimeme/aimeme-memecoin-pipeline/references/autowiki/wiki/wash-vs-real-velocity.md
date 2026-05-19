# Wash vs Real Velocity (Step 1.5)

`inflow_fdv_ratio > 20x` alone is ambiguous: it can be Solana wash bots cycling the same dollars, or it can be a real launch where 300+ wallets are bidding genuinely. v3.9 step 1.5 disambiguates with **m5 unique buyers** as a confirmation gate. Below 5 unique buyers in five minutes the velocity is bot residue and the token is rejected. Above 20 unique buyers it's real demand and the candidate skips ahead to step 3.

This is the wash-detection branch of the aggregate-vs-instantaneous principle: the inflow ratio is a 5-minute aggregate dollar number, while unique-buyer count is the human-shape underneath it. The rule's purpose is precisely to stop killing genuine Solana pumps that look bot-like by their dollar volume profile alone.

## Claims

- Implements [[../pipeline.md]] step 1.5: `if inflow_fdv_ratio > 20x AND m5_unique_buyers < 5 → confirmed wash REJECT`; `if inflow_fdv_ratio > 20x AND m5_unique_buyers > 20 → real velocity, send to step 3`.
- DerivedFrom [[aggregate-vs-instantaneous-meta-rule.md]] — instantiates the meta-rule on inflow_fdv_ratio vs m5 buyers.
- Supports [[../portfolio.md]] lumi observation: "vol h1 $760k, m5 343 buyers REAL velocity" — passed step 1.5 as real demand, then died at the top1 hard gate, validating that step 1.5 was correctly distinguishing.
- Supports [[../portfolio.md]] Skyler observation: 1077 unique h6 buyers + monotonic uptrend = real velocity recognized.
- Contradicts the simpler v3.7 pre-filter that rejected anything with `inflow_fdv_ratio > 20x` — that rule generated false negatives on Solana retail launches.
- Extends [[../pipeline.md]] step 1 pre-filter `inflow_fdv_ratio > 20x` as a soft-flag rather than hard-kill once step 1.5 is in place.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
-->
