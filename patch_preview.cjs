const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminCertificatesPage.tsx', 'utf8');

// Replace the first preview
content = content.replace(/whiteSpace: 'nowrap'(\s*)\}\}/g, "whiteSpace: 'nowrap', fontStyle: conf.fontStyle === 'italic' ? 'italic' : 'normal', fontWeight: conf.fontStyle === 'bold' ? 'bold' : 'normal', fontFamily: conf.fontStyle === 'italic' ? 'serif' : 'sans-serif' $1}}");

fs.writeFileSync('src/pages/AdminCertificatesPage.tsx', content);

let studentContent = fs.readFileSync('src/pages/StudentCertificatesPage.tsx', 'utf8');
studentContent = studentContent.replace(/whiteSpace: 'nowrap'(\s*)\}\}/g, "whiteSpace: 'nowrap', fontStyle: conf.fontStyle === 'italic' ? 'italic' : 'normal', fontWeight: conf.fontStyle === 'bold' ? 'bold' : 'normal', fontFamily: conf.fontStyle === 'italic' ? 'serif' : 'sans-serif' $1}}");
fs.writeFileSync('src/pages/StudentCertificatesPage.tsx', studentContent);

let studentDash = fs.readFileSync('src/pages/StudentDashboard.tsx', 'utf8');
studentDash = studentDash.replace(/whiteSpace: 'nowrap'(\s*)\}\}/g, "whiteSpace: 'nowrap', fontStyle: conf.fontStyle === 'italic' ? 'italic' : 'normal', fontWeight: conf.fontStyle === 'bold' ? 'bold' : 'normal', fontFamily: conf.fontStyle === 'italic' ? 'serif' : 'sans-serif' $1}}");
fs.writeFileSync('src/pages/StudentDashboard.tsx', studentDash);

