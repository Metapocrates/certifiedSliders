// src/app/(public)/welcome/choose-role/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleCard from '@/components/portals/RoleCard';

export default function ChooseRolePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = async (role: string, onboardingRoute: string) => {
    setIsSubmitting(true);

    try {
      // Set role preference
      const response = await fetch('/api/roles/set-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        throw new Error('Failed to set role preference');
      }

      // Navigate to onboarding
      router.push(onboardingRoute);
    } catch (error) {
      console.error('Failed to set role:', error);
      alert('Failed to set role. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-6xl py-12">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold text-app">Welcome to Certified Sliders</h1>
        <p className="mt-3 text-lg text-muted">
          Choose your role to get started
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <RoleCard
          icon={
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          title="Athlete"
          description="Track your PRs, get verified, and connect with college coaches"
          onClick={() => handleRoleSelect('athlete', '/me')}
          disabled={isSubmitting}
        />

        <RoleCard
          icon={
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          title="Parent / Guardian"
          description="Support your athlete and submit results on their behalf"
          onClick={() => handleRoleSelect('parent', '/parent/onboarding')}
          disabled={isSubmitting}
        />

        <RoleCard
          icon={
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          title="HS Coach"
          description="Manage your roster, attest results, and support your athletes"
          onClick={() => handleRoleSelect('hs_coach', '/hs/onboarding')}
          disabled={isSubmitting}
        />

        <RoleCard
          icon={
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          title="College Coach"
          description="Search verified athletes and build your recruiting lists"
          onClick={() => handleRoleSelect('ncaa_coach', '/coach/onboarding')}
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> You can change your default landing page later in your profile settings.
        </p>
      </div>
    </div>
  );
}
