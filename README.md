# Squeek League

A mobile-first community prediction game about Squeektoshi’s wheel habits. Built with React, TypeScript, Vite, and ethers v6. **Sepolia testnet only. No money, no prizes. Not made by the Squeekchain team.**

The complete static website is in **`dist/`**, including local fonts, bundled dependencies, favicon, and `social-card.png` (1200 × 630). It works under a static-hosting subpath. There is no backend and nothing to deploy on-chain.

## Install, run, rebuild

Use Node 22.12+ or Node 24 and npm:

```sh
npm ci
npm run dev
```

For the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

Serve the contents of `dist/` on a static host. Vite’s base is `./`; navigation uses hashes, so server route rewrites are unnecessary. Keep every exported asset with `index.html`. Normal builds do not need Playwright or a running RPC. Live game data requires access to the allowed services below.

## Play

- **Draft:** select 3 distinct UTC hours in 3 taps, or select Sleep call. Each tile also shows your device’s local time. Press **Lock my picks** once and confirm the transaction in your wallet. Connection and wallet confirmation are additional wallet steps; the app never bypasses consent. A locked pick is public and cannot change.
- **Activity:** inspect all certified history, filter completed days, select cells for exact counts, or download CSV. Partial days are marked. The heatmap scrolls within its own region on narrow screens.
- **What-if:** works without a wallet. Test 3 hours or Sleep across complete pre-league days and settled league days. Results update immediately and never affect league points.
- **Replay:** open a settled match, including a direct `#replay/0` link. Inspect its 144 rounds, highlight a player’s picks, and read every public pick and score. Full addresses expand in place. Unscored calculated points are labelled.
- **League:** view contract season totals, shared leaders, the labelled House Bot, and personal history. Anyone can settle the next day in order, review and score batches of at most 8 unscored players, and crown a completed season.
- **Rules:** plain-language scoring, timing, settlement, privacy, and community disclaimer. Share buttons generate local result PNGs; what-if cards are explicitly labelled.

The app drafts the next UTC day, or day 0 before the league starts. Match and season numbers in the interface are one-based; contract days and seasons are zero-based. A draft may be edited locally outside its lock window, but it cannot be submitted then. The contract’s `lockWindow` read controls the countdown and availability.

## Existing deployment

| Setting | Value |
| --- | --- |
| Network | Ethereum Sepolia, chain `11155111` |
| League | `0xaDEA9907bAA30D7B54E7B9Eb6F6551B9A0088e08` |
| First event scan block | `12079298` |
| Day 0 start | `2026-11-08T00:00:00Z` |
| First league round | `601` |
| Round epoch | `2026-11-03T19:50:00Z`, plus 600 seconds × round ID |

The ownerless contract is already deployed. No deploy scripts, keys, owner settings, or replacement contracts are included. Configuration and human-readable ABIs live in `src/config.ts`.

A draft earns `floor(100 × active rounds in its 3 slots / 18)`. Sleep earns 25 only if all 144 rounds are idle. Each season has 7 days; tied human leaders share the title. The House Bot follows the contract’s statistical rule and is never crowned. Its day-d pick is hidden until `isSettled(d-2)` succeeds; the first two days therefore have no public preview.

## Data, caching, and safety states

