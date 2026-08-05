const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const oldDet = `        // Security logic
        const personCount = objects.filter(o => o === 'person').length;
        if (personCount === 0) {
          handleViolation('Face not visible / Left frame');
        } else if (personCount > 1) {
          handleViolation('Multiple persons detected');
        }
        if (objects.includes('cell phone')) {
          handleViolation('Mobile phone detected');
        }
        if (objects.includes('laptop') || objects.includes('tv') || objects.includes('monitor')) {
          handleViolation('Secondary device detected');
        }
        if (objects.includes('book')) {
          handleViolation('Book or notes detected');
        }`;

const newDet = `        // Security logic
        const personCount = objects.filter(o => o === 'person').length;
        
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
        }`;

code = code.replace(oldDet, newDet);

const oldStartDet = `  const startDetectionLoop = useCallback(() => {
    if (!videoRef.current || !aiModelRef.current || !hasStarted || !quiz?.securitySettings?.enableCamera) return;
    const detect = async () => {`;

const newStartDet = `  const startDetectionLoop = useCallback(() => {
    const sec = quiz?.securitySettings;
    const needsCamera = sec?.enableCamera || sec?.enableFaceDetection || sec?.enableMultiPerson || sec?.enableDeviceDetection;
    if (!videoRef.current || !aiModelRef.current || !hasStarted || !needsCamera) return;
    
    const detect = async () => {`;

code = code.replace(oldStartDet, newStartDet);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
