const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Replace td padding
content = content.replace(
  /.inventory-data-side td \{\s*padding: 16px;/g,
  '.inventory-data-side td {\n  padding: 10px 12px;'
);

// Add flex-wrap: nowrap to row-actions
content = content.replace(
  /.inventory-data-side .row-actions \{\s*display: flex;/g,
  '.inventory-data-side .row-actions {\n  display: flex;\n  flex-wrap: nowrap;\n  white-space: nowrap;'
);

// Also set min-width for the last th/td to ensure actions have space
// Wait, I already had a rule for th:last-child somewhere?
// Let's explicitly set width for actions column
if (!content.includes('.inventory-data-side th:last-child { width: 200px;')) {
    content = content.replace(
        '.inventory-data-side th:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; text-align: right; }',
        '.inventory-data-side th:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; text-align: right; width: 220px; }'
    );
    content = content.replace(
        '.inventory-data-side td:last-child { \n  border-top-right-radius: 16px; \n  border-bottom-right-radius: 16px; \n  border-right: 1px solid transparent; \n}',
        '.inventory-data-side td:last-child { \n  border-top-right-radius: 16px; \n  border-bottom-right-radius: 16px; \n  border-right: 1px solid transparent; \n  width: 220px;\n}'
    );
}

fs.writeFileSync(cssPath, content);
console.log('CSS tweaked successfully!');
