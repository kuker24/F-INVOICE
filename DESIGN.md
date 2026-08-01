---
name: F-INVOICE
description: Operator-grade invite-only invoice ledger — clinical mono on frosted paper
colors:
  canvas: "#f5f5f5"
  paper: "#ffffff"
  surface-alt: "#fafafa"
  ink: "#0a0a0a"
  ink-soft: "#171717"
  mid-gray: "#525252"
  hairline: "#e5e5e5"
  ember: "#e7000b"
  canvas-dark: "#0a0a0a"
  paper-dark: "#141414"
  surface-alt-dark: "#111111"
  ink-dark: "#f5f5f5"
  ink-soft-dark: "#e5e5e5"
  mid-gray-dark: "#a8a8a8"
  hairline-dark: "#262626"
  ember-dark: "#ff4d4f"
typography:
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.05em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  pdf:
    fontFamily: "Helvetica, Helvetica-Bold"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  small: "6px"
  nested: "10px"
  interactive: "18px"
  cards: "24px"
spacing:
  4: "4px"
  8: "8px"
  12: "12px"
  16: "16px"
  20: "20px"
  24: "24px"
  48: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-alt}"
    rounded: "{rounded.interactive}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.surface-alt}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "0 16px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "0 16px"
    height: "40px"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.ember}"
    rounded: "{rounded.interactive}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.cards}"
    padding: "20px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "8px 12px"
    height: "40px"
  badge-solid:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.surface-alt}"
    rounded: "{rounded.interactive}"
    padding: "2px 10px"
  badge-soft:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "2px 10px"
  badge-danger:
    backgroundColor: "#e7000b1a"
    textColor: "{colors.ember}"
    rounded: "{rounded.interactive}"
    padding: "2px 10px"
  nav-item-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "10px 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.mid-gray}"
    rounded: "{rounded.interactive}"
    padding: "10px 12px"
---

# Design System: F-INVOICE

## 1. Overview

**Creative North Star: "Clinical Blueprint on Frosted Paper"**

F-INVOICE is an invite-only operator ledger, not a SaaS marketing shell. The visual system is almost entirely achromatic: warm-gray canvas, white paper cards, black ink, and one ember reserved for destructive action and error. Geist carries every label, heading, and tabular IDR amount. Density is compact; chrome is quiet; every surface exists to finish a job (list, create, verify, share).

The system rejects theatre. No gradient heroes, no emerald growth dashboards, no glassmorphic shells, no navy-and-gold fintech chrome. Dark mode is optional system preference only — light mono is the default identity. Indonesian product voice: short labels, clear status words, no marketing fluff.

**Key Characteristics:**
- Achromatic by default; ember only for destroy/error (not status paint on metrics)
- Radius hierarchy: 18px interactive, 24px containers
- Whisper elevation: hairline border + barely-there card shadow
- Money is sacred: tabular-nums, integer IDR, honest status machine
- Task over theatre: CTAs and deep links beat vanity KPI wallpaper

## 2. Colors

Restrained mono palette. One accent for danger only.

### Primary
- **Ink** (`#0a0a0a` / `--dm-ink`): Primary text, filled primary buttons, icon strokes at full emphasis.
- **Ink Soft** (`#171717` / `--dm-ink-soft`): Hover for filled actions, solid badge fill.

### Neutral
- **Canvas** (`#f5f5f5` / `--dm-canvas`): Page background, secondary button fill, input resting fill.
- **Paper** (`#ffffff` / `--dm-paper`): Cards, header, active nav pill.
- **Surface Alt** (`#fafafa` / `--dm-surface-alt`): Sidebar, subtle elevated band.
- **Mid Gray** (`#525252` / `--dm-mid-gray`): Muted body, placeholders, helper labels. **AA on paper/canvas** — not `#737373`.
- **Hairline** (`#e5e5e5` / `--dm-hairline`): Borders, dividers, input outlines.

### Destructive
- **Ember** (`#e7000b` / `--dm-ember`): Destructive buttons, error text, danger badge text. Never brand decoration. Never the sole cue for “overdue money” on a dashboard metric — use Badge/weight.

### Dark (optional)
- Canvas `#0a0a0a`, paper `#141414`, surface-alt `#111111`, ink `#f5f5f5`, mid-gray `#a8a8a8`, hairline `#262626`, ember `#ff4d4f`.

**The One Ember Rule.** Ember appears only for destructive/error. Status (OVERDUE, PENDING) uses Badge tones or type weight, not ember paint on vanity numbers.

**The Three-Tone Stack Rule.** Canvas → surface-alt → paper layers depth without chromatic chrome.

## 3. Typography

**Display/Body Font:** Geist Sans (`--font-geist-sans`) with ui-sans-serif / system-ui fallback  
**Mono Font:** Geist Mono for code-adjacent IDs when needed (`--font-geist-mono`)

**Character:** One family for the whole product UI. Geometric, developer-infrastructure neutrality. No display serif. No marketing fluid clamp headings.