- Calls use `https://ethereum-sepolia-rpc.publicnode.com`, with `https://sepolia.gateway.tenderly.co` as fallback. Logs use **Tenderly only**, in inclusive ranges of at most 5,000 blocks from the deployment block. Smaller ranges are retried when necessary.
- The API at `https://api.squeekchain.com/v1/economy/state` supplies `deployment.components.core.address`. It is compared with the league’s live `core()` on load and refresh. A mismatch displays **“Squeekchain was redeployed - this league is closed”** across the full width and disables locking. API verification failure also pauses locking, with a retry action.
- `state()` on the league-bound core supplies the certified frontier. Its first static ABI word is `settledThroughRound`; later economic fields are deliberately not decoded. The deployed `roundPage` returns a single dynamic page tuple; the ABI includes that wrapper, verified against live responses.
- History is read in spans of **at most 16 rounds**, never beyond the frontier. Omitted certified rounds are idle. The cache is keyed by core and frontier and supports incremental loading, retry checkpoints, and restricted-storage fallback. Failed data loads are not converted to idle days.
- Full pre-league days are computed from rounds. Settled league days use `slotCounts`. Unsettled league days are excluded from backtesting even when their raw rounds are certified.
- Logs cache the confirmed prefix, rescan the latest 12 blocks, deduplicate events, and exclude removed logs. Settled count caches include the settlement transaction hash. Clearing this site’s browser storage forces fresh reads; cached data is a convenience, not an independent verification of the RPC.
- Visible pages refresh data every 60 seconds; the countdown ticks every second. The status badge uses only `https://api.squeekchain.com/v1/status`: online freshness and positive RPM mean running. It is decoration and never enters scoring.
- `pickOf` is reread before scoring and filters already-scored picks. A transaction contains at most 8 players for one day. Wallet rejection, pending confirmation, success, and custom contract errors have explicit messages.

Wallets connect through EIP-6963 discovery or `window.ethereum`. Mobile visitors can open the page in a wallet’s browser. The app switches to, or adds, Sepolia. **The connected wallet estimates gas and fees; the app sets no gas limit.** Empty wallets get Sepolia faucet links. There is no relay, WalletConnect project ID, passkey service, or smart-wallet SDK: the assignment’s injected-wallet and permitted-network restrictions take precedence over the broader supplied wallet reference.

No analytics, tracking, private keys, external fonts, runtime CDN, seed leaderboard, demo mode, or hidden application services are present. The HTML CSP and optional `_headers` restrict background connections to the two RPC hosts and Squeekchain API. Faucet and wallet-app links navigate externally only when selected. Local storage holds public caches, unsigned drafts, theme, and wallet provider choice.

## Checks actually run

