# SchoolLib - Folder Structure Guide

This guide breaks down every single folder in the project and explains its purpose. You can use this to answer questions during your Q&A defense when asked about the architecture or organization of the codebase.

---

## 📂 Root Level Folders

### 1. `app/` (The Routing Engine)
This is the most important folder in a Next.js 13+ project. Next.js uses **File-System Based Routing**, meaning any folder inside `app/` automatically becomes a web address (URL) that a user can visit.
* **`app/api/`**: Contains server-side logic and database endpoints. This acts as the backend. (e.g., `app/api/chat/route.ts` handles the AI chatbot logic).
* **`app/dashboard/`**: The protected area of the website after logging in.
  * **`app/dashboard/admin/`**: The pages only administrators can see and use (e.g., `/dashboard/admin/books`).
  * **`app/dashboard/staff/`**: The pages for library staff operations.
  * **`app/dashboard/student/`**: The pages for student features (browse, request, read reviews).
* **`app/login/` & `app/register/`**: The public authentication pages.
* **`app/chat/`**: The public-facing AI Chat page.
* **`app/page.tsx`**: The main public Landing Page (homepage).
* **`app/layout.tsx`**: The master HTML wrapper that applies global fonts, CSS, and providers to every single page.

### 2. `components/` (Reusable Building Blocks)
This folder holds all the UI pieces that **do not have their own URL**. Instead of rewriting code, you build a component here and plug it into different pages inside `app/`.
* **`components/ui/`**: This contains all the Shadcn UI components (Buttons, Cards, Modals, Inputs). These are the basic styling building blocks that give the site its premium glassmorphic look.
* **`components/dashboard/`**: Holds larger, complex pieces specific to our app.
  * `admin-sidebar.tsx`, `staff-sidebar.tsx`, `student-sidebar.tsx`: The side navigation menus.
  * `return-dialog.tsx`: The popup window used by both admin and staff to process returned books.
  * `notifications-panel.tsx`: The bell icon dropdown that shows system alerts.

### 3. `lib/` (Core Logic & Utilities)
"Lib" stands for Library. This folder holds essential background logic, database connections, and helper functions that can be called from anywhere.
* **`lib/supabase.ts` & `lib/supabase-server.ts`**: The connection cables to our Supabase PostgreSQL database. One is for client-side security, the other is for server-side.
* **`lib/dateUtils.ts`**: Contains the math to calculate 15-day return limits and block weekends (Saturdays/Sundays).
* **`lib/borrowingLimit.ts`**: Contains the rules that prevent a student from borrowing more than their allowed limit.
* **`lib/notifyAdmins.ts`**: The script that pushes real-time alerts to the notification bell.
* **`lib/store.ts`**: The Zustand state manager. It remembers who is currently logged in (Admin vs Student) so the website doesn't have to constantly ask the database.
* **`lib/i18n/`**: Stands for "Internationalization." This folder holds the dictionaries that allow the website to instantly translate between English, Filipino, and Cebuano.

### 4. `public/` (Static Assets)
Anything inside this folder is publicly accessible to the internet without needing security checks. It is strictly used for static files.
* **What goes here:** Images, logos, icons, fonts, and the `favicon.ico` (the tiny icon you see in the browser tab).

### 5. `sql/` (Database Blueprints)
This folder contains raw SQL code files (`.sql`).
* **What it does:** It acts as the blueprint for Supabase. If you ever need to recreate the database from scratch on a new server, you would run the files in this folder to instantly build all the tables, relationships, and Row Level Security (RLS) rules.

### 6. `docs/` (Documentation)
This folder holds all the written guides, summaries, and architectural documentation (including this file) for developer reference and project defense preparation.

### 7. `.next/` (The Engine Room - Hidden)
This is an automatically generated folder created by Next.js when you run `npm run dev` or `npm run build`. 
* **What it does:** It takes all your React code and compiles it into the highly optimized HTML, CSS, and JavaScript that the browser actually reads. **You should never manually edit files in this folder.**

### 8. `node_modules/` (The Toolbox - Hidden)
This is where all external third-party code lives.
* **What it does:** When you install something like Tailwind CSS, Supabase, or Lucide Icons using the command line (`npm install`), the actual code for those tools is downloaded and stored here. It is massive and is automatically excluded from GitHub because it can always be re-downloaded.

### 9. `.git/` (Version Control - Hidden)
This folder is created by Git. It silently tracks every single change, addition, or deletion you make to your code over time so you can revert mistakes or push your code to GitHub.

---

### Q&A Defense Tip
If the panel asks: *"How is your code organized?"*

**Your Answer:**
> *"We use a modern component-based architecture. The `app/` folder strictly handles our routing and page layouts. The `components/` folder holds our reusable UI building blocks like buttons and sidebars. Finally, all of our database connections, business rules, and helper functions are isolated in the `lib/` folder. This keeps the code clean, modular, and easy to maintain."*
