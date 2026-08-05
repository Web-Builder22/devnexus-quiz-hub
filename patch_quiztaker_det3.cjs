const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

code = code.replace(/const startDetectionLoop = useCallback\(\(\) => \{\s*if \(\!videoRef\.current \|\| \!aiModelRef\.current \|\| \!hasStarted \|\| \!quiz\?\.securitySettings\?\.enableCamera\) return;\s*const detect = async \(\) => \{/,
`const startDetectionLoop = useCallback(() => {
    const sec = quiz?.securitySettings;
    const needsCamera = sec?.enableCamera || sec?.enableFaceDetection || sec?.enableMultiPerson || sec?.enableDeviceDetection;
    if (!videoRef.current || !aiModelRef.current || !hasStarted || !needsCamera) return;
    const detect = async () => {`);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
