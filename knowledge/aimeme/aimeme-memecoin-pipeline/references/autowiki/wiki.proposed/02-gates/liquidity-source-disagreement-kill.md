# Liquidity Source Disagreement Kill

When Nansen reports a token above the liquidity floor but a cheap executable-route check shows only dust liquidity, treat the candidate as rejected until the discrepancy is resolved. Liquidity is only useful if it exists on the route a trade can actually execute through. A screener-level liquidity number can be stale, aggregated across non-actionable pools, or pointed at a route that no longer represents practical exit depth.

Cycle 12 produced two Base examples. HERMESOS passed the Nansen sidecar with about `$96.9k` liquidity, 1 SM trader, and positive 6h SM netflow, but the GoPlus/DeFi route showed its largest live UniV4 pool around `$2.4k`. BLOCKTRONICS looked even worse: Nansen showed about `$42.3k` liquidity while the cheap route check saw only about `$5`. Both had clean honeypot/tax/proxy fields, so the kill was not contract safety; it was executable liquidity.

Pipeline rule: after a Nansen or screener liquidity pass, verify EVM/Base candidates with a cheap DEX/security endpoint before paying for deeper holder or SM verification. If reported liquidity differs by more than 10x, use the lower executable-route number for gating and sizing. This extends [[../../wiki/dexscreener-pair-selection.md]] and [[../../wiki/drained-pool-honeypot.md]] from dashboard correctness into live candidate gating.
