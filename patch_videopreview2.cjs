const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const videoPreviewCode = `
const VideoPreview = React.forwardRef<HTMLVideoElement, { className?: string, stream?: MediaStream | null }>(({ className, stream }, ref) => {
  const fallbackRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref || fallbackRef) as React.MutableRefObject<HTMLVideoElement>;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    
    return () => {
      // Cleanup is handled by QuizTaker, but we clear the srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, videoRef]);

  return <video ref={videoRef} autoPlay playsInline muted className={className} />;
});
VideoPreview.displayName = 'VideoPreview';
`;

// Replace the old VideoPreview component
code = code.replace(/const VideoPreview = React\.forwardRef[\s\S]*?VideoPreview\.displayName = 'VideoPreview';/, videoPreviewCode.trim());

// Update the usage of VideoPreview to pass the stream
code = code.replace(/<VideoPreview ref=\{videoRef\} className="w-full h-full object-cover transform scale-x-\[-1\]" \/>/g,
  '<VideoPreview ref={videoRef} stream={cameraStreamRef.current} className="w-full h-full object-cover transform scale-x-[-1]" />');

fs.writeFileSync('src/pages/QuizTaker.tsx', code);
