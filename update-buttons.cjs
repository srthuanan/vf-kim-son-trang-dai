const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Update column width for Thao tác
content = content.replace(
  /width: 220px !important;\s*min-width: 220px !important;\s*max-width: 220px !important;/g,
  'width: 140px !important; min-width: 140px !important; max-width: 140px !important;'
);
content = content.replace(
  /width: 240px !important;\s*min-width: 240px !important;\s*max-width: 240px !important;/g,
  'width: 140px !important; min-width: 140px !important; max-width: 140px !important;'
);

// Replace button styles
const buttonRegex = /\.inventory-data-side \.row-action-button \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-hold \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-hold:hover:not\(:disabled\) \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-create \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-create:hover:not\(:disabled\) \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-release,\s*\.inventory-data-side \.action-btn-delete \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-release:hover:not\(:disabled\),\s*\.inventory-data-side \.action-btn-delete:hover:not\(:disabled\) \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-edit \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-edit:hover:not\(:disabled\) \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-queue \{[\s\S]*?\}\s*\.inventory-data-side \.action-btn-queue:hover:not\(:disabled\) \{[\s\S]*?\}/m;

const newButtonStyles = \
.inventory-data-side .row-action-button span {
  display: none; /* Hide text for a cleaner look */
}

.inventory-data-side .row-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8; /* Subtle gray by default */
  transition: all 0.2s ease;
  cursor: pointer;
}

/* Hover effects reveal the color */
.inventory-data-side .action-btn-hold:hover:not(:disabled) { background: #ecfdf5; color: #059669; }
.inventory-data-side .action-btn-create:hover:not(:disabled) { background: #f0fdfa; color: #0f766e; }
.inventory-data-side .action-btn-release:hover:not(:disabled),
.inventory-data-side .action-btn-delete:hover:not(:disabled) { background: #fff1f2; color: #e11d48; }
.inventory-data-side .action-btn-edit:hover:not(:disabled) { background: #eff6ff; color: #2563eb; }
.inventory-data-side .action-btn-queue:hover:not(:disabled) { background: #fffbeb; color: #d97706; }
\;

content = content.replace(buttonRegex, newButtonStyles.trim());

fs.writeFileSync(cssPath, content);
console.log('Button styles updated for cleaner UI!');
