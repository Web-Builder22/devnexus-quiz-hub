const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const oldDet = `  const startDetectionLoop = useCallback(() => {
    if (!videoRef.current || !aiModelRef.current || !hasStarted || !quiz?.securitySettings?.enableCamera) return;
    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && aiModelRef.current) {
        const predictions = await aiModelRef.current.detect(videoRef.current);
        
        // Draw to canvas for PIP
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            predictions.forEach(prediction => {
              const [x, y, width, height] = prediction.bbox;
              ctx.strokeStyle = '#4f46e5';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);
              ctx.fillStyle = '#4f46e5';
              ctx.fillText(prediction.class, x, y > 10 ? y - 5 : 10);
            });
          }
        }

        const objects = predictions.map(p => p.class);
        setDetectedObjects(objects);

        // Security logic
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
        }
      }`;

const newDet = `  const startDetectionLoop = useCallback(() => {
    const sec = quiz?.securitySettings;
    const needsCamera = sec?.enableCamera || sec?.enableFaceDetection || sec?.enableMultiPerson || sec?.enableDeviceDetection;
    if (!videoRef.current || !aiModelRef.current || !hasStarted || !needsCamera) return;
    
    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && aiModelRef.current) {
        const predictions = await aiModelRef.current.detect(videoRef.current);
        
        // Draw to canvas for PIP
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            predictions.forEach(prediction => {
              const [x, y, width, height] = prediction.bbox;
              ctx.strokeStyle = '#4f46e5';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);
              ctx.fillStyle = '#4f46e5';
              ctx.fillText(prediction.class, x, y > 10 ? y - 5 : 10);
            });
          }
        }

        const objects = predictions.map(p => p.class);
        setDetectedObjects(objects);

        // Security logic
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
        }
      }`;

code = code.replace(oldDet, newDet);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
