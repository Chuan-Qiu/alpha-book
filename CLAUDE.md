# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run web        # Start Expo dev server for web (http://localhost:8081)
npm run ios        # Start for iOS simulator
npm run android    # Start for Android emulator
npm start          # Start Expo dev server (choose platform interactively)
```

No test runner or linter is configured yet.

## Architecture

**AlphaBook** is a personal stock trading strategy tracker. Single-user, no multi-tenancy beyond Supabase RLS.

### Stack

- **Expo SDK 54** with Expo Router v6 (file-based routing)
- **NativeWind v4** (Tailwind CSS for React Native) — all styling via `className`
- **Supabase** — auth (email/password) + PostgreSQL database
- **react-native-svg** — used directly to render charts (Victory Native v41 was installed but its new Skia-based API is not used; SVG charts are hand-built)

### Routing structure

```
app/
  _layout.tsx          Root layout — auth guard (redirects to login or tabs)
  (auth)/login.tsx     Login + register screen
  (tabs)/
    index.tsx          Strategy list (home)
    stats.tsx          Global statistics + charts
  strategy/[id].tsx    Strategy detail — trade list + cumulative return chart
  trade/
    new.tsx            New trade form (strategyId passed as query param)
    [id].tsx           Edit trade form
```

The auth guard in `app/_layout.tsx` uses `supabase.auth.onAuthStateChange` + `useSegments` to redirect between `/(auth)` and `/(tabs)`.

### Navigation note (web)

`router.back()` is unreliable on Expo web. All back navigation uses explicit `router.replace(path)` with a known destination (e.g. `router.replace("/(tabs)")` or `router.replace(\`/strategy/${strategyId}\`)`).

### Data model

Two Supabase tables, both RLS-protected (`auth.uid() = user_id`):

**`strategies`** — `id, user_id, name, description, tags[], created_at, updated_at`

**`trades`** — `id, user_id, strategy_id, stock_name, stock_code, buy_lots jsonb, sell_lots jsonb, notes, created_at, updated_at`

`buy_lots` and `sell_lots` are JSONB arrays of `{ date: string, price: number, quantity: number }`. A trade is considered "open" when `sell_lots` is empty or total sell quantity < total buy quantity.

> ⚠️ `supabase/schema.sql` is outdated — it still has the old single-lot columns. The live database uses the jsonb array schema described above. When recreating from scratch, run the correct SQL manually.

### Types and business logic (`types/index.ts`)

All shared types (`Trade`, `Strategy`, `Lot`) and pure calculation functions live here:
- `isOpen(trade)` — whether a position is still open
- `calcReturn(trade)` — `{ rate, pnl }` based on all buy/sell lots
- `avgPrice(lots)` — quantity-weighted average price
- `formatPercent` / `formatCurrency` — display helpers

### Charts

Charts are built with `react-native-svg` directly (no charting library). Two chart types exist:
- **Line/area chart** (`ReturnChart` in `strategy/[id].tsx`, `TotalReturnChart` in `stats.tsx`) — cumulative return over time
- **Bar chart** (`StrategyBarChart` in `stats.tsx`) — per-strategy return comparison

Both use a fixed pixel width (340px) with manual coordinate math. Only rendered when there are ≥ 2 data points.

### Web-specific workarounds

- `Alert.prompt` (iOS-only) is replaced with inline `TextInput` state in the strategy list
- Multi-button `Alert.alert` confirmations use `window.confirm` on web via `Platform.OS === "web"` checks
- `expo-secure-store` is skipped on web (Supabase falls back to localStorage)

### Environment variables

Stored in `.env` (Expo reads `EXPO_PUBLIC_*` at build time):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Supabase permissions

Both tables require explicit grants (auto-grant was disabled at project creation):
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
```
