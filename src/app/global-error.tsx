"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          color: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 24,
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Terjadi kesalahan</h1>
          <p style={{ fontSize: 14, color: "#737373", margin: "0 0 16px" }}>
            Aplikasi tidak bisa dimuat. Muat ulang halaman.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#737373", fontFamily: "monospace" }}>
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              height: 40,
              padding: "0 16px",
              borderRadius: 18,
              border: 0,
              background: "#0a0a0a",
              color: "#fafafa",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
