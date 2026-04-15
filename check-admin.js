const fs = require('fs');
const files = [
  'app/dashboard/admin/books/page.tsx',
  'app/dashboard/admin/shelves/page.tsx',
  'app/dashboard/admin/transactions/page.tsx',
  'app/dashboard/admin/requests/page.tsx',
  'app/dashboard/admin/announcements/page.tsx',
  'app/dashboard/admin/staff/page.tsx',
  'app/dashboard/admin/categories/page.tsx',
  'app/api/admin/create-staff/route.ts',
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n').length;
    console.log(f, '-> lines:', lines, 'bytes:', c.length);
  } else {
    console.log(f, '-> MISSING');
  }
});
