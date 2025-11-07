/**
 * JSON-LD structured data for athlete profiles
 * Implements Person schema for rich search results
 */

type AthleteJsonLdProps = {
  name: string;
  profileId: string;
  classYear?: number | null;
  school?: string | null;
  schoolState?: string | null;
  gender?: "M" | "F" | null;
  bio?: string | null;
  profilePicUrl?: string | null;
  starRating?: number | null;
  primaryEvent?: string | null;
  primaryEventMark?: string | null;
};

export default function AthleteJsonLd({
  name,
  profileId,
  classYear,
  school,
  schoolState,
  gender,
  bio,
  profilePicUrl,
  starRating,
  primaryEvent,
  primaryEventMark,
}: AthleteJsonLdProps) {
  const baseUrl = "https://www.certifiedsliders.com";
  const url = `${baseUrl}/athletes/${profileId}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
    identifier: profileId,
    image: profilePicUrl || undefined,
    description: bio || `High school track & field athlete${classYear ? `, class of ${classYear}` : ""}${primaryEvent ? ` competing in ${primaryEvent}` : ""}.`,

    // Educational context
    ...(school && {
      alumniOf: {
        "@type": "EducationalOrganization",
        name: school,
        ...(schoolState && { address: { "@type": "PostalAddress", addressRegion: schoolState } }),
      },
    }),

    // Gender
    ...(gender && {
      gender: gender === "M" ? "Male" : "Female",
    }),

    // Primary sport
    knowsAbout: ["Track and Field", "High School Athletics", primaryEvent].filter(Boolean),

    // Star rating as aggregateRating
    ...(starRating && starRating >= 3 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: starRating,
        bestRating: 5,
        worstRating: 0,
        ratingCount: 1,
      },
    }),

    // Primary achievement
    ...(primaryEvent && primaryEventMark && {
      award: `${primaryEvent}: ${primaryEventMark}${classYear ? ` (${classYear})` : ""}`,
    }),

    // Additional context
    additionalType: "Athlete",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 0) }}
    />
  );
}
