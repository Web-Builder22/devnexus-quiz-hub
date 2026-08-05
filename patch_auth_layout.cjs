const fs = require('fs');
let code = fs.readFileSync('src/components/AuthenticatedLayout.tsx', 'utf8');

code = code.replace("import { Topbar } from './Topbar';", 
"import { Topbar } from './Topbar';\nimport { BrandingFooter } from './BrandingFooter';");

code = code.replace(
`        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>`,
`        <main className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <BrandingFooter className="mt-8 mb-2" />
        </main>`
);
fs.writeFileSync('src/components/AuthenticatedLayout.tsx', code);
