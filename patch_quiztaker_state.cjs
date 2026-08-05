const fs = require('fs');
let code = fs.readFileSync('src/pages/QuizTaker.tsx', 'utf8');

const search = `  const [aiLoading, setAiLoading] = useState(false);`;
const replacement = `  const [aiLoading, setAiLoading] = useState(false);
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);`;

code = code.replace(search, replacement);
fs.writeFileSync('src/pages/QuizTaker.tsx', code);
