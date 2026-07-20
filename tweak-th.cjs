const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Replace the th styling
content = content.replace(
  '.inventory-data-side th {\n  padding: 12px 16px;\n  font-size: 12px;\n  font-weight: 700;\n  color: #475569;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  background: rgba(248, 250, 252, 0.85);\n  backdrop-filter: blur(8px);\n  border: none;\n  border-right: 1px solid #e2e8f0;\n  border-bottom: 1px solid #e2e8f0;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n  text-align: left;\n}',
  '.inventory-data-side th {\n  padding: 14px 16px;\n  font-size: 14px;\n  font-weight: 800;\n  color: #1e293b;\n  text-transform: uppercase;\n  letter-spacing: 0.02em;\n  background: #f1f5f9;\n  border: none;\n  border-right: 1px solid #e2e8f0;\n  border-bottom: 2px solid #cbd5e1;\n  position: sticky;\n  top: 0;\n  z-index: 50;\n  text-align: left;\n}'
);

fs.writeFileSync(cssPath, content);
console.log("CSS th tweaked successfully!");
