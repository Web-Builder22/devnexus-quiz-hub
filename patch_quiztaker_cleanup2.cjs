const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const regex = /\/\/\s*Cleanup streams\s*if\s*\(videoRef\.current\?\.srcObject\)\s*\{\s*\(videoRef\.current\.srcObject as MediaStream\)\.getTracks\(\)\.forEach\(t => t\.stop\(\)\);\s*\}\s*if\s*\(screenRef\.current\?\.srcObject\)\s*\{\s*\(screenRef\.current\.srcObject as MediaStream\)\.getTracks\(\)\.forEach\(t => t\.stop\(\)\);\s*\}/g;

code = code.replace(regex, '');
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
