import { Card, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Pelanggan baru</h1>
      <Card>
        <CardTitle className="mb-4">Data pelanggan</CardTitle>
        <CustomerForm mode="create" />
      </Card>
    </div>
  );
}
