const fs = require('fs');

let dash = fs.readFileSync('src/pages/StudentDashboard.tsx', 'utf8');
dash = dash.replace(/import jsPDF from 'jspdf';/, `import jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';\nimport { CertificateRenderer } from '../components/CertificateRenderer';`);

const dlResReplacement = `const handleDownloadPdf = async () => {
    if (!certData) return;
    const element = document.getElementById('certificate-preview-node-student-dash');
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
dash = dash.replace(/const handleDownloadPdf = \(\) => \{[\s\S]*?doc\.save\([\s\S]*?\);\s*\};/, dlResReplacement);

const previewRegex = /<div\s*className="relative bg-white shadow-md rounded"[\s\S]*?containerType: 'inline-size'[\s\S]*?\}\}\s*>[\s\S]*?<\/div>\s*<\/div>/;
const previewReplacement = `<div id="certificate-preview-node-student-dash" className="w-full relative shadow-md rounded overflow-hidden">
                  <CertificateRenderer data={certData.data} template={certData.template} />
                </div>`;
dash = dash.replace(previewRegex, previewReplacement);

fs.writeFileSync('src/pages/StudentDashboard.tsx', dash);

