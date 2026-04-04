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
      <body style={{ margin: 0 }}>
        <div style={{ padding: 24, color: "#fff", background: "#050b15", minHeight: "100vh" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Global error</h2>
          <p style={{ opacity: 0.8, marginTop: 8 }}>
            {error?.message ?? "Unknown error"}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(140,170,255,.18)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
