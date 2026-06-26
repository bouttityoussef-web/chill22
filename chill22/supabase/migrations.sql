-- Run this in your Supabase SQL Editor

-- Orders table (new)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  plan_label text,
  amount numeric(10,2) default 0,
  status text default 'paid', -- 'paid' | 'pending'
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table orders enable row level security;

-- Admin can do everything (service role bypasses RLS)
-- Clients can only see their own orders
create policy "Clients can view own orders" on orders
  for select using (auth.uid() = client_id);

-- Make sure subscriptions table has end_date column
alter table subscriptions add column if not exists end_date date;
