const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Replace the first media query block
content = content.replace(
  '.inventory-data-side {\n    height: auto;\n    overflow: visible;\n  }\n  .inventory-data-side .table-wrap {\n    overflow-y: visible;\n  }',
  '.inventory-data-side {\n    height: 70vh;\n    min-height: 500px;\n    overflow: hidden;\n  }\n  .inventory-data-side .table-wrap {\n    overflow-y: auto !important;\n  }'
);

// We need to also remove .inventory-data-side .table-wrap from the other mobile rule
content = content.replace(
  '.orders-data-side .table-wrap,\n  .inventory-data-side .table-wrap {\n    overflow-x: auto !important;\n    overflow-y: visible !important;\n    -webkit-overflow-scrolling: touch;\n  }',
  '.orders-data-side .table-wrap {\n    overflow-x: auto !important;\n    overflow-y: visible !important;\n    -webkit-overflow-scrolling: touch;\n  }'
);

// Handle any variation of spacing
content = content.replace(
  /.orders-data-side \.table-wrap,\s*\.inventory-data-side \.table-wrap \{\s*overflow-x: auto !important;\s*overflow-y: visible !important;/g,
  '.orders-data-side .table-wrap {\n    overflow-x: auto !important;\n    overflow-y: visible !important;'
);

fs.writeFileSync(cssPath, content);
console.log('Fixed sticky header on small screens!');
