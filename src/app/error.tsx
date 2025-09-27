"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ marginBottom: 8 }}>Try again or go back.</p>

        <pre style={{
          whiteSpace: "pre-wrap",
          background: "#f8f8f8",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 12,
          marginTop: 12,
        }}>
{String(error?.message || "Server error")}
{error?.digest ? `\n\nDigest: ${error.digest}` : ""}
        </pre>

        <button
          onClick={() => reset()}
          style={{ marginTop: 16, padding: "8px 12px", border: "1px solid #333", borderRadius: 8 }}
        >
          Reset
        </button>
      </body>
    </html>
  );
}
