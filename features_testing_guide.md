# SchoolLib Feature Testing Walkthrough

This guide provides step-by-step instructions to test all five newly implemented features in the SchoolLib platform.

> **Important Prerequisite**
> Before testing, ensure you have executed the new SQL migration script. Open your Supabase Dashboard, go to the SQL Editor, and paste/run the contents of `c:\library-system\sql\features_v2_migration.sql`.

---

## 1. Feature S: Student Borrowing Limits

**Test the Admin Controls:**
1. Log in to the system as an **Admin**.
2. Navigate to **Settings** from the sidebar.
3. Scroll down to the new **Library Rules** section.
4. Verify the "Default Borrowing Limit" is visible (defaults to 3). Change it to `2` and click **Save Limit**.

**Test the Enforcement:**
1. Log out and log back in as a **Student** (or open an incognito window as a student).
2. Look at your Dashboard. Under the "Borrowing Capacity" progress bar, verify it says "0 of 2 slots used".
3. Navigate to the **Browse Catalog**.
4. Request to borrow **2** available books.
5. Try to request a **3rd** book. 
6. **Expected Result:** The system should block the request, showing an alert banner on the book detail modal stating your limit is reached, and the "Request to Borrow" button should be disabled.

---

## 2. Feature R: Due Date Reminders

**Test the Dashboard Alerts:**
1. Log in as a **Student** who currently has active borrowed books.
2. If you don't have overdue books, you might need to temporarily modify a transaction in your Supabase `transactions` table to have a `due_date` in the past.
3. **Expected Result:** 
   - If a book is overdue, a **Red Alert Banner** will appear at the top of the Student Dashboard: *"You have overdue books!"*
   - If a book is due within the next 3 days, an **Amber Alert Banner** will appear: *"You have books due soon!"*

---

## 3. Feature T: Book Tags System

**Test Tag Management (Admin):**
1. Log in as an **Admin**.
2. Click on **Manage Tags** in the sidebar.
3. Create a new tag (e.g., name it `"Summer Reading"` and pick an orange color).
4. Verify the tag appears in the grid.

**Test Tag Assignment:**
1. Navigate to **Manage Books**.
2. Click **Edit** on any existing book.
3. In the dialog, look for the "Tags" dropdown. Select your new `"Summer Reading"` tag and save.
4. Back on the books table, verify the tag pill appears in the book's row.

**Test Tag Discovery (Student):**
1. Log in as a **Student**.
2. Navigate to **Browse Catalog**.
3. Underneath the category tabs, verify the tag filter chips are visible.
4. Click the `"Summer Reading"` tag.
5. **Expected Result:** The book grid should filter to only show the book you tagged. The book card itself will also display the mini tag chip.
6. Open **Libby AI** (chat) and ask: *"Do you have any books tagged as Summer Reading?"* Libby should now correctly reference the tagged books!

---

## 4. Feature W: Featured / Book of the Month

**Test Admin Configuration:**
1. Log in as an **Admin** and navigate to **Manage Books**.
2. Pick a book and click the **Crown Icon** (👑) in its row to make it the **Book of the Month**. Confirm the prompt.
3. Pick 2 or 3 other books and click the **Star Icon** (⭐) in their rows to mark them as **Featured**.
4. (Optional) Edit one of the featured books and add a custom message in the "Featured Note" field.

**Test Student View:**
1. Log in as a **Student** and go to the **Dashboard**.
2. **Expected Result:** 
   - A large, beautifully styled **Book of the Month** hero banner should appear highlighting the crowned book.
   - Below it, a horizontally scrolling **Featured Books** shelf should display the starred books.

---

## 5. Feature DD: Multi-Language Support

**Test Language Switching:**
1. Log in as a **Student** (or any role).
2. Navigate to **Settings**.
3. Locate the new **Language Preference** card.
4. Click on **Filipino** (🇵🇭) or **Cebuano** (🇵🇭).
5. Navigate back to the **Dashboard** or **Browse Catalog**.
6. **Expected Result:** Key interface text elements (like "Dashboard", "Library Catalog", "Books Borrowed") should instantly translate to the selected language without reloading the page.
7. Refresh the page to ensure your language preference persists.
