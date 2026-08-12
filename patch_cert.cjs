const fs = require('fs');
let file = fs.readFileSync('src/components/CertificateRenderer.tsx', 'utf8');

const targetFallback = `      {!hasBg && (
        <div className="absolute inset-0 pointer-events-none p-[5cqi] flex flex-col items-center border-[2cqi] border-double border-slate-200">
          
          {/* Certificate Borders & Corner Ornaments */}
          <div className="absolute inset-[1.5cqi] border border-slate-300"></div>
          <div className="absolute inset-[2.5cqi] border border-slate-200"></div>
          <div className="absolute top-[2.5cqi] left-[2.5cqi] w-[4cqi] h-[4cqi] border-t-2 border-l-2 border-amber-500"></div>
          <div className="absolute top-[2.5cqi] right-[2.5cqi] w-[4cqi] h-[4cqi] border-t-2 border-r-2 border-amber-500"></div>
          <div className="absolute bottom-[2.5cqi] left-[2.5cqi] w-[4cqi] h-[4cqi] border-b-2 border-l-2 border-amber-500"></div>
          <div className="absolute bottom-[2.5cqi] right-[2.5cqi] w-[4cqi] h-[4cqi] border-b-2 border-r-2 border-amber-500"></div>
          
          {/* Top Logo Area */}
          <div className="w-full flex justify-center items-start mt-[1cqi]">
            <DevNexusLogo className="h-[20cqi] w-auto object-contain drop-shadow-2xl" />
          </div>

          {/* Title Area */}
          <div className="mt-[4cqi] text-center">
            <h1 className="text-[6cqi] font-serif text-slate-900 uppercase tracking-[0.2em] font-bold">Certificate of Completion</h1>
            <div className="flex items-center justify-center mt-[1cqi] gap-4">
              <div className="h-px bg-slate-300 w-[15cqi]"></div>
              <Award className="w-[3cqi] h-[3cqi] text-amber-500" />
              <div className="h-px bg-slate-300 w-[15cqi]"></div>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
            <Award className="w-[40cqi] h-[40cqi] text-slate-900" />
          </div>

          {/* Decorative Divider */}
          <div className="w-full h-[1.5cqi] bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] absolute bottom-0 left-0" />
          <div className="w-full h-[1.5cqi] bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] absolute top-0 left-0" />
        </div>
      )}`;

const replacementFallback = `      {!hasBg && (
        <div className="absolute inset-0 pointer-events-none border-[2cqi] border-double border-slate-200">
          
          {/* Certificate Borders & Corner Ornaments */}
          <div className="absolute inset-[1.5cqi] border border-slate-300"></div>
          <div className="absolute inset-[2.5cqi] border border-slate-200"></div>
          <div className="absolute top-[2.5cqi] left-[2.5cqi] w-[4cqi] h-[4cqi] border-t-2 border-l-2 border-amber-500"></div>
          <div className="absolute top-[2.5cqi] right-[2.5cqi] w-[4cqi] h-[4cqi] border-t-2 border-r-2 border-amber-500"></div>
          <div className="absolute bottom-[2.5cqi] left-[2.5cqi] w-[4cqi] h-[4cqi] border-b-2 border-l-2 border-amber-500"></div>
          <div className="absolute bottom-[2.5cqi] right-[2.5cqi] w-[4cqi] h-[4cqi] border-b-2 border-r-2 border-amber-500"></div>
          
          {/* Top Logo Area (Moved Left) */}
          <div className="absolute top-[5cqi] left-[5cqi]">
            <DevNexusLogo className="h-[12cqi] w-auto object-contain drop-shadow-2xl" />
          </div>

          {/* Title Area (Smaller font & adjusted) */}
          <div className="absolute top-[8cqi] w-full flex flex-col items-center text-center">
            <h1 className="text-[3.5cqi] font-serif text-slate-900 uppercase tracking-[0.2em] font-bold">Certificate of Completion</h1>
            <div className="flex items-center justify-center mt-[1cqi] gap-4">
              <div className="h-px bg-slate-300 w-[15cqi]"></div>
              <Award className="w-[2.5cqi] h-[2.5cqi] text-amber-500" />
              <div className="h-px bg-slate-300 w-[15cqi]"></div>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
            <Award className="w-[40cqi] h-[40cqi] text-slate-900" />
          </div>

          {/* Decorative Divider */}
          <div className="w-full h-[1.5cqi] bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] absolute bottom-0 left-0" />
          <div className="w-full h-[1.5cqi] bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] absolute top-0 left-0" />
        </div>
      )}`;

file = file.replace(targetFallback, replacementFallback);
fs.writeFileSync('src/components/CertificateRenderer.tsx', file);
