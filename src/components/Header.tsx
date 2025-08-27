'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';


export default function Header() {
const [isAuthed, setIsAuthed] = useState(false);


useEffect(() => {
const supabase = createClient();
(async () => {
const { data: { session } } = await supabase.auth.getSession();
setIsAuthed(!!session);
const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
return () => subscription?.unsubscribe();
})();
}, []);


const signOut = async () => {
const supabase = createClient();
await supabase.auth.signOut();
window.location.assign('/');
};


return (
<header className="border-b">
<div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between">
<Link href="/" className="font-semibold">Certified Sliders</Link>
{isAuthed ? (
<div className="flex items-center gap-3">
<Link href="/me" className="text-sm hover:underline">Me</Link>
<Link href="/submit-result" className="text-sm hover:underline">Submit Result</Link>
<button onClick={signOut} className="text-sm">Sign out</button>
</div>
) : (
<Link href="/signin" className="text-sm hover:underline">Sign in</Link>
)}
</div>
</header>
);
}