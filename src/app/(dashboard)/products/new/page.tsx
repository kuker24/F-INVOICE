import { Card, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/forms/product-form";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Produk baru</h1>
      <Card>
        <CardTitle className="mb-4">Data produk</CardTitle>
        <ProductForm mode="create" />
      </Card>
    </div>
  );
}
