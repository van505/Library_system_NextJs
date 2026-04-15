-- ============================================================
-- SCHOOL LIB SCHEMA UPGRADE (Phase 1)
-- ============================================================

-- Categories/Genres table
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  color text default '#6366f1',
  icon text default 'BookOpen',
  created_at timestamp default now()
);

-- Add category_id to books
alter table books add column if not exists category_id uuid references categories(id);

-- Notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  message text not null,
  type text default 'info', -- info, success, warning, danger
  is_read boolean default false,
  link text,
  created_at timestamp default now()
);

alter table notifications enable row level security;
create policy "Users manage own notifications" on notifications 
  for all using (auth.uid() = user_id);

-- Auto-notify on overdue (function)
create or replace function notify_overdue()
returns void as $$
declare
  t record;
begin
  for t in 
    select tr.*, b.title as book_title, p.full_name
    from transactions tr
    join books b on b.id = tr.book_id
    join profiles p on p.id = tr.user_id
    where tr.status = 'borrowed' 
    and tr.due_date < now()
    and not exists (
      select 1 from notifications n 
      where n.user_id = tr.user_id 
      and n.link = '/dashboard/student/borrowed'
      and n.created_at > now() - interval '1 day'
    )
  loop
    insert into notifications (user_id, title, message, type, link)
    values (
      t.user_id,
      'Book Overdue!',
      'Your borrowed book "' || t.book_title || '" is overdue. Please return it immediately.',
      'danger',
      '/dashboard/student/borrowed'
    );
  end loop;
end;
$$ language plpgsql security definer;

-- Enable RLS on categories
alter table categories enable row level security;
create policy "Anyone can read categories" on categories for select using (true);
create policy "Admin manages categories" on categories for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
