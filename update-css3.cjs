const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

const startMarker = '/* INVENTORY DASHBOARD MODULAR LAYOUT (OPTION 2) */';
const endMarker = '/* ORDERS MODULAR LAYOUT (SYNCED WITH INVENTORY) */';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found!');
    process.exit(1);
}

const newCssPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\cec6fb23-ecfc-469c-91fa-15534f178aa4\\scratch\\new_styles.txt';
const newCss = fs.readFileSync(newCssPath, 'utf8');

const pre = content.substring(0, startIndex);
const post = content.substring(endIndex);

fs.writeFileSync(cssPath, pre + newCss + post);

content = fs.readFileSync(cssPath, 'utf8');
content = content.replace(
  /.orders-data-side \.table-wrap,\s*\.inventory-data-side \.table-wrap \{\s*overflow-x: auto !important;\s*overflow-y: visible !important;/g,
  '.orders-data-side .table-wrap {\n    overflow-x: auto !important;\n    overflow-y: visible !important;'
);
fs.writeFileSync(cssPath, content);

console.log('CSS updated successfully!');
