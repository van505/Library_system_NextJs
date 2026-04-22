# Core Functions & Important Patterns
## SchoolLib System Architecture

This document highlights the most frequently used functions, utilities, and architectural patterns in the codebase. Reviewing these will help you understand how data flows through the application and how core rules (like borrowing limits and date restrictions) are enforced.

---

## 1. Database & State Management

### A. Supabase Client Initialization
The system separates Supabase initialization into Client and Server versions to ensure Next.js App Router compatibility and security.

- **`lib/supabase.ts` (`createClient`)**
  - **Where it's used:** Exclusively in `use client` components (e.g., dashboard pages, React forms).
  - **Why it's important:** It uses the standard anonymous key and relies on PostgreSQL Row Level Security (RLS) to protect data.

- **`lib/supabase-server.ts` (`createServerSupabaseClient` & `createServiceSupabaseClient`)**
  - **Where it's used:** Inside `app/api/*` routes and Server Components.
  - **Why it's important:** Extracts the secure session token from cookies securely. The `createServiceSupabaseClient` uses the `SUPABASE_SERVICE_ROLE_KEY` to **bypass all database security rules** (RLS)—it is strictly used for Admin-only operations like creating Staff accounts or bulk updating borrowing limits.

### B. Global State (Zustand)
- **`lib/store.ts` (`useAuthStore`)**
  - **Where it's used:** Almost every client page.
  - **Why it's important:** It holds the currently logged-in user's `profile` object (id, full_name, role). Instead of pinging the database on every page to ask "Is this user an admin?", the app checks `useAuthStore().profile.role`.

---

## 2. Core Business Logic (The `lib/` Folder)

These helper files contain the essential rules of the library system. Instead of writing the same `if/else` logic on every page, pages call these central functions.

### A. Date & Weekend Management
- **`lib/dateUtils.ts`**
  - **Key Functions:** `isWeekend()`, `getMinReturnDate()`, `getMaxReturnDate()`, `validateReturnDate()`.
  - **Where it's used:** Admin/Staff Borrow & Return pages, Student Request modals.
  - **Why it's important:** It guarantees that library books are never due on a Saturday or Sunday, and caps the maximum borrow duration at 15 days.

### B. Borrowing Limits (Feature S)
- **`lib/borrowingLimit.ts` (`checkBorrowingLimit`)**
  - **Where it's used:** Before a student clicks "Request Book", and before Staff/Admins click "Issue Book".
  - **Why it's important:** It dynamically checks the `transactions` table for the student's active books and compares it against their `borrow_limit`. If they hit the limit, it blocks the action. Staff/Admins get a pop-up allowing them to override the limit.

### C. Notifications & Logging
- **`lib/notifyAdmins.ts` (`notifyUser`, `notifyAdmins`)**
  - **Where it's used:** Whenever a request is approved, a book is issued, or a book is returned.
  - **Why it's important:** It inserts records into the `notifications` table, which instantly updates the red badge on the bell icon in the dashboard header.

- **`lib/activityLog.ts` (`logActivity`)**
  - **Where it's used:** Inside Admin/Staff data mutations (editing a book, deleting a shelf).
  - **Why it's important:** Creates an immutable audit trail in the `audit_logs` table so the principal/head librarian can track who made changes to the system.

- **`lib/dueDateReminders.ts` (`checkAndSendReminders`)**
  - **Why it's important:** This powers **Feature R**. It scans active transactions and triggers yellow/red alert banners on the student dashboard if books are due in < 3 days or overdue.

---

## 3. UI Patterns & Key Components

### A. Modular Sidebars
- **`components/dashboard/admin-sidebar.tsx` (and staff/student equivalents)**
  - Instead of one massive navigation bar with complex `if (role === 'admin')` statements, the layout (`app/dashboard/layout.tsx`) loads a completely different, isolated sidebar component based on the user's role. This is significantly more secure and easier to maintain.

### B. Shared Action Dialogs
- **`components/dashboard/return-dialog.tsx`**
  - **Where it's used:** Inside both the Admin and Staff "Borrow / Return" pages.
  - **Why it's important:** Returning a book is complex—it has to update the transaction status to 'returned', increase the `available_copies` in the `books` table, and send a notification. Putting this in a shared component ensures admins and staff use the exact same logic.

### C. The Shadcn UI Library (`components/ui/*`)
- You will see imports like `import { Button } from '@/components/ui/button'` everywhere.
- **Why it's important:** These are highly accessible, styled Tailwind components. We use these instead of standard HTML `<button>` or `<input>` tags to maintain the premium "glassmorphic" design language across the entire platform.

---

## 4. Crucial API Routes

### A. The Libby Chatbot
- **`app/api/chat/route.ts`**
  - **How it works:** It acts as the bridge between the user's chat box and the Google Gemini AI. Before sending the user's message to Gemini, this function queries the Supabase `books` and `shelves` tables, builds a massive text block of the *current available inventory*, and secretly prepends it to the AI prompt. This is what allows Libby to answer questions about the specific school library.

### B. Bulk Security Bypass
- **`app/api/admin/update-borrow-limit/route.ts`**
  - **How it works:** When the Admin changes the default borrowing limit in Settings, this API route uses the `createServiceSupabaseClient` to bypass PostgreSQL's Row Level Security and update every single student's row simultaneously. Doing this purely on the client side would be blocked by security policies.
