import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Card>
      <div className="mb-6 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-mid-gray">
          F-INVOICE
        </p>
        <CardTitle>Masuk ke F-INVOICE</CardTitle>
        <CardDescription>
          Kelola invoice, langganan, dan pembayaran pelanggan.
        </CardDescription>
      </div>
      <LoginForm />
    </Card>
  );
}
