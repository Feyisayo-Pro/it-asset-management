# IT Asset Management Platform

Enterprise-grade IT Asset Lifecycle Management system built with NestJS and React.

## Overview

A full-stack platform for managing IT assets from registration through allocation, repair, and eventual disposal. Role-based access control ensures each user sees only what they need.

### Key Features

- **Asset Inventory** — Register, track, and manage IT assets with full status history
- **Workflow Engine** — Configurable multi-step approval workflows for allocations
- **Asset Returns** — Structured return process with item recording, assessment, and sign-off
- **Device Assessment** — Checklist-based condition assessments tied to returns or standalone
- **Repair Tracking** — Log repairs with cost tracking and status machine (Reported → Diagnosed → InProgress → Completed)
- **Disposal Management** — Request/approve asset disposals with reason tracking
- **Enterprise Dashboard** — Role-specific KPIs, charts, and widgets with real-time refresh
- **Reports & Export** — Inventory, allocation, returns, repairs, disposal, compliance, and SLA reports with CSV/Excel/PDF export
- **Notifications** — Event-driven notifications for workflow actions and asset events
- **Audit Trail** — Complete audit logging of all actions with correlation IDs

### Roles

| Role | Access |
|------|--------|
| Super Admin | Full platform access, user management, audit logs |
| Stores Officer | Asset CRUD, allocations, returns, repairs, disposals, reports |
| IT Representative | Asset management, repair focus, technical assessments |
| People & Culture | Employee asset allocations and returns |
| Employee | View own assets, submit return requests, personal dashboard |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript (strict), TypeORM 0.3, PostgreSQL |
| Frontend | React 18, Vite, Ant Design 5, TanStack Query, Zustand |
| Auth | JWT (access + refresh tokens), bcrypt, account lockout |
| Security | Helmet, CORS, rate limiting (global + auth), RBAC guards |

## Quick Start

```bash
# Prerequisites: Node.js 18+, PostgreSQL 15+, pnpm

# Install dependencies
pnpm install

# Set up environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your database credentials and JWT secrets

# Run database migrations
cd packages/backend
pnpm typeorm migration:run -d src/config/data-source.ts

# Start development servers
cd packages/backend && pnpm start:dev    # API on :3000
cd packages/frontend && pnpm dev          # UI on :5173
```

## Project Structure

```
packages/
  backend/
    src/
      common/          # Guards, decorators, filters, interceptors, middleware
      config/          # App configuration, env validation, data source
      migrations/      # TypeORM database migrations
      modules/
        auth/          # Authentication (login, tokens, password reset)
        rbac/          # Roles and permissions
        audit/         # Audit logging
        asset/         # Asset inventory and status management
        workflow/      # Workflow engine and definitions
        return/        # Asset return process
        assessment/    # Device condition assessments
        repair/        # Repair tracking
        disposal/      # Disposal management
        notification/  # Event-driven notifications
        reporting/     # Reports and data export
        dashboard/     # Enterprise dashboard
    test/              # Unit and integration tests
  frontend/
    src/
      api/             # API client functions and query keys
      components/      # Shared UI components
      features/        # Feature modules (auth, assets, returns, etc.)
      hooks/           # Shared React hooks
      layouts/         # App and auth layouts
      routes/          # Router and protected routes
      stores/          # Zustand state stores
      types/           # Shared TypeScript types
```

## Documentation

- [API Reference](docs/API.md)
- [Environment Variables](docs/ENVIRONMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Developer Setup](docs/DEVELOPER_SETUP.md)
- [User Manual](docs/USER_MANUAL.md)
- [Administrator Guide](docs/ADMIN_GUIDE.md)

## Testing

```bash
# Backend unit + integration tests
cd packages/backend
pnpm test

# Frontend type checking
cd packages/frontend
pnpm typecheck
```

## API Health Check

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"...","checks":{"database":"ok"}}

curl http://localhost:3000/api/v1/health/live
# {"status":"ok"}
```

## License

Proprietary. All rights reserved.
