const fs = require('fs');
let code = fs.readFileSync('src/pages/SignUpPage.tsx', 'utf8');

code = code.replace("import { BrainCircuit, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';", 
"import { BrainCircuit, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';\nimport { BrandingFooter } from '../components/BrandingFooter';");

code = code.replace(
`            </p>
          </>
        )}
      </div>
    </div>`,
`            </p>
          </>
        )}
      </div>
      <BrandingFooter className="absolute bottom-6 left-0 w-full" />
    </div>`
);
fs.writeFileSync('src/pages/SignUpPage.tsx', code);
