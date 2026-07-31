# Enhanced prompt — F-INVOICE UI craft

## Product scene
Staff (DEVELOPER/ADMIN) on laptop mid-day; customer on phone paying invoice. Light mono tool UI: frosted paper canvas, black primary actions, single red for danger only. Design SERVES the task (Linear/Stripe density), not brand spectacle.

## System constraints (locked)
- Colors: canvas `#f5f5f5`, paper `#fff`, surface-alt `#fafafa`, ink `#0a0a0a`, ink-soft `#171717`, mid-gray `#737373`, hairline `#e5e5e5`, ember `#e7000b`
- Radius: buttons/inputs/badges 18px; cards 24px; nested 10px
- Type: Geist, body 14/1.43; headings weight 600, tracking-tight
- Max content width 1280px; card pad 20px
- No glassmorphism, gradient text, side-stripe accents, hero-marketing eyebrows

## Interaction bar
- Every control: default / hover / focus-visible (ring ink/20–25 + offset) / disabled / loading
- Primary fill ink → text surface-alt; secondary canvas fill
- Touch target ≥40px (prefer 44)
- Money: tabular-nums; IDR integer display via formatIdr
- Motion: 150–250ms color only; respect prefers-reduced-motion

## Surfaces to protect
1. Auth login — invite-only copy; password toggle ≥36×36 hit
2. Public invoice — status badge, totals hierarchy, payment confirm labeled
3. Dashboard shell — sidebar active state, header role quiet, main landmark
4. List pages — primary CTA = buttonVariants Link, not ad-hoc classes

## Anti-goals
Do not introduce dark theme, marketing hero, new accent hues, card-in-card nesting, or third-party animation kits on staff CRUD screens.
