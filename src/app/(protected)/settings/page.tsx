'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';


interface Profile {
id: string;
username: string | null;
full_name: string | null;
class_year: number | null;
gender: string | null;
school_name: string | null;
school_state: string | null;
bio: string | null;
profile_pic_url: string | null;
}


export default function SettingsPage() {
const supabase = createClient();
const router = useRouter();
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [profile, setProfile] = useState<Profile | null>(null);
const [error, setError] = useState<string | null>(null);


useEffect(() => {
(async () => {
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError) {
setError(authError.message);
setLoading(false);
return;
}
if (!user) {
router.push('/signin');
return;
}
const { data, error: pErr } = await supabase
.from('profiles')
.select('id, username, full_name, class_year, gender, school_name, school_state, bio, profile_pic_url')
.eq('id', user.id)
.maybeSingle();
if (pErr) setError(pErr.message);
setProfile(data as Profile);
setLoading(false);
})();
}, [supabase, router]);


const updateProfile = async (formData: FormData) => {
setSaving(true);
setError(null);
const payload = {
username: formData.get('username')?.toString() || null,
full_name: formData.get('full_name')?.toString() || null,
class_year: formData.get('class_year') ? Number(formData.get('class_year')) : null,
gender: formData.get('gender')?.toString() || null,
school_name: formData.get('school_name')?.toString() || null,
school_state: formData.get('school_state')?.toString() || null,
bio: formData.get('bio')?.toString() || null,
profile_pic_url: formData.get('profile_pic_url')?.toString() || null,
};


const { error } = await supabase.from('profiles').update(payload).eq('id', profile!.id);
if (error) setError(error.message);
setSaving(false);
router.refresh();
};


}