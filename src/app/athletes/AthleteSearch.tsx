"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type Athlete = {
  id: string;
  profile_id: string;
  full_name: string;
  username: string | null;
  school_name: string | null;
  school_state: string | null;
  class_year: number | null;
  gender: string | null;
  profile_pic_url: string | null;
  star_rating: number | null;
};

export default function AthleteSearch() {
  const [query, setQuery] = useState("");
  const [classYear, setClassYear] = useState("");
  const [gender, setGender] = useState("all");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAthletes();
  }, [query, classYear, gender]);

  async function fetchAthletes() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (classYear) params.set("class_year", classYear);
      if (gender !== "all") params.set("gender", gender);

      const response = await fetch(`/api/athletes?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch athletes");
      }

      setAthletes(data.rows || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const classYearOptions = Array.from({ length: 8 }, (_, i) => currentYear + 4 - i);

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Search by name or nickname..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-app bg-card px-4 py-3 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
            className="rounded-lg border border-app bg-card px-4 py-2 text-sm text-app focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          >
            <option value="">All Class Years</option>
            {classYearOptions.map((year) => (
              <option key={year} value={year}>
                Class of {year}
              </option>
            ))}
          </select>

          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-lg border border-app bg-card px-4 py-2 text-sm text-app focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          >
            <option value="all">All Genders</option>
            <option value="M">Boys</option>
            <option value="F">Girls</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-app border-t-transparent"></div>
          <p className="mt-3 text-sm text-muted">Searching athletes...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {athletes.length} {athletes.length === 1 ? "athlete" : "athletes"} found
            </p>
          </div>

          {athletes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted">No athletes found. Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {athletes.map((athlete) => (
                <Link
                  key={athlete.id}
                  href={`/athletes/${athlete.profile_id}`}
                  className="group block rounded-xl border border-app bg-card p-5 shadow-sm transition hover:border-scarlet hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
                      {athlete.profile_pic_url ? (
                        <Image
                          src={athlete.profile_pic_url}
                          alt={athlete.full_name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <Image
                          src="/favicon-64x64.png"
                          alt={athlete.full_name}
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-app group-hover:text-scarlet">
                          {athlete.full_name}
                        </h3>
                        {athlete.star_rating && athlete.star_rating >= 3 && (
                          <span className="text-xs">
                            {"⭐".repeat(athlete.star_rating)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 space-y-0.5 text-xs text-muted">
                        {athlete.school_name && (
                          <p className="truncate">
                            {athlete.school_name}
                            {athlete.school_state && `, ${athlete.school_state}`}
                          </p>
                        )}
                        {athlete.class_year && (
                          <p>Class of {athlete.class_year}</p>
                        )}
                        {athlete.gender && (
                          <p>{athlete.gender === "M" ? "Boys" : "Girls"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
