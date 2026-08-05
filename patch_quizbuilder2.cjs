const fs = require('fs');
let file = fs.readFileSync('src/pages/QuizBuilder.tsx', 'utf8');

const regex = /const handleSaveQuestion = async \(\) => \{[\s\S]*?finally \{\s*setSavingQuestion\(false\);\s*\}\s*\};/;
const replacement = `const handleSaveQuestion = async () => {
    if (!newQuestionContent.trim() || !user || !quiz) return;
    
    // Validation
    if (newQuestionType === 'multiple_choice' || newQuestionType === 'true_false') {
      if (newQuestionOptions.some(o => !o.content.trim())) {
         alert('All options must have content.');
         return;
      }
      if (!newQuestionOptions.some(o => o.isCorrect)) {
         alert('At least one option must be marked as correct.');
         return;
      }
    }

    setSavingQuestion(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(\`/api/v1/quizzes/\${quiz.id}/questions\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: newQuestionType,
          content: newQuestionContent,
          points: newQuestionPoints,
          optionsData: newQuestionOptions
        })
      });

      if (response.ok) {
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
        setNewQuestionPoints(1);
        setNewQuestionOptions([
          { content: '', isCorrect: true },
          { content: '', isCorrect: false }
        ]);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(\`Failed to save question: \${err.error || response.statusText}\`);
      }
    } catch (err: any) {
      console.error(err);
      alert(\`Error saving question: \${err.message}\`);
    } finally {
      setSavingQuestion(false);
    }
  };`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/pages/QuizBuilder.tsx', file);
