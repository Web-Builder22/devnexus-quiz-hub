const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentCertificatesPage.tsx', 'utf8');

content = content.replace(/import jsPDF from 'jspdf';/, `import jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';\nimport { CertificateRenderer } from '../components/CertificateRenderer';`);

// Replace handleDownloadPdf
const downloadReplacement = `const handleDownloadPdf = async () => {
    if (!certData) return;
    const element = document.getElementById('certificate-preview-node-student');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      doc.save(\`Certificate_\${certData.data.studentName}_\${certData.data.quizTitle}.pdf\`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    }
  };`;
content = content.replace(/const handleDownloadPdf = \(\) => \{[\s\S]*?doc\.save\([\s\S]*?\);\s*\};/, downloadReplacement);

// Replace preview JSX
const previewRegex = /<div\s*className="relative bg-white shadow-md rounded"[\s\S]*?containerType: 'inline-size'[\s\S]*?\}\}\s*>[\s\S]*?<\/div>\s*<\/div>/;
const previewReplacement = `<div id="certificate-preview-node-student" className="w-full relative shadow-md rounded overflow-hidden">
                  <CertificateRenderer data={certData.data} template={certData.template} />
                </div>`;
content = content.replace(previewRegex, previewReplacement);

fs.writeFileSync('src/pages/StudentCertificatesPage.tsx', content);

let results = fs.readFileSync('src/pages/QuizResults.tsx', 'utf8');
results = results.replace(/import jsPDF from 'jspdf';/, `import jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';\nimport { CertificateRenderer } from '../components/CertificateRenderer';`);

const dlResReplacement = `const downloadCertificate = async (participant: any) => {
    if (!participant.certificateId) return;
    try {
      const res = await fetch(\`/api/v1/certificates/\${participant.certificateId}/download-data\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (res.ok) {
        const { template, data } = await res.json();
        
        // We need to render it temporarily to generate PDF.
        // We can create an invisible container for html2canvas
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.width = '1000px'; 
        document.body.appendChild(container);
        
        // Render with standard ReactDOM client
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);
        
        // Wrap in a promise to wait for render
        await new Promise(resolve => {
            root.render(<div id="pdf-cert-temp"><CertificateRenderer data={data} template={template} /></div>);
            setTimeout(resolve, 500); // give it time to render images/fonts
        });
        
        const element = document.getElementById('pdf-cert-temp');
        if (element) {
           const canvas = await html2canvas(element, { scale: 2 });
           const imgData = canvas.toDataURL('image/jpeg', 1.0);
           const doc = new jsPDF('landscape', 'mm', 'a4');
           doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
           doc.save(\`Certificate_\${data.studentName}_\${data.quizTitle}.pdf\`);
        }
        
        root.unmount();
        document.body.removeChild(container);
      } else {
        alert('Could not download certificate');
      }
    } catch (e) {
      console.error(e);
      alert('Could not download certificate');
    }
  };`;
results = results.replace(/const downloadCertificate = async \(participant: any\) => \{[\s\S]*?\} catch \(e\) \{\s*console\.error\(e\);\s*alert\('Could not download certificate'\);\s*\}\s*\};/, dlResReplacement);

fs.writeFileSync('src/pages/QuizResults.tsx', results);
