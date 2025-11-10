import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Certified Sliders",
  description: "Terms of Service for Certified Sliders - the premier platform for track & field athletes",
};

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted mb-8">Last updated: [Date]</p>
      <p className="text-lg mb-8">Please read carefully.</p>

      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to Certified Sliders (the &ldquo;Service&rdquo;), operated by [Your Company Name], a [State of Incorporation] corporation (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By accessing or using the Service (including the website, mobile apps, or other interfaces) you (&ldquo;you&rdquo;, &ldquo;your&rdquo;, &ldquo;User&rdquo;) agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Definitions</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account</strong> means your registered user account.</li>
            <li><strong>Coach</strong> means a user who is a coach and uses the Service under a coach-premium or standard account.</li>
            <li><strong>Parent/Guardian</strong> means a user who is a parent/guardian of a participating athlete.</li>
            <li><strong>Athlete</strong> means a user who is an athlete (in your case) whose data is being managed or evaluated.</li>
            <li><strong>Subscription</strong> means a paid plan (if any) that grants you premium access to the Service.</li>
            <li><strong>Content</strong> means data, text, graphics, images, or other materials you upload or generate via the Service.</li>
            <li><strong>User Content</strong> means Content uploaded or contributed by you.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Use of the Service</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must register for an Account and provide accurate, up-to-date information.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</li>
            <li>You agree not to share or transfer your account unless explicitly permitted.</li>
            <li>You must comply with all applicable laws in using the Service, including data-protection laws.</li>
            <li>We reserve the right to suspend or terminate your access if you violate these Terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Subscription and Payment Terms</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>If applicable, you may choose a Subscription plan. Payment terms, renewal, and cancellation policies will be as specified on the website or the relevant order form.</li>
            <li>We may modify pricing or plans at any time; we will notify you in advance of material changes.</li>
            <li>Unless otherwise stated, payments are non-refundable (except as required by law or expressly stated).</li>
            <li>You are responsible for all taxes associated with your purchases.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>All rights, title and interest in and to the Service, including software, design, logos, trademarks, and content (other than your User Content) are owned by or licensed to us.</li>
            <li>You retain ownership of your User Content, but by uploading or using it you grant us a worldwide, non-exclusive, royalty-free license to reproduce, modify, distribute, display and otherwise use your User Content for the purpose of providing and improving the Service.</li>
            <li>You represent and warrant that you own or have the necessary rights to your User Content and that it does not infringe any third‐party rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Acceptable Use and Prohibited Conduct</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Service in any way that violates laws or regulations (including data-protection, youth athlete protections, etc.).</li>
            <li>Use the Service for unauthorized or harmful purposes (e.g., hacking, distributing malware).</li>
            <li>Upload or transmit any content that is unlawful, harmful, infringing, defamatory, obscene, child-exploitive, or otherwise objectionable.</li>
            <li>Impersonate another person or misrepresent your affiliation.</li>
            <li>Interfere with security mechanisms or attempt to gain unauthorized access to the Service or its data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our <a href="/privacy" className="text-scarlet hover:underline">Privacy Policy</a>, which is incorporated by reference. We encourage you to review it carefully.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Disclaimers; Limitation of Liability</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Disclaimer of warranties.</strong> The Service is provided &ldquo;AS IS&rdquo;, &ldquo;AS AVAILABLE&rdquo; and without warranties of any kind. We disclaim all express or implied warranties, including fitness for a particular purpose, non-infringement, or uninterrupted service.</li>
            <li><strong>Limitation of liability.</strong> To the maximum extent permitted by law, our liability for any claim related to the Service is limited to the amount you paid in the prior 12 months (or $100 if no payment). We will not be liable for indirect, incidental, special, punitive or consequential damages.</li>
            <li>Some jurisdictions do not allow certain limitations; if these limitations are not permitted, our liability shall be limited to the minimum required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Termination</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You may terminate your account at any time by contacting us or via the account settings.</li>
            <li>We may suspend or terminate your account (including access to the Service) if you breach these Terms, or if we believe you misuse the Service.</li>
            <li>Upon termination, your rights to use the Service cease; we may delete or disable your Content and account data (subject to applicable laws and our data-retention policy).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will post the updated Terms on our site and update the &ldquo;Last Updated&rdquo; date. If the changes are material, we will provide advance notice (e.g., via email). By continuing to use the Service following changes, you agree to the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Governing Law and Dispute Resolution</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>These Terms shall be governed by the laws of [State/Country], without regard to its conflict of laws rules.</li>
            <li>Any dispute arising under or relating to these Terms will be resolved by binding arbitration in [City/State], or small-claims court if applicable.</li>
            <li>If any provision of these Terms is found invalid or unenforceable, that provision shall be enforced to the maximum extent permitted and the remaining provisions shall remain in full force.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">12. Miscellaneous</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>These Terms (together with the Privacy Policy) constitute the entire agreement between you and us regarding the Service.</li>
            <li>A waiver of any provision or right shall only be effective if in writing and signed by us.</li>
            <li>You may not assign your rights or obligations under these Terms without our prior written consent; we may assign without your consent.</li>
            <li>All notices to you may be provided via email or via posting on our website.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
