import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <div className="mb-6 space-y-2">
        <CardTitle>Lupa password</CardTitle>
        <CardDescription>
          Masukkan email akun. Jika terdaftar, tautan reset akan dikirim.
        </CardDescription>
      </div>
      <ForgotPasswordForm />
    </Card>
  );
}
