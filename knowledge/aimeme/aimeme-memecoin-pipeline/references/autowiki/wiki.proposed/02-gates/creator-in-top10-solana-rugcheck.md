---
id: 46
category: gates
function: Kill Solana Creator Top-Holder
status: proposed
related: [20, 22, 28, 29, 32]
---

# Solana Creator In Top10 via Rugcheck

## Rule

For Solana tokens, fetch Rugcheck full report and compare `creator` against `topHolders[].owner`. If any top-10 holder account is owned by the creator, **REJECT (hard kill, step 5)**, even when `creatorBalance` is zero.

## Why

`creatorBalance` alone can be misleading because Solana token ownership lives through token accounts. A creator may have zero direct balance while still controlling a top holder token account. The pipeline already hard-kills "creator address in top 10 holders"; Rugcheck gives the Solana implementation path through `topHolders[].owner`.

## Evidence — SUEAAUAN

Cycle 10 surfaced `SUEAAUAN` (`7qbSRkHEKXioezZQZQQBdAU7Z6WJnHTDQSAEyDYpump`) via Nansen smart-money holdings: 4 SM holders, ~$20.5k SM value, age 1d, mcap ~$362k. Surface checks were attractive: Rugcheck score_normalised 1, LP locked ~95.4%, no risks, mint/freeze null, DexScreener h1/h6/h24 all strongly positive.

The full Rugcheck report showed creator `FvYsGPiQoG5A7aQsbQM7bR3VdjY2TKeG8xLwhBQMNQWY`. A top-10 token account (`EJDmun...`) owned by that creator held ~3.02% of supply. This is a creator-in-top10 hard gate even though `creatorBalance` was reported as 0. Without checking `topHolders[].owner`, the token would have looked like a possible C/D-tier momentum entry.

## Implementation

```ts
const creator = report.creator;
const creatorTopHolder = report.topHolders
  .slice(0, 10)
  .find((holder) => holder.owner === creator);

if (creatorTopHolder) {
  return reject("creator-in-top10-solana");
}
```

Exclude AMM/pool owners when computing concentration, but do not exclude creator-owned token accounts.

## Related

- Extends [[creator-in-top10-evm-kill]]
- Supports [[../wiki/top-holder-dumping]]
- Implements [[../pipeline.md]] step 5 hard gates
