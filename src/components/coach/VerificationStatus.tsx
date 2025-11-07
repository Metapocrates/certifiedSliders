type VerificationStatusProps = {
  verification: {
    score: number;
    tier: number;
    signals: any;
    last_computed_at: string | null;
  };
  programName: string;
};

const TIER_INFO = {
  0: {
    name: "Limited Access",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    description: "Verify your affiliation to unlock full access",
  },
  1: {
    name: "Verified Coach",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Full access to interested athletes",
  },
  2: {
    name: "Coordinator",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Full access + analytics and advanced features",
  },
};

export default function VerificationStatus({
  verification,
  programName,
}: VerificationStatusProps) {
  const tierInfo = TIER_INFO[verification.tier as 0 | 1 | 2] || TIER_INFO[0];
  const nextTierScore = verification.tier === 0 ? 30 : verification.tier === 1 ? 70 : null;
  const scoreToNext = nextTierScore ? nextTierScore - verification.score : null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Verification Status</h2>
          <p className="text-sm text-muted-foreground">{programName}</p>
        </div>
        <div className={`rounded-full px-4 py-2 ${tierInfo.bgColor} ${tierInfo.color} font-medium`}>
          Tier {verification.tier}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className={`text-2xl font-bold ${tierInfo.color}`}>
            {tierInfo.name}
          </div>
          <div className="text-sm text-muted-foreground">
            Score: {verification.score} points
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{tierInfo.description}</p>
      </div>

      {/* Progress Bar */}
      {scoreToNext !== null && scoreToNext > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress to Tier {verification.tier + 1}</span>
            <span className="font-medium">{scoreToNext} points needed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (verification.score / (nextTierScore || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Active Signals */}
      {verification.signals && Object.keys(verification.signals).length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium">Active Verification Signals:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(verification.signals).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
              >
                {key.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {verification.last_computed_at && (
        <div className="text-xs text-muted-foreground">
          Last checked: {new Date(verification.last_computed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
