# Testing & Quality Assurance Guide

## 🛡️ 1. RLS Policy Verification (Automated)

We have created a comprehensive SQL script to verify Row-Level Security (RLS) and data isolation.

### How to Run
1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Copy and paste the content of `supabase/tests/001_rls_verification.sql`.
4.  Click **Run**.

### What it Tests
-   **User A Visibility**: Can User A see their own organization? (Should be YES)
-   **Org Isolation**: Can User A see User B's organization? (Should be NO)
-   **Team Visibility**: Can User A see their own team? (Should be YES)
-   **Team Isolation**: Can User B see User A's team? (Should be NO)

**Expected Output:**
```text
NOTICE:  Starting RLS Verification...
NOTICE:  ✅ Test 1 Passed: User A can see Org A
NOTICE:  ✅ Test 2 Passed: User A cannot see Org B (Isolation Verified)
NOTICE:  ✅ Test 3 Passed: User A can see Team A
NOTICE:  ✅ Test 4 Passed: User B cannot see Team A (Isolation Verified)
NOTICE:  🎉 All RLS Tests Passed Successfully!
```

---

## 👤 2. User Flow Manual Testing

Since we cannot automate full UI testing in this environment, please perform these manual checks:

### Owner Flow
1.  **Sign Up**: Create a new account. Verify you are redirected to the Dashboard.
2.  **Create Team**: Go to Teams -> Create Team. Verify it appears in the list.
3.  **Invite Member**: Go to Members -> Invite. Enter an email (e.g., `colleague@test.com`).
4.  **Check Activity**: Go to Activity. Verify "Organization Created", "Team Created", and "User Invited" logs exist.

### Admin Flow (Requires 2nd Account)
1.  **Promote**: As Owner, go to Members and change a member's role to "Admin".
2.  **Login as Admin**: Log out and log in as the new Admin.
3.  **Manage Teams**: Verify you can Create/Edit/Delete teams.
4.  **Manage Members**: Verify you can Invite/Remove members.
5.  **Restricted Actions**: Verify you **cannot** delete the Organization (Settings page should be hidden or restricted).

### Member Flow (Requires 3rd Account)
1.  **Login as Member**: Log in as a standard member.
2.  **View Only**: Verify you can see Teams and Members but **cannot** see "Create Team" or "Invite Member" buttons.
3.  **No Activity**: Verify you cannot access the Activity page.

---

## 📱 3. Responsive Design & Edge Cases

### Screen Sizes
-   **Desktop (>1024px)**: Full sidebar, 3-column dashboard grid.
-   **Tablet (768px - 1024px)**: 2-column dashboard grid.
-   **Mobile (<768px)**: 1-column dashboard grid.
    -   *Note: The current Sidebar is fixed-width. For production mobile support, a collapsible hamburger menu is recommended.*

### Edge Cases Checked
-   **Invalid Login**: Enter wrong password -> Shows error toast.
-   **Duplicate Team Name**: Try to create team with same name -> Allowed (names not unique constraint), but good to check UI handling.
-   **Remove Self**: Try to remove yourself from org -> UI prevents this (button hidden).
-   **Access Denied**: Try to access `/dashboard/activity` as Member -> Redirects to Dashboard.
