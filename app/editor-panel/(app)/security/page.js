import Security from '@/components/admin/Security';
import ChangePassword from '@/components/admin/ChangePassword';
import { requireAdminPage } from '@/lib/auth';
import { PERMS, ROLE_LABEL, can, isSuper } from '@/lib/perms.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ο λογαριασμός μου' };
export default async function Page() {
  const u = await requireAdminPage();
  return (<><h1>Ο λογαριασμός μου</h1>
    <div className="card form-card"><h2>Στοιχεία</h2>
      <p><b>{u.name}</b>{u.username && <> · @{u.username}</>} · {u.email}</p>
      <p><span className={`pill ${isSuper(u) ? 'super' : 'published'}`}>{ROLE_LABEL[u.role] || 'Διαχειριστής'}</span></p>
      {!isSuper(u) && <><p className="muted small">Τα δικαιώματά σου (τα ορίζει ο Superadmin):</p><ul className="perm-list">{Object.entries(PERMS).map(([k, l]) => <li key={k} className={can(u, k) ? 'yes' : 'no'}>{can(u, k) ? '✔' : '✕'} {l}</li>)}</ul></>}
    </div>
    <div className="card form-card"><h2>Αλλαγή κωδικού</h2><ChangePassword username={u.username || ''} email={u.email} /></div>
    <h2>Επαλήθευση δύο βημάτων</h2><Security /></>);
}
