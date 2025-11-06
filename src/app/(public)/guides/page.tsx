import Link from "next/link";

export const metadata = {
  title: "How-to Guides - Certified Sliders",
  description: "Step-by-step guides to help you get the most out of Certified Sliders.",
};

type Guide = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: "Getting Started" | "Verification" | "Advanced";
};

const guides: Guide[] = [
  {
    title: "Claim Your Profile",
    description: "Learn how to claim your athlete profile and start building your verified track & field resume.",
    href: "/guides/claim-profile",
    category: "Getting Started",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: "Verify Your Athletic.net Profile",
    description: "Step-by-step instructions for linking and verifying your Athletic.net account to enable automatic result imports.",
    href: "/guides/verify-profile",
    category: "Verification",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Submit a Result",
    description: "How to manually submit track & field results, add proof links, and get your performances verified.",
    href: "/guides/submit-result",
    category: "Getting Started",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    title: "Star Ratings Explained",
    description: "Understand how star ratings work, what they mean for your grade level, and how to improve your rating.",
    href: "/guides/star-ratings",
    category: "Advanced",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

const guidesByCategory = guides.reduce((acc, guide) => {
  if (!acc[guide.category]) {
    acc[guide.category] = [];
  }
  acc[guide.category].push(guide);
  return acc;
}, {} as Record<string, Guide[]>);

export default function GuidesPage() {
  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-app">How-to Guides</h1>
        <p className="mt-2 text-muted">
          Step-by-step instructions to help you get the most out of Certified Sliders.
          Have a question? Check our <Link href="/faq" className="text-scarlet underline">FAQ page</Link>.
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(guidesByCategory).map(([category, categoryGuides]) => (
          <section key={category}>
            <h2 className="mb-4 text-xl font-semibold text-app">{category}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group rounded-2xl border border-app bg-card p-6 shadow-sm transition hover:shadow-md hover:border-scarlet"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 rounded-lg bg-scarlet/10 p-3 text-scarlet transition group-hover:bg-scarlet group-hover:text-white">
                      {guide.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-app group-hover:text-scarlet transition">
                        {guide.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {guide.description}
                      </p>
                      <div className="mt-3 flex items-center text-sm font-medium text-scarlet">
                        Read guide
                        <svg className="ml-1 h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-app bg-muted/30 p-6">
        <h2 className="text-lg font-semibold text-app">Need more help?</h2>
        <p className="mt-2 text-sm text-muted">
          Check out our <Link href="/faq" className="text-scarlet underline">frequently asked questions</Link> or
          reach out to our support team for personalized assistance.
        </p>
      </div>
    </div>
  );
}
