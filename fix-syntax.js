const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./components'));
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('\\`') || content.includes('\\$')) {
    const original = content;

    // Direct string replace all instances of \` with `
    content = content.split('\\`').join('`');
    // Direct string replace all instances of \$ with $
    content = content.split('\\$').join('$');
    // Direct string replace all instances of \n inside these components? Wait, if I replace \\n with \n it might break real newlines?
    // Actually, only some lines had \\n. I'll just do \\n -> \n
    content = content.split('\\n').join('\n');

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Fixed:', Math.abs(content.length - original.length), 'chars in', file);
      modifiedCount++;
    }
  }
});
console.log('Fixed files:', modifiedCount);
