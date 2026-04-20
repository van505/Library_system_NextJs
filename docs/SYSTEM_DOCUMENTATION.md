---
# SchoolLib - School Library Management System
## Complete System Documentation
---

## 1. SYSTEM OVERVIEW
SchoolLib is a comprehensive, modern web-based library management platform designed to automate and streamline daily operations for school libraries. It solves the problem of manual, paper-based inventory tracking and provides an engaging, digital-first experience for students to discover, reserve, and review books.

**Technology Stack:**
- **Frontend Framework:** Next.js (App Router) for server-side rendering and routing.
- **Backend & Database:** Supabase (PostgreSQL, Authentication, Storage) for real-time database operations and Row Level Security.
- **Styling & UI:** Tailwind CSS and Shadcn UI for a responsive, premium "glassmorphic" interface.
- **Data Visualization:** Recharts for analytical dashboard charts.
- **Artificial Intelligence:** Google Gemini API powering the interactive library assistant.

**User Roles:**
1. **Admin:** Full system oversight. Manages staff accounts, configures global library rules, oversees all inventory, and has permanent delete privileges.
2. **Staff:** Handles daily library operations. Manages the book catalog, shelves, processes student book reservations, and issues/returns books.
3. **Student:** The end-user. Browses the catalog, tracks personal borrowing limits, requests book reservations, writes reviews, and interacts with the AI assistant.

**Libby AI (Chatbot):**
Libby is a role-aware AI assistant built using a lightweight Retrieval-Augmented Generation (RAG) approach. Before sending a student's prompt to the Gemini API, the system fetches the actual live database inventory (available books, categories, tags, shelf locations) and injects it into the system context. This ensures Libby only recommends books the library actually owns and accurately tells students which shelf to look on.

---

## 2. DATABASE STRUCTURE
The system relies on a highly relational PostgreSQL database hosted on Supabase, protected by strict Row Level Security (RLS) policies.

**Core Tables & Columns:**
- **`profiles`**: Stores user data. 
  - `id` (uuid, PK), `full_name` (text), `role` (varchar: admin, staff, student), `avatar_url` (text), `borrow_limit` (int), `notif_email`, `notif_reminders`, `notif_overdue` (boolean).
- **`books`**: The main catalog.
  - `id` (uuid, PK), `title`, `author`, `isbn`, `description`, `total_copies`, `available_copies` (int), `cover_url`, `published_year`, `publisher`, `shelf_id` (FK), `is_archived` (boolean), `is_featured` (boolean), `is_book_of_month` (boolean), `featured_note` (text).
- **`categories`**: Book genres.
  - `id` (uuid, PK), `name`, `color`, `icon`.
- **`book_categories`**: Pivot table for many-to-many book genres.
  - `book_id` (FK), `category_id` (FK).
- **`tags`**: Custom descriptors (Feature T).
  - `id` (uuid, PK), `name`, `color`, `created_by` (FK).
- **`book_tags`**: Pivot table for many-to-many book tags.
  - `book_id` (FK), `tag_id` (FK).
- **`shelves`**: Physical library locations.
  - `id` (uuid, PK), `name`, `location`, `capacity` (int).
- **`transactions`**: Borrowing history.
  - `id` (uuid, PK), `book_id` (FK), `borrower_id` (FK), `issued_by` (FK), `borrow_date` (timestamptz), `due_date` (timestamptz), `return_date` (timestamptz), `status` (varchar: borrowed, returned), `is_archived` (boolean), `reminder_3day_sent`, `reminder_1day_sent`, `reminder_due_sent` (boolean).
- **`book_requests`**: Student reservation requests.
  - `id` (uuid, PK), `user_id` (FK), `book_id` (FK), `status` (varchar: pending, approved, rejected), `proposed_return_date` (date), `staff_note` (text).
- **`book_reviews`**: Student feedback.
  - `id` (uuid, PK), `book_id` (FK), `user_id` (FK), `rating` (int), `comment` (text).
- **`announcements`**: System-wide broadcasts.
  - `id` (uuid, PK), `title`, `content`, `type` (varchar), `is_active` (boolean), `show_on_landing` (boolean).
- **`library_settings`**: Global configuration.
  - `setting_key` (varchar, PK), `setting_value` (text).
