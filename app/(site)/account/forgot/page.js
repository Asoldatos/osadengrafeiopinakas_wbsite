import { ForgotForm } from '@/components/play/StudentForms';
export const metadata = { title: 'Ξέχασα τον κωδικό μου', robots: { index: false } };
export default function Page() { return <ForgotForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''} />; }
