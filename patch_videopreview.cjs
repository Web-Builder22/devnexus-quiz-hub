const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const videoPreviewCode = `
const VideoPreview = React.forwardRef<HTMLVideoElement, { className?: string }>(({ className }, ref) => {
  const fallbackRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref || fallbackRef) as React.MutableRefObject<HTMLVideoElement>;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isActive = true;

    const initStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' },
          audio: false
        });
        if (isActive && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera for VideoPreview:', err);
      }
    };

    initStream();

    return () => {
      isActive = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  return <video ref={videoRef} autoPlay playsInline muted className={className} />;
});
VideoPreview.displayName = 'VideoPreview';
`;

// Insert after imports
code = code.replace("export function QuizTaker() {", videoPreviewCode + "\nexport function QuizTaker() {");

// Replace <video ref={videoRef} ... /> with <VideoPreview ref={videoRef} ... />
code = code.replace(
  /<video\s+ref=\{videoRef\}\s+autoPlay\s+playsInline\s+muted\s+className="w-full h-full object-cover transform scale-x-\[-1\]"\s*\/>/g,
  '<VideoPreview ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" />'
);

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
