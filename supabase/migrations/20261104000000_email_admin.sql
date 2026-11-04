-- Email tables for Backfield OS.
-- Ship this file only. Do not run it from the app, a preview, or a script.
-- Timestamps are timestamptz, stored in UTC.
-- Email is unique on the lowercased value.
-- Row level security is on and no policies are created, so the anon role cannot read or write.
-- The server uses the service role, which bypasses row level security.

create table if not exists email_subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null,
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_subscribers_email_lower_idx
  on email_subscribers (lower(email));

create table if not exists email_lists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references email_subscribers (id),
  list_id uuid not null references email_lists (id),
  consent_source text not null default '',
  consent_at timestamptz not null default now(),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_subscriptions_status_chk check (status in ('active', 'pending', 'unsubscribed')),
  constraint email_subscriptions_subscriber_list_key unique (subscriber_id, list_id)
);

create table if not exists email_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists email_subscriber_tags (
  subscriber_id uuid not null references email_subscribers (id),
  tag_id uuid not null references email_tags (id),
  created_at timestamptz not null default now(),
  primary key (subscriber_id, tag_id)
);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subject text not null default '',
  html text not null default '',
  plain_text text not null default '',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references email_templates (id),
  issue_label text,
  list_id uuid references email_lists (id),
  state text not null default 'draft',
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_sends_state_chk check (state in ('draft', 'test', 'scheduled', 'sent'))
);

create table if not exists email_lead_magnets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  page_path text not null default '',
  delivery_subject text not null default '',
  delivery_text text not null default '',
  handoff_opt_in_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_unsubscribe_tokens (
  token text primary key,
  subscriber_id uuid not null references email_subscribers (id),
  list_id uuid not null references email_lists (id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table email_subscribers enable row level security;
alter table email_lists enable row level security;
alter table email_subscriptions enable row level security;
alter table email_tags enable row level security;
alter table email_subscriber_tags enable row level security;
alter table email_templates enable row level security;
alter table email_sends enable row level security;
alter table email_lead_magnets enable row level security;
alter table email_unsubscribe_tokens enable row level security;

revoke all on email_subscribers from anon, authenticated;
revoke all on email_lists from anon, authenticated;
revoke all on email_subscriptions from anon, authenticated;
revoke all on email_tags from anon, authenticated;
revoke all on email_subscriber_tags from anon, authenticated;
revoke all on email_templates from anon, authenticated;
revoke all on email_sends from anon, authenticated;
revoke all on email_lead_magnets from anon, authenticated;
revoke all on email_unsubscribe_tokens from anon, authenticated;
