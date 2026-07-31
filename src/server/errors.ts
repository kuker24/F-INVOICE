export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } };
}

export function toActionError(e: unknown): ActionResult<never> {
  if (e instanceof AppError) {
    return fail(e.code, e.message);
  }
  if (e && typeof e === "object" && "code" in e && "message" in e) {
    const err = e as { code: string; message: string; name?: string };
    if (err.name === "PermissionError" || err.code === "FORBIDDEN") {
      return fail("FORBIDDEN", err.message || "Akses ditolak.");
    }
  }
  console.error(e);
  return fail("INTERNAL", "Terjadi kesalahan. Coba lagi.");
}
