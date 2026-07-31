const fs = require('fs');
const path = require('path');

const dashDir = path.join(__dirname, '../app/dashboard');

function processDir(dir, depth) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath, depth + 1);
    } else if (file === 'page.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Determine active link based on directory name
      let activeLink = 'overview';
      if (depth > 0) {
        activeLink = path.basename(dir);
      }
      
      // Calculate import path
      const prefix = '../'.repeat(depth + 2);
      const importStmt = `import DashboardSidebar from "${prefix}components/DashboardSidebar";`;
      
      // If already refactored, skip
      if (content.includes('DashboardSidebar')) continue;
      
      // Add import after the last import statement
      const importRegex = /import .* from ".*";\r?\n/g;
      let lastIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastIndex = match.index + match[0].length;
      }
      content = content.substring(0, lastIndex) + importStmt + '\n' + content.substring(lastIndex);
      
      // Replace <aside>...</aside>
      const asideRegex = /<aside className=\{styles\.sidebar\}>[\s\S]*?<\/aside>/;
      content = content.replace(asideRegex, `<DashboardSidebar activeLink="${activeLink}" />`);
      
      fs.writeFileSync(fullPath, content);
      console.log(`Refactored ${fullPath}`);
    }
  }
}

processDir(dashDir, 0);
