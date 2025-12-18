# BarberFlow AI Coding Instructions

## Project Overview
BarberFlow is a Next.js-based barbershop management system using Firebase for backend services. It supports multi-role access (superadmin, barbershop admin, barber, client) with features like appointment booking, WhatsApp notifications, AI-powered scheduling predictions, and payment integration.

## Architecture
- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions)
- **AI**: Google Genkit with Gemini 2.5 Flash for smart shift predictions
- **Payments**: MercadoPago integration
- **Messaging**: Bitsafira API for WhatsApp notifications
- **State Management**: React Context + custom Firebase hooks

## Key Data Models
- `Barbershop`: Core entity with operating hours, plan status, WhatsApp instance
- `Barber`: Staff with schedules, services, avatar
- `Service`: Priced offerings with duration
- `Client`: Users with mandatory WhatsApp phone
- `Appointment`: Bookings with denormalized client data for performance
- `Expense`: Financial tracking for admins

## Development Workflows
- **Local Development**: `npm run dev` + `npx firebase emulators:start --only firestore,auth`
- **AI Development**: `npm run genkit:dev` for Genkit UI at localhost:4001
- **Build**: `npm run build` (includes TypeScript checking)
- **WhatsApp Setup**: Use `npm run bitsafira:*` scripts for instance management
- **Testing**: No formal test suite; validate manually against emulators

## Coding Patterns
- **Firebase Access**: Use custom hooks (`useDoc`, `useCollection`, `useFirestore`) instead of direct SDK calls
- **Error Handling**: Emit errors via `errorEmitter` for global handling; catch Firestore permission errors
- **Forms**: React Hook Form + Zod schemas; validate on blur/change
- **Dates**: date-fns for all date operations; store as Firestore Timestamps
- **Styling**: Tailwind classes; shadcn/ui components with custom variants
- **Routing**: App Router with route groups: `(dashboard)` for protected, `(public)` for client-facing
- **Data Denormalization**: Appointments include `clientName` and `clientPhone` to avoid joins
- **Webhooks**: Event-driven architecture for external integrations (e.g., appointment.created)

## Integration Points
- **WhatsApp**: Bitsafira API for confirmations/reminders; requires instance setup per barbershop
- **Payments**: MercadoPago for booking payments; webhooks for status updates
- **AI Scheduling**: Genkit flows for availability prediction based on historical data
- **Geolocation**: Client-side geolocation for barbershop discovery

## Security & Permissions
- Firestore rules enforce role-based access (admins see only their barbershop data)
- Client-side auth with Firebase Auth; server-side validation in API routes
- Environment variables for all secrets (API keys, service accounts)

## Common Pitfalls
- Always use emulators for local dev to avoid production data corruption
- WhatsApp integration requires manual instance creation/setup before testing
- Appointment times must account for service durations and barber schedules
- Client phone numbers are WhatsApp-specific; validate format accordingly</content>
<parameter name="filePath">c:\Users\Gedson\Documents\Barbearia\barberflow\.github\copilot-instructions.md