> WHY: Documents how pump.fun bonding-curve graduation works in 2026, why graduated tokens carry LP=0 percent by default, and why only ~1 percent of launches ever reach this stage — load-bearing for interpreting LP-locked signals on Solana memecoins.

# Pump.Fun Graduation Mechanics

Pump.fun is the dominant Solana memecoin launchpad in 2026. Tokens launch on an internal bonding curve and "graduate" to an external DEX once a price/market-cap threshold is hit. The mechanics below determine why most graduated tokens show LP-locked = 0 percent in trending feeds.

## Graduation Trigger

- Initial graduation threshold: $69,000 market cap on the bonding curve.
- At threshold, pump.fun injects $12,000 of liquidity as a Raydium LP and burns the LP tokens, locking that liquidity permanently.
- Full graduation to PumpSwap (pump.fun's in-house AMM) occurs at the $75,000 to $100,000 market-cap band.

## Graduation Rate

- Approximately 1 percent of all pump.fun token launches ever graduate. The remaining 99 percent stall on the bonding curve and decay.

## Post-Graduation LP State

- Post-graduation tokens carry LP-locked = 0 percent by default in third-party scanners.
- This is because graduation to PumpSwap does not perform an automatic LP burn equivalent to the initial Raydium step — the creator must manually lock or burn the new LP, and most do not.
- Consequence: a "LP locked 0 percent" reading on a recently graduated pump.fun token is the default state, not a rug signal in itself. It must be cross-checked with creator behavior, holder distribution, and whether any manual lock was added.

## Pipeline Implication

Any prefilter that hard-rejects on `lpLockedPct = 0` will cull the entire post-graduation pump.fun population. This is the single largest source of false negatives on Solana trending feeds and must be handled with a tristate (locked / burned / unlocked-but-graduated) rather than a binary gate.

## Sources

- jump_bit Medium guide on pump.fun graduation mechanics
- https://smithii.io/en/graduate-token-pump-fun