- **`notifications`**: User alert system.
  - `id` (uuid, PK), `user_id` (FK), `title`, `message`, `type`, `is_read` (boolean), `link` (text).
- **`audit_logs`**: System tracking.
  - `id` (uuid, PK), `performed_by` (FK), `role`, `action_type`, `entity_type`, `description`.

**Row Level Security (RLS):**
RLS policies guarantee that Students can only `SELECT` their own transactions, requests, and profile data. Modifications to the catalog (`books`, `shelves`, `tags`) are strictly restricted to users where `role IN ('admin', 'staff')`.

---

## 3. PUBLIC LANDING PAGE (app/page.tsx)
The public homepage serves as the welcome mat for the library system.

**What visitors see:**
- **Hero Section:** A dynamic greeting with quick call-to-action buttons for browsing or logging in.
- **Public Announcements:** If an admin creates an announcement and toggles "Show on Landing Page," it appears here as a prominent banner.
- **Book of the Month (Feature W):** A spotlight section featuring a single, highly promoted book determined by the admin.
- **Featured Books (Feature W):** A horizontal scrolling carousel displaying books the admin has specifically marked as "Featured."
- **How It Works:** A 3-step graphic explaining the borrowing process.
- **AI Chat Preview:** A teaser of the Libby AI capabilities.

**Data Loading & Actions:**
Data is loaded dynamically from Supabase via server components. Guests can browse the catalog, utilize the global search, switch the UI language, and navigate to the Login or Student Registration pages.

---

## 4. AUTHENTICATION PAGES

### 4.1 Login Page (app/login/page.tsx)
- **Visuals:** A sleek, split-screen design featuring a glassmorphic login card over a customized background.
- **Form Fields:** Email and Password.
- **Role-Based Redirection:** Upon successful authentication, the system checks the `profiles.role` table and automatically routes the user: Admins to `/dashboard/admin`, Staff to `/dashboard/staff`, and Students to `/dashboard/student`.
- **Error Handling:** Built-in validation displays toast notifications for incorrect credentials or server errors.

### 4.2 Register Page (app/register/page.tsx)
- **Access:** Only Students can self-register. Staff accounts must be provisioned by Admins.
- **Form Fields:** Full Name, Email, Password, and Confirm Password. All are required.
- **Database Flow:** Submitting the form creates a secure identity in `auth.users`. A PostgreSQL database trigger instantly intercepts this creation and automatically generates a linked record in the public `profiles` table with the default role of `'student'`.
- **Redirection:** Successful registration immediately logs the user in and directs them to the student dashboard.

---

## 5. ADMIN DASHBOARD
Located at `/app/dashboard/admin/`, this section provides total system control.

### 5.1 Main Dashboard (admin/page.tsx)
- **Stats Cards:** Displays total books, active borrows, overdue books, total students, total staff, and pending requests.
- **Charts:** A Recharts bar chart showing inventory by category, and a pie chart showing availability status.
- **Panels:** Quick-view tables for Recent Transactions and Pending Book Requests.

### 5.2 Manage Books (admin/books/page.tsx)
- **Interface:** A comprehensive data table with a search bar and category filter chips.
- **Columns:** Title/Author, Cover Thumbnail, Categories, Tags (Feature T pill icons), Shelf Location, Copies, and Status indicators (Crown for Book of the Month, Star for Featured).
- **Add/Edit Dialog:** Allows input of all metadata, multi-select dropdowns for Categories and Tags, Cover Image URL inputs, and toggles for Featured status.
- **Actions:** Books can be soft-deleted (Archived) or permanently deleted (with warning confirmation).

### 5.3 Manage Shelves (admin/shelves/page.tsx)
- **Visuals:** A grid of shelf cards.
- **Progress Bars:** Each card features a color-coded capacity progress bar (Green/Yellow/Red) showing how full the physical shelf is based on current inventory.
- **Actions:** Add, edit location, update capacity, or delete shelves.

### 5.4 Manage Categories (admin/categories/page.tsx)
- **Interface:** Grid of genre cards displaying assigned icons and a visual color swatch.
- **Data:** Shows exactly how many books are currently assigned to each category.
- **Actions:** Full CRUD (Create, Read, Update, Delete) capabilities.

