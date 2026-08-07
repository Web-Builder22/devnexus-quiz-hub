const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const regex = /useEffect\(\(\) => \{\s*if \(hasStarted\) \{\s*if \(videoRef\.current && cameraStreamRef\.current && !videoRef\.current\.srcObject\) \{/g;
if (code.match(regex)) {
  console.log("MATCH");
} else {
  console.log("NO MATCH");
}
