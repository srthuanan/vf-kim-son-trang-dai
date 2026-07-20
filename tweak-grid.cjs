const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// We want to add borders between columns inside the row cards.
// We keep border-spacing: 0 8px so they remain cards, but we add vertical dividers.
content = content.replace(
  '.inventory-data-side td {\n  padding: 10px 12px;\n  font-size: 13px;\n  color: #334155;\n  border: none;\n  border-top: 1px solid transparent;\n  border-bottom: 1px solid transparent;\n  vertical-align: middle;\n}',
  '.inventory-data-side td {\n  padding: 10px 12px;\n  font-size: 13px;\n  color: #334155;\n  border: none;\n  border-right: 1px solid #f1f5f9;\n  vertical-align: middle;\n}'
);

content = content.replace(
  '.inventory-data-side td:last-child { \n  border-top-right-radius: 16px; \n  border-bottom-right-radius: 16px; \n  border-right: 1px solid transparent; \n  width: 240px !important; min-width: 240px !important; max-width: 240px !important;\n}',
  '.inventory-data-side td:last-child { \n  border-top-right-radius: 16px; \n  border-bottom-right-radius: 16px; \n  border-right: none;\n  width: 240px !important; min-width: 240px !important; max-width: 240px !important;\n}'
);

// Add border-right to th as well
content = content.replace(
  '.inventory-data-side th {\n  padding: 12px 16px;\n  font-size: 12px;\n  font-weight: 700;\n  color: #475569;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  background: rgba(248, 250, 252, 0.85);\n  backdrop-filter: blur(8px);\n  border: none;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n  text-align: left;\n}',
  '.inventory-data-side th {\n  padding: 12px 16px;\n  font-size: 12px;\n  font-weight: 700;\n  color: #475569;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  background: rgba(248, 250, 252, 0.85);\n  backdrop-filter: blur(8px);\n  border: none;\n  border-right: 1px solid #e2e8f0;\n  border-bottom: 1px solid #e2e8f0;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n  text-align: left;\n}'
);

content = content.replace(
  '.inventory-data-side th:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; text-align: right; }',
  '.inventory-data-side th:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; text-align: right; border-right: none; }'
);

// Add a border to the whole row card to make it look like a framed row
content = content.replace(
  '.inventory-data-side tbody tr {\n  background: #ffffff;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);\n  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);\n  border-radius: 16px;\n}',
  '.inventory-data-side tbody tr {\n  background: #ffffff;\n  box-shadow: 0 0 0 1px #e2e8f0, 0 1px 3px rgba(15, 23, 42, 0.04);\n  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);\n  border-radius: 16px;\n}'
);

fs.writeFileSync(cssPath, content);
console.log("CSS grid tweaked successfully!");
