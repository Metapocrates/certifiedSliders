import SideNav from '@/components/SideNav';


export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
return (
<div className="mx-auto max-w-6xl w-full gap-6 px-4 sm:px-6 md:px-8 py-6 md:flex">
<SideNav />
<main className="flex-1 min-w-0">{children}</main>
</div>
);
}