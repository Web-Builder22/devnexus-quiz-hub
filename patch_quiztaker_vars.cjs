const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');
const search = `  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  
  // PIP Dragging state`;
const replacement = `  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const cleanupStreams = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  }, []);

  // PIP Dragging state`;
code = code.replace(search, replacement);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
