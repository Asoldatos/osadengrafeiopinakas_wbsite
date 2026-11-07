import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { levelInfo } from '@/lib/progress.mjs';
export const GET = sroute(async (_r, _c, st) => json({ nickname: st.nickname, avatar: st.avatar, ...levelInfo(st.xp) }));
