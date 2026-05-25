---
name: Typosquat OSS Token Name Pattern
description: Pattern recognition — token_name = real OSS project + github URL field = serial rug template; Nansen SM-holdings can surface these falsely
type: pattern
---

# Typosquat OSS Token Name — Coordinated Rug Template

## Pattern

Token GoPlus `token_name` field formatted as `{REAL_OSS_PROJECT_NAME} github.com/{org}/{NAME}`, where `{NAME}` matches a known open-source project. The contract impersonates a real OSS project to lend false credibility. Almost always paired with `honeypot_with_same_creator=1` on a creator wallet that has deployed several such tokens in batch.

## Why

The signal that should trigger suspicion: legitimate token projects do not embed a GitHub URL in their on-chain token_name string. That field is meant for human-readable name only. The presence of `github.com/...` inside the name is itself a tell. Combined with name = real OSS project, it is a high-confidence rug fingerprint.

The Nansen `/smart-money/holdings` endpoint can surface these falsely — either because SM-labeled wallets are being orchestrated by the rug deployer, or because Nansen labels wallets by historical PnL without re-checking when those wallets enter known-rug templates. **SM accumulation on a typosquat-named token is not a legitimating signal.**

## Cycle-9 evidence

Single creator `0xd95a366a2c887033ba71743c6342e2df470e9db9` deployed at minimum:

| Symbol | Address | token_name field | SM holders surfaced |
|---|---|---|---|
| NOCOBASE | `0xadf61f225bc836d517c238ae3a08d2a5321b25c0` | `NOCOBASE github.com/nocobase/NOCOBASE` | 10 |
| PRISMA | `0xadf0d31463cb2f2a88dbf0bcb22964a7d5960c25` | `PRISMA github.com/prisma/PRISMA` | 9 |

Both real projects:
- NocoBase: open-source no-code platform (github.com/nocobase/nocobase)
- Prisma: open-source Node.js ORM (github.com/prisma/prisma)

Both contracts read clean GoPlus on every other axis (no honeypot, no tax, no proxy, no mint, no hidden owner). The `honeypot_with_same_creator=1` flag is the only programmatic kill. The typosquat name is the human-readable confirmation.

## How to apply

Add a soft pre-check at step 3 (post-GoPlus fetch, pre-paid-Nansen):

```python
name = goplus.token_name or ""
if "github.com/" in name.lower():
    flag("typosquat-oss-name")
    if goplus.honeypot_with_same_creator == "1":
        return REJECT("typosquat-oss-rug-template")
```

Maintain a list of known-creator addresses caught with this template — if a future contract has the same creator, hard kill before scanning.

## Why this matters for the discovery layer

The Nansen SM-holdings discovery vector is **not safe alone** for paid entry. SM accumulation must always be cross-validated with GoPlus safety scan before any score. The cycle-9 pipeline correctly caught these two via GoPlus despite Nansen ranking them top-2 by SM holder count.

## Related

- [[goplus-honeypot-with-same-creator-kill]]
- [[../wiki/livo-launchpad-backdoor]]
- [[../wiki/sm-conviction-is-non-negotiable]] — SM-holders count alone is necessary not sufficient
- pipeline.md step 3
