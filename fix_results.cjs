const fs = require('fs');
const replacement = `const downloadCertificate = async (participant: any) => {
    if (!participant.certificateId) return;
    try {
      const res = await fetch(\`/api/v1/certificates/\${participant.certificateId}/download-data\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (res.ok) {
        const { template, data } = await res.json();
        const doc = new jsPDF('landscape');
        if (template.backgroundImage) {
          doc.addImage(template.backgroundImage, 'JPEG', 0, 0, 297, 210);
        }
        const fields = ['studentName', 'studentEmail', 'quizTitle', 'score', 'percentage', 'rank', 'issueDate', 'certificateId'];
        fields.forEach(field => {
          const conf = template.layoutConfig[field];
          if (conf && conf.enabled && data[field] !== undefined) {
            doc.setFontSize(conf.fontSize);
            doc.setTextColor(conf.color);
            const fontName = conf.fontStyle === 'italic' ? 'times' : 'helvetica';
            doc.setFont(fontName, conf.fontStyle || 'normal');
            doc.text(String(data[field]), conf.x, conf.y, { align: conf.align });
          }
        });
        doc.save(\`Certificate_\${data.studentName}_\${data.quizTitle}.pdf\`);
      } else {
        alert('Could not download certificate');
      }
    } catch (e) {
      console.error(e);
      alert('Could not download certificate');
    }
  };`;

let content = fs.readFileSync('src/pages/QuizResults.tsx', 'utf8');
content = content.replace(/const downloadCertificate = async \(participant: any\) => \{[\s\S]*?\} catch \(e\) \{\s*console\.error\(e\);\s*alert\('Could not download certificate'\);\s*\}\s*\};/, replacement);
fs.writeFileSync('src/pages/QuizResults.tsx', content);
