/**
 * JSON-LD structured data for rankings pages
 * Implements ItemList schema for rich search results
 */

type RankingEntry = {
  name: string;
  profileId: string;
  mark: string;
  classYear?: number | null;
  school?: string | null;
};

type RankingsJsonLdProps = {
  event: string;
  year?: string;
  gender?: "M" | "F" | null;
  athletes: RankingEntry[];
};

export default function RankingsJsonLd({
  event,
  year,
  gender,
  athletes,
}: RankingsJsonLdProps) {
  const baseUrl = "https://www.certifiedsliders.com";
  const genderLabel = gender === "M" ? "Boys" : gender === "F" ? "Girls" : "";
  const title = [year, genderLabel, event, "Rankings"]
    .filter(Boolean)
    .join(" ");

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    description: `Top verified high school track & field performances for ${event}${year ? ` in ${year}` : ""}.`,
    numberOfItems: athletes.length,
    itemListElement: athletes.slice(0, 50).map((athlete, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Person",
        name: athlete.name,
        url: `${baseUrl}/athletes/${athlete.profileId}`,
        identifier: athlete.profileId,
        ...(athlete.school && {
          alumniOf: {
            "@type": "EducationalOrganization",
            name: athlete.school,
          },
        }),
        award: `${event}: ${athlete.mark}${athlete.classYear ? ` (${athlete.classYear})` : ""}`,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 0) }}
    />
  );
}
