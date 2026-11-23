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
`create table if not exists tutorials(
  id serial primary key, slug text unique not null, title text not null, subtitle text not null default '', icon text not null default '📘',
  intro text not null default '', blocks jsonb not null default '[]', outro text not null default '', status text not null default 'draft',
  sort int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists xmas3d_progress(
  student_id int primary key references students(id) on delete cascade, max_ch int not null default 0, completed boolean not null default false,
  completed_at timestamptz, plays int not null default 0, source text not null default 'live', updated_at timestamptz not null default now())`,
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
`alter table users add column if not exists username text, add column if not exists permissions jsonb not null default '{}', add column if not exists disabled boolean not null default false, add column if not exists must_change boolean not null default false, add column if not exists created_by int, add column if not exists last_login timestamptz`,
`create unique index if not exists users_username on users(lower(username)) where username is not null`,
`create unique index if not exists users_one_super on users(role) where role='superadmin'`,
`alter table activity add column if not exists user_id int`,
`create index if not exists activity_user on activity(user_id, ts)`,
`create table if not exists themes(slug text primary key, name text not null, mode text not null default 'off', config jsonb not null, updated_at timestamptz not null default now())`,
`create table if not exists theme_activations(
  id serial primary key, theme text not null, campaign_id int not null default 0, subscriber_id int not null default 0, count int not null default 0,
  first_at timestamptz not null default now(), last_at timestamptz not null default now(), unique(theme, campaign_id, subscriber_id))`,
`alter table campaigns add column if not exists scheduled_at timestamptz, add column if not exists theme_slug text, add column if not exists header_image text not null default '', add column if not exists activation_enabled boolean not null default false, add column if not exists activation_label text not null default '', add column if not exists activation_message text not null default '', add column if not exists buttons jsonb not null default '[]', add column if not exists decor_snow boolean not null default true, add column if not exists decor_candy boolean not null default true, add column if not exists decor_garland boolean not null default true, add column if not exists last_error text not null default ''`,
`alter table campaign_sends add column if not exists claimed_at timestamptz`,
// ---------- κοινότητα: επικοινωνία/αιτήματα, προβολές, likes, σχόλια, βίντεο, φίλοι, μηνύματα ----------
`create table if not exists tickets(
  id serial primary key, kind text not null default 'other', name text not null default '', email text not null default '', student_id int references students(id) on delete set null,
  subject text not null, message text not null, status text not null default 'open', token_hash text unique not null, ip_hash text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create index if not exists tickets_status on tickets(status, updated_at desc)`,
`create table if not exists ticket_replies(
  id serial primary key, ticket_id int not null references tickets(id) on delete cascade, author text not null, user_id int, user_name text not null default '', body text not null,
  created_at timestamptz not null default now())`,
`create index if not exists ticket_replies_t on ticket_replies(ticket_id, id)`,
`alter table articles add column if not exists view_count int not null default 0, add column if not exists like_count int not null default 0, add column if not exists comment_count int not null default 0`,
`create table if not exists article_views_daily(article_id int not null references articles(id) on delete cascade, day date not null, views int not null default 0, primary key(article_id, day))`,
`create table if not exists article_likes(article_id int not null references articles(id) on delete cascade, student_id int not null references students(id) on delete cascade, created_at timestamptz not null default now(), primary key(article_id, student_id))`,
`create table if not exists comments(
  id serial primary key, article_id int not null references articles(id) on delete cascade, student_id int not null references students(id) on delete cascade,
  body text not null, status text not null default 'visible', reports int not null default 0, created_at timestamptz not null default now())`,
`create index if not exists comments_article on comments(article_id, status, id desc)`,
`create index if not exists comments_student on comments(student_id, created_at)`,
`create table if not exists comment_reports(comment_id int not null references comments(id) on delete cascade, student_id int not null references students(id) on delete cascade, created_at timestamptz not null default now(), primary key(comment_id, student_id))`,
`alter table students add column if not exists community_banned boolean not null default false`,
`alter table comments add column if not exists auto_flag text not null default ''`,

