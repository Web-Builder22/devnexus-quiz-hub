const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const oldReq = `  const requestPermissions = async () => {
    if (!quiz?.securitySettings) return;
    setRequestingPermissions(true);
    setPermissionsError('');
    try {
      const sec = quiz.securitySettings;
      
      let cameraStream: MediaStream | null = null;
      let screenStream: MediaStream | null = null;
      if (sec.enableCamera || sec.enableMicrophone) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: sec.enableCamera ? { facingMode: "user" } : false,
          audio: sec.enableMicrophone
        });
        if (videoRef.current) { 
           videoRef.current.srcObject = cameraStream;
        }
      }
      if (sec.enableScreenSharing) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        if (screenRef.current) { 
           screenRef.current.srcObject = screenStream;
        }
      }
      
      if (sec.enableCamera && cameraStream) {
         cameraStream.getVideoTracks()[0].addEventListener('ended', () => handleViolation('Camera turned off'));
         
         // Load AI Model
         setAiLoading(true);
         try {
           aiModelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
         } catch (e) {
           console.error("Error loading TF model", e);
         }
         setAiLoading(false);
      }
      if (sec.enableScreenSharing && screenStream) {
         screenStream.getVideoTracks()[0].addEventListener('ended', () => handleViolation('Screen sharing stopped'));
      }`;

const newReq = `  const requestPermissions = async () => {
    if (!quiz?.securitySettings) return;
    setRequestingPermissions(true);
    setPermissionsError('');
    try {
      const sec = quiz.securitySettings;
      
      let cameraStream: MediaStream | null = null;
      let screenStream: MediaStream | null = null;
      
      const needsCamera = sec.enableCamera || sec.enableFaceDetection || sec.enableMultiPerson || sec.enableDeviceDetection;
      
      if (needsCamera || sec.enableMicrophone) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: needsCamera ? { facingMode: "user" } : false,
          audio: sec.enableMicrophone
        });
        cameraStreamRef.current = cameraStream;
      }
      
      if (sec.enableScreenSharing) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        screenStreamRef.current = screenStream;
      }
      
      if (needsCamera && cameraStream) {
         cameraStream.getVideoTracks()[0].addEventListener('ended', () => handleViolation('Camera turned off'));
         
         // Load AI Model
         setAiLoading(true);
         try {
           aiModelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
         } catch (e) {
           console.error("Error loading TF model", e);
         }
         setAiLoading(false);
      }
      
      if (sec.enableScreenSharing && screenStream) {
         screenStream.getVideoTracks()[0].addEventListener('ended', () => handleViolation('Screen sharing stopped'));
      }`;

code = code.replace(oldReq, newReq);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
