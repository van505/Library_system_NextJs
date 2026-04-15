// Fix Dialog accessibility: add DialogDescription after every DialogHeader in admin pages
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && !full.includes('node_modules') && !full.includes('.next')) {
      results = results.concat(walk(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      results.push(full);
    }
  });
  return results;
}

// We need to import DialogDescription in files that have DialogContent
// and add <DialogDescription className="sr-only">Dialog</DialogDescription>
// after <DialogTitle> if DialogDescription not already present

const files = walk('./app/dashboard/admin').concat(walk('./components/dashboard'));
let fixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('DialogContent')) return;
  
  let modified = content;
  
  // 1. Add DialogDescription to import if missing
  if (content.includes('DialogContent') && !content.includes('DialogDescription')) {
    modified = modified.replace(
      /import \{ ([^}]*DialogTitle[^}]*) \} from '@\/components\/ui\/dialog'/,
      (match, inner) => {
        const items = inner.split(',').map(s => s.trim()).filter(Boolean);
        if (!items.includes('DialogDescription')) items.push('DialogDescription');
        return `import { ${items.join(', ')} } from '@/components/ui/dialog'`;
      }
    );
    // Also try the pattern without DialogTitle (just DialogContent etc.)
    if (!modified.includes('DialogDescription')) {
      modified = modified.replace(
        /import \{ ([^}]*DialogContent[^}]*) \} from '@\/components\/ui\/dialog'/,
        (match, inner) => {
          const items = inner.split(',').map(s => s.trim()).filter(Boolean);
          if (!items.includes('DialogDescription')) items.push('DialogDescription');
          return `import { ${items.join(', ')} } from '@/components/ui/dialog'`;
        }
      );
    }
  }

  // 2. After each </DialogTitle>, add <DialogDescription className="sr-only">Dialog</DialogDescription> if not already present
  // We do this by finding </DialogTitle> and checking if DialogDescription follows in the next 2 lines
  const lines = modified.split('\n');
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    if (lines[i].includes('</DialogTitle>')) {
      // Check if next non-empty line has DialogDescription
      let nextContent = '';
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (lines[j].trim()) { nextContent = lines[j]; break; }
      }
      if (!nextContent.includes('DialogDescription')) {
        // Get the indentation of the current line
        const indent = lines[i].match(/^(\s*)/)[1];
        newLines.push(`${indent}<DialogDescription className="sr-only">Dialog</DialogDescription>`);
      }
    }
  }
  modified = newLines.join('\n');

  if (modified !== content) {
    fs.writeFileSync(file, modified);
    console.log('Fixed dialog accessibility in:', file);
    fixed++;
  }
});

console.log('Total fixed:', fixed);
