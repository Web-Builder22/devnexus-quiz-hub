const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

code = code.replace(/\{quiz\.securitySettings\?\.enableCamera && \(/, 
`{(quiz.securitySettings?.enableCamera || quiz.securitySettings?.enableDeviceDetection || quiz.securitySettings?.enableFaceDetection || quiz.securitySettings?.enableMultiPerson) && (`);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
