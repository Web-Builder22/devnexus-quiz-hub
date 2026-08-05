const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const oldCleanup = `  const cleanupStreams = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }`;

const newCleanup = `  const isCleaningUpRef = useRef(false);
  const cleanupStreams = useCallback(() => {
    isCleaningUpRef.current = true;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      screenStreamRef.current = null;
    }`;

code = code.replace(oldCleanup, newCleanup);

code = code.replace(`cameraStream.getVideoTracks()[0].addEventListener('ended', () => handleViolation('Camera turned off'));`, 
`cameraStream.getVideoTracks()[0].addEventListener('ended', () => { if (!isCleaningUpRef.current) handleViolation('Camera turned off'); });`);

code = code.replace(`screenStream.getVideoTracks()[0].addEventListener('ended', () => handleViolation('Screen sharing stopped'));`, 
`screenStream.getVideoTracks()[0].addEventListener('ended', () => { if (!isCleaningUpRef.current) handleViolation('Screen sharing stopped'); });`);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
