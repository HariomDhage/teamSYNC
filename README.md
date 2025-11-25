# TeamSync

A minimal workspace collaboration platform for managing organizations, teams, and members with role-based access control.

## 🚀 Features

### Core Functionality
- **Authentication**: Email/password signup and login powered by Supabase Auth
- **Organizations**: Create and manage organizations with automatic owner assignment
- **Role-Based Access Control**: Three roles with granular permissions
  - **Owner**: Full control including org settings and deletion
  - **Admin**: Manage teams and members
  - **Member**: Read-only access to teams and members
- **Team Management**: Create, update, delete teams and assign members
- **Member Management**: Invite members, change roles, remove members
- **Activity Logging**: Comprehensive audit trail of all actions (visible to Admin/Owner)
- **Row-Level Security**: Complete data isolation between organizations using Supabase RLS

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and TypeScript
- **Database & Auth**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Server Components
- **Form Handling**: React Hook Form
- **Notifications**: React Hot Toast

### Project Structure
```
teamsync/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Protected dashboard area
│   │   ├── dashboard/       # Home page with stats
│   │   ├── teams/           # Team management
│   │   ├── members/         # Member management
│   │   ├── activity/        # Activity feed
│   │   └── settings/        # Organization settings
│   ├── layout.tsx
│   └── page.tsx
├── components/              # Reusable UI components
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── context/            # React context providers
│   └── types/              # TypeScript definitions
├── middleware.ts           # Route protection
└── supabase/
    └── migrations/         # Database schema
```

## 🔒 Security & RLS Policies

All database tables are protected with Row-Level Security (RLS) policies implementing these rules:

### Organizations Table
- Users can view organizations they're members of
- Any authenticated user can create an organization
- Only owners can update or delete organizations

### Organization Members Table
- Members can view other members in their organization
- Admins and owners can invite new members
- Admins and owners can modify roles and remove members
- First member of an organization is automatically set as owner

### Teams Table
- All organization members can view teams
- Admins and owners can create, update, and delete teams

### Team Members Table
- All organization members can view team membership
- Admins and owners can add/remove team members

### Activity Logs Table
- Only admins and owners can view activity logs
- Any organization member can insert logs (for system operations)

## 📋 Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account ([sign up at supabase.com](https://supabase.com))
- Vercel account for deployment (optional, [vercel.com](https://vercel.com))

### 1. Clone and Install Dependencies
```bash
cd TeamSYNC
npm install
```

### 2. Set Up Supabase Project

1. Create a new Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Project Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key
   - Service Role Key (keep this secret!)

3. Run the database migration:
   - Go to **SQL Editor** in Supabase dashboard
   - Open the file `supabase/migrations/001_initial_schema.sql`
   - Copy the entire content and paste into SQL Editor
   - Click "Run" to create all tables, RLS policies, and indexes

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Test the Application

1. **Sign Up**: Create an account at `/signup`
   - Enter your email, password, and organization name
   - You'll be automatically set as the organization owner

2. **Create Teams**: Navigate to Teams and create a few teams

3. **Invite Members**: Go to Members and invite team members (Note: actual email invitations are not implemented in this demo)

4. **Manage Teams**: Add members to teams, edit team details

5. **View Activity**: Check the Activity page to see all logged actions

6. **Test Permissions**: 
   - Create another account
   - Try accessing admin features as a member (should be blocked)

## 🚀 Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - TeamSync implementation"
git branch -M main
git remote add origin your-github-repo-url
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure environment variables:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add `SUPABASE_SERVICE_ROLE_KEY`
5. Click **"Deploy"**

### 3. Update Supabase Settings

After deployment, update your Supabase project:
1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel deployment URL to **Site URL**
3. Add `https://your-app.vercel.app/**` to **Redirect URLs**

##📊 Database Schema

### Core Tables
- `organizations`: Organization information
- `organization_members`: User-organization relationships with roles
- `teams`: Teams within organizations
- `team_members`: User-team relationships
- `activity_logs`: Audit trail of all actions

### Enums
- `member_role`: `owner` | `admin` | `member`
- `activity_type`: `user_invited` | `user_removed` | `role_changed` | `team_created` | `team_updated` | `team_deleted` | `member_added_to_team` | `member_removed_from_team` | `organization_created`

## 🎯 Key Implementation Decisions

### 1. Multi-Tenancy Strategy
- Used RLS policies for automatic organization-level data isolation
- All queries filtered by `auth.uid()` to ensure users only see their organization's data
- No additional filtering needed in application code

### 2. Organization Creation Flow
- On signup, user creates both account and organization in one step
- User automatically becomes organization owner
- This streamlines onboarding vs. separate "create org" step

### 3. Activity Logging
- Centralized logging for all significant actions
- Stored metadata as JSONB for flexibility
- Only visible to admins/owners for privacy

### 4. Role-Based UI
- Dashboard sidebar dynamically shows/hides menu items based on role
- Buttons and actions conditionally rendered based on permissions
- Server-side RLS provides additional security layer

### 5. Email Invitations (Simplified)
- Current implementation logs invitation intent without sending actual emails
- Production would integrate SendGrid/Resend for email delivery
- Invitation links would create pending memberships

## ⚠️ Trade-offs & Limitations

### Made for Time Constraint
1. **Email System**: No actual email invitations sent; placeholder implementation
2. **User Profiles**: Using email addresses instead of full profiles with avatars
3. **OAuth**: Only email/password auth; no Google/GitHub OAuth
4. **Real-time**: No live updates; manual refresh required
5. **Testing**: Manual verification instead of automated test suites

### Known Limitations
1. Users can only be in one organization (no org switching)
2. No pagination for large member/team lists
3. Basic error handling (could be more granular)
4. Simplified member display (using partial user IDs as placeholders)

## 🔮 Future Improvements

### Phase 4 Features (Not Implemented)
- **Audit Trail Export**: Download activity logs as CSV/JSON
- **Bulk User Import**: CSV upload for inviting multiple users
- **Custom Roles**: Define roles beyond Owner/Admin/Member
- **SSO Integration**: SAML/OAuth for enterprise organizations
- **Two-Factor Authentication**: TOTP/SMS 2FA
- **Webhooks**: Event notifications for external integrations

### Additional Enhancements
- Real-time updates using Supabase subscriptions
- Advanced search and filtering
- Team hierarchy (parent/child teams)
- User avatars and profiles
- Email notification preferences
- Mobile-responsive improvements
- Comprehensive automated testing

## 🤖 AI Tool Usage

This project utilized AI assistance (GitHub Copilot / Cursor / Claude) for:
- Boilerplate Next.js component generation
- TypeScript type definitions
- SQL query optimization and RLS policy review
- Tailwind CSS styling suggestions
- Documentation writing

All generated code was reviewed, tested, and customized for correctness and security.

## 📸 Screenshots

### Dashboard
![Dashboard showing organization stats and quick actions]

### Teams Page
![Teams grid view with create team button]

### Team Detail
![Team detail page with member list]

### Members Management
![Members table with role management]

### Activity Feed
![Activity log showing all organization events]

### Settings
![Organization settings with danger zone]

## 📝 License

This project was created as a take-home assignment. Not licensed for commercial use.

---

**Built with ❤️ using Next.js, Supabase, and Tailwind CSS**
