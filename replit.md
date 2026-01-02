# ChangeBD.org - Bangladesh Civic Engagement Platform

## Overview

ChangeBD.org ("Change Bangladesh") is an anonymous civic engagement platform enabling Bangladesh citizens to raise cases, vote on issues, report scammers, and participate in political party voting. The platform emphasizes anonymity and encryption to protect user identity while facilitating community-driven discourse on political, social, and environmental issues.

Key features:
- Anonymous case submission and voting across categories (political, social, scam alerts, environment, education, healthcare, infrastructure)
- Political party voting with real-time results visualization
- Community polls with time-limited voting periods
- Scammer reporting and verification system
- Leaderboard ranking cases by community support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Design System**: Bangladesh cultural theme with flag colors (#006A4E green, #F42A41 red), Material Design foundation
- **Fonts**: Inter (UI), Lora (serif), JetBrains Mono (code)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Session Management**: Anonymous session IDs generated per client for vote tracking without user identification

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all type definitions and Zod validation schemas
- **Current Storage**: In-memory storage implementation (`MemStorage`) with interface for database migration
- **Database Config**: Drizzle Kit configured for PostgreSQL via `DATABASE_URL` environment variable

### Key Design Patterns
- **Shared Types**: Schema definitions in `shared/` directory used by both client and server
- **API Client**: Centralized `queryClient.ts` handles all API requests with error handling
- **Component Structure**: Feature components in `client/src/components/`, UI primitives in `client/src/components/ui/`
- **Form Handling**: React Hook Form with Zod resolvers for validation

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds static assets to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Database Migrations**: `drizzle-kit push` for schema synchronization

## External Dependencies

### Database
- PostgreSQL (required, configured via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations
- connect-pg-simple for session storage capability

### UI Components
- Radix UI primitives (dialog, dropdown, tabs, forms, etc.)
- Recharts for data visualization (party voting pie charts)
- Embla Carousel for carousel components
- Lucide React for icons

### Form & Validation
- React Hook Form for form state management
- Zod for runtime validation schemas
- @hookform/resolvers for Zod integration

### Development Tools
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
- TypeScript with strict mode
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`