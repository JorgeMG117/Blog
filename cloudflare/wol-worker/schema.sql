create table if not exists wol_command (
  slot integer primary key check (slot = 1),
  id text not null,
  action text not null,
  created_at text not null,
  expires_at text not null,
  delivered_at text null,
  acked_at text null
);
