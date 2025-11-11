"use client";

import { useState } from "react";
import { inviteAthleteAction } from "@/app/(protected)/hs/portal/roster/invite/actions";

type SearchResult = {
  athlete_id: string;
  full_name: string;
  username: string | null;
  profile_id: string | null;
  school_name: string | null;
  class_year: number | null;
  gender: string | null;
  profile_pic_url: string | null;
  already_on_roster: boolean;
  has_pending_invite: boolean;
};

export default function InviteAthleteSearch({ teamId }: { teamId: string }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingAthleteId, setInvitingAthleteId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;

    setIsSearching(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/hs/search-athletes?team=${teamId}&q=${encodeURIComponent(search)}`);
      const data = await res.json();

      if (data.error) {
        setFeedback({ type: "error", text: data.error });
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch (error) {
      setFeedback({ type: "error", text: "Failed to search athletes" });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleInvite(athleteId: string) {
    setInvitingAthleteId(athleteId);
    setFeedback(null);

    const formData = new FormData();
    formData.append("team_id", teamId);
    formData.append("athlete_id", athleteId);
    formData.append("message", message);

    try {
      const result = await inviteAthleteAction(formData);

      if (result.success) {
        setFeedback({ type: "success", text: "Invitation sent successfully!" });
        setMessage("");
        // Refresh search to update status
        const res = await fetch(`/api/hs/search-athletes?team=${teamId}&q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setFeedback({ type: "error", text: result.error || "Failed to send invitation" });
      }
    } catch (error) {
      setFeedback({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setInvitingAthleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, or profile ID..."
          className="flex-1 rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
        />
        <button
          type="submit"
          disabled={isSearching || !search.trim()}
          className="rounded-md bg-scarlet px-6 py-2 text-sm font-semibold text-white hover:bg-scarlet/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg border p-4 ${
            feedback.type === "success"
              ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100"
              : "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100"
          }`}
        >
          <p className="text-sm">{feedback.text}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-app">Search Results</h3>
          <div className="space-y-3">
            {results.map((athlete) => (
              <div
                key={athlete.athlete_id}
                className="rounded-xl border border-app bg-card p-4 flex items-start gap-4"
              >
                {/* Avatar */}
                {athlete.profile_pic_url ? (
                  <img
                    src={athlete.profile_pic_url}
                    alt={athlete.full_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-medium text-muted-foreground">
                    {athlete.full_name.charAt(0)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="font-semibold text-app">{athlete.full_name}</div>
                  <div className="text-sm text-muted space-y-0.5">
                    {athlete.username && <div>@{athlete.username}</div>}
                    {athlete.profile_id && <div>{athlete.profile_id}</div>}
                    {athlete.school_name && <div>{athlete.school_name}</div>}
                    {athlete.class_year && <div>Class of {athlete.class_year}</div>}
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {athlete.already_on_roster ? (
                    <span className="inline-flex items-center rounded-md border border-green-300 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-xs font-medium text-green-800 dark:text-green-200">
                      On Roster
                    </span>
                  ) : athlete.has_pending_invite ? (
                    <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                      Invite Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInvite(athlete.athlete_id)}
                      disabled={invitingAthleteId === athlete.athlete_id}
                      className="rounded-md bg-scarlet px-4 py-1.5 text-sm font-semibold text-white hover:bg-scarlet/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {invitingAthleteId === athlete.athlete_id ? "Sending..." : "Send Invite"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && search && !isSearching && (
        <div className="text-center py-12">
          <p className="text-muted">No athletes found matching "{search}"</p>
        </div>
      )}

      {/* Optional Message Input (shown when search has results) */}
      {results.length > 0 && (
        <div className="rounded-lg border border-app bg-muted/30 p-4">
          <label htmlFor="invite_message" className="block text-sm font-medium text-app mb-2">
            Optional message to include with invitations
          </label>
          <textarea
            id="invite_message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g., We'd love to have you join our team..."
            className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          />
          <p className="text-xs text-muted mt-1">{message.length}/500 characters</p>
        </div>
      )}
    </div>
  );
}