```sh
npm run typecheck
npm run build
npm test
PLAYWRIGHT_BROWSERS_PATH=test/scratch/browsers npx playwright install chromium webkit
PLAYWRIGHT_BROWSERS_PATH=test/scratch/browsers npm run test:browser
PLAYWRIGHT_BROWSERS_PATH=test/scratch/browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The last command used the assignment’s pinned probe; that input is removed from the submission. Our interaction script remains in `scripts/` and serves the export under `/preview/` within one bounded process.

Actual results: production build and typecheck passed; **14 logic/transport tests passed**; **15 Chromium interaction groups passed**, with no script errors or missing local resources; **taste@1 passed 16/16 checks**. All six screens had no page overflow at 320, 390, 768, and 1440px. The 390 × 844 draft has its primary action on the first screen. Selected-tile text contrast was measured in both themes (minimum 4.663:1 light, 4.678:1 dark).

Browser interaction tests use explicit synthetic RPC/wallet fixtures, never production sample data. They exercise wallet connection, Sepolia switching, wallet-estimated gas, rejection recovery, drafts, backtesting, CSV/PNG downloads, replay, score filtering, API failure, redeployment, the connected header at 15 widths from 320 to 780px on all six screens, `core()` failure, and log-scan failure followed by Retry. No actual transaction was broadcast. The first league day had not begun during validation, so live settled-day and crown transactions could not be exercised. Live read-only probes independently confirmed both RPC chain IDs, the bound core, contract lock window, certified history, and empty pre-launch event logs. A sampled frontier of 446 contained 36 active rounds and two complete pre-league UTC days; these are observations, not hard-coded fixtures in the app.

**Limitations:** direct browser outbound transport failed in this environment; live-payload UI inspection used a test-only Node transport bridge, not shipped in the app. WebKit could not launch because required OS libraries were unavailable. Physical mobile wallets, a real signature/confirmation, a screen reader, native 200% zoom, forced-colors rendering, and RTL mirroring were not verified. These are not claimed as passes. See the review below and [DESIGN.md](DESIGN.md).

## Better Interface review

Scope of this revision: the shared header and the loading, failure, and empty states on Activity, What-if, Replay, and League, checked on the production export under `/preview/`. The review record from the first round is not in this repository, so the rest of the product was covered here only by the interaction checks and taste@1 above, not re-reviewed line by line.

| Domain | Status | Evidence |
| --- | --- | --- |
| Accessibility | Checked | Failure notices now announce; existing keyboard, modal-focus, and focus-return checks pass. Screen reader not run. |
| Layout | Checked | Viewed 360 and 390 connected, plus failure screenshots at 390. Sweep below. |
| Writing | Checked | Failure copy says only what is known and offers Retry. |
| Typography | Checked | Brand stays on the existing `--text-base` token; taste@1 passed its type checks. |
| Colors | Checked | No color changes; selected-draft contrast re-measured at 4.663:1 light and 4.678:1 dark. Failure notices were viewed in light theme only. |
| UI | Checked | Reuses `ErrorNotice`, `Loading`, and `.text-button`; no new components. |

Findings, all fixed and rechecked:

- **HIGH, `src/styles.css:401`:** a connected wallet held the page at 405px wide on viewports from 360px up to that edge, clipping the address (measured at 360, 375, 384, 390, and 393px). The compact brand now applies through 430px, and the wallet icon is dropped below 390px. The second step is needed because the compact brand alone measured 1px of page overflow at 360px and left the control inside the 16px page padding at 375px.
- **MEDIUM, `src/useLeague.ts`, `src/components/Activity.tsx`, `src/components/Replay.tsx`:** a `core()` failure left Activity, What-if, and Replay loading forever. It now also fails history, each screen shows the error with Retry, and loaders show only while a request is pending. This also fixes Activity showing a loader beside a real history error and League's endless season loader.
- **MEDIUM, `src/components/Replay.tsx`, `src/components/Standings.tsx`, `src/components/Backtest.tsx`:** failed reads were presented as empty results. Picks stay unknown until a log scan succeeds, the screens say "Player history unavailable", and a failed rescan withdraws earlier empty claims. What-if no longer says no days are available while history is failing or still loading.
- **MEDIUM, `src/components/Shared.tsx`:** failure notices replaced an announced loader with silent text. `ErrorNotice` is now `role="alert"`.
- **LOW, `src/components/Standings.tsx`:** "1 picks pending" is now singular.

Left as is: at 390px the League table's last column starts clipped inside its labelled, focusable scroll region. It is reachable by scrolling, and the page itself does not overflow.

Completion: complete for the stated scope, with the limitations listed above.

## Repository layout and byte budget

`src/` contains the app, contract transport, scoring, hooks, and components. `test/*.test.ts` contains delivered tests. `scripts/` contains the bounded browser validator, static preview helper, contrast checker, and optional social-card authoring script. `public/` holds the source export assets and license notices; `dist/` is the finished export.

The explicit `.gitignore` path budget is generated dependency trees (`**/node_modules/`), Vite/npm caches (`**/.vite/`, `**/.npm/`, `**/.cache/`), TypeScript build metadata (`**/*.tsbuildinfo`), and `/test/scratch/`. **`dist/` is deliberately included.** No dependency archives, registry mirror, submodule, or package cache belongs in the delivered bundle. Scratch files and browser downloads are excluded and are not build inputs.

The social card is already generated. To intentionally re-author it with installed Chromium: `node --import tsx scripts/social-card.tsx` (set `PLAYWRIGHT_BROWSERS_PATH` if your browser install uses a custom path), then rebuild.

Pixel hamster and wheel artwork are original inline SVG. Fonts are bundled locally under their OFL licenses; React, ethers, Lucide, and bundled dependency notices are in `public/licenses/` and exported with the site. Design guidance attribution is in [DESIGN.md](DESIGN.md), with the supplied combined license retained in `artifacts/design-guidance-LICENSE.txt`.

<!-- final-byte-budget -->
Final artifact audit: **85 files, 1,810,241 bytes total (1.726 MiB), below 8,388,608 bytes**. The complete `dist/` is 758,995 bytes. This count excludes the supplied inputs, protected metadata, generated dependencies/caches, and `test/scratch/`; it includes source, lockfile, export, documentation, licenses, and retained screenshots. All relative HTML/CSS asset references and both 1200 × 630 social PNG copies were checked; no deliverable symlink, submodule metadata, dependency archive, or cache was found.
