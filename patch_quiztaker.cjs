const fs = require('fs');
let file = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const regex = /const handleOptionToggle = \(questionId: number, optionId: number, isMultiSelect: boolean\) => \{/;
const replacement = `
  // Auto-sync answers to server
  useEffect(() => {
    if (!hasStarted || !attemptIdRef.current || !user) return;
    const syncTimeout = setTimeout(async () => {
      try {
        const token = await user.getIdToken();
        await fetch(\`/api/v1/student/attempts/\${attemptIdRef.current}/sync\`, {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selectedOptions: selectedOptionsRef.current
          })
        });
      } catch (err) {
        console.error('Failed to sync answers', err);
      }
    }, 1500); // Debounce sync
    return () => clearTimeout(syncTimeout);
  }, [selectedOptions, hasStarted, user]);

  const handleOptionToggle = (questionId: number, optionId: number, isMultiSelect: boolean) => {`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/pages/QuizTaker.tsx', file);
