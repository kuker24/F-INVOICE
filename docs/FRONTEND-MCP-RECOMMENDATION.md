# Frontend MCP — F-INVOICE

Project type: **dashboard / SaaS app** (staff + portal + public invoice).  
Already in agent env: shadcn MCP, Magic UI, Playwright (session tools).  
Repo: **no** `components.json` yet (custom DesignModel primitives under `src/components/ui`).

## Decision

| Status | MCP / registry | Why |
|--------|----------------|-----|
| **Keep / use** | **shadcn MCP** (already) | Align future primitives; optional `npx shadcn init` only if adding official registry components without breaking DesignModel tokens |
| **Keep** | **Playwright MCP** (already) | E2E login, public pay, smoke |
| **Skip now** | Magic UI / Aceternity / React Bits | Landing/marketing effects — out of MVP product register |
| **Skip now** | Kibo UI | No Kanban/Gantt/editor need |
| **Skip** | 21st.dev Magic | Needs API key; not required |
| **Skip** | Higgsfield | Media gen; N/A |

## Install (only if you want project-local `components.json`)

```bash
# optional — after confirming DesignModel tokens map to CSS vars
npx shadcn@latest init
# then registries only if needed; do not add marketing packs by default
```

**Do not install extra MCP servers** for this product pass — stack already sufficient; more servers burn context.
