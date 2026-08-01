import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  // Money uses tabular-nums CSS, not a second face — skip Geist Mono (~23–30KB).
  preload: true,
});

export const metadata: Metadata = {
  title: "F-INVOICE",
  description: "Private invoice management system",
};

/** Run serverless near SEA users (was iad1 → multi-second RTT). */
export const preferredRegion = ["sin1"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('finv-theme');if(t==='dark'||t==='light')document.documentElement.classList.add(t);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} min-h-screen bg-canvas font-sans text-ink antialiased`}
      >
        <a href="#main" className="skip-link">
          Loncat ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
