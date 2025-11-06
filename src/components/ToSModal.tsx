// src/components/ToSModal.tsx
"use client";

import { useState } from "react";

const TOS_VERSION = "1.0";

interface ToSModalProps {
  isOpen: boolean;
  actionType: "submit_result" | "link_account";
  onAccept: () => void | Promise<void>;
  onDecline: () => void;
}

export default function ToSModal({ isOpen, actionType, onAccept, onDecline }: ToSModalProps) {
  const [accepting, setAccepting] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Record ToS acceptance
      await fetch("/api/tos/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          tos_version: TOS_VERSION,
        }),
      });

      await onAccept();
    } catch (error) {
      console.error("Failed to record ToS acceptance:", error);
      alert("Failed to record acceptance. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const getActionText = () => {
    switch (actionType) {
      case "submit_result":
        return "submit results";
      case "link_account":
        return "link external accounts";
      default:
        return "continue";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-2xl font-semibold text-gray-900">Terms of Service</h2>
          <p className="text-sm text-gray-600 mt-1">
            Please review and accept our terms to {getActionText()}
          </p>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-lg mb-2">1. Acceptance of Terms</h3>
            <p>
              By using Certified Sliders and {getActionText()}, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">2. Data Accuracy & Verification</h3>
            <p className="mb-2">
              When submitting athletic results, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate and truthful information</li>
              <li>Submit valid proof for all results (meet results, photos, videos)</li>
              <li>Only submit results that belong to you or that you have permission to submit</li>
              <li>Not submit fraudulent, manipulated, or misleading information</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">3. Account Linking</h3>
            <p className="mb-2">
              When linking external accounts (e.g., Athletic.net), you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Only link accounts that belong to you</li>
              <li>Follow the verification process to prove ownership</li>
              <li>Not attempt to claim or link accounts belonging to others</li>
              <li>Allow us to import publicly available results from linked profiles</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">4. Content & Conduct</h3>
            <p className="mb-2">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Impersonate other athletes or coaches</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload malicious content or attempt to compromise the platform</li>
              <li>Use automated tools to scrape or collect data without permission</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">5. Privacy & Data Usage</h3>
            <p>
              We collect and use your data as described in our Privacy Policy. By submitting results
              and linking accounts, you consent to the collection, storage, and display of your
              athletic performance data on our platform.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">6. Account Suspension</h3>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms,
              submit fraudulent data, or engage in abusive behavior.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">7. Changes to Terms</h3>
            <p>
              We may update these terms from time to time. Continued use of the service after
              changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">8. Contact</h3>
            <p>
              For questions about these terms, please contact us through the support channels
              provided on our website.
            </p>
          </section>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={onDecline}
            disabled={accepting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="px-6 py-2 rounded-lg bg-scarlet text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {accepting ? "Processing..." : "Accept & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
