"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Program = {
  id: string;
  name: string;
  short_name: string | null;
  division: string | null;
  location_city: string | null;
  location_state: string | null;
};

export default function ProgramSelector({ programs }: { programs: Program[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectProgram(programId: string) {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("program_id", programId);

      const response = await fetch("/api/coach/join-program", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join program");
      }

      // Success - redirect to portal
      router.push("/coach/portal");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted p-8 text-center text-muted-foreground">
        No programs available. Please contact an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {programs.map((program) => (
          <button
            key={program.id}
            onClick={() => handleSelectProgram(program.id)}
            disabled={loading}
            className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-semibold">{program.name}</div>
            {program.division && (
              <div className="text-sm text-muted-foreground">{program.division}</div>
            )}
            {program.location_city && program.location_state && (
              <div className="text-sm text-muted-foreground">
                {program.location_city}, {program.location_state}
              </div>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-sm text-muted-foreground">
          Joining program...
        </div>
      )}
    </div>
  );
}
