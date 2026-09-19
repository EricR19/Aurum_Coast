# Root Cause Analysis — Frozen / Jumping / Glitches (2026-09-19)

**Status:** 5 root causes found and fixed. `tsc --noEmit` → 0 errors · `next build` → exit 0.

## Why the previous rounds failed

`PERFORMANCE_FIXES.md` diagnosed everything as a **timing** problem (flags, `scrollend`, removing delays). The real causes were an **index-mapping bug**, a **GPU memory overrun**, and **history-stack corruption** — none fixable by timing changes. Issue #6's documented fix was also never actually implemented in the code that shipped.

---

## #1 — Wrong product / dead search tap (was the real "frozen search")

`lib/deepLink.ts` picked the target slide by index on the **raw JSON array**:

```ts
const idx = products.findIndex(...);
container.children.item(idx + 2);
```

But the DOM renders from `applyFilters()`, which sorts by `popularity`. Orders never match. Verified against real data — **11 of 12 products landed on the wrong watch**:

| slug | json → dom | off by |
|---|---|---|
| hamilton-khaki | 11 → 4 | **7** |
| casio-edifice | 2 → 8 | −6 |
| seiko-diver | 3 → 0 | 3 |
| tissot-prx | 1 → 3 | −2 |

With a brand filter active the index went out of range, `children.item()` returned `null`, and the function resolved silently → **tap did nothing**. That was the "frozen search", not the 370ms timeout that was removed earlier.

**Fix:** resolve the slide via `data-product-id` on the DOM. Order/filters now irrelevant by construction.

## #2 — Glitches / stuck image / freeze

`will-change: transform` was on `.h-screen-snap` (**15 sections**) *plus* inline on `<main>`. That's 16 permanent full-screen compositor layers ≈ **150 MB GPU texture** held all session on a 1080×2400 device. On exhaustion the compositor evicts and re-rasterizes tiles → stale frame stuck, scroll stalls, paint artifacts.

The earlier "fix" that *added* `will-change` turned an occasional raster miss into permanent memory pressure.

**Fix:** removed it from `.h-screen-snap` → `contain: layout paint` (same isolation, no GPU memory). `<main>` promotes only while `isScrolling`.

## #3 — Snap engine fighting programmatic scrolls

```ts
const onScrollEnd = () => {
  isProgrammaticScrollRef.current = false;  // reset...
  if (!touching) snapToNearest();           // ...never checked
};
```

The guard was **dead code** on the primary path (only the fallback at line 182 read it). Every deep link and search tap got a correcting `scrollTo` fired on top of it. Plus `snapToNearest`'s own smooth scroll re-fired `scrollend` → self-retriggering loop, broken only by a 2px threshold that fractional viewport heights defeated.

**Fix:** actually consume the flag; mark the snap's own `scrollTo`; tolerance 2px → 6px; max-scroll guard.

## #4 — Back button exits the app

`pushState` ran unconditionally but its cleanup sat **inside** the listener `if`. With `reactStrictMode: true`, React mounts→unmounts→remounts: two ghost entries pushed, one removed. Then `closeSheet()` called `history.back()` **unconditionally** — if the ghost was already consumed or overwritten by `scrollToProduct`'s racing `replaceState`, it navigated **off the site**.

**Fix:** `pushState` + cleanup in the same scope; `ghostEntriesRef` counter so `back()` only runs when a ghost is pending; removed the racing `replaceState` from the search path.

## #5 — Layout resizing under the finger

`--app-height` was applied 150ms after the toolbar settled — often still mid-fling. All 15 sections resized at once, every `offsetTop` shifted, content moved under the finger.

**Fix:** apply only when the feed is verifiably idle (two equal `scrollTop` reads), retry otherwise; round values; skip no-op writes.

---

## Files changed

| File | Fix |
|---|---|
| `lib/programmaticScroll.ts` | **new** — scroll coordination (TTL, not boolean) |
| `lib/deepLink.ts` | #1 |
| `components/mobile/MobileFeed.tsx` | #2, #3 |
| `app/globals.css` | #2 |
| `components/providers/SheetProvider.tsx` | #4 |
| `components/sheets/SearchSheet.tsx` | #1, #4 |
| `lib/useAppHeight.ts` | #5 |

## Notes

- **TTL over boolean:** if a `scrollTo` target equals the current position the browser emits no `scrollend`; a boolean would latch forever and swallow the next legitimate snap.
- `next lint` exits 1 — no `.eslintrc`, prompts for interactive setup. Pre-existing, unrelated. `next build` runs lint internally and passed.
- **Needs device verification** (touch/GPU behavior), especially #2.
