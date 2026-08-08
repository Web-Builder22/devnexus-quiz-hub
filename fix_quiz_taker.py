import re

with open('src/pages/QuizTaker.tsx', 'r') as f:
    content = f.read()

# Fix face confidence and buffer for mobile
# minConfidence line
old_min_conf = "        const minConfidence = sec?.minFaceConfidence ?? 0.5;"
new_min_conf = """        const isMobile = window.innerWidth < 768;
        const minConfidence = isMobile ? Math.min(sec?.minFaceConfidence ?? 0.5, 0.35) : (sec?.minFaceConfidence ?? 0.5);"""
content = content.replace(old_min_conf, new_min_conf)

# noFaceBuffer line
old_buffer = "              const allowedBuffer = sec?.noFaceBufferSec ?? 4;"
new_buffer = "              const allowedBuffer = (sec?.noFaceBufferSec ?? 4) + (isMobile ? 6 : 0);"
content = content.replace(old_buffer, new_buffer)

# Remove resize violation completely
resize_logic = """    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const handleWindowResize = () => {
      if (sec.fullscreen) {
        const widthDiff = Math.abs(window.innerWidth - lastWidth);
        const heightDiff = Math.abs(window.innerHeight - lastHeight);
        if (widthDiff > 200 || heightDiff > 200) {
          handleViolation('Browser Resized Significantly');
        }
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
      }
    };"""
content = content.replace(resize_logic, "")

# Remove window.addEventListener('resize', handleWindowResize);
content = re.sub(r"\s*window\.addEventListener\('resize', handleWindowResize\);", "", content)

# Remove window.removeEventListener('resize', handleWindowResize);
content = re.sub(r"\s*window\.removeEventListener\('resize', handleWindowResize\);", "", content)

with open('src/pages/QuizTaker.tsx', 'w') as f:
    f.write(content)

