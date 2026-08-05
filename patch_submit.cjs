const fs = require('fs');
let file = fs.readFileSync('src/api/student.ts', 'utf8');

const regex = /if \(selectedOptions && Array\.isArray\(selectedOptions\) && selectedOptions\.length > 0\) \{\s*await db\.delete\(answers\)\.where\(eq\(answers\.attemptId, attemptId\)\);\s*const selectedOpts = await db\.select\(\)\.from\(options\)\.where\(inArray\(options\.id, selectedOptions\)\);\s*if \(selectedOpts\.length > 0\) \{\s*const answerRecords = selectedOpts\.map\(opt => \(\{\s*attemptId,\s*questionId: opt\.questionId,\s*optionId: opt\.id\s*\}\)\);\s*await db\.insert\(answers\)\.values\(answerRecords\);\s*\}\s*\}/;

const replacement = `if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      await db.transaction(async (tx) => {
        await tx.delete(answers).where(eq(answers.attemptId, attemptId));
        const selectedOpts = await tx.select().from(options).where(inArray(options.id, selectedOptions));
        if (selectedOpts.length > 0) {
          const answerRecords = selectedOpts.map(opt => ({
            attemptId,
            questionId: opt.questionId,
            optionId: opt.id
          }));
          await tx.insert(answers).values(answerRecords);
        }
      });
    }`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/student.ts', file);
