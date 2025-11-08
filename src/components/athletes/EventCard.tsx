"use client";

import { useState } from "react";
import SafeLink from "@/components/SafeLink";
import ShareButtons from "@/components/ShareButtons";
import EventHistoryModal from "./EventHistoryModal";
import ReportResultModal from "./ReportResultModal";
import { formatGrade } from "@/lib/grade";

type EventCardProps = {
  event: string;
  mark: string;
  season: string;
  meetDate: string;
  meetName: string;
  wind: string;
  proofUrl: string | null;
  profileId: string;
  athleteName: string;
  status?: string | null;
  isOwner?: boolean;
  resultId?: number;
  isAuthenticated?: boolean;
  grade?: number | null;
  classYear?: number | null;
  starRating?: number | null;
};

export default function EventCard({
  event,
  mark,
  season,
  meetDate,
  meetName,
  wind,
  proofUrl,
  profileId,
  athleteName,
  status,
  isOwner = false,
  resultId,
  isAuthenticated = false,
  grade,
  classYear,
  starRating,
}: EventCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine status badge
  const getStatusBadge = () => {
    if (!status || status === 'verified' || status === 'approved') return null;

    if (status === 'pending') {
      return (
        <div className="absolute top-3 right-3 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          Pending
        </div>
      );
    }

    if (status === 'manual_review') {
      return (
        <div className="absolute top-3 right-3 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">
          In Review
        </div>
      );
    }

    return null;
  };

  // Only show non-approved results to owner
  if (!isOwner && status && !['verified', 'approved'].includes(status)) {
    return null;
  }

  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-app bg-card p-6 shadow-sm transition ${isModalOpen ? '' : 'hover:-translate-y-1 hover:shadow-xl'}`}>
      {getStatusBadge()}
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] font-bold text-gray-900 dark:text-gray-100">
        <span>{season ?? "Season TBD"}</span>
        <span>{meetDate}</span>
      </div>
      {(grade || classYear) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          {grade && <span>{formatGrade(grade)}</span>}
          {grade && classYear && <span>•</span>}
          {classYear && <span>Class of {classYear}</span>}
        </div>
      )}
      <h3 className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">{event}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Best mark</p>
      <p className="text-2xl font-semibold text-app">{mark}</p>
      <div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <p>
          <span className="font-medium text-app">Meet:</span> {meetName ?? "—"}
        </p>
      </div>
      <div className="mt-4 flex flex-col items-start gap-2">
        {proofUrl && (
          <SafeLink
            href={proofUrl}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm font-semibold text-scarlet transition hover:text-scarlet/80"
          >
            View proof →
          </SafeLink>
        )}
        <div className="flex items-center gap-3">
          <EventHistoryModal
            profileId={profileId}
            athleteName={athleteName}
            event={event}
            currentMark={mark}
            onOpenChange={setIsModalOpen}
          />
          {resultId && !isOwner && (
            <ReportResultModal
              resultId={resultId}
              eventName={event}
              athleteName={athleteName}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>

      {/* Share buttons - only visible to owner */}
      {isOwner && status && ['verified', 'approved'].includes(status) && (
        <div className="mt-6 border-t border-app/30 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Share this result</p>
          <ShareButtons
            url={`/athletes/${profileId}`}
            title={`I just posted ${mark} in the ${event}${meetName ? ` at ${meetName}` : ''}!`}
            description={starRating && starRating >= 3 ? `${"⭐".repeat(starRating)} performance` : undefined}
            hashtags={["CertifiedSliders", "TrackAndField", event.replace(/\s+/g, "")]}
          />
        </div>
      )}
    </div>
  );
}
