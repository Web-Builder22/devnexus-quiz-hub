const fs = require('fs');
let code = fs.readFileSync('src/pages/SignUpPage.tsx', 'utf8');

const importStr = "import { BrandingFooter } from '../components/BrandingFooter';";
if (!code.includes(importStr)) {
  const parts = code.split('export function SignUpPage');
  code = parts[0] + importStr + "\n" + 'export function SignUpPage' + parts[1];
  fs.writeFileSync('src/pages/SignUpPage.tsx', code);
}