### 5.5 Manage Tags (admin/tags/page.tsx)
- **Interface:** Tag cards displaying custom descriptors (e.g., "Award Winner", "Summer Reading").
- **Features:** Includes a built-in color picker allowing admins to assign distinct hex colors to tags for UI differentiation.
- **Data:** Tracks usage count; tags assigned to active books cannot be deleted.

### 5.6 Borrow / Return (admin/borrow-return/page.tsx)
- **Issue Book Tab:** Debounced search for students and books, with a due date picker.
- **Return Book Tab:** Searchable list of active transactions. Clicking "Return" restores `available_copies` in the inventory.
- **Reservations Tab:** Admin reviews student requests. Can Approve (accepting proposed date), Edit & Approve (forcing a new date with a note), or Decline (providing a rejection reason). Inventory updates instantly upon approval.

### 5.7 Transactions (admin/transactions/page.tsx)
- **Purpose:** A read-only audit log of all borrowing activity.
- **Features:** Tabs to filter All, Active, Returned, and Overdue. Due dates are color-coded (Red for overdue). Includes a robust "Export to CSV" function for reporting.

### 5.8 Book Requests (admin/requests/page.tsx)
- A dedicated, expanded view of student reservations allowing bulk approval/rejection workflows. Notifications are automatically dispatched to students upon decision.

### 5.9 Announcements (admin/announcements/page.tsx)
- **Interface:** CRUD manager for system alerts.
- **Configuration:** Admins select a Type (Info, Warning, Success, Danger) which dictates the banner color. Toggles allow announcements to be visible inside dashboards or pushed out to the public landing page.

### 5.10 Manage Staff (admin/staff/page.tsx)
- **Interface:** Table of all staff and student users.
- **Security Bypass:** Creating staff accounts is done via a specialized API route utilizing the Supabase Service Role Key, bypassing standard signup flows.
- **Overrides:** Admins can edit individual student profiles here to override their specific `borrow_limit` (Feature S).

### 5.11 Archive (admin/archive/page.tsx)
- **Purpose:** Soft-deleted entities (Books, Shelves, Transactions) are moved here instead of being permanently erased, preserving historical data integrity.
- **Actions:** Admins can Restore items back to active status, or execute a Permanent Delete.

### 5.12 Admin Profile (admin/profile/page.tsx)
- Admins can update their Full Name and Avatar. Role and Email are read-only for security.

### 5.13 Settings (dashboard/settings/page.tsx)
- **General:** UI Theme toggles, Accent Color selection, and global Language Preference.
- **Security:** Password change form.
- **Library Rules:** The control center for Feature S. Admins set the "Default Borrowing Limit" here. Saving it executes a bulk database update across all default student profiles.

---

## 6. STAFF DASHBOARD
Located at `/app/dashboard/staff/`, this interface mirrors the admin experience but removes highly sensitive privileges.

### 6.1 Staff Main Dashboard (staff/page.tsx)
- Focuses heavily on daily operations. Features a Quick Action Flow widget for immediately issuing or returning books, a live Activity Stream, and overdue alerts.

### 6.2 Books Catalog & 6.3 Shelves
- Staff have full read/write access to add, edit, and categorize the inventory, exactly like Admins.

### 6.4 Borrow / Return
- The primary workspace for Staff. Same robust functionality as the Admin view. Crucially, every time a staff member issues or returns a book, the system logs the action and sends a notification to the Admins for oversight.

### 6.5 Archive
- **Restriction:** Staff can view and restore archived transactions or requests, but they **cannot** permanently delete records.

### 6.6 Staff Profile
- Standard editable profile fields (Name, Avatar).

---

## 7. STUDENT DASHBOARD
Located at `/app/dashboard/student/`, designed to be engaging, informative, and restrictive.

### 7.1 Student Main Dashboard (student/page.tsx)
- **Alerts (Feature R):** Dynamic banners warn students of Overdue books (Red) or books Due Soon (Amber).
- **Capacity Bar (Feature S):** A progress bar showing how many books the student is allowed to borrow (e.g., "1 of 2 slots used") based on global rules or admin overrides.
- **Content:** Displays the Book of the Month, Featured Books, and cards for Currently Borrowed books with live countdowns to the due date.

