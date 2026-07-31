import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatIdr } from "@/lib/money/invoice-math";

export type PdfInvoiceData = {
  businessName: string;
  businessAddress?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  customerName: string;
  customerAddress?: string | null;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  additionalFee: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  terms?: string | null;
  footer?: string | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: "#737373" },
  section: { marginTop: 16 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 6,
    marginTop: 12,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    paddingVertical: 6,
  },
  colName: { width: "40%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "30%", textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalLine: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    marginBottom: 4,
  },
  grand: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 6 },
});

export function InvoicePdfDocument({ data }: { data: PdfInvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <View>
            <Text style={styles.title}>{data.businessName}</Text>
            {data.businessAddress ? (
              <Text style={styles.muted}>{data.businessAddress}</Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text>{data.invoiceNumber}</Text>
            <Text style={styles.muted}>Status: {data.status}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.row]}>
          <View>
            <Text style={styles.muted}>Tagihan kepada</Text>
            <Text>{data.customerName}</Text>
            {data.customerAddress ? (
              <Text style={styles.muted}>{data.customerAddress}</Text>
            ) : null}
          </View>
          <View>
            <Text>Tanggal: {data.issueDate}</Text>
            <Text>Jatuh tempo: {data.dueDate}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colName}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Harga</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {data.items.map((it, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colName}>{it.name}</Text>
            <Text style={styles.colQty}>{it.quantity}</Text>
            <Text style={styles.colPrice}>{formatIdr(it.unitPrice)}</Text>
            <Text style={styles.colTotal}>{formatIdr(it.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text>Subtotal</Text>
            <Text>{formatIdr(data.subtotal)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Diskon</Text>
            <Text>{formatIdr(data.discountAmount)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Pajak</Text>
            <Text>{formatIdr(data.taxAmount)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Biaya lain</Text>
            <Text>{formatIdr(data.additionalFee)}</Text>
          </View>
          <View style={[styles.totalLine, styles.grand]}>
            <Text>Total</Text>
            <Text>{formatIdr(data.totalAmount)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Terbayar</Text>
            <Text>{formatIdr(data.amountPaid)}</Text>
          </View>
          <View style={[styles.totalLine, styles.grand]}>
            <Text>Sisa</Text>
            <Text>{formatIdr(data.balanceDue)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.muted}>Catatan</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}
        {data.terms ? (
          <View style={styles.section}>
            <Text style={styles.muted}>Syarat</Text>
            <Text>{data.terms}</Text>
          </View>
        ) : null}
        {data.footer ? (
          <View style={styles.section}>
            <Text style={styles.muted}>{data.footer}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
