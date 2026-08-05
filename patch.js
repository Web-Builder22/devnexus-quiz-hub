const fs = require('fs');
let file = fs.readFileSync('src/api/certificates.ts', 'utf8');

const replacement = `
    let settings = await db.select().from(certificateTemplates).where(eq(certificateTemplates.adminId, dbUser.id));
    
    if (settings.length === 0) {
      // Create default
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
        adminId: dbUser.id,
        enabled: false,
        passingPercentage: 70,
        layoutConfig: defaultLayoutConfig,
      }).returning();
      
      return res.json(newSettings[0]);
    }

    res.json(settings[0]);
`;

file = file.replace(/const settings = await db\.select\(\)\.from\(certificateTemplates\)\.where\(eq\(certificateTemplates\.adminId, dbUser\.id\)\);\s*if \(settings\.length === 0\) \{([\s\S]*?)\}\s*res\.json\(settings\[0\]\);/, replacement.trim());
fs.writeFileSync('src/api/certificates.ts', file);
