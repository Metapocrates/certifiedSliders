"use client";

type Props = {
  className?: string;
  showWordmark?: boolean;
};

export default function BrandLogo({ className, showWordmark = true }: Props) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 520 180"
        role="img"
        aria-label="Certified Sliders"
        className="h-auto w-full"
      >
        {/* Swoosh */}
        <path
          d="M30 120c70 10 190 5 260-40"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="26"
          strokeLinecap="round"
        />
        {/* Sparkle */}
        <path
          d="M360 24v32m-16-16h32"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Runner simplified silhouette */}
        <path
          d="M250 70c-10 0-18-8-18-18s8-18 18-18 18 8 18 18-8 18-18 18zm-8 12c14-6 48 8 62 16 9 5 10 19 2 26a18 18 0 0 1-23 1l-26-19-16 34c-5 10-15 16-26 14-11-2-18-13-16-24l8-40-18 6c-10 3-21-2-24-12-4-11 3-22 14-25l46-14c8-2 17 0 23 6l14 13z"
          fill="var(--cs-scarlet)"
        />
        {showWordmark && (
          <>
            {/* CERTIFIED */}
            <text
              x="30"
              y="165"
              fontFamily="system-ui, ui-sans-serif, Inter, Segoe UI, Roboto"
              fontWeight={800}
              fontSize="44"
              fill="var(--text)"
              letterSpacing="0.5"
            >
              CERTIFIED
            </text>
            {/* SLIDERS */}
            <text
              x="300"
              y="165"
              fontFamily="system-ui, ui-sans-serif, Inter, Segoe UI, Roboto"
              fontWeight={900}
              fontSize="44"
              fill="var(--cs-scarlet)"
              letterSpacing="0.5"
            >
              SLIDERS
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
