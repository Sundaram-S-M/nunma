const fs = require('fs');
const path = require('path');

const dirsToScan = ['pages', 'components', 'layouts', 'context', 'hooks', 'utils'];
const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.html'];
const root = process.cwd();

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fileLoc = path.join(dir, file);
    const stat = fs.statSync(fileLoc);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fileLoc));
    } else {
      if (extensions.some(ext => fileLoc.endsWith(ext))) {
        results.push(fileLoc);
      }
    }
  });
  return results;
}

const files = [path.join(root, 'pages', 'Inbox.tsx')];
let modifiedCount = 0;

const regex = /(bg|text|border|shadow|fill|stroke|from|to|via|ring|focus:border|hover:text|hover:bg|hover:border)-indigo-900/g;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  newContent = newContent.replace(regex, '$1-nunma-forest');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
  }
});

console.log(`Replaced in ${modifiedCount} files.`);
