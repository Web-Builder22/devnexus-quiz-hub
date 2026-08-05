const fs = require('fs');
let file = fs.readFileSync('src/pages/QuizBuilder.tsx', 'utf8');

const regex = /if \(response\.ok\) \{\s*const savedQuestion = await response\.json\(\)\.catch\(\(\) => null\);\s*if \(savedQuestion\) \{\s*setQuiz\(\{\s*\.\.\.quiz,\s*questions: \[\.\.\.quiz\.questions, savedQuestion\]\s*\}\);\s*\}\s*\/\/ Reset form\s*setIsAddingQuestion\(false\);\s*setNewQuestionContent\(''\);\s*setNewQuestionOptions\(\[\{ content: '', isCorrect: true \}\]\);\s*\} else \{[\s\S]*?\}\s*\} catch \(err\) \{\s*console\.error\(err\);\s*\}/;

const replacement = `if (response.ok) {
        const savedQuestion = await response.json().catch(() => null);
        if (savedQuestion) {
          setQuiz({
            ...quiz,
            questions: [...quiz.questions, savedQuestion]
          });
        }
        // Reset form
        setIsAddingQuestion(false);
        setNewQuestionContent('');
        setNewQuestionOptions([{ content: '', isCorrect: true }]);
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(\`Failed to save question: \${errData.error || response.statusText}\`);
      }
    } catch (err: any) {
      console.error(err);
      alert(\`Error saving question: \${err.message}\`);
    }`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/pages/QuizBuilder.tsx', file);
