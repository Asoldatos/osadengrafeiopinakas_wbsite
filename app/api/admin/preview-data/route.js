import { route, json } from '@/lib/guard';
import { getSiteData } from '@/lib/data';
export const GET = route(async () => json(await getSiteData()));
