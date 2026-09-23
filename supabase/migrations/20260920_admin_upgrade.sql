-- DS FITNESS admin upgrade: CORENERGY-style member management on the existing DS FITNESS database
create extension if not exists pgcrypto;

-- Settings compatibility
alter table public.gym_settings add column if not exists gym_name text;
alter table public.gym_settings add column if not exists contact_number text;
alter table public.gym_settings add column if not exists whatsapp_number text;
alter table public.gym_settings add column if not exists expiring_soon_days integer not null default 7;
update public.gym_settings
set gym_name = coalesce(nullif(gym_name,''),'DS FITNESS'),
    contact_number = coalesce(nullif(contact_number,''), phone1),
    whatsapp_number = coalesce(nullif(whatsapp_number,''), phone1),
    expiring_soon_days = coalesce(expiring_soon_days, 7)
where gym_name is null or gym_name = '' or contact_number is null or whatsapp_number is null;

-- Member fields used by the CORENERGY-style admin panel
alter table public.members add column if not exists member_code text;
alter table public.members add column if not exists mobile text;
alter table public.members add column if not exists alt_mobile text;
alter table public.members add column if not exists date_of_birth date;
alter table public.members add column if not exists gender text;
alter table public.members add column if not exists address text;
alter table public.members add column if not exists emergency_contact text;
alter table public.members add column if not exists photo_path text;

-- Keep old phone data usable as mobile.
update public.members set mobile = coalesce(nullif(mobile,''), phone) where mobile is null or mobile = '';

-- Human-readable member IDs.
create sequence if not exists public.ds_member_code_seq start 1;
create or replace function public.generate_member_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  n := nextval('public.ds_member_code_seq');
  return 'DSF-' || lpad(n::text, 4, '0');
end;
$$;

-- Backfill any existing rows, then enforce uniqueness.
do $$
declare r record; code text;
begin
  for r in select id from public.members where member_code is null order by created_at, id loop
    code := public.generate_member_code();
    update public.members set member_code = code where id = r.id;
  end loop;
end $$;

create unique index if not exists members_member_code_uidx on public.members(member_code);

-- Membership history (one member can have many memberships/renewals).
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  plan text not null,
  duration_days integer not null default 30,
  start_date date not null,
  expiry_date date not null,
  fee numeric(10,2) not null default 0 check (fee >= 0),
  renewed_from_membership_id uuid references public.memberships(id),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists memberships_member_idx on public.memberships(member_id);
create index if not exists memberships_expiry_idx on public.memberships(expiry_date);

-- Payment history compatibility.
alter table public.payments add column if not exists membership_id uuid;
alter table public.payments add column if not exists purpose text default 'Membership';
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists notes text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payments_membership_id_fkey') then
    alter table public.payments add constraint payments_membership_id_fkey
      foreign key (membership_id) references public.memberships(id) on delete cascade;
  end if;
end $$;
create index if not exists payments_membership_idx on public.payments(membership_id);

-- System config used only by the login/setup guard.
create table if not exists public.system_config (
  id integer primary key default 1 check (id = 1),
  setup_completed boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.system_config(id, setup_completed) values (1, true)
on conflict (id) do update set setup_completed = true;

-- Existing admin account was already created manually.
alter table public.system_config enable row level security;
drop policy if exists "system_config_read_all" on public.system_config;
create policy "system_config_read_all" on public.system_config for select using (true);

-- Authenticated admin access for the new tables.
alter table public.memberships enable row level security;
drop policy if exists "authenticated manage memberships" on public.memberships;
create policy "authenticated manage memberships" on public.memberships for all to authenticated using (true) with check (true);

-- Ensure the existing payments table remains usable by authenticated admins.
drop policy if exists "authenticated manage payments" on public.payments;
create policy "authenticated manage payments" on public.payments for all to authenticated using (true) with check (true);

-- Member photos: keep the bucket private for admin-only access.
update storage.buckets set public = false where id = 'member-photos';
drop policy if exists "public read member photos" on storage.objects;
drop policy if exists "authenticated upload member photos" on storage.objects;
drop policy if exists "authenticated delete member photos" on storage.objects;
drop policy if exists "member_photos_read_authenticated" on storage.objects;
drop policy if exists "member_photos_write_authenticated" on storage.objects;
drop policy if exists "member_photos_update_authenticated" on storage.objects;
drop policy if exists "member_photos_delete_authenticated" on storage.objects;
create policy "member_photos_read_authenticated" on storage.objects for select to authenticated using (bucket_id = 'member-photos');
create policy "member_photos_write_authenticated" on storage.objects for insert to authenticated with check (bucket_id = 'member-photos');
create policy "member_photos_update_authenticated" on storage.objects for update to authenticated using (bucket_id = 'member-photos') with check (bucket_id = 'member-photos');
create policy "member_photos_delete_authenticated" on storage.objects for delete to authenticated using (bucket_id = 'member-photos');

-- Seed memberships for the six DS FITNESS plans only when a member has no history.
do $$
declare r record; p record; s date; e date; m uuid;
begin
  for r in select id, membership_plan, start_date, expiry_date, payment_status from public.members where membership_plan is not null loop
    if not exists (select 1 from public.memberships where member_id = r.id) then
      select id, name, price, duration into p from public.membership_plans where name = r.membership_plan limit 1;
      s := coalesce(r.start_date, current_date);
      e := coalesce(r.expiry_date, s + 30);
      insert into public.memberships(member_id, plan, duration_days, start_date, expiry_date, fee)
      values (r.id, coalesce(r.membership_plan, 'Custom'), greatest(e-s,1), s, e, coalesce(p.price,0)) returning id into m;
      if r.payment_status = 'paid' and coalesce(p.price,0) > 0 then
        insert into public.payments(member_id, membership_id, amount, payment_date, purpose, method)
        values (r.id, m, p.price, s, 'Membership', 'Legacy');
      end if;
    end if;
  end loop;
end $$;
