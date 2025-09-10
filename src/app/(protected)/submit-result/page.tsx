// src/app/(protected)/submit-result/page.tsx
import SubmitResultForm from "./SubmitResultForm";

export const dynamic = "force-dynamic";

export default function SubmitResultPage() {
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Submit a Proof Link</h1>
      <SubmitResultForm />
    </div>
  );
}
