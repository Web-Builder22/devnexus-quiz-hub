const fs = require('fs');
let file = fs.readFileSync('src/api/student.ts', 'utf8');

const regex = /import \{ eq, and, inArray, desc \} from 'drizzle-orm';/;
const replacement = `import { eq, and, inArray, desc, sql } from 'drizzle-orm';`;

file = file.replace(regex, replacement);

const regex2 = /\.set\(\{ violations: \(attempt\.violations \|\| 0\) \+ 1 \}\)/;
const replacement2 = `.set({ violations: sql\`COALESCE(\${attempts.violations}, 0) + 1\` })`;

file = file.replace(regex2, replacement2);

fs.writeFileSync('src/api/student.ts', file);
