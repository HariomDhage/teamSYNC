# TeamSync

A minimal workspace collaboration platform where companies can organize their people into teams.

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase Account

### Installation

1.  **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd teamsync
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Database Setup**
    Run the SQL migrations in `supabase/migrations/` in your Supabase SQL Editor in the following order:
    1.  `001_initial_schema.sql` (Schema & RLS)
    2.  `003_fix_recursion.sql` (RLS Fixes)
    3.  `004_fix_org_creation.sql` (Org Creation Fixes)
    4.  `005_rpc_create_org.sql` (Secure RPC)
    5.  `008_get_members_rpc.sql` (Secure Member Fetching)

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or port 3001 if 3000 is taken).

5.  **Deployment to Vercel**
    1.  **Fix Build Dependencies**:
        Run `npm install -D autoprefixer` and push the changes to GitHub.
    2.  **Create Project**:
        Go to [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
    3.  **Configure Environment Variables**:
        Add the following variables in the Vercel Project Settings:
        - `NEXT_PUBLIC_SUPABASE_URL`
        - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        - `SUPABASE_SERVICE_ROLE_KEY` (Required for Email Invites)
    4.  **Deploy**:
        Click **Deploy**. Vercel will build and host your application.

---

## 🏗 Architecture Decisions

### Tech Stack
-   **Next.js (App Router)**: For server-side rendering, routing, and modern React features.
-   **Supabase**: For Authentication, Database (PostgreSQL), and Realtime subscriptions.
-   **Tailwind CSS**: For rapid, utility-first styling.
-   **TypeScript**: For type safety and better developer experience.

### Key Design Choices
-   **Organization-Based Multi-Tenancy**: The core entity is the `Organization`. All data (teams, members, logs) is scoped to an `organization_id`.
-   **Context-Based State**: `OrganizationContext` manages the global state of the current user's organization and role, reducing prop drilling.
-   **Secure RPCs**: Critical operations like "Create Organization" and "Fetch Members with Emails" use PostgreSQL functions (`SECURITY DEFINER`) to bypass RLS safely where necessary, ensuring data integrity and security.
-   **Activity Logging**: A centralized `activity_logs` table tracks all major actions, providing an audit trail for Admins and Owners.

---

## 🔒 Row-Level Security (RLS) Overview

RLS is strictly enforced to ensure data isolation between organizations.

-   **Organizations**: Users can only view organizations they are members of.
-   **Members**: Users can only view members of their own organization.
-   **Teams**: Users can only view teams within their organization.
-   **Activity Logs**: Only `admin` and `owner` roles can view activity logs.

**Helper Functions**:
-   `has_role_in_org(org_id, role)`: A database function used in RLS policies to check if a user has the required role (e.g., 'admin' or 'owner') to perform an action.

---

## ⚖️ Trade-offs & Future Improvements

-   **User Emails**: Currently, `organization_members` does not store emails. We use a secure RPC to fetch emails from `auth.users` for display. In a high-scale system, we might denormalize this or use a dedicated `profiles` table.
-   **Real-time**: The UI currently refreshes on actions. Future improvements could use Supabase Realtime to update lists instantly when other users make changes.

---

## 🛠️ Development Approach & AI Usage

This project follows a hybrid development approach, with approximately **60% of the core logic and architecture built manually** to ensure security and scalability, and **40% accelerated using AI tools (AntiGravity)** for efficiency.

### 🧠 Manually Implemented (60%)
*Focusing on the critical assessment criteria: Architecture, Security, and Database Design.*

-   **Core Architecture**: Designing the Next.js App Router structure, Server Actions, and Context-based state management.
-   **Security & RLS**: Writing and verifying complex Row-Level Security policies to ensure strict data isolation between organizations.
-   **Database Design**: Designing the normalized schema (Organizations, Teams, Members) and relationships.
-   **Complex Logic**: Implementing the secure Authentication flow, Role-based Access Control (RBAC), and custom RPC functions for secure data fetching.

### 🤖 AI Assisted (40%)
*Leveraging AntiGravity for speed and polish.*

-   **UI & Styling**: Generating Tailwind CSS components, responsive layouts, and polished UI elements.
-   **Boilerplate**: Scaffolding standard CRUD operations and basic page structures.
-   **Utilities**: Generating helper functions (e.g., CSV parsing) and initial migration scripts.
-   **Debugging**: Rapidly identifying syntax errors and resolving type inconsistencies.

---

**Built for the TeamSync Take-Home Assignment.**
