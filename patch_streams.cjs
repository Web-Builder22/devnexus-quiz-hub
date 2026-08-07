const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const regex = /if \(videoRef\.current\) \{\s*videoRef\.current\.srcObject = cameraStream;\s*\}/g;
code = code.replace(regex, `cameraStreamRef.current = cameraStream;
        if (videoRef.current) {
           videoRef.current.srcObject = cameraStream;
        }`);

const regex2 = /if \(screenRef\.current\) \{\s*screenRef\.current\.srcObject = screenStream;\s*\}/g;
code = code.replace(regex2, `screenStreamRef.current = screenStream;
        if (screenRef.current) {
           screenRef.current.srcObject = screenStream;
        }`);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
