# Monotonic Netflow Score

The v3.9 netflow score replaces the v3.8 binary `netflow_6h > 0 → 1.0 else 0.0` with a graduated four-step ladder that rewards monotonic positivity across nested windows. Full credit only when 6h, 1h, AND 15m are all positive — i.e. the token is still inflowing at the most recent timeframe, not just on the multi-hour aggregate.

`pts=1.0` requires `netflow_6h>0 AND netflow_1h>0 AND netflow_15m>0`. `pts=0.6` if 6h and 1h are positive but 15m is negative (cooling). `pts=0.3` if 6h is positive but 1h is already negative (early dump). `pts=0.0` otherwise. The graduation is what lets the score distinguish "still pumping" from "pumped, now distributing" without throwing away a useful signal.

## Claims

- Implements [[../pipeline.md]] v3.9 change 10 (step 5.5 fix) verbatim ladder.
- Supersedes [[../pipeline.md]] v3.8 binary netflow rule `netflow_pts = 1.0 if netflow_6h > 0 else 0.0` (still listed in the embedded score block as legacy).
- DerivedFrom [[aggregate-vs-instantaneous-meta-rule.md]] — applies meta-rule to netflow timeframes.
- Supports [[../portfolio.md]] ROO scoring: "NF1h +$838, NF24h +$2,059, NF7d +$2,059 monotonic positive" cited as the basis for 3.2/4 entry.
- Supports [[../portfolio.md]] Skyler scoring: "monotonic m5+29% m30+50% h1+187% h6+269%" — netflow shape recognized as positive even though LP failure killed the entry elsewhere.
- Contradicts naive `netflow_6h > 0` checks that would credit a token that had pumped six hours ago and is now reversing.

<!-- sources:
- ../pipeline.md sha256:1cc4df05330ada2e3d3144737ed904145b0be76927f6d7ab8696b80be59ccc17
- ../portfolio.md sha256:0e801844cff851c649b9f840c278951f9533100f9270feb5037acdca61888691
-->
