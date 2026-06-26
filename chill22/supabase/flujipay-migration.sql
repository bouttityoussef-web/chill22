-- Add customer fields to orders table for FlujiPay webhook data
alter table orders add column if not exists customer_email text;
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists customer_phone text;
