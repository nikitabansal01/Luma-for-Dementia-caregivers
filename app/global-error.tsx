"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#faf8f5" }}>
        <h2 style={{ marginBottom: "0.75rem" }}>Something went wrong</h2>
        <p style={{ marginBottom: "1rem", color: "#6b6b6b" }}>
          The app hit an unexpected error. Try refreshing the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#2d5016",
            color: "white",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
