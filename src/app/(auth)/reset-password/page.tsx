import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <Card>
      <div className="space-y-2">
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Buka tautan dari email reset Supabase Auth. Form ganti password penuh
          menyusul di PR berikutnya; sementara set password lewat Supabase
          recovery flow.
        </CardDescription>
      </div>
    </Card>
  );
}
