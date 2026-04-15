-- ============================================================
-- SchoolLib: Book Categories (Many-to-Many) + Storage Bucket
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Remove old single category_id from books (if it exists)
alter table books drop column if exists category_id;

-- 2. Create pivot table for many-to-many book <-> categories
create table if not exists book_categories (
  book_id uuid references books(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (book_id, category_id)
);

alter table book_categories enable row level security;

create policy "Anyone can read book_categories" on book_categories
  for select using (true);

create policy "Admin/staff manage book_categories" on book_categories
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );

-- 3. Create the book-covers storage bucket
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

create policy "Anyone can view book covers" on storage.objects
  for select using (bucket_id = 'book-covers');

create policy "Admin/staff can upload book covers" on storage.objects
  for insert with check (
    bucket_id = 'book-covers' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );

create policy "Admin/staff can delete book covers" on storage.objects
  for delete using (
    bucket_id = 'book-covers' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );
