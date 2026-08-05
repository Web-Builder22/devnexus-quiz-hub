import React from 'react';
// @ts-ignore
import { QRCodeSVG } from 'qrcode.react';

export const CertificateRenderer = ({ data, template, scale = 1 }: any) => {
  const isCustomBackground = !!template?.backgroundImage;
  const A4_RATIO = 297 / 210;

  if (isCustomBackground) {
    return (
      <div 
        style={{
          width: '100%',
          aspectRatio: `${A4_RATIO}`,
          backgroundImage: `url(${template.backgroundImage})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          containerType: 'inline-size'
        }}
        className="bg-white"
      >
        {['studentName', 'studentEmail', 'quizTitle', 'score', 'percentage', 'rank', 'issueDate', 'certificateId'].map(field => {
          const conf = template?.layoutConfig?.[field];
          if (conf && conf.enabled && data[field] !== undefined) {
            return (
              <div 
                key={field}
                style={{
                  position: 'absolute',
                  left: `${(conf.x / 297) * 100}%`,
                  top: `${(conf.y / 210) * 100}%`,
                  transform: `translate(${conf.align === 'center' ? '-50%' : conf.align === 'right' ? '-100%' : '0'}, -100%)`,
                  color: conf.color || '#000',
                  fontSize: `${conf.fontSize * 0.1187}cqi`,
                  whiteSpace: 'nowrap',
                  fontStyle: conf.fontStyle === 'italic' ? 'italic' : 'normal',
                  fontWeight: conf.fontStyle === 'bold' ? 'bold' : 'normal',
                  fontFamily: conf.fontStyle === 'italic' ? 'serif' : 'sans-serif'
                }}
              >
                {data[field]}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <div 
      className="bg-[#f8f9fa] relative overflow-hidden"
      style={{
        width: '100%',
        aspectRatio: `${A4_RATIO}`,
        containerType: 'inline-size',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Background SVG for Corners */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 297 210" preserveAspectRatio="none">
        {/* Top Left Dark Blue Corner */}
        <polygon points="0,0 120,0 35,210 0,210" fill="#0a192f" stroke="#d4af37" strokeWidth="2" />
        {/* Bottom Right Dark Blue Corner */}
        <polygon points="297,140 297,210 210,210" fill="#0a192f" stroke="#d4af37" strokeWidth="2" />
      </svg>

      {/* DevNexus Logo (Left side overlay) */}
      <div className="absolute top-[10cqi] left-[5cqi] text-white flex flex-col items-center">
         <div className="w-[18cqi] h-[18cqi] rounded-full border-[0.5cqi] border-[#d4af37] bg-[#0a192f] shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
             <div className="text-[5cqi] font-black tracking-tighter text-cyan-400 flex items-center">
                D<span className="text-[#d4af37] -ml-[0.5cqi]">N</span>
             </div>
             <div className="text-[1.5cqi] font-bold tracking-widest mt-[0.5cqi]">DEVNEXUS</div>
             <div className="text-[0.8cqi] text-cyan-400 mt-[0.2cqi] uppercase tracking-widest text-center px-2">Code • Secure • Innovate</div>
         </div>
      </div>
      
      {/* Gold ribbon / Seal */}
      <div className="absolute top-0 right-[10cqi] flex flex-col items-center">
         <div className="w-[6cqi] h-[15cqi] bg-[#d4af37] absolute top-0"></div>
         <svg className="absolute top-[13cqi] w-[6cqi] h-[2.1cqi]" viewBox="0 0 60 20" preserveAspectRatio="none">
          <polygon points="0,20 0,0 30,20 60,0 60,20" fill="#f8f9fa" />
         </svg>
         <div className="w-[12cqi] h-[12cqi] rounded-full bg-[#0a192f] border-[0.5cqi] border-[#d4af37] absolute top-[8cqi] flex flex-col items-center justify-center text-center shadow-lg">
            <div className="w-[10cqi] h-[10cqi] rounded-full border-[0.2cqi] border-dashed border-[#d4af37] flex flex-col items-center justify-center p-2">
               <div className="text-[#d4af37] text-[1.2cqi] font-bold uppercase leading-tight">Excellence<br/>In Learning</div>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-[12cqi] px-[15cqi]" style={{ marginLeft: '10cqi' }}>
         <h1 className="text-[6cqi] font-serif font-black text-[#0a192f] tracking-widest uppercase">Certificate</h1>
         <div className="flex items-center gap-[2cqi] mt-[1cqi]">
            <div className="h-[0.2cqi] w-[8cqi] bg-[#d4af37]"></div>
            <h2 className="text-[2.5cqi] font-serif text-[#d4af37] tracking-[0.5em] uppercase">Of Achievement</h2>
            <div className="h-[0.2cqi] w-[8cqi] bg-[#d4af37]"></div>
         </div>

         <div className="mt-[8cqi] flex flex-col items-center w-full">
            <p className="text-[1.8cqi] font-bold text-slate-700 uppercase tracking-widest mb-[2cqi]">This certificate is proudly presented to</p>
            <p className="text-[6cqi] font-serif italic text-[#0a192f] border-b-[0.2cqi] border-[#d4af37] pb-[1cqi] px-[4cqi] mb-[2cqi] whitespace-nowrap">
               {data.studentName}
            </p>
            <p className="text-[1.8cqi] text-slate-600 mb-[1cqi]">for successfully completing the quiz</p>
            <p className="text-[3cqi] font-bold text-[#0a192f] mb-[2cqi] text-center px-[4cqi]">{data.quizTitle}</p>
            <p className="text-[1.5cqi] text-slate-500 text-center max-w-[50cqi]">
               We congratulate you on your outstanding performance and dedication to excellence.
            </p>
         </div>

         {/* Stats Grid */}
         <div className="mt-[6cqi] w-full flex justify-between px-[5cqi] items-start">
            <div className="flex flex-col items-center text-center">
               <div className="w-[4cqi] h-[4cqi] mb-[1cqi] text-[#0a192f]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
               </div>
               <span className="text-[1.2cqi] font-bold text-[#d4af37] tracking-widest mb-[0.5cqi]">SCORE</span>
               <span className="text-[2cqi] font-bold text-[#0a192f]">{data.score}</span>
            </div>
            
            <div className="w-[0.1cqi] h-[8cqi] bg-slate-300"></div>

            <div className="flex flex-col items-center text-center">
               <div className="w-[4cqi] h-[4cqi] mb-[1cqi] text-[#0a192f]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
               </div>
               <span className="text-[1.2cqi] font-bold text-[#d4af37] tracking-widest mb-[0.5cqi]">PERCENTAGE</span>
               <span className="text-[2cqi] font-bold text-[#0a192f]">{data.percentage}</span>
            </div>

            <div className="w-[0.1cqi] h-[8cqi] bg-slate-300"></div>

            <div className="flex flex-col items-center text-center">
               <div className="w-[4cqi] h-[4cqi] mb-[1cqi] text-[#0a192f]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10l1 7H6l1-7z"/></svg>
               </div>
               <span className="text-[1.2cqi] font-bold text-[#d4af37] tracking-widest mb-[0.5cqi]">RANK</span>
               <span className="text-[2cqi] font-bold text-[#0a192f]">{data.rank}</span>
            </div>

            <div className="w-[0.1cqi] h-[8cqi] bg-slate-300"></div>

            <div className="flex flex-col items-center text-center">
               <div className="w-[4cqi] h-[4cqi] mb-[1cqi] text-[#0a192f]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
               </div>
               <span className="text-[1.2cqi] font-bold text-[#d4af37] tracking-widest mb-[0.5cqi]">DATE</span>
               <span className="text-[2cqi] font-bold text-[#0a192f]">{data.issueDate}</span>
            </div>
            
            <div className="w-[0.1cqi] h-[8cqi] bg-slate-300"></div>

            <div className="flex flex-col items-center text-center">
               <div className="w-[4cqi] h-[4cqi] mb-[1cqi] text-[#0a192f]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               </div>
               <span className="text-[1.2cqi] font-bold text-[#d4af37] tracking-widest mb-[0.5cqi]">CERTIFICATE ID</span>
               <span className="text-[1.5cqi] font-bold text-[#0a192f]">{data.certificateId}</span>
            </div>
         </div>

         {/* Bottom Footer Section */}
         <div className="absolute bottom-[3cqi] w-full flex justify-between items-end px-[8cqi] pb-[2cqi]">
            <div className="flex flex-col items-center flex-1">
               <span className="text-[2cqi] font-bold text-[#0a192f] mb-[0.5cqi]">{data.adminName}</span>
               <div className="w-[20cqi] h-[0.1cqi] bg-slate-300 mb-[0.5cqi]"></div>
               <span className="text-[1.5cqi] text-slate-500">Quiz Administrator</span>
            </div>

            <div className="flex flex-col items-center flex-1">
               <div className="p-[0.5cqi] bg-white border-[0.2cqi] border-slate-200 shadow-sm rounded-lg mb-[1cqi]">
                  <QRCodeSVG 
                    value={`${window.location.origin}/verify?id=${data.certificateId}`}
                    size={80}
                    style={{ width: '8cqi', height: '8cqi' }}
                  />
               </div>
               <span className="text-[1.2cqi] font-bold text-[#d4af37] tracking-widest uppercase">Scan to Verify</span>
            </div>

            <div className="flex flex-col items-center flex-1">
               <span className="text-[2cqi] font-bold text-[#0a192f] mb-[0.5cqi]">{data.organizationName}</span>
               <div className="w-[20cqi] h-[0.1cqi] bg-slate-300 mb-[0.5cqi]"></div>
               <span className="text-[1.5cqi] text-slate-500">Empowering Knowledge</span>
            </div>
         </div>
      </div>
    </div>
  );
};
