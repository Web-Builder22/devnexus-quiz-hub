const fs = require('fs');
let file = fs.readFileSync('src/api/certificates.ts', 'utf8');

const replacement = `
    let tpl = tplResult[0];
    if (!tpl) {
       // Create default if missing
       const defaultLayoutConfig = {
        studentName: { x: 148.5, y: 100, fontSize: 24, color: '#000000', align: 'center', enabled: true },
        studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
        quizTitle: { x: 148.5, y: 130, fontSize: 18, color: '#000000', align: 'center', enabled: true },
        score: { x: 148.5, y: 150, fontSize: 16, color: '#000000', align: 'center', enabled: true },
        percentage: { x: 148.5, y: 160, fontSize: 16, color: '#000000', align: 'center', enabled: false },
        rank: { x: 148.5, y: 170, fontSize: 16, color: '#000000', align: 'center', enabled: false },
        issueDate: { x: 70, y: 180, fontSize: 14, color: '#000000', align: 'left', enabled: true },
        certificateId: { x: 227, y: 180, fontSize: 10, color: '#666666', align: 'right', enabled: true }
      };
      const newSettings = await db.insert(certificateTemplates).values({
        adminId: quiz.authorId,
        enabled: false,
        passingPercentage: 70,
        layoutConfig: defaultLayoutConfig,
        updatedAt: new Date()
      }).returning();
      tpl = newSettings[0];
    }
`;

file = file.replace(/const tpl = tplResult\[0\];/, replacement);
fs.writeFileSync('src/api/certificates.ts', file);
