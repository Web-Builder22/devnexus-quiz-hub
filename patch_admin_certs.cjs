const fs = require('fs');
let file = fs.readFileSync('src/pages/AdminCertificatesPage.tsx', 'utf8');

const replacement = `      user.getIdToken().then(token => {
        fetch('/api/v1/certificates/settings', {
          headers: { Authorization: \`Bearer \${token}\` }
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
             setCertSettings(data);
          } else {
             // Fallback if backend still fails
             setCertSettings({
                enabled: false,
                passingPercentage: 70,
                backgroundImage: null,
                layoutConfig: {
                  studentName: { x: 148.5, y: 100, fontSize: 24, color: '#000000', align: 'center', enabled: true },
                  studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
                  quizTitle: { x: 148.5, y: 130, fontSize: 18, color: '#000000', align: 'center', enabled: true },
                  score: { x: 148.5, y: 150, fontSize: 16, color: '#000000', align: 'center', enabled: true },
                  percentage: { x: 148.5, y: 160, fontSize: 16, color: '#000000', align: 'center', enabled: false },
                  rank: { x: 148.5, y: 170, fontSize: 16, color: '#000000', align: 'center', enabled: false },
                  issueDate: { x: 70, y: 180, fontSize: 14, color: '#000000', align: 'left', enabled: true },
                  certificateId: { x: 227, y: 180, fontSize: 10, color: '#666666', align: 'right', enabled: true }
                }
             });
          }
          setCertLoading(false);
        })
        .catch(err => {
          console.error(err);
          setCertLoading(false);
        });
      });`;

file = file.replace(/user\.getIdToken\(\)\.then\(token => \{[\s\S]*?fetch\('\/api\/v1\/certificates\/settings'[\s\S]*?\.then\(r => r\.ok \? r\.json\(\) : null\)[\s\S]*?\.then\(data => \{[\s\S]*?if \(data\) setCertSettings\(data\);\s*setCertLoading\(false\);\s*\}\)[\s\S]*?\.catch\(err => \{[\s\S]*?console\.error\(err\);\s*setCertLoading\(false\);\s*\}\);\s*\}\);/, replacement);
fs.writeFileSync('src/pages/AdminCertificatesPage.tsx', file);
