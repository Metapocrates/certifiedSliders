import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Certified Sliders",
  description: "Privacy Policy for Certified Sliders - how we collect, use, and protect your personal information",
};

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted mb-8">Last updated: [Date]</p>
      <p className="text-lg mb-8">
        At Certified Sliders (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) we respect your privacy and are committed to protecting your personal information. This Privacy Policy describes how we collect, use, share, store and protect your personal information when you use our Service.
      </p>

      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. What Information We Collect</h2>
          <p className="mb-2">We collect personal and non-personal information about Users of our Service, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account information:</strong> name, email address, password, role (Athlete / Coach / Parent)</li>
            <li><strong>Profile information:</strong> profile photo, team/club affiliation, sport data (athlete performance metrics, etc)</li>
            <li><strong>Usage information:</strong> IP address, device type, browser type, operating system, log files, usage analytics, crash reports</li>
            <li><strong>Payment information (if applicable):</strong> billing address, credit card or other payment details (via third-party payment processors)</li>
            <li><strong>Communications:</strong> customer support requests, feedback, survey responses</li>
            <li><strong>Cookies and tracking technologies:</strong> cookies, web beacons, similar technologies to collect information about how you interact with our Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. How We Use the Information</h2>
          <p className="mb-2">We use your information for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide, operate and maintain our Service</li>
            <li>To manage your account, verify your identity, communicate with you</li>
            <li>To process your transactions and send you related information, including purchase confirmations and invoices</li>
            <li>To improve, customize and optimize the Service (including analytics, performance monitoring, user feedback)</li>
            <li>To send promotional materials (if you opt-in) or service updates</li>
            <li>To comply with legal obligations and protect our rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. How We Share the Information</h2>
          <p className="mb-2">We will not sell your personal information. We may share your information as follows:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>With service providers who help us operate and maintain the Service (e.g., hosting providers, email service providers, analytics providers) under appropriate contractual protections</li>
            <li>With coaches, parents, guardians or teams as appropriate in the platform context (e.g., athlete data shared with the athlete&apos;s coach if permitted)</li>
            <li>With law enforcement or regulators when required by law, legal process, or to protect rights, property or safety</li>
            <li>In connection with a business transaction (e.g., merger, acquisition, sale of assets) — in which case we will notify you and update this Policy accordingly</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Data Retention</h2>
          <p>
            We will retain your personal data as long as your account is active or as needed to provide the Service, or as required by applicable law. When data is no longer needed, we will delete or anonymize it. We may retain aggregated or de-identified data indefinitely for analytics purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
          <p>
            We implement commercially reasonable technical, administrative and physical safeguards to protect your information (such as encryption in transit and at rest, access controls, regular security reviews). However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Your Rights and Choices</h2>
          <p className="mb-2">Depending on your jurisdiction and account type, you may have rights including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accessing your personal data and obtaining a copy</li>
            <li>Correcting inaccurate or incomplete data</li>
            <li>Deleting your personal data (subject to legal retention obligations)</li>
            <li>Objecting to or restricting processing of your data</li>
            <li>Withdrawing your consent where processing is based on consent</li>
            <li>Opting-out of marketing communications</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, please contact us at the details below.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Children and Athletes</h2>
          <p>
            If you are a parent or guardian of an athlete under [age threshold] (as applicable by jurisdiction), you must provide consent for the athlete&apos;s account. We do not knowingly collect personal data from children under [age] without parental consent. If you believe we have collected data from a child without consent, contact us for deletion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. International Transfers</h2>
          <p>
            Your information may be transferred to — and processed in — countries other than your country of residence. These countries may have different data-protection laws. We will take steps to ensure that transfers comply with applicable legal safeguards.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies, web beacons, and similar technologies to collect information about your interaction with our Service. You may be able to manage and disable cookies via browser settings, although this may limit functionality of the Service. For more details see our Cookie Policy [if applicable].
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Updates to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised policy here with a new &ldquo;Last updated&rdquo; date. If we make material changes we will provide notice (e.g., via email or prominent notice). Please check this page periodically.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
          <p className="mb-2">If you have questions, requests or concerns regarding this Privacy Policy or your data, please contact us at:</p>
          <div className="pl-4">
            <p>[Your Company Name]</p>
            <p>[Address]</p>
            <p>[Email address]</p>
            <p>[Phone number] (optional)</p>
          </div>
        </section>
      </div>
    </main>
  );
}
