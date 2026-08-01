"use client";

/** Inline action error — replaces alert() on row mutations. */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-xs text-ember" role="alert">
      {message}
    </p>
  );
}
