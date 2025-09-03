import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function HomePage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = data?.username ?? null;
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl md:text-4xl font-bold">Welcome to Certified Sliders</h1>
      <p className="mt-3 text-gray-600 max-w-prose">
        Build your athlete profile, upload a photo, and submit results for verification.
      </p>

      {!user ? (
        <div className="mt-6 flex gap-3">
          <Link href="/signin" className="btn">Sign in to get started</Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/me" className="btn">Go to My Profile</Link>
          {username && (
            <Link href={`/athletes/${username}?view=public#overview`} className="btn">
              View My Public Page
            </Link>
          )}
          <Link href={`/athletes/${username ?? ""}#edit`} className="btn">
            Edit My Profile
          </Link>
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-3">What you can do</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Create or update your profile details.</li>
          <li>Upload a profile photo.</li>
          <li>Submit meet results for verification (owner sees pending; public sees verified only).</li>
        </ul>
      </section>
    </div>
  );
}
