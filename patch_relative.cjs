const fs = require('fs');

['src/pages/LoginPage.tsx', 'src/pages/SignUpPage.tsx', 'src/pages/UnauthorizedPage.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace('className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8"', 'className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8"');
  fs.writeFileSync(file, code);
});
