# UI & CLOUD EXECUTION CONTRACT — Single Source of Truth Edition (Engineering-OS v4.1 RC)

| Metadata | Valor |
| :--- | :--- |
| **Task ID** | `TSK-SYNC-001` |
| **Epic ID** | `EPC-SYNC` |
| **Versión del Contrato** | `4.0` |
| **Estado** | `PASSED` |
| **Fase del Pipeline** | `Fase 2 (Inyección de Reglas) → Fase 4 (Refactorización Incremental)` |
| **Lenguaje / Stack** | `TypeScript` · `React 19` · `Supabase PostgreSQL Realtime` |
| **Plataformas Objetivo** | **Desktop Web SaaS** & **Mobile PWA Táctil** |
| **Fuente de Auditoría** | Diagnóstico de sesión multi-dispositivo y 0 CLS en DashboardSkeleton |

---

## 1. Declaración de Objetivo (Goal)

> Implement Single Source of Truth architecture for AutoTrader and Portfolio across multi-device sessions, eliminating phantom local runners, trade duplications, and skeleton layout shifts.

---

## 2. Especificación Determinista de Contrato JSON (IR v4.0)

```json
{
  "contract_version": "4.0",
  "status": "PENDING",
  "language": "typescript",
  "task_id": "TSK-SYNC-001",
  "epic_id": "EPC-SYNC",
  "goal": "Implement Single Source of Truth architecture for AutoTrader and Portfolio across multi-device sessions, eliminating phantom local runners, trade duplications, and skeleton layout shifts",
  "scope": {
    "target_files": [
      "frontend/src/contexts/AutoTraderContext.tsx",
      "frontend/src/contexts/PortfolioContext.tsx",
      "frontend/src/components/ui/DashboardSkeleton.tsx"
    ],
    "forbidden_files": [
      "frontend/src/App.tsx",
      "supabase/**/*",
      "app.py",
      "*.py"
    ],
    "authorized_global_files": []
  },
  "depends_on": [],
  "contracts": {
    "types_file": "frontend/src/lib/supabase.ts",
    "function_signatures": [
      "export const AutoTraderProvider: React.FC<{ children: React.ReactNode }>",
      "export const PortfolioProvider: React.FC<{ children: React.ReactNode }>",
      "export const DashboardSkeleton: React.FC"
    ]
  },
  "env": {
    "NODE_ENV": "test"
  },
  "execution_steps": [
    "Remove obsolete subheader bar placeholder from DashboardSkeleton to guarantee zero layout shifts",
    "Update AutoTraderContext initial cloud hydration to terminate local runner when cloud session is STOPPED or absent",
    "Handle STOPPED realtime event in AutoTraderContext by invoking runner stop and clearing local storage keys",
    "Implement tradeId deduplication in AutoTraderContext closed trades state",
    "Ensure PortfolioContext synchronizes spot holdings to user_portfolios table in Supabase for authenticated users",
    "Execute automated test suite and confirm zero regressions"
  ],
  "commands": {
    "test": "node --test frontend/src/__tests__/cloud_sync_ssot.test.js",
    "lint": "npx oxlint frontend/src/contexts/AutoTraderContext.tsx frontend/src/contexts/PortfolioContext.tsx",
    "typecheck": "npm run build --prefix frontend"
  },
  "acceptance_criteria": [
    "assert.strictEqual(skeletonContent.includes('Subheader Bar Skeleton'), false, 'Obsolete subheader bar removed from DashboardSkeleton')",
    "assert.ok(contextContent.includes('STOPPED'), 'AutoTraderContext handles STOPPED state')",
    "assert.ok(portfolioContent.includes('upsertPortfolioHoldingToSupabase'), 'PortfolioContext syncs holdings to Supabase')"
  ],
  "definition_of_done": [
    "commands.test returns exit code 0",
    "commands.lint returns exit code 0",
    "commands.typecheck returns exit code 0",
    "AutoTrader stops immediately across devices when cloud session status is STOPPED",
    "Spot holdings synchronize bidirectionally with Supabase",
    "git diff --name-only shows only target_files"
  ],
  "rollback": {
    "command": "git checkout HEAD -- frontend/src/contexts/AutoTraderContext.tsx frontend/src/contexts/PortfolioContext.tsx frontend/src/components/ui/DashboardSkeleton.tsx"
  }
}
```