### Hierarchy
- **Display** (600, 36px, 1.1, tight tracking): Rare hero money figures only.
- **Headline** (600, 24px, 1.2): Page-level emphasis when needed.
- **Title** (600, 18–20px, tight): Card titles (`CardTitle`), section heads.
- **Body** (400, 14px, 1.43): Default UI copy; list rows; form labels companion text.
- **Label / Caption** (500, 12px, slight tracking): Stat labels, role chips, uppercase optional for status keys.
- **Button** (500, 14px): Primary/secondary control labels; sm size 12px.

### Named Rules
**The Product Type Rule.** Fixed rem scale, not fluid clamp. One sans. Tabular-nums on every IDR amount and count.

**The Money Scale Rule.** Outstanding / primary money on home uses larger weight (≈30–36px / 600) than vanity counts (≈24px). Equal `text-2xl` on every KPI is forbidden.

## 4. Elevation

Flat-by-default with whisper card lift. No dramatic drop shadows, no colored glows, no glass stacks.

### Shadow Vocabulary
- **Card / subtle** (`0 0 0 1px rgba(23,23,23,0.05), 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` / `--dm-shadow-subtle`): Cards, active nav pill, skip-link focus.
- **Filled button:** none — tonal contrast only.
- **Input focus:** 1–2px ink-tinted ring (`ring-ink/15`), hairline border strengthens; no offset shadow.

### Named Rules
**The Flat-By-Default Rule.** Surfaces rest flat. Shadow only marks “card” or sticky chrome. Sticky header may use `bg-paper/95` + light blur; keep blur minimal — product anti-ref against glassmorphism.

**The Hairline Edge Rule.** Cards always carry `1px solid hairline` plus subtle shadow. Shadow alone is not the edge.

## 5. Components

### Buttons
- **Shape:** Pill geometry (`18px` radius on ~40px height).
- **Primary:** Ink fill, surface-alt text, hover ink-soft. High-emphasis: Simpan, Buat, Verifikasi.
- **Secondary:** Canvas fill, ink text. Keluar, low emphasis.
- **Outline:** Transparent + hairline border.
- **Ghost:** Transparent, hover canvas.
- **Destructive:** Transparent, ember text, hover ember/10.
- **Focus:** `ring-2 ring-ink/25` + offset on paper.
- **Sizes:** default 40px, sm 36px, lg 44px, icon 40×40.

### Badges
- Soft (canvas/ink), solid (ink-soft/surface-alt), danger (ember/10 + ember text), muted, warn (canvas + hairline).
- Radius 18px, text 12px medium. Status via `statusTone()` — not free-form color.

### Cards / Containers
- Paper, 24px radius, hairline border, shadow-subtle, padding 20px (`p-5`).
- Nested radius 10px when stacking inside cards.

### Inputs / Fields
- Canvas fill, hairline border, 18px radius, h-10, 14px body.
- Placeholder mid-gray. Focus: stronger border + soft ink ring.
- Search (`ListSearch`) shares the same field vocabulary.

### Navigation
- Sidebar surface-alt, full height sticky, ~240px.
- Items: 18px radius pills, mid-gray rest, paper + shadow when active.
- Group labels (Master / Uang / Sistem) are 12px mid-gray uppercase — not extra buttons.
- Mobile: top bar + drawer overlay; labels on open/close.

### Empty states
- Centered status region, short Indonesian title + description, one primary CTA when the path is clear.
- Never blank white void with only “No data.”

### Data tables / lists
- Shared `DataTable` chrome, hairline dividers, badge status, row actions consistent across customers/invoices/payments/products/subscriptions.

### Stat blocks (dashboard)
- Label: 12px mid-gray (caption).
- Value: tabular-nums semibold; money hero larger than count.
- Prefer **link cards** to filtered lists over dead numbers.
- Overdue emphasis: Badge or weight — not ember numeral.

## 6. Do's and Don'ts

### Do:
- **Do** use mid-gray `#525252` (light) so muted text stays AA on paper/canvas.
- **Do** put primary job CTAs on list and home surfaces (`+ Invoice`, verify queue).
- **Do** keep ember for destructive/error only.
- **Do** use integer IDR + `tabular-nums` for every money figure.
- **Do** match EmptyState + ListSearch patterns across staff lists.
- **Do** honor `prefers-reduced-motion` (state feedback only, 150–250ms).
- **Do** write Indonesian ops labels for staff UI (`Jatuh tempo`, `Piutang`, `Invoice terbuka`).

### Don't:
- **Don't** ship public SaaS onboarding, pricing pages, or multi-tenant workspace chrome.
- **Don't** use navy-and-gold fintech, emerald growth dashboards, or gradient hero metrics.
- **Don't** apply glassmorphism, side-stripe cards, or AI-cream marketing landing as the app shell.
- **Don't** make dark-first “cool tools” the default identity.
- **Don't** invent chromatic brand colors beyond ember.
- **Don't** paint overdue/open metrics with ember as decoration.
- **Don't** use equal-weight vanity KPI cards with no deep link (scoreboard theatre).
- **Don't** mix English money jargon with Indonesian chrome without reason (`Invoice open` vs `Pelanggan`).
- **Don't** set body/muted text lighter than mid-gray on paper (fails AA).
- **Don't** use border-radius outside the scale (6 / 10 / 18 / 24).
- **Don't** add payment-gateway marketplace UX or WhatsApp-chat product surfaces in MVP.
