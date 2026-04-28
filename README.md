# AlphaBook

A personal stock trading strategy tracker. Log your trades, group them by strategy, and review your performance over time.

## Features

- **Strategy management** — create strategies and group trades under them
- **Multi-lot trades** — record multiple buy/sell lots per trade with individual dates, prices, and quantities
- **Performance metrics** — return rate, P&L, win rate per strategy
- **Cumulative return chart** — visualize closed-trade performance over time
- **Open position tracking** — clearly distinguish held vs. closed positions
- **Cross-platform** — runs on iOS, Android, and web

## Tech Stack

- [Expo](https://expo.dev) SDK 54 + Expo Router v6 (file-based routing)
- [NativeWind](https://www.nativewind.dev) v4 (Tailwind CSS for React Native)
- [Supabase](https://supabase.com) — auth + PostgreSQL database
- `react-native-svg` — hand-built SVG charts

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/alpha-book.git
cd alpha-book
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set up the database

In your Supabase project, run the following SQL:

```sql
create table strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  strategy_id uuid references strategies(id) on delete cascade not null,
  stock_name text not null,
  stock_code text not null,
  buy_lots jsonb not null default '[]',
  sell_lots jsonb not null default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table strategies enable row level security;
alter table trades enable row level security;

create policy "users manage own strategies" on strategies
  for all using (auth.uid() = user_id);

create policy "users manage own trades" on trades
  for all using (auth.uid() = user_id);

-- Grant permissions
grant select, insert, update, delete on public.strategies to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
```

### 4. Run

```bash
npm run web      # web (http://localhost:8081)
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Project Structure

```
app/
  _layout.tsx          Root layout — auth guard
  (auth)/login.tsx     Login + register
  (tabs)/
    index.tsx          Strategy list
    stats.tsx          Global statistics + charts
  strategy/[id].tsx    Strategy detail + trade list
  trade/
    new.tsx            New trade form
    [id].tsx           Edit trade form
components/
  DatePickerInput.tsx  Custom calendar date picker
  LotRow.tsx           Reusable buy/sell lot row
lib/
  supabase.ts          Supabase client
types/
  index.ts             Shared types + business logic
```

## Data Model

**`strategies`** — `id, user_id, name, description, tags[], created_at, updated_at`

**`trades`** — `id, user_id, strategy_id, stock_name, stock_code, buy_lots jsonb, sell_lots jsonb, notes, created_at, updated_at`

`buy_lots` and `sell_lots` are JSONB arrays of `{ date, price, quantity }`. A trade is "open" when total sell quantity is less than total buy quantity.

## License

MIT
