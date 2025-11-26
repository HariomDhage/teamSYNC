# TeamSync

A modern, scalable Team Management System built with Next.js 15, Supabase, and Tailwind CSS.

## 🚀 Features

- **Authentication**: Secure email/password login via Supabase Auth.
- **Organization Management**: Create and manage organizations with role-based access control (Owner, Admin, Member).
- **Team Collaboration**: Create teams, assign members, and manage roles.
- **Activity Logging**: Comprehensive audit trail of all actions.
- **Advanced Features**:
    - Resource Quotas
    - API Key Management
    - Webhooks
    - Compliance Reporting
    - SSO Integration (UI)
    - 2FA Support

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- Supabase Account

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd teamsync
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env.local` file:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    ```

4.  **Database Setup**:
    Run the migrations in `supabase/migrations` in order using the Supabase Dashboard SQL Editor or CLI:
    ```bash
    supabase migration up
    ```

5.  **Seed Data (Optional)**:
    To populate the database with "Acme Inc." demo data:
    1.  Sign up for an account in the app.
    2.  Run the contents of `supabase/seed.sql` in your Supabase SQL Editor.

6.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🌍 Deployment to Vercel

1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  Add the Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, etc.) in the Vercel Project Settings.
4.  Deploy!

## 💡 Architecture & Design Decisions

- **App Router**: Leveraged Next.js App Router for layouts, server components, and efficient data fetching.
- **Server Actions**: All mutations (invites, updates) use Server Actions to ensure type safety and leverage Next.js caching/revalidation.
- **Mobile First**: The dashboard layout adapts to mobile screens with a collapsible sidebar.
- **Audit Trail**: Built-in from day one to ensure compliance readiness.

## 🛡️ RLS Policies Overview

Row Level Security (RLS) is the backbone of TeamSync's security model. We enforce strict tenant isolation:

- **Organizations**: Users can only view organizations they belong to.
- **Teams**: Users can only view teams within their organization.
- **Members**: Only Admins/Owners can modify member roles or remove members.
- **Activity Logs**: Visible to all organization members for transparency.

Example Policy:
```sql
CREATE POLICY "Org members can view teams"
ON teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = teams.organization_id
    AND user_id = auth.uid()
  )
);
```

## ⚖️ Trade-offs & Future Improvements

- **Trade-off**: **Client-side vs Server-side Auth**: We use a mix. Middleware protects routes, but some client-side checks exist for UI UX.
    - *Improvement*: Move more logic to Middleware or Server Components for stricter performance.
- **Trade-off**: **Complex SQL vs ORM**: We used raw SQL/Supabase client for flexibility but it requires manual type management.
    - *Improvement*: Integrate Prisma or Drizzle ORM for better type inference.
- **Future**: **Real-time Updates**: Use Supabase Realtime to update the dashboard instantly.
- **Future**: **Billing Integration**: Connect Stripe for subscription management.

## 🤖 AI Usage Note

This project was built with the assistance of **Antigravity**, an agentic AI coding assistant.
- **Role**: The AI acted as a pair programmer, generating boilerplate, writing SQL migrations, and debugging TypeScript errors.
- **Verification**: All AI-generated code was reviewed and tested to ensure security and correctness, particularly the RLS policies.
