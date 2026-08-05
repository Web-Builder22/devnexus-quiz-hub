const fs = require('fs');
let code = fs.readFileSync('src/pages/UnauthorizedPage.tsx', 'utf8');

code = code.replace("import { ShieldAlert } from 'lucide-react';", 
"import { ShieldAlert } from 'lucide-react';\nimport { BrandingFooter } from '../components/BrandingFooter';");

code = code.replace(
`        </div>
      </div>
    </div>`,
`        </div>
      </div>
      <BrandingFooter className="absolute bottom-6 left-0 w-full" />
    </div>`
);
fs.writeFileSync('src/pages/UnauthorizedPage.tsx', code);
