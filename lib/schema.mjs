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
`create table if not exists password_resets(
  id serial primary key, user_id int not null references users(id) on delete cascade,
  token_hash text unique not null, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now())`,
`create index if not exists password_resets_user on password_resets(user_id)`,
`create table if not exists students(
  id serial primary key, email text unique not null, nickname text not null, nick_lower text unique not null, password_hash text not null,
  avatar text not null default 'happy', verified boolean not null default false, disabled boolean not null default false,
  xp int not null default 0, xp_day date, xp_today int not null default 0, consent_at timestamptz,
  created_at timestamptz not null default now(), last_login timestamptz)`,
`create table if not exists student_sessions(
  id text primary key, student_id int not null references students(id) on delete cascade, expires_at timestamptz not null, created_at timestamptz not null default now())`,
`create table if not exists student_tokens(
  id serial primary key, student_id int not null references students(id) on delete cascade, kind text not null,
  token_hash text unique not null, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now())`,
`create table if not exists student_badges(
  student_id int not null references students(id) on delete cascade, code text not null, earned_at timestamptz not null default now(), primary key(student_id, code))`,
`create table if not exists game_scores(
  id serial primary key, student_id int not null references students(id) on delete cascade, game text not null, score int not null,
  meta jsonb not null default '{}', created_at timestamptz not null default now())`,
`create index if not exists game_scores_game on game_scores(game, score desc)`,
`create index if not exists game_scores_student on game_scores(student_id, game, created_at)`,
`create table if not exists quiz_questions(
  id serial primary key, question text not null, options jsonb not null, correct_no int not null, explanation text default '',
  active boolean not null default true, created_at timestamptz not null default now())`,
`create table if not exists quiz_runs(
  id text primary key, student_id int not null references students(id) on delete cascade, qids jsonb not null,
  started_at timestamptz not null default now(), done boolean not null default false)`,
`create table if not exists words(id serial primary key, word text not null, hint text default '', active boolean not null default true)`,
`create table if not exists adventures(
  id serial primary key, slug text unique not null, title text not null, description text default '', cover_url text,
  unlock_level int not null default 1, xp_reward int not null default 60, status text not null default 'draft', sort int not null default 0,
  scenes jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists adventure_progress(
  student_id int not null references students(id) on delete cascade, adventure_id int not null references adventures(id) on delete cascade,
  scene_id text not null, finished boolean not null default false, finished_at timestamptz, updated_at timestamptz not null default now(),
  primary key(student_id, adventure_id))`,
`create table if not exists downloads(
  id serial primary key, student_id int not null references students(id) on delete cascade, edition_id int not null references editions(id) on delete cascade,
  kind text not null default 'print', ts timestamptz not null default now())`,
`create index if not exists downloads_student on downloads(student_id, ts)`,
`alter table students add column if not exists totp_secret_enc text, add column if not exists totp_pending_enc text, add column if not exists totp_enabled boolean not null default false, add column if not exists totp_last_step bigint not null default 0, add column if not exists dl_until timestamptz`,
`alter table student_sessions add column if not exists pending text`,
`create table if not exists student_recovery_codes(id serial primary key, student_id int not null references students(id) on delete cascade, code_hash text not null, used_at timestamptz)`,
`create table if not exists student_devices(
  id serial primary key, student_id int not null references students(id) on delete cascade, token_hash text unique not null,
  label text not null default '', created_at timestamptz not null default now(), last_seen timestamptz not null default now())`,
`create table if not exists student_otps(
  id serial primary key, student_id int not null references students(id) on delete cascade, purpose text not null, code_hash text not null,
  expires_at timestamptz not null, attempts int not null default 0, used_at timestamptz, created_at timestamptz not null default now())`,
`create index if not exists student_otps_lookup on student_otps(student_id, purpose, created_at)`,
`create table if not exists subscribers(
  id serial primary key, email text unique not null, name text not null default '', status text not null default 'pending', token text unique not null,
  source text not null default 'site', confirm_hash text, confirm_expires timestamptz, created_at timestamptz not null default now(), confirmed_at timestamptz, unsub_at timestamptz)`,
`create table if not exists campaigns(
  id serial primary key, subject text not null, preheader text not null default '', body_html text not null default '', mascot_mood text not null default 'wave',
  mascot_text text not null default '', cta_label text not null default '', cta_url text not null default '', include_articles boolean not null default true,
  article_count int not null default 3, status text not null default 'draft', total int not null default 0, sent_count int not null default 0, failed_count int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), sent_at timestamptz)`,
`create table if not exists campaign_sends(
  campaign_id int not null references campaigns(id) on delete cascade, subscriber_id int not null references subscribers(id) on delete cascade,
  status text not null default 'pending', error text not null default '', sent_at timestamptz, primary key(campaign_id, subscriber_id))`,
`create table if not exists activity(
  id serial primary key, user_name text default '', action text not null, detail text default '',
  ts timestamptz not null default now())`,
];
