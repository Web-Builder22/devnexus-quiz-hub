const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const regex = /if \(sec\.enableCamera \|\| sec\.enableMicrophone\) \{/g;
code = code.replace(regex, `
      const needsCamera = sec.enableCamera || sec.enableFaceDetection || sec.enableMultiPerson || sec.enableDeviceDetection;
      if (needsCamera || sec.enableMicrophone) {`);

const regex2 = /video: sec\.enableCamera \? \{ facingMode: "user" \} : false,/g;
code = code.replace(regex2, `video: needsCamera ? { facingMode: "user" } : false,`);

const regex3 = /if \(sec\.enableCamera && cameraStream\) \{/g;
code = code.replace(regex3, `if (needsCamera && cameraStream) {`);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