`create table if not exists videos(
  id serial primary key, slug text unique not null, title text not null, description text default '', youtube_id text not null, article_id int references articles(id) on delete set null,
  status text not null default 'draft', publish_at timestamptz, sort int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists friendships(
  a int not null references students(id) on delete cascade, b int not null references students(id) on delete cascade, requester int not null, status text not null default 'pending',
  created_at timestamptz not null default now(), accepted_at timestamptz, primary key(a, b), check (a < b))`,
`create index if not exists friendships_b on friendships(b)`,
`create table if not exists blocks(blocker int not null references students(id) on delete cascade, blocked int not null references students(id) on delete cascade, created_at timestamptz not null default now(), primary key(blocker, blocked))`,
`create table if not exists dm_messages(
  id bigserial primary key, a int not null references students(id) on delete cascade, b int not null references students(id) on delete cascade, sender int not null,
  body text not null, read_at timestamptz, created_at timestamptz not null default now())`,
`create index if not exists dm_pair on dm_messages(a, b, id)`,
`create index if not exists dm_unread on dm_messages(b, read_at) where read_at is null`,
`create index if not exists dm_unread_a on dm_messages(a, read_at) where read_at is null`,
`create index if not exists dm_created on dm_messages(created_at)`,
`create table if not exists dm_reports(
  id serial primary key, reporter int references students(id) on delete set null, reported int references students(id) on delete set null, reason text not null default '',
  snapshot jsonb not null default '[]', status text not null default 'open', note text not null default '', created_at timestamptz not null default now(), resolved_at timestamptz)`,
// ---------- chat.osaden.gr: servers (από τους διαχειριστές), κανάλια, μηνύματα, E2E συσκευές, κλήσεις ----------
`create table if not exists chat_servers(
  id serial primary key, slug text unique not null, name text not null, description text default '', icon text not null default '💬', color text not null default '#5865F2',
  rules text default '', status text not null default 'draft', publish_at timestamptz, sort int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists chat_channels(
  id serial primary key, server_id int not null references chat_servers(id) on delete cascade, name text not null, topic text default '', readonly boolean not null default false,
  slowmode int not null default 0, sort int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create index if not exists chat_channels_s on chat_channels(server_id, sort)`,
`create table if not exists chat_members(server_id int not null references chat_servers(id) on delete cascade, student_id int not null references students(id) on delete cascade,
  joined_at timestamptz not null default now(), muted_until timestamptz, primary key(server_id, student_id))`,
`create index if not exists chat_members_st on chat_members(student_id)`,
`create table if not exists chat_messages(
  id bigserial primary key, channel_id int not null references chat_channels(id) on delete cascade, student_id int references students(id) on delete cascade, staff_name text not null default '',
  body text not null, reply_to bigint, edited_at timestamptz, deleted boolean not null default false, created_at timestamptz not null default now())`,
`create index if not exists chat_messages_ch on chat_messages(channel_id, id)`,
`create index if not exists chat_messages_created on chat_messages(created_at)`,
`create table if not exists chat_reactions(message_id bigint not null references chat_messages(id) on delete cascade, student_id int not null references students(id) on delete cascade, emoji text not null, primary key(message_id, student_id, emoji))`,
`create table if not exists chat_reads(student_id int not null references students(id) on delete cascade, channel_id int not null references chat_channels(id) on delete cascade, last_id bigint not null default 0, primary key(student_id, channel_id))`,
`create table if not exists chat_devices(id serial primary key, student_id int not null references students(id) on delete cascade, public_key jsonb not null, name text not null default '', created_at timestamptz not null default now(), last_seen timestamptz not null default now())`,
`create index if not exists chat_devices_st on chat_devices(student_id)`,
`alter table dm_messages add column if not exists enc jsonb`,
`create table if not exists chat_signals(id bigserial primary key, to_id int not null references students(id) on delete cascade, from_id int not null references students(id) on delete cascade, kind text not null, data jsonb not null default '{}', created_at timestamptz not null default now())`,
`create index if not exists chat_signals_to on chat_signals(to_id, id)`,
`create table if not exists chat_calls(id serial primary key, caller int references students(id) on delete set null, callee int references students(id) on delete set null, video boolean not null default false,
  started_at timestamptz not null default now(), answered_at timestamptz, ended_at timestamptz)`,
`alter table students add column if not exists last_seen_chat timestamptz, add column if not exists allow_calls boolean not null default true`,
];
