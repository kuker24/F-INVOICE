"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSubscriptionAction } from "@/server/actions/subscriptions";

export type SubFormCustomer = { id: string; name: string; code: string };
export type SubFormProduct = {
  id: string;
  code: string;
  name: string;
  default_price: number;
  unit: string | null;
  billing_type: string;
  description?: string | null;
};

const CYCLE_FROM_BILLING: Record<string, string> = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  SEMIANNUAL: "SEMIANNUAL",
  YEARLY: "YEARLY",
  CUSTOM: "CUSTOM",
};

export function SubscriptionForm({
  customers,
  products,
}: {
  customers: SubFormCustomer[];
  products: SubFormProduct[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function applyProduct(id: string) {
    setProductId(id);
    if (!id) return;
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setName(p.name);
    setDescription(p.description ?? "");
    setPrice(Number(p.default_price) || 0);
    const cycle = CYCLE_FROM_BILLING[p.billing_type];
    if (cycle) setBillingCycle(cycle);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    start(async () => {
      const res = await createSubscriptionAction({
        ...raw,
        product_id: productId || null,
        name: name.trim() || String(raw.name ?? ""),
        description: description.trim() || null,
        price: Number(price),
        due_days: Number(raw.due_days || 7),
        custom_interval_days: raw.custom_interval_days
          ? Number(raw.custom_interval_days)
          : null,
        billing_cycle: billingCycle,
        auto_generate_invoice: raw.auto_generate_invoice === "on",
        end_date: raw.end_date ? String(raw.end_date) : null,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      router.push("/subscriptions");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="customer_id">Pelanggan</Label>
          <Select id="customer_id" name="customer_id" required defaultValue="">
            <option value="" disabled>
              Pilih…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="product_id">Produk / layanan</Label>
          <Select
            id="product_id"
            name="product_id"
            value={productId}
            onChange={(e) => applyProduct(e.target.value)}
          >
            <option value="">Tanpa produk (isi nama manual)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name} ({p.default_price.toLocaleString("id-ID")})
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-mid-gray">
            Nama item di invoice mengikuti produk ini (bukan nama pelanggan).
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="name">Nama langganan / item invoice</Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: SIAB2-Absensi"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Deskripsi (opsional)</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Keterangan di baris invoice"
          />
        </div>

        <div>
          <Label htmlFor="billing_cycle">Siklus</Label>
          <Select
            id="billing_cycle"
            name="billing_cycle"
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value)}
          >
            <option value="MONTHLY">Bulanan</option>
            <option value="QUARTERLY">3 bulanan</option>
            <option value="SEMIANNUAL">6 bulanan</option>
            <option value="YEARLY">Tahunan</option>
            <option value="CUSTOM">Custom</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="custom_interval_days">Interval custom (hari)</Label>
          <Input
            id="custom_interval_days"
            name="custom_interval_days"
            type="number"
            min={1}
          />
        </div>
        <div>
          <Label htmlFor="price">Harga (Rp)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            required
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="due_days">Jatuh tempo (hari)</Label>
          <Input
            id="due_days"
            name="due_days"
            type="number"
            min={0}
            defaultValue={7}
          />
        </div>
        <div>
          <Label htmlFor="start_date">Mulai</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={today}
          />
        </div>
        <div>
          <Label htmlFor="next_invoice_date">Invoice berikutnya</Label>
          <Input
            id="next_invoice_date"
            name="next_invoice_date"
            type="date"
            defaultValue={today}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="auto_generate_invoice" defaultChecked />
        Auto generate & kirim invoice
      </label>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </form>
  );
}
