create extension if not exists pgcrypto;

create table if not exists public.gym_settings (
  id uuid primary key default gen_random_uuid(),
  description text default '',
  phone1 text default '+91 88903 11555',
  phone2 text default '+91 92145 80585',
  timings text default '5:00 AM - 10:00 AM | 4:00 PM - 10:00 PM',
  address text default 'DS FITNESS, Tirtham Circle, Near Union Bank, Hanuman Hatha, Bikaner, Bikaner City, Rajasthan - 334001',
  instagram_url text default 'https://www.instagram.com/dsfitnessbkn/',
  maps_url text default 'https://maps.app.goo.gl/AJGH8dacLCNuopdu5',
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  duration text not null,
  category text not null default 'Gym',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  member_photo_url text,
  membership_plan text,
  start_date date,
  expiry_date date,
  payment_status text not null default 'pending' check (payment_status in ('paid','pending','partial')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_date date not null default current_date,
  method text default 'cash',
  status text not null default 'paid' check (status in ('paid','pending','refunded')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  storage_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists members_expiry_idx on public.members(expiry_date);
create index if not exists members_phone_idx on public.members(phone);
create index if not exists payments_member_idx on public.payments(member_id);
create index if not exists gallery_sort_idx on public.gallery(sort_order, created_at);

alter table public.gym_settings enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.gallery enable row level security;

-- Public can read public website content.
drop policy if exists "public read active plans" on public.membership_plans;
create policy "public read active plans" on public.membership_plans for select using (is_active = true);
drop policy if exists "public read active gallery" on public.gallery;
create policy "public read active gallery" on public.gallery for select using (is_active = true);
drop policy if exists "public read settings" on public.gym_settings;
create policy "public read settings" on public.gym_settings for select using (true);

-- Authenticated admins can manage admin data. Restrict dashboard access to signed-in users.
drop policy if exists "authenticated manage plans" on public.membership_plans;
create policy "authenticated manage plans" on public.membership_plans for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage members" on public.members;
create policy "authenticated manage members" on public.members for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage payments" on public.payments;
create policy "authenticated manage payments" on public.payments for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage gallery" on public.gallery;
create policy "authenticated manage gallery" on public.gallery for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage settings" on public.gym_settings;
create policy "authenticated manage settings" on public.gym_settings for all to authenticated using (true) with check (true);

insert into public.gym_settings (description)
select 'DS Fitness is a focused training space in Bikaner led by Deepak Sharma, Certified Trainer.'
where not exists (select 1 from public.gym_settings);

insert into public.membership_plans(name,price,duration,category,sort_order)
select * from (values
 ('1 Month',1500,'1 Month','Gym',1),
 ('3 Months',4000,'3 Months','Gym',2),
 ('6 Months',7000,'6 Months','Gym',3),
 ('Yearly',12000,'12 Months','Gym',4),
 ('1 Month PT',6000,'1 Month','Personal Training',5),
 ('3 Months PT',15000,'3 Months','Personal Training',6)
) as v(name,price,duration,category,sort_order)
where not exists (select 1 from public.membership_plans);

-- Storage bucket for gallery images.
insert into storage.buckets (id, name, public) values ('gallery','gallery',true) on conflict (id) do nothing;
drop policy if exists "public read gallery storage" on storage.objects;
create policy "public read gallery storage" on storage.objects for select using (bucket_id = 'gallery');
drop policy if exists "authenticated upload gallery storage" on storage.objects;
create policy "authenticated upload gallery storage" on storage.objects for insert to authenticated with check (bucket_id = 'gallery');
drop policy if exists "authenticated delete gallery storage" on storage.objects;
create policy "authenticated delete gallery storage" on storage.objects for delete to authenticated using (bucket_id = 'gallery');

insert into storage.buckets (id, name, public) values ('member-photos','member-photos',true) on conflict (id) do nothing;
drop policy if exists "public read member photos" on storage.objects;
create policy "public read member photos" on storage.objects for select using (bucket_id = 'member-photos');
drop policy if exists "authenticated upload member photos" on storage.objects;
create policy "authenticated upload member photos" on storage.objects for insert to authenticated with check (bucket_id = 'member-photos');
drop policy if exists "authenticated delete member photos" on storage.objects;
create policy "authenticated delete member photos" on storage.objects for delete to authenticated using (bucket_id = 'member-photos');
