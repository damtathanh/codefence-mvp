create table if not exists customer_blacklist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  reason text,
  created_at timestamptz default now()
);

create unique index if not exists customer_blacklist_unique_user_phone
  on customer_blacklist (user_id, phone);

alter table customer_blacklist enable row level security;

create policy "Users can view their blacklist"
on customer_blacklist
for select
using (auth.uid() = user_id);

create policy "Users can insert their own blacklist"
on customer_blacklist
for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own blacklist"
on customer_blacklist
for delete
using (auth.uid() = user_id);
