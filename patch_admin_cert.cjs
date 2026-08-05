const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminCertificatesPage.tsx', 'utf8');

content = content.replace(/import jsPDF from 'jspdf';/, `import jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';\nimport { CertificateRenderer } from '../components/CertificateRenderer';`);

// Replace handleDownloadPdf
const downloadReplacement = `const handleDownloadPdf = async () => {
    if (!certPreviewData) return;
    const element = document.getElementById('certificate-preview-node');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      doc.save(\`Certificate_\${certPreviewData.data.studentName}_\${certPreviewData.data.quizTitle}.pdf\`);
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    }
  };`;
content = content.replace(/const handleDownloadPdf = \(\) => \{[\s\S]*?doc\.save\([\s\S]*?\);\s*\};/, downloadReplacement);

// Replace preview JSX
const previewRegex = /<div\s*className="relative bg-white shadow-md rounded"[\s\S]*?containerType: 'inline-size'[\s\S]*?\}\}\s*>[\s\S]*?<\/div>\s*<\/div>/;
const previewReplacement = `<div id="certificate-preview-node" className="w-full relative shadow-md rounded overflow-hidden">
                  <CertificateRenderer data={certPreviewData.data} template={certPreviewData.template} />
                </div>`;
content = content.replace(previewRegex, previewReplacement);

fs.writeFileSync('src/pages/AdminCertificatesPage.tsx', content);
