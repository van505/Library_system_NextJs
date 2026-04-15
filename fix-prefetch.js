// Add prefetch={true} to all <Link> elements in sidebar components
const fs = require('fs');

const files = [
  'components/dashboard/admin-sidebar.tsx',
  'components/dashboard/staff-sidebar.tsx',
  'components/dashboard/student-sidebar.tsx',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace <Link href= with <Link prefetch={true} href= where prefetch is missing
  content = content.replace(/<Link\s+(?!prefetch)/g, '<Link prefetch={true} ');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Added prefetch to:', file);
  } else {
    console.log('Already OK:', file);
  }
});
