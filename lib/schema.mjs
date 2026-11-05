export const SCHEMA = [
`create table if not exists users(
  id serial primary key, email text unique not null, name text not null default '',
  password_hash text not null, role text not null default 'editor',
  totp_secret_enc text, totp_pending_enc text, totp_enabled boolean not null default false,
  totp_last_step bigint not null default 0, created_at timestamptz not null default now())`,
`create table if not exists sessions(
  id text primary key, user_id int not null references users(id) on delete cascade,
  pending boolean not null default false, expires_at timestamptz not null, created_at timestamptz not null default now())`,
`create table if not exists recovery_codes(
  id serial primary key, user_id int not null references users(id) on delete cascade,
  code_hash text not null, used_at timestamptz)`,
`create table if not exists attempts(key text not null, ts timestamptz not null default now())`,
`create index if not exists attempts_key on attempts(key, ts)`,
`create table if not exists categories(
  id serial primary key, slug text unique not null, name text not null, color text default '#00C8E0',
  description text default '', sort int not null default 0)`,
`create table if not exists authors(
  id serial primary key, name text not null, role text default '', bio text default '', photo_url text,
  sort int not null default 0, visible boolean not null default true, created_at timestamptz not null default now())`,
`create table if not exists articles(
  id serial primary key, slug text unique not null, title text not null, subtitle text default '',
  content text default '', cover_url text, author_id int references authors(id) on delete set null,
  category_id int references categories(id) on delete set null, tags jsonb not null default '[]',
  featured boolean not null default false, status text not null default 'draft', publish_at timestamptz,
  gallery jsonb not null default '[]', videos jsonb not null default '[]', links jsonb not null default '[]',
  seo_title text default '', seo_desc text default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create index if not exists articles_pub on articles(status, publish_at)`,
`create table if not exists editions(
  id serial primary key, slug text unique not null, title text not null, cover_url text, pub_date date,
  school_year text default '', description text default '', digital_pdf_url text, print_pdf_url text,
  digital_public boolean not null default true, print_public boolean not null default false,
  status text not null default 'draft', featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists hotspots(
  id serial primary key, edition_id int not null references editions(id) on delete cascade,
  page_no int not null, x real not null, y real not null, w real not null, h real not null,
  type text not null default 'link', icon text default '', label text default '', config jsonb not null default '{}')`,
`create index if not exists hotspots_ed on hotspots(edition_id, page_no)`,
`create table if not exists media(
  id serial primary key, url text not null, name text not null default '', mime text not null default '',
  size bigint not null default 0, alt text default '', created_at timestamptz not null default now())`,
`create table if not exists settings(key text primary key, value jsonb not null)`,
`create table if not exists pages(
  slug text primary key, draft jsonb not null, published jsonb not null, updated_at timestamptz not null default now())`,
`create table if not exists revisions(
  id serial primary key, slug text not null, data jsonb not null, note text default '',
  user_name text default '', created_at timestamptz not null default now())`,
`create table if not exists activity(
  id serial primary key, user_name text default '', action text not null, detail text default '',
  ts timestamptz not null default now())`,
];