### 7.2 Browse Books (student/browse/page.tsx)
- **Interface:** A visual grid of book covers.
- **Filters:** Includes a search bar, Category tabs, an Availability toggle, and a multi-select Tag filter dropdown (Feature T).
- **Modal Flow:** Clicking a book reveals descriptions, stats, and peer reviews. If the student hasn't hit their borrow limit, they can click "Request to Borrow", pick a return date (max 15 days, weekends disabled), and submit the reservation to staff.

### 7.3 My Borrowed Books (student/borrowed/page.tsx)
- A personal ledger of active and returned books, complete with color-coded due date indicators.

### 7.4 Request a Book (student/requests/page.tsx)
- Tracks the status of submitted reservations. If a staff member modifies the requested return date during approval, a staff note is attached and displayed here.

### 7.5 My Reviews (student/reviews/page.tsx)
- Students can only review books they have successfully borrowed and returned. Includes a 1-5 star rating system and text comment submission.

### 7.6 Student Profile (student/profile/page.tsx)
- Displays personal details and automatically calculated reading statistics (Total Books Read, Favorite Genre).

---

## 8. SHARED FEATURES

### 8.1 AI Chat - Libby (dashboard/chat/page.tsx)
- **Functionality:** A conversational interface with typing animations and suggested prompts.
- **Context Awareness:** Libby knows who she is talking to. If a student asks where a book is, she provides the exact shelf location. If staff asks about a book, she can provide borrower details.
- **Integration:** Fully aware of newly added Tags (Feature T) and Categories, dynamically pulling this data via an API route before responding.

### 8.2 Notification System
- A real-time bell icon dropdown. Triggers automatically on critical system events: Borrow approvals, rejections, overdue notices, due-soon reminders (Feature R), and staff activity alerts.

### 8.3 Customization (Settings)
- Every user can personalize their experience by selecting Light/Dark/System themes, choosing an Accent Color, and switching the interface language (Feature DD) to English, Filipino, or Cebuano.

---

## 9. KEY SYSTEM FEATURES SUMMARY
**A.** Role-based access control (Admin, Staff, Student).  
**B.** Libby AI Chatbot with live RAG database context.  
**C.** Student book reservation workflow with date selection.  
**D.** Staff approval mechanisms with date overrides.  
**E.** Borrowing Limit enforcement per student (Feature S).  
**F.** Automated due date alert banners (Feature R).  
**G.** Custom Book Tags system with color coding (Feature T).  
**H.** Curated Featured and Book of the Month spotlighting (Feature W).  
**I.** Multi-language UI support (Feature DD).  
**J.** Soft-delete Archive system with restoration.  
**K.** Real-time database notifications.  
**L.** Targeted Announcement broadcasting.  
**M.** Multi-category and Multi-tag taxonomy.  
**N.** CSV data exporting for transactions.  
**O.** Recharts visual analytics dashboard.  
**P.** Dynamic UI theming (Dark mode + Accents).  

---

## 10. SECURITY & ACCESS CONTROL
- **Row Level Security (RLS):** Supabase strictly enforces read/write permissions at the database level. Students cannot manipulate HTTP requests to view others' data.
- **Middleware Protection:** Next.js `middleware.ts` intercepts all route requests. If a student attempts to type `/dashboard/admin` in the URL bar, they are instantly redirected back to their authorized workspace.
- **Service Role Bypass:** Highly sensitive actions (like bulk updating limits or creating staff accounts) use a secure backend API route with the Supabase Service Role key, ensuring standard users can never trigger these actions.

---

## 11. HOW TO RUN THE SYSTEM
**Prerequisites:** Node.js, npm, and a Supabase account.
1. Clone the repository to your local machine.
2. Create a `.env.local` file in the root directory.
3. Populate the required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`.
4. Run `npm install` to download dependencies.
5. Execute the SQL migration scripts in your Supabase SQL Editor.
6. Run `npm run dev` to start the local development server at `localhost:3000`.
7. Register the first account, then manually promote it to 'admin' directly inside the Supabase database.
8. Use the Admin dashboard to provision Staff accounts and configure Library Rules.
