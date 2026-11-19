# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/nimble-condor-29/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/nimble-condor-29/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

The best token launch radar: it reads a frozen DefiLlama snapshot of 758
protocols, finds the ones that record no token, ranks them by what their
launch would be worth, and shows a reader how to farm each one — on a
dashboard with a sortable, filterable board, a detail view per protocol,
and the farm plan beside every row.

The value model is stated in full in the dashboard and in `lib/model.ts`:
implied value = TVL × 0.30 × growth × maturity × breadth × category,
where growth follows the 7-day TVL change, maturity follows how long the
protocol has run with no token, breadth follows multi-chain reach, and the
category tilt follows the kind of business a launch would reprice. No
protocol name is ever special-cased. Protocols whose token already trades
are kept apart in a separate live view and are never ranked; wrapped,
staked, bridged and exchange products are excluded outright.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path to snapshot.json>
```

Reads `/input/snapshot.json` (or `--input <snapshot.json|directory>`),
writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and
`dossier.json` to `/output` (or `MAKEFUN_OUTPUT_DIR`). Node 22 or later,
standard library only, deterministic, no network.

---

<sub>Entered on [make.fun](https://make.fun/?ref=gk6zm613&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
