"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createInvoiceAction } from "@/server/actions/invoices";

type CustomerOpt = { id: string; name: string; code: string };
type ProductOpt = {
  id: string;
  name: string;
  default_price: number;
  default_tax_rate: number;
  unit: string | null;
};

export function InvoiceForm({
  customers,
  products,
}: {
  customers: CustomerOpt[];
  products: ProductOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState([
    {
      name: "",
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      tax_rate: 0,
      product_id: "",
      unit: "",
    },
  ]);

  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        product_id: productId,
        name: p?.name ?? next[idx].name,
        unit_price: p?.default_price ?? next[idx].unit_price,
        tax_rate: p?.default_tax_rate ?? next[idx].tax_rate,
        unit: p?.unit ?? next[idx].unit,
      };
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      customer_id: String(fd.get("customer_id")),
      invoice_type: String(fd.get("invoice_type") || "PROJECT"),
      issue_date: String(fd.get("issue_date")),
      due_date: String(fd.get("due_date")),
      discount_amount: Number(fd.get("discount_amount") || 0),
      additional_fee: Number(fd.get("additional_fee") || 0),
      customer_notes: String(fd.get("customer_notes") || "") || null,
      internal_notes: String(fd.get("internal_notes") || "") || null,
      terms: String(fd.get("terms") || "") || null,
      items: items.map((it) => ({
        product_id: it.product_id || null,
        name: it.name,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount_amount: Number(it.discount_amount),
        tax_rate: Number(it.tax_rate),
        unit: it.unit || null,
      })),
    };
    start(async () => {
      const res = await createInvoiceAction(payload);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      router.push(`/invoices/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Pelanggan</Label>
          <Select name="customer_id" required defaultValue="">
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
        <div>
          <Label>Tipe</Label>
          <Select name="invoice_type" defaultValue="PROJECT">
            <option value="PROJECT">Project</option>
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="HOSTING">Hosting</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label>Tanggal</Label>
          <Input name="issue_date" type="date" required defaultValue={today} />
        </div>
        <div>
          <Label>Jatuh tempo</Label>
          <Input name="due_date" type="date" required defaultValue={today} />
        </div>
        <div>
          <Label>Diskon header</Label>
          <Input name="discount_amount" type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Biaya tambahan</Label>
          <Input name="additional_fee" type="number" min={0} defaultValue={0} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Item</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItems((p) => [
                ...p,
                {
                  name: "",
                  quantity: 1,
                  unit_price: 0,
                  discount_amount: 0,
                  tax_rate: 0,
                  product_id: "",
                  unit: "",
                },
              ])
            }
          >
            + Item
          </Button>
        </div>
        {items.map((it, idx) => (
          <div
            key={idx}
            className="grid gap-2 rounded-[18px] border border-hairline p-3 sm:grid-cols-6"
          >
            <div className="sm:col-span-2">
              <Label>Produk (opsional)</Label>
              <Select
                value={it.product_id}
                onChange={(e) => pickProduct(idx, e.target.value)}
              >
                <option value="">Custom</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Nama</Label>
              <Input
                required
                value={it.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setItems((p) => {
                    const n = [...p];
                    n[idx] = { ...n[idx], name: v };
                    return n;
                  });
                }}
              />
            </div>
            <div>
              <Label>Qty</Label>
              <Input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setItems((p) => {
                    const n = [...p];
                    n[idx] = { ...n[idx], quantity: v };
                    return n;
                  });
                }}
              />
            </div>
            <div>
              <Label>Harga</Label>
              <Input
                type="number"
                min={0}
                value={it.unit_price}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setItems((p) => {
                    const n = [...p];
                    n[idx] = { ...n[idx], unit_price: v };
                    return n;
                  });
                }}
              />
            </div>
            <div>
              <Label>Diskon</Label>
              <Input
                type="number"
                min={0}
                value={it.discount_amount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setItems((p) => {
                    const n = [...p];
                    n[idx] = { ...n[idx], discount_amount: v };
                    return n;
                  });
                }}
              />
            </div>
            <div>
              <Label>Pajak bp</Label>
              <Input
                type="number"
                min={0}
                value={it.tax_rate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setItems((p) => {
                    const n = [...p];
                    n[idx] = { ...n[idx], tax_rate: v };
                    return n;
                  });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Catatan pelanggan</Label>
          <Textarea name="customer_notes" />
        </div>
        <div>
          <Label>Catatan internal</Label>
          <Textarea name="internal_notes" />
        </div>
      </div>
      <div>
        <Label>Syarat</Label>
        <Textarea name="terms" />
      </div>

      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Buat DRAFT"}
      </Button>
    </form>
  );
}
