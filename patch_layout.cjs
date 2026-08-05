const fs = require('fs');

const replacement = `const defaultLayoutConfig = {
        studentName: { x: 148.5, y: 92, fontSize: 36, color: '#000000', align: 'center', enabled: true, fontStyle: 'italic' },
        studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
        quizTitle: { x: 148.5, y: 122, fontSize: 20, color: '#000000', align: 'center', enabled: true, fontStyle: 'bold' },
        score: { x: 47.5, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        percentage: { x: 98, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        rank: { x: 148.5, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        issueDate: { x: 199, y: 163, fontSize: 14, color: '#000000', align: 'center', enabled: true },
        certificateId: { x: 249.5, y: 163, fontSize: 12, color: '#000000', align: 'center', enabled: true }
      };`;

// Patch backend
let apiFile = fs.readFileSync('src/api/certificates.ts', 'utf8');
apiFile = apiFile.replace(/const defaultLayoutConfig = \{[\s\S]*?certificateId: \{[\s\S]*?\}\s*\};/, replacement);
fs.writeFileSync('src/api/certificates.ts', apiFile);

// Patch frontend Admin page
let adminPage = fs.readFileSync('src/pages/AdminCertificatesPage.tsx', 'utf8');
adminPage = adminPage.replace(/layoutConfig: \{[\s\S]*?certificateId: \{[\s\S]*?\}[\s\S]*?\}/, replacement.replace('const defaultLayoutConfig = ', 'layoutConfig: '));
fs.writeFileSync('src/pages/AdminCertificatesPage.tsx', adminPage);
