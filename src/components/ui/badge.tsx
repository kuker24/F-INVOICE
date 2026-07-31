import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  default: "bg-canvas text-ink",
  success: "bg-ink text-[#fafafa]",
  warn: "bg-canvas text-ink border border-hairline",
  danger: "bg-ember/10 text-ember",
  muted: "bg-canvas text-mid-gray",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[18px] px-2.5 py-0.5 text-xs font-medium",
        tones[tone] ?? tones.default,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): keyof typeof tones {
  switch (status) {
    case "PAID":
    case "ACTIVE":
    case "VERIFIED":
      return "success";
    case "OVERDUE":
    case "REJECTED":
    case "CANCELLED":
      return "danger";
    case "DRAFT":
    case "PENDING":
    case "INVITED":
      return "muted";
    case "PARTIALLY_PAID":
    case "SENT":
    case "VIEWED":
      return "warn";
    default:
      return "default";
  }
}
