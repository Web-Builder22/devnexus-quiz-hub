const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

code = code.replace(/const personCount = objects\.filter\(o => o === 'person'\)\.length;[\s\S]*?if \(objects\.includes\('book'\)\) \{\s*handleViolation\('Book or notes detected'\);\s*\}/, 
`const personCount = objects.filter(o => o === 'person').length;
        
        if (sec?.enableFaceDetection && personCount === 0) {
          handleViolation('Face not visible / Left frame');
        }
        if (sec?.enableMultiPerson && personCount > 1) {
          handleViolation('Multiple persons detected');
        }
        
        if (sec?.enableDeviceDetection) {
           if (objects.includes('cell phone')) {
             handleViolation('Mobile phone detected');
           }
           if (objects.includes('laptop') || objects.includes('tv') || objects.includes('monitor')) {
             handleViolation('Secondary device detected');
           }
           if (objects.includes('book')) {
             handleViolation('Book or notes detected');
           }
        }`);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
