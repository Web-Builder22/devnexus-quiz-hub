const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminCertificatesPage.tsx', 'utf8');
content = content.replace(/certificateId: \{[\s\S]*?\}\s*\};\s*\}\);\s*\}/, "certificateId: { x: 249.5, y: 163, fontSize: 12, color: '#000000', align: 'center', enabled: true }\n                }\n             });\n          }");
fs.writeFileSync('src/pages/AdminCertificatesPage.tsx', content);
