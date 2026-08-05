const fs = require('fs');
let content = fs.readFileSync('src/api/certificates.ts', 'utf8');

const regex = /const participantName = [\s\S]*?res\.json\(\{[\s\S]*?template: tpl,[\s\S]*?data: \{([\s\S]*?)\}\s*\}\);/;
const match = content.match(regex);
if (match) {
  const replacement = `const participantName = myBest?.participantName || student.displayName || student.email.split('@')[0];
    
    // Get Admin
    const adminResult = await db.select().from(users).where(eq(users.id, quiz.authorId));
    const adminUser = adminResult[0];
    const adminName = adminUser?.displayName || adminUser?.email.split('@')[0] || 'Administrator';
    
    res.json({
      template: tpl,
      data: {
        studentName: participantName,
        studentEmail: student.email,
        quizTitle: quiz.title,
        rank: \`#\${rank}\`,
        score: \`\${myBest.score}\`,
        percentage: \`\${percentage.toFixed(0)}%\`,
        issueDate: new Date(cert.issuedAt).toLocaleDateString(),
        certificateId: cert.certificateId,
        adminName: adminName,
        organizationName: 'DevNexus'
      }
    });`;
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/api/certificates.ts', content);
  console.log("Patched API");
} else {
  console.log("No match found in API");
}
