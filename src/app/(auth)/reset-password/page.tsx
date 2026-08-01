import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Card>
      <div className="mb-6 space-y-2">
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Atur password baru setelah membuka tautan dari email.
        </CardDescription>
      </div>
      <ResetPasswordForm />
    </Card>
  );
}
