export default function ResultStatusBadge({ status }: { status?: string | null }) {
const s = (status ?? 'pending').toLowerCase();
const styles = s === 'verified' ? 'bg-emerald-100 text-emerald-800' : s === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800';
const label = s.charAt(0).toUpperCase() + s.slice(1);
return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles}`}>{label}</span>;
}