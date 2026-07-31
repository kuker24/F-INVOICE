# Design review — F-INVOICE (2026-07-31)

**Surfaces:** `/login`, public `/i/[token]`, dashboard shell (code), list CTAs  
**Register:** product (tool UI; DesignModel light mono locked)  
**Screenshots (before fix):** `docs/01-login.png`, `docs/02-public-invoice.png`

## Audit health (pre-fix)

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | Focus ring weak; labels missing on public form; touch targets ~36px |
| 2 | Performance | 3 | Lean; no heavy motion |
| 3 | Responsive | 3 | Mobile drawer OK; tables overflow-x |
| 4 | Theming | 3 | Tokens exist; hard-coded `#fafafa` + one-off CTA classes |
| 5 | Anti-patterns | 3 | Hero-metric cards (product OK); uppercase eyebrow on login |
| **Total** | | **14/20** | Good — polish system, not redesign |

## Anti-patterns verdict
Not AI-slop marketing. Clinical mono matches DesignModel. Failures were **product craft**: focus, target size, shared button language, form labels.

## P0–P2 findings → fix status

| Sev | Issue | Fix |
|-----|--------|-----|
| P1 | Input/select/textarea `focus:outline-none` without strong ring | Visible `focus-visible:ring-2` + hairline border |
| P1 | Public payment labels not wired `htmlFor` | Labels + ids + role=alert/status |
| P1 | Touch targets h-8/h-9 (<44px) | Button default `h-10`; icon `h-10` |
| P1 | Primary CTA links duplicated outside `Button` | `buttonVariants()` on list page Links |
| P2 | Hard-coded `text-[#fafafa]` | `text-surface-alt` token |
| P2 | Login uppercase eyebrow | Brand as `font-semibold` line |
| P2 | Dashboard metric titles as nested `CardTitle` (h2) | Plain labels + tabular-nums |
| P2 | PDF link plain underline only | Outline-style control |
| P2 | No reduced-motion global | `prefers-reduced-motion` in globals |
| P3 | Role shown ALL CAPS tracked | Quiet text-xs |

## Positive
- DesignModel tokens honored (canvas/paper/ink/ember)
- Pill radius 18 / card 24 consistent
- Mobile sidebar drawer with overlay + aria-label
- Public invoice hierarchy clear; money as primary data

## Post-fix verification
- `pnpm lint` green
- Hard-coded CTA / `#fafafa` gone from `src`
- Optional: `/impeccable init` for PRODUCT.md; re-screenshot after deploy

## Suggested next
1. Deploy polish to Vercel
2. `/impeccable polish` empty states + table row density
3. `/impeccable document` → DESIGN.md at repo root from DesignModel
