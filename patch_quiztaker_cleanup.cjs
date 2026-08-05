const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

// handleViolation cleanup
code = code.replace(/if \(videoRef\.current\?\.srcObject\) \{[\s\S]*?\}\s*if \(screenRef\.current\?\.srcObject\) \{[\s\S]*?\}/, 'cleanupStreams();');

// executeSubmit cleanup
code = code.replace(/if \(response\.ok\) \{\s*navigate\('\/student\/dashboard'/g, 'if (response.ok) { cleanupStreams(); navigate(\'/student/dashboard\'');

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
