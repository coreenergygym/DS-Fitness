-- DS FITNESS: payment-level discount support
-- Discount is treated as membership credit, while `amount` remains actual money received.
alter table public.payments
  add column if not exists discount numeric(10,2) not null default 0
  check (discount >= 0);
