const fs = require('fs');
let file = fs.readFileSync('src/api/quizzes.ts', 'utf8');

const regex = /const newQuestion = await db\.insert\(questions\)\.values\(\{([\s\S]*?)\}\)\.returning\(\);\s*const question = newQuestion\[0\];\s*let insertedOptions: any\[\] = \[\];\s*if \(optionsData && Array\.isArray\(optionsData\) && optionsData\.length > 0\) \{\s*const optionsToInsert = optionsData\.map\(\(opt: any\) => \(\{\s*questionId: question\.id,\s*content: opt\.content,\s*isCorrect: opt\.isCorrect \|\| false\s*\}\)\);\s*insertedOptions = await db\.insert\(options\)\.values\(optionsToInsert\)\.returning\(\);\s*\}/;

const replacement = `const result = await db.transaction(async (tx) => {
      const newQuestion = await tx.insert(questions).values({$1}).returning();
      const question = newQuestion[0];
      let insertedOptions: any[] = [];
      if (optionsData && Array.isArray(optionsData) && optionsData.length > 0) {
         const optionsToInsert = optionsData.map((opt: any) => ({
           questionId: question.id,
           content: opt.content,
           isCorrect: opt.isCorrect || false
         }));
         insertedOptions = await tx.insert(options).values(optionsToInsert).returning();
      }
      return { ...question, options: insertedOptions };
    });
    
    return res.status(201).json(result);`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/api/quizzes.ts', file);
