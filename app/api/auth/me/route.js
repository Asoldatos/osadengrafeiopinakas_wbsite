import { route, json } from '@/lib/guard';
export const GET = route(async (_req, _ctx, u) => json({ id: u.user_id, email: u.email, name: u.name, role: u.role, username: u.username, permissions: u.permissions, must_change: u.must_change, totp_enabled: u.totp_enabled }), { allowMustChange: true });
