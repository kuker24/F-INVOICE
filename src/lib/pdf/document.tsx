import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatIdr } from "@/lib/money/invoice-math";

export type PdfPaymentMethod = {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  branch?: string | null;
  instructions?: string | null;
  type?: string | null;
};

export type PdfInvoiceData = {
  businessName: string;
  legalName?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  businessWebsite?: string | null;
  businessTaxId?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  showSignature?: boolean;
  accentColor?: string | null;
  invoiceNumber: string;
  invoiceType?: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  customerName: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  periodLabel?: string | null;
  items: {
    name: string;
    description?: string | null;
    quantity: number;
    unit?: string | null;
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
  paymentMethod?: PdfPaymentMethod | null;
};

function formatDateId(iso: string): string {
  // expect YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    SENT: "Terkirim",
    VIEWED: "Dilihat",
    PARTIALLY_PAID: "Sebagian dibayar",
    PAID: "Lunas",
    OVERDUE: "Jatuh tempo",
    CANCELLED: "Dibatalkan",
  };
  return map[status] ?? status;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
    lineHeight: 1.4,
  },
  accentBar: {
    height: 3,
    marginBottom: 18,
    marginHorizontal: -40,
    marginTop: -36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  brandBlock: { flex: 1, paddingRight: 12 },
  logo: { width: 64, height: 64, objectFit: "contain", marginBottom: 8 },
  businessName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  legalName: { fontSize: 9, color: "#525252", marginBottom: 4 },
  contactLine: { fontSize: 9, color: "#525252", marginBottom: 1 },
  metaBlock: { width: 190, alignItems: "flex-end" },
  docTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 2,
  },
  metaLabel: { fontSize: 9, color: "#737373" },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  statusPill: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  section: { marginTop: 18 },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  col: { flex: 1 },
  sectionLabel: {
    fontSize: 8,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  strong: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 2 },
  muted: { fontSize: 9, color: "#525252", marginBottom: 1 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 7,
    paddingHorizontal: 6,
    marginTop: 14,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#404040",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "flex-start",
  },
  colItem: { width: "42%", paddingRight: 6 },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "23%", textAlign: "right" },
  colTotal: { width: "23%", textAlign: "right" },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  itemDesc: { fontSize: 8, color: "#737373", marginTop: 2 },
  totalsWrap: { marginTop: 14, alignItems: "flex-end" },
  totalLine: {
    flexDirection: "row",
    width: 230,
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalMuted: { color: "#525252" },
  totalDivider: {
    width: 230,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    marginVertical: 5,
  },
  grandLabel: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  grandValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  balanceBox: {
    marginTop: 6,
    width: 230,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  payBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#fafafa",
  },
  payTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
  },
  payLine: { fontSize: 9, marginBottom: 2 },
  notesBox: { marginTop: 14 },
  notesTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 3,
    color: "#404040",
  },
  notesBody: { fontSize: 9, color: "#404040" },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
    fontSize: 8,
    color: "#737373",
    textAlign: "center",
  },
  signatureBlock: {
    marginTop: 28,
    width: 180,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  signatureImg: {
    width: 120,
    height: 48,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: "#a3a3a3",
    marginTop: 36,
    marginBottom: 4,
  },
  signatureCaption: { fontSize: 8, color: "#737373" },
});

function MoneyLine({
  label,
  amount,
  bold,
  muted,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={styles.totalLine}>
      <Text
        style={[
          bold ? styles.grandLabel : {},
          muted ? styles.totalMuted : {},
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          bold ? styles.grandValue : {},
          muted ? styles.totalMuted : {},
        ]}
      >
        {formatIdr(amount)}
      </Text>
    </View>
  );
}

