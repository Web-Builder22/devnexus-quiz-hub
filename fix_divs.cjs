const fs = require('fs');
['src/pages/AdminCertificatesPage.tsx', 'src/pages/StudentCertificatesPage.tsx', 'src/pages/StudentDashboard.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<CertificateRenderer data=\{([^}]+)\} template=\{([^}]+)\} \/>\s*<\/div>\s*<div className="flex justify-end gap-3 pt-2">/g, 
  `<CertificateRenderer data={$1} template={$2} />\n                </div>\n              </div>\n                <div className="flex justify-end gap-3 pt-2">`);
  
  content = content.replace(/<CertificateRenderer data=\{([^}]+)\} template=\{([^}]+)\} \/>\s*<\/div>\s*<div className="flex justify-end pt-2">/g, 
  `<CertificateRenderer data={$1} template={$2} />\n                </div>\n              </div>\n                <div className="flex justify-end pt-2">`);
  
  fs.writeFileSync(file, content);
});
