import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid."),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm: z.string().min(8, "Konfirmasi password minimal 8 karakter."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Password dan konfirmasi tidak sama.",
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
