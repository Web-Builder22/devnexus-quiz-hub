const fs = require('fs');

const replacement = `const doc = new jsPDF('landscape');
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
    doc.save(\`Certificate_\${data.studentName}_\${data.quizTitle}.pdf\`);`;

const files = [
  'src/pages/QuizResults.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/const doc = new jsPDF\('landscape'\);[\s\S]*?doc\.save\(`Certificate_\$\{data\.studentName\}_\$\{data\.quizTitle\}\.pdf`\);/, replacement);
    fs.writeFileSync(file, content);
  }
});
