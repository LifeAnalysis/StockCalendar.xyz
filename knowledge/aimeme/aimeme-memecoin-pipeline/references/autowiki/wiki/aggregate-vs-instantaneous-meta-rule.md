# Aggregate vs Instantaneous (v3.9 Meta-Rule)

v3.9's organizing principle: **any aggregate metric (24h, 7d, lifetime) masks current dynamics**. The pipeline cross-checks every aggregate against an instantaneous window (m5/m15/m30/h1/h6) and trusts the recent direction when they diverge. The rule was generalized from the LEVR finding — where lifetime `trader_count` flattered a token already being distributed — and now spans six explicit checks across the pipeline.

The six concrete instantiations: trending-but-dead filter (h24 vs h6/h1/m30), top-holder dumping (24h balance change vs holding), wash confirmation (inflow_fdv_ratio vs m5 unique buyers), monotonic netflow score (6h vs 1h vs 15m), SM-exit verification (lifetime trader_count vs active/exited split), and recent-vs-convicted SM (holding age <2d vs >7d).

## Claims

- Implements [[../pipeline.md]] v3.9 META-RULE statement: "ANY aggregate metric masks current dynamics. Always compare aggregate vs instantaneous and trust the recent direction when they diverge."
- Supports [[sm-exit-pattern.md]] — SM-exit is one of six instantiations.
- Supports [[top-holder-dumping.md]] — step 3.5 instantiation.
- Supports [[wash-vs-real-velocity.md]] — step 1.5 instantiation.
- Supports [[monotonic-netflow-score.md]] — step 5.5 instantiation.
- Supports [[sm-conviction-recency.md]] — step 4b instantiation.
- Implements [[../pipeline.md]] step 0.5 trending-but-dead filter: `h24_pct >+200% AND h6 < h1 AND m30 sells > buys → REJECT`.
- DerivedFrom [[../onepager.md]] "Key architectural learning" section enumerating the same six rules as the architecture's defining feature.
- Extends [[../portfolio.md]] LEVR rejection — the case that generalized into the meta-rule.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
- ../onepager.md sha256:ba1406fa670f91b11aa098665076efb1a7c00cedd45d05695abdf47377517379
-->
