import TicketView from '@/components/community/TicketView';
export const metadata = { title: 'Το αίτημά μου', robots: { index: false, follow: false } };
export default function Ticket({ params }) {
  return <div className="wrap narrow page-pad"><TicketView token={params.token} /></div>;
}
