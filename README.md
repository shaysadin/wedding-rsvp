<h1 align="center">Wedding RSVP Manager</h1>

<p align="center">
  A comprehensive wedding event management platform for handling RSVPs, guest lists, seating arrangements, and more.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#installation"><strong>Installation</strong></a> ·
  <a href="#environment-variables"><strong>Environment Variables</strong></a>
</p>

---

## Features

### Guest Management
- Import guests from Excel/CSV files
- Track RSVP responses and guest counts
- Filter and search guests by status, group, and more
- Bulk messaging for invitations and reminders

### Voice AI Agent
- Automated phone calls to collect RSVPs using VAPI
- Natural conversation flow in Hebrew
- Real-time call status tracking
- Automatic RSVP updates from calls

### Seating Arrangements
- Interactive drag-and-drop table planner
- Multiple table shapes (round, rectangle, square)
- Guest assignment with visual feedback
- Export seating charts

### Task Management
- Kanban board for wedding planning tasks
- Drag-and-drop task organization
- Notes and comments on tasks
- Progress tracking across stages

### Supplier Management
- Track wedding vendors and suppliers
- Payment tracking and budgeting
- Contact information management

### Invitations
- Customizable RSVP pages
- WhatsApp integration for sending invites
- QR code generation
- Interactive invitation templates

### Multi-Language Support
- Full Hebrew (RTL) and English support
- Localized UI and communications

---

## Tech Stack

### Framework
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM

### Authentication & Payments
- **Auth.js v5** - Authentication with multiple providers
- **Stripe** - Subscription billing

### UI & Styling
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Lucide Icons** - Icon set

### Database & Storage
- **PostgreSQL** - Primary database (via Neon)
- **Cloudflare R2** - File storage

### Communications
- **Resend** - Email delivery
- **VAPI** - Voice AI agent
- **Twilio** - SMS/WhatsApp messaging

### Deployment
- **Vercel** - Hosting and deployment

---

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wedding-rsvp-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

---

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=

# Auth
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID=
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID=
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID=
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID=

# Email
RESEND_API_KEY=

# VAPI (Voice AI)
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=

# App
NEXT_PUBLIC_APP_URL=
```

---

## License

MIT License
