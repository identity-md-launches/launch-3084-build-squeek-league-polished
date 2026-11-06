# Squeek League design system

## Overview

A phone-first prediction game for a community following a real hamster. The visual idea is a tiny, calm arcade league: pixel lettering and an original pixel hamster sit beside precise, readable game controls. The draft is the first product surface, with no marketing hero above it.

The canonical implementation is `src/styles.css`; structure and shared navigation are in `src/App.tsx`. The production export mirrors this source. The reference desktop has a draft/scene pair; a phone leads with the interactive draft, then the live status and House Bot. Other screens reuse the same headings, surfaces, controls, and data treatments.

## Colors

Semantic CSS custom properties are defined at `src/styles.css:1`. The dark override is `:root[data-theme='dark']` at line 36. All values are sRGB hex. Theme choice initially follows the system and can be changed with the header control; the `data-theme` mechanism is the only switch. `App.tsx` suppresses transitions during a theme change.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#f5f4ec` | `#17241d` | Page background |
| `--surface` | `#fffef9` | `#1f2e24` | Structural panels, fields, dialogs |
| `--surface-soft` | `#eeefe5` | `#24362a` | Quiet data fills, hover, Bot avatar |
| `--ink` | `#283e31` | `#e6eadb` | Main text and data |
| `--muted` | `#5e685b` | `#bac6b2` | Secondary labels, local time |
| `--line` | `#d5dacb` | `#40513d` | Borders and separators; never text |
| `--accent` | `#244d36` | `#bed398` | Primary action, selected outlines |
| `--accent-ink` | `#fffef5` | `#1b3021` | Text on primary action |
| `--accent-soft` | `#e2eacf` | `#30442d` | Supporting state fills |
| `--accent-hover` | `#183e28` | `#d2e3b2` | Primary hover |
| `--slot-bg` | `#f6f7f0` | `#26342a` | Unselected hours |
| `--slot-selected` | `#e0eacd` | `#3e5435` | Selected hours |
| `--danger` / `--danger-soft` | `#8d3c2c` / `#f8e9e1` | `#f2b2a0` / `#452d26` | Errors and redeploy closure |
| `--warning` / `--warning-soft` | `#79561c` / `#f5edce` | `#e3c784` / `#413924` | Waiting and replay misses |
| `--focus` | `#8b592d` | `#edc48f` | 2px keyboard outline, 3px offset |

The seven activity tokens `--heat-0` through `--heat-6` represent 0–6 active rounds. Light: `#e9eddf`, `#cad9ac`, `#b2ca8c`, `#94b668`, `#749a50`, `#50793e`, `#2e5433`. Dark: `#2b3b2a`, `#3e5435`, `#557142`, `#70904f`, `#89ac63`, `#abca80`, `#d1e5a5`. Exact counts remain available through cell labels and selected-cell feedback. Uncertified cells are transparent with dashed borders.

The illustration deliberately keeps a warm daylight palette in both themes (`#e2e9cf` scene, russet hamster, sage wheel). It is artwork, not a second UI palette. The share PNG uses the light palette for portable contrast.

Rendered selected-slot secondary text was measured at **4.663:1** (`#5e685b` over `#e0eacd`) in light and **4.678:1** (`#bac6b2` over `#3e5435`) in dark. These are specific audited states, not a claim that every possible rendered pair was checked. The pinned light entry-page contrast probe also passed.

## Typography

Fonts are packaged by `@fontsource` and loaded locally in `src/main.tsx`. DM Sans uses real 400, 500, and 700 files. Pixelify Sans uses its real 500 file, exclusively for branding, page titles, and the small numbered play steps. Prose and dense data stay in DM Sans; there is no monospace prose.

| Token | Default size | Role |
| --- | --- | --- |
| `--text-xs` | 12px / `.75rem` | Captions, local hours, compact mobile navigation |
| `--text-sm` | 14px / `.875rem` | Buttons, table data, hints |
| `--text-base` | 16px / `1rem` | Body, slot numbers, input/select text |
| `--text-lg` | 20px / `1.25rem` | Section headings, mobile brand |
| `--text-xl` | 28px / `1.75rem` | Phone page titles, desktop brand, totals |
| `--text-display` | 40px / `2.5rem` | Desktop page titles, backtest average |

Body line height is 1.5. H1 is 1.1 with `-.035em` tracking; H2 is 1.3 with `-.02em`; H3 is 1.4. Headings use balanced wrapping, descriptions use pretty wrapping. Rules are limited to 70ch. Timers, slot labels, and addresses use tabular numerals. Native inputs/selects stay at 16px to avoid iOS input zoom.

The final probe observed two font families and three weights, five regularly repeated sizes on each entry viewport, and at most six including one-offs. Canvas artwork uses separate export dimensions and typography; it is not the interface type scale.

## Layout

The shared maximum width is 1216px including desktop inline padding of 32px. Header, navigation, and content align to the same edges. Common component gaps are 8, 12, 16, 20, and 24px; section separation is 28–44px. The slot grid has six columns throughout, with gaps of 8px desktop, 7px phone, and 5px at the narrowest breakpoint. Insets and much directional spacing use logical CSS properties.

