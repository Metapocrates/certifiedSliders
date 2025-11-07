// src/app/(protected)/settings/share-with-coaches/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/compat";
import AcademicInfoEditor from "@/components/profile/AcademicInfoEditor";
import ContactInfoManager from "@/components/profile/ContactInfoManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Share with Coaches",
};

export default async function ShareWithCoachesPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/share-with-coaches");
  }

  // Fetch profile with contact info
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, phone, share_contact_info")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch academic info
  const { data: academicInfo } = await supabase
    .from("athlete_academic_info")
    .select("gpa, sat_score, act_score, share_with_coaches")
    .eq("athlete_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Share with Coaches</h1>
        <p className="text-sm text-muted-foreground">
          Manage what information you share with college coaches. This information
          will never be publicly visible, but can be accessed by coaches when viewing
          your profile in the coach portal.
        </p>
      </div>

      <div className="space-y-8">
        {/* Academic Information Section */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-app mb-1">Academic Information</h2>
            <p className="text-sm text-muted-foreground">
              Add your GPA and standardized test scores. Check the box to share with coaches.
            </p>
          </div>
          <AcademicInfoEditor
            athleteId={user.id}
            initialData={academicInfo ? {
              gpa: academicInfo.gpa,
              sat_score: academicInfo.sat_score,
              act_score: academicInfo.act_score,
              share_with_coaches: academicInfo.share_with_coaches,
            } : undefined}
          />
        </section>

        {/* Contact Information Section */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-app mb-1">Contact Information</h2>
            <p className="text-sm text-muted-foreground">
              Add your email and phone number. Check the box to share with coaches from programs you&apos;re interested in.
            </p>
          </div>
          <ContactInfoManager
            athleteId={user.id}
            initialData={{
              email: profile?.email ?? null,
              phone: profile?.phone ?? null,
              share_contact_info: profile?.share_contact_info ?? false,
            }}
          />
        </section>

        {/* Privacy Notice */}
        <div className="rounded-lg bg-muted/30 border border-border p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Privacy Notice:</strong> Your academic and contact information will never be
            publicly visible on your profile page. Only coaches viewing your profile in the coach
            portal will be able to see this information, and only if you&apos;ve opted to share it by
            checking the respective checkboxes above.
          </p>
        </div>
      </div>
    </div>
  );
}
