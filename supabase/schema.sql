-- 策略表
create table strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  tags text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 交易记录表
create table trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  strategy_id uuid references strategies(id) on delete cascade not null,
  stock_name text not null,
  stock_code text not null,
  buy_time timestamptz not null,
  buy_price numeric(12,4) not null,
  buy_quantity integer not null,
  sell_time timestamptz,
  sell_price numeric(12,4),
  sell_quantity integer,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 开启行级安全
alter table strategies enable row level security;
alter table trades enable row level security;

-- 策略表策略：只能操作自己的数据
create policy "own strategies" on strategies
  for all using (auth.uid() = user_id);

-- 交易表策略：只能操作自己的数据
create policy "own trades" on trades
  for all using (auth.uid() = user_id);
