"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Program = {
  id: string;
  name: string;
  short_name: string | null;
  division: string | null;
  location_city: string | null;
  location_state: string | null;
  is_test_program?: boolean;
};

export default function ProgramSelector({ programs }: { programs: Program[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");

  // Get unique divisions
  const divisions = useMemo(() => {
    const divs = new Set(programs.map(p => p.division).filter(Boolean));
    return Array.from(divs).sort();
  }, [programs]);

  // Filter programs based on search query and division
  const filteredPrograms = useMemo(() => {
    let filtered = programs;

    // Apply division filter
    if (divisionFilter !== "all") {
      filtered = filtered.filter(p => p.division === divisionFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(program =>
        program.name.toLowerCase().includes(query) ||
        program.short_name?.toLowerCase().includes(query) ||
        program.division?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [programs, searchQuery, divisionFilter]);

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

      {/* Search and Filter Controls */}
      <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
        <div>
          <label htmlFor="program-search" className="block text-sm font-medium text-foreground mb-2">
            Search Programs
          </label>
          <input
            id="program-search"
            type="text"
            placeholder="Search by school name, abbreviation, or division..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="division-filter" className="text-sm font-medium text-foreground">
            Division:
          </label>
          <select
            id="division-filter"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Divisions</option>
            {divisions.map((div) => (
              <option key={div} value={div || ""}>
                {div}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing {filteredPrograms.length} of {programs.length} programs
        </div>
      </div>

      {/* Programs List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredPrograms.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-8 text-center text-muted-foreground">
            No programs found matching &quot;{searchQuery}&quot;
            {divisionFilter !== "all" && ` in ${divisionFilter}`}
          </div>
        ) : (
          filteredPrograms.map((program) => (
            <button
              key={program.id}
              onClick={() => handleSelectProgram(program.id)}
              disabled={loading}
              className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <div className="font-semibold">{program.name}</div>
                {program.is_test_program && (
                  <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    TEST ONLY
                  </span>
                )}
              </div>
              {program.division && (
                <div className="text-sm text-muted-foreground">{program.division}</div>
              )}
              {program.location_city && program.location_state && (
                <div className="text-sm text-muted-foreground">
                  {program.location_city}, {program.location_state}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {loading && (
        <div className="text-center text-sm text-muted-foreground">
          Joining program...
        </div>
      )}
    </div>
  );
}
