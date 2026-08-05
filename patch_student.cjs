const fs = require('fs');
let file = fs.readFileSync('src/api/student.ts', 'utf8');

const regex = /if \(selectedOptions && Array\.isArray\(selectedOptions\) && selectedOptions\.length > 0\) \{[\s\S]*?\} else if \(selectedOptions && Array\.isArray\(selectedOptions\) && selectedOptions\.length === 0\) \{\s*await db\.delete\(answers\)\.where\(eq\(answers\.attemptId, attemptId\)\);\s*\}/;

const replacement = `await db.transaction(async (tx) => {
      if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
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
      } else if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length === 0) {
        await tx.delete(answers).where(eq(answers.attemptId, attemptId));
      }
    });`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/student.ts', file);
