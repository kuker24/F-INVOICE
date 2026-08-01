export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <main id="main" className="w-full max-w-md" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
