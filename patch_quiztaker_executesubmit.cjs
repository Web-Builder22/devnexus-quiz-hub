const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const oldExec = `      // Cleanup streams
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (screenRef.current?.srcObject) {
        (screenRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      
      if (response.ok) {
        navigate('/student/dashboard', { state: { openResults: true } });
      } else {`;

const newExec = `      if (response.ok) { cleanupStreams(); navigate('/student/dashboard', { state: { openResults: true } });
      } else {`;

code = code.replace(oldExec, newExec);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