- **Above 1050px:** draft and illustration use `1.3fr 1fr`, separated by 24px. Backtesting is two equal columns. Rules use a reading column and a summary aside.
- **At 1050px:** panels tighten from 24px to 20px padding, draft split becomes `1.2fr 1fr`, and replay changes from 8 to 6 hour columns.
- **At 780px:** main content becomes one column with 24px side margins; the draft’s supporting content can use a smaller two-column layout; replay uses 4 columns. Network label and decorative navigation note are removed when they do not fit.
- **At 540px:** margins are 16px, panels use 18px × 16px padding and 10px radius, navigation is five equal columns, H1 is 28px. The full scene is hidden in favor of the small heading hamster and a text live badge after the draft. Slot buttons are at least 55px tall. The three play steps and maintenance tools stack.
- **At 359px:** panel inline padding is 12px, slot gaps are 5px, the header brand uses 16px and omits its redundant hamster icon. The title can wrap. No critical data is clipped.

The heatmap and wide tables scroll within named, focusable regions; the page itself does not scroll horizontally. The heatmap says to swipe on phones. Full player addresses expand in the table flow rather than floating outside the scroll region.

Observed: all six routes reflowed without page overflow at 320, 390, 768, and 1440px. At 390 × 844, the title, all 24 slots, and Lock my picks are on the first screen. The settled replay intentionally continues vertically. Native 200% zoom and RTL mirroring were not exercised.

## Elevation & depth

The system is flat. A 1px structural border or a tonal fill separates a region; there are no box shadows or gradient text. `.panel > .notice` becomes an inline colored rule instead of a nested card. The wheel scene clips only decorative artwork.

Native dialogs sit in the top layer. Their backdrop is `#10221899` with a 3px blur. Toast-like transaction notices stay in document flow, remain until dismissed or replaced, and cannot cover the draft. The full-width redeploy banner precedes the header.

## Shapes

Desktop panels and scene: 12px radius; phone panels: 10px; ordinary controls: 6px; Bot avatar: 8px; heat cells: 3px; round cells: 1px. The mobile wallet sheet has 16px top corners. Pixel hamster art uses crisp rectangular steps; ordinary controls retain a readable modern shape.

## Components

| Component / source | Reuse and states |
| --- | --- |
| `SlotPicker`, `src/components/SlotPicker.tsx` | Controlled `pick`, `onChange`, `day`, optional `disabled` and test `id`. Exactly three distinct slots, instant fourth-slot guard, deselection, Sleep alternative, Clear. Native buttons expose `aria-pressed`; the count is a polite status. Selected state adds a check and outline, not color alone. |
| `Draft`, `src/components/Draft.tsx` | Holds the unsigned local draft. Countdown, checking/open/closed/locked/waiting states, one lock transaction, core-verification gate, inline retry, faucet links for an empty wallet. |
| `.primary`, `.secondary`, `.text-button`, `.icon-button`, `src/styles.css` | One filled primary action per main task. Neutral secondary actions; text links for navigation/support. Hover is pointer-gated, active uses 0.96 scale, disabled uses 55% opacity, keyboard uses the focus token. |
| `WalletDialog`, `src/components/WalletDialog.tsx` | One header connect control opens a native modal. Discovered providers, browser-wallet fallback, mobile deep links, connecting/error states, full connected address, disconnect, Sepolia switch, and faucets. Escape/backdrop/close button dismiss it; explicit Tab wrapping via `containDialogFocus` and native focus restoration. |
| `ErrorNotice`, `Loading`, `Address`, `Faucets`, `src/components/Shared.tsx` | Recoverable nearby feedback, optional retry, static loading marker, expandable full public addresses, deliberate external faucet links. |
| Activity patterns, `src/components/Activity.tsx` | All-history grid, completed-day filter, 0–6 ramp, exact cell details, partial markers, optional CSV download; loading and failure stay explicit. |
| Replay patterns, `src/components/Replay.tsx` | Settled-day and player selectors, 24 hours × 6 rounds, active/idle and drafted hit/miss states, accessible text labels, public results table. Unknown rounds are not presented as idle. |
| Standings patterns, `src/components/Standings.tsx` | Authoritative scores, shared ranks, labelled non-champion House Bot, public personal history, ordered maintenance actions, reviewable score batches. |
| `ShareDialog`, `src/components/Share.tsx` | Native modal with a 1200 × 630 canvas. Distinguishes what-if from certified results. Uses file sharing when supported and always offers PNG download. |
| `HamsterMark`, `WheelScene`, `src/components/PixelArt.tsx` | Original inline SVG assets. Mark is decorative; scene has an accessible description. No motion is required to understand wheel status. |

High-frequency control transitions last 120ms with `cubic-bezier(.2,0,0,1)`. They are enabled only when reduced motion is not requested. The refresh spinner is also motion-guarded; smooth scrolling turns off under reduced motion. Theme changes explicitly suppress transitions.

## Do’s and don’ts

Start a screen inside `App`’s shared content wrapper, use one `.page-heading` and H1, then a task-focused panel or data layout. Reuse `SlotPicker` rather than rebuilding a second selection model. Reuse semantic tokens and the six type sizes. Keep inputs at 16px and errors beside their action with a retry route.

Keep the House Bot a labelled statistical player and show only contract-backed league points. Preserve UTC meaning and local-time labels. Do not substitute missing data with zeros, use color alone for a pick/result, hide a full address permanently, add a hero above the draft, introduce another font, or add border-plus-shadow surfaces. Use a neutral maintenance action unless it is the one primary action currently being reviewed.

Design guidance: adapted from Jakub Krehel’s Better Interface, MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: Paul Bakaus’s Impeccable, Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. Supplied license texts are retained in `artifacts/design-guidance-LICENSE.txt`. The six-domain review and its explicit limitations are in `artifacts/validation.md`.
