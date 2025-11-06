import Link from "next/link";

export const metadata = {
  title: "FAQ - Certified Sliders",
  description: "Frequently asked questions about Certified Sliders, the track & field verification platform.",
};

type FAQItem = {
  question: string;
  answer: string | React.ReactNode;
};

const faqs: { category: string; items: FAQItem[] }[] = [
  {
    category: "Getting Started",
    items: [
      {
        question: "What is Certified Sliders?",
        answer: "Certified Sliders is a verified track & field ranking platform for high school athletes. We verify performances through Athletic.net integration and provide star ratings based on national standards by grade level.",
      },
      {
        question: "How do I create a profile?",
        answer: (
          <>
            Sign up with your email and complete your profile with your school information and graduation year.
            Then <Link href="/guides/claim-profile" className="text-scarlet underline">claim your profile</Link> to link
            your Athletic.net results.
          </>
        ),
      },
      {
        question: "Is Certified Sliders free?",
        answer: "Yes! Certified Sliders is completely free for athletes, coaches, and recruiters.",
      },
    ],
  },
  {
    category: "Verification & Results",
    items: [
      {
        question: "Why is my result pending?",
        answer: "All submitted results go through a verification process to ensure accuracy. We check that the proof link is valid, the meet information matches, and the performance meets our standards. This typically takes 24-48 hours.",
      },
      {
        question: "How do I verify my Athletic.net profile?",
        answer: (
          <>
            Visit your Settings page and click &quot;Link Athletic.net Profile.&quot; Follow the verification steps
            to prove ownership. See our <Link href="/guides/verify-profile" className="text-scarlet underline">detailed guide</Link> for
            step-by-step instructions.
          </>
        ),
      },
      {
        question: "What if my result is on MileSplit instead of Athletic.net?",
        answer: "Currently, we only support Athletic.net for automatic verification. If your result is on MileSplit, you can manually submit it with a proof link, but it will go through manual review which may take longer.",
      },
      {
        question: "Can I submit results from multiple years?",
        answer: "Yes! You can submit any high school track & field result from your career. Results are tracked by the grade you were in when you achieved them, not your current grade.",
      },
    ],
  },
  {
    category: "Star Ratings",
    items: [
      {
        question: "How do star ratings work?",
        answer: (
          <>
            Star ratings (1-5★) are based on national performance standards for your grade level and gender.
            A 5★ Freshman has different standards than a 5★ Senior. Learn more in
            our <Link href="/guides/star-ratings" className="text-scarlet underline">star ratings guide</Link>.
          </>
        ),
      },
      {
        question: "Why did my star rating change?",
        answer: "Star ratings are contextual to your current grade level. As you advance grades, the performance standards increase, so your rating may change even if your times stay the same. Additionally, ratings update when you achieve new PRs.",
      },
      {
        question: "Are ratings based on FAT or hand timing?",
        answer: "We prefer FAT (Fully Automatic Timing) for accuracy, but accept hand timing with appropriate conversion factors. FAT times are given preference in rankings and star rating calculations.",
      },
    ],
  },
  {
    category: "Profile & Settings",
    items: [
      {
        question: "Can I change my class year?",
        answer: "Your class year can be changed before it's locked (typically at the start of your senior year). Once locked, changes require admin approval to prevent manipulation of grade-specific rankings. Contact support if you need to update a locked class year.",
      },
      {
        question: "How do I update my profile picture?",
        answer: "Go to Settings, click on your current profile picture or the upload area, and select a new image. Profile pictures are visible on your public athlete profile and in rankings.",
      },
      {
        question: "Can I hide certain results from my profile?",
        answer: "Yes! In your event preferences (accessible from your profile), you can choose which events to feature prominently and which to hide from your public profile. All verified results remain in your history.",
      },
    ],
  },
  {
    category: "Technical Questions",
    items: [
      {
        question: "What's the difference between FAT and hand timing?",
        answer: "FAT (Fully Automatic Timing) uses electronic sensors at the start and finish, providing accuracy to 0.01 seconds. Hand timing uses stopwatches and is less precise. For sprint events, hand times are typically 0.24 seconds faster than FAT.",
      },
      {
        question: "What does 'wind legal' mean?",
        answer: "For sprint events (100m, 200m) and horizontal jumps, wind assistance cannot exceed +2.0 m/s for the performance to be considered 'wind legal' for official records and rankings. Wind-aided marks are still tracked but noted as illegal (IL).",
      },
      {
        question: "How are marks from different events compared?",
        answer: "Each event has its own ranking system. We don't directly compare across events, but star ratings provide a relative measure of excellence within each event for your grade level.",
      },
      {
        question: "What's the grading system?",
        answer: "Grades (Freshman, Sophomore, Junior, Senior) are calculated based on your class year and the date of the performance. The school year boundary is August 1st, so performances before August 1st count toward the previous grade.",
      },
    ],
  },
  {
    category: "Recruiting & Visibility",
    items: [
      {
        question: "Can college coaches see my profile?",
        answer: "Yes! All verified profiles are publicly visible. College coaches can search rankings by event, class year, grade, gender, and state to find recruits. Higher star ratings increase your visibility in search results.",
      },
      {
        question: "How do I share my profile with coaches?",
        answer: "Your profile has a unique URL (certifiedsliders.com/athletes/YOUR-ID). You can share this link directly or use the share buttons on your profile to post to social media. Verified profiles include rich preview cards.",
      },
      {
        question: "What should I include in my profile bio?",
        answer: "Highlight your athletic achievements, academic interests, target events, and recruiting status. Keep it professional and update it regularly with new accomplishments.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-app">Frequently Asked Questions</h1>
        <p className="mt-2 text-muted">
          Find answers to common questions about Certified Sliders. Can&apos;t find what you&apos;re looking for?
          Check out our <Link href="/guides" className="text-scarlet underline">how-to guides</Link>.
        </p>
      </div>

      <div className="space-y-8">
        {faqs.map((section, idx) => (
          <section key={idx} className="rounded-2xl border border-app bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-app">{section.category}</h2>
            <div className="space-y-5">
              {section.items.map((faq, faqIdx) => (
                <div key={faqIdx}>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-app bg-muted/30 p-6">
        <h2 className="text-lg font-semibold text-app">Still have questions?</h2>
        <p className="mt-2 text-sm text-muted">
          Browse our <Link href="/guides" className="text-scarlet underline">step-by-step guides</Link> or reach out
          to our support team for personalized help.
        </p>
      </div>
    </div>
  );
}
