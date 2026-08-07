const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const effect = `
  useEffect(() => {
    if (hasStarted && proctoringPassed) {
      if (videoRef.current && cameraStreamRef.current && videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }
      if (screenRef.current && screenStreamRef.current && screenRef.current.srcObject !== screenStreamRef.current) {
        screenRef.current.srcObject = screenStreamRef.current;
      }
    }
  }, [hasStarted, proctoringPassed, videoRef.current, screenRef.current]);
`;

code = code.replace("  const startDetectionLoop = useCallback(() => {", effect + "\n  const startDetectionLoop = useCallback(() => {");

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
