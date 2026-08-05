const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    if (hasStarted) {
      initSocket();
      startDetectionLoop();
    }
    return () => {
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [hasStarted, startDetectionLoop, initSocket]);`;

const newEffect = `  useEffect(() => {
    if (hasStarted) {
      if (videoRef.current && cameraStreamRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }
      if (screenRef.current && screenStreamRef.current && !screenRef.current.srcObject) {
        screenRef.current.srcObject = screenStreamRef.current;
      }
      initSocket();
      startDetectionLoop();
    }
    return () => {
      cleanupStreams();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [hasStarted, startDetectionLoop, initSocket, cleanupStreams]);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