export function InvoicePdfDocument({ data }: { data: PdfInvoiceData }) {
  const accent = data.accentColor?.trim() || "#0a0a0a";
  const pm = data.paymentMethod;
  const hasPayment =
    pm &&
    (pm.bankName ||
      pm.accountNumber ||
      pm.accountHolder ||
      pm.instructions);

  const businessLines = [
    data.businessAddress,
    [data.businessPhone, data.businessEmail].filter(Boolean).join(" · ") || null,
    data.businessWebsite,
    data.businessTaxId ? `NPWP: ${data.businessTaxId}` : null,
  ].filter(Boolean) as string[];

  const customerLines = [
    data.customerAddress,
    data.customerPhone,
    data.customerEmail,
  ].filter(Boolean) as string[];

  return (
    <Document
      title={`${data.invoiceNumber} — ${data.customerName}`}
      author={data.businessName}
      subject="Invoice"
    >
      <Page size="A4" style={styles.page}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {data.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
              <Image src={data.logoUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.businessName}>{data.businessName}</Text>
            {data.legalName ? (
              <Text style={styles.legalName}>{data.legalName}</Text>
            ) : null}
            {businessLines.map((line, i) => (
              <Text key={i} style={styles.contactLine}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.docTitle}>INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No.</Text>
              <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaValue}>
                {formatDateId(data.issueDate)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Jatuh tempo</Text>
              <Text style={styles.metaValue}>{formatDateId(data.dueDate)}</Text>
            </View>
            {data.invoiceType ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Jenis</Text>
                <Text style={styles.metaValue}>{data.invoiceType}</Text>
              </View>
            ) : null}
            {data.periodLabel ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Periode</Text>
                <Text style={styles.metaValue}>{data.periodLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.statusPill}>{statusLabel(data.status)}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.twoCol]}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Tagihan kepada</Text>
            <Text style={styles.strong}>{data.customerName}</Text>
            {customerLines.map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
          <View style={[styles.col, { alignItems: "flex-end" }]}>
            <Text style={styles.sectionLabel}>Ringkasan</Text>
            <Text style={styles.muted}>
              Total: {formatIdr(data.totalAmount)}
            </Text>
            <Text style={styles.muted}>
              Terbayar: {formatIdr(data.amountPaid)}
            </Text>
            <Text style={[styles.strong, { marginTop: 2 }]}>
              Sisa: {formatIdr(data.balanceDue)}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colItem}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Harga</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {data.items.map((it, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <View style={styles.colItem}>
              <Text style={styles.itemName}>{it.name}</Text>
              {it.description ? (
                <Text style={styles.itemDesc}>{it.description}</Text>
              ) : null}
              {it.unit ? (
                <Text style={styles.itemDesc}>Satuan: {it.unit}</Text>
              ) : null}
            </View>
            <Text style={styles.colQty}>{it.quantity}</Text>
            <Text style={styles.colPrice}>{formatIdr(it.unitPrice)}</Text>
            <Text style={styles.colTotal}>{formatIdr(it.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totalsWrap}>
          <MoneyLine label="Subtotal" amount={data.subtotal} muted />
          {data.discountAmount > 0 ? (
            <MoneyLine label="Diskon" amount={data.discountAmount} muted />
          ) : null}
          {data.taxAmount > 0 ? (
            <MoneyLine label="Pajak" amount={data.taxAmount} muted />
          ) : null}
          {data.additionalFee > 0 ? (
            <MoneyLine label="Biaya lain" amount={data.additionalFee} muted />
          ) : null}
          <View style={styles.totalDivider} />
          <MoneyLine label="Total" amount={data.totalAmount} bold />
          <MoneyLine label="Terbayar" amount={data.amountPaid} muted />
          <View style={styles.balanceBox}>
            <Text style={styles.grandLabel}>Sisa tagihan</Text>
            <Text style={styles.grandValue}>
              {formatIdr(data.balanceDue)}
            </Text>
          </View>
        </View>

        {hasPayment ? (
          <View style={styles.payBox} wrap={false}>
            <Text style={styles.payTitle}>Pembayaran ke</Text>
            {pm?.bankName ? (
              <Text style={styles.payLine}>Bank: {pm.bankName}</Text>
            ) : null}
            {pm?.accountNumber ? (
              <Text style={styles.payLine}>No. rekening: {pm.accountNumber}</Text>
            ) : null}
            {pm?.accountHolder ? (
              <Text style={styles.payLine}>a.n. {pm.accountHolder}</Text>
            ) : null}
            {pm?.branch ? (
              <Text style={styles.payLine}>Cabang: {pm.branch}</Text>
            ) : null}
            {pm?.instructions ? (
              <Text style={[styles.payLine, { marginTop: 4, color: "#525252" }]}>
                {pm.instructions}
              </Text>
            ) : null}
          </View>
        ) : null}

        {data.notes?.trim() ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Catatan</Text>
            <Text style={styles.notesBody}>{data.notes.trim()}</Text>
          </View>
        ) : null}

        {data.terms?.trim() ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Syarat & ketentuan</Text>
            <Text style={styles.notesBody}>{data.terms.trim()}</Text>
          </View>
        ) : null}

        {data.showSignature !== false ? (
          <View style={styles.signatureBlock} wrap={false}>
            {data.signatureUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
              <Image src={data.signatureUrl} style={styles.signatureImg} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureCaption}>{data.businessName}</Text>
            <Text style={styles.signatureCaption}>Hormat kami</Text>
          </View>
        ) : null}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            [
              data.footer?.trim() ||
                `Dicetak dari ${data.businessName} · ${data.invoiceNumber}`,
              `Hal. ${pageNumber}/${totalPages}`,
            ].join("  ·  ")
          }
        />
      </Page>
    </Document>
  );
}
