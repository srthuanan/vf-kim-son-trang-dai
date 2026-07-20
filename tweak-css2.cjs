const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

content = content.replace('width: 220px;', 'width: 240px !important; min-width: 240px !important; max-width: 240px !important;');
content = content.replace('width: 220px;', 'width: 240px !important; min-width: 240px !important; max-width: 240px !important;'); // Second replace for td

fs.writeFileSync(cssPath, content);
console.log('CSS tweaked width successfully!');
