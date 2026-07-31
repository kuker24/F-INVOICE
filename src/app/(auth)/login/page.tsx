import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Card>
      <div className="mb-6 space-y-1">
        <p className="text-sm font-semibold tracking-tight text-ink">F-INVOICE</p>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>
          Kelola invoice, langganan, dan pembayaran pelanggan.
        </CardDescription>
      </div>
      <LoginForm />
    </Card>
  );
}
