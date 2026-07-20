const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Update .status.pending
content = content.replace(
  /.status\.pending \{\s*background: #fef3c7;\s*color: #b45309;\s*border: none;\s*\}/g,
  '.status.pending { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }'
);

// Update .status.preparing
content = content.replace(
  /.status\.preparing \{\s*background: #d1fae5;\s*color: #047857;\s*border: none;\s*\}/g,
  '.status.preparing { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }'
);

// Update .status.done
content = content.replace(
  /.status\.done \{\s*background: #dbeafe;\s*color: #1d4ed8;\s*border: none;\s*\}/g,
  '.status.done { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }'
);

fs.writeFileSync(cssPath, content);
console.log('Badges updated successfully!');
