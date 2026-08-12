import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Hexagon } from 'lucide-react';

export const CertificateRenderer = ({ data, template, scale = 1 }: any) => {
  if (!template) return null;
  const hasBg = !!template.backgroundImage;
  const bgStyle = hasBg ? {
    backgroundImage: `url(${template.backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {
    backgroundColor: '#ffffff'
  };

  const layout = template.layoutConfig || {};
  
  // A4 dimensions in mm: 297 x 210
  const A4_WIDTH_MM = 297;
  const A4_HEIGHT_MM = 210;
  
  const getPositionStyle = (field: any, fieldKey: string) => {
    if (!field || !field.enabled) return { display: 'none' };

    return {
      position: 'absolute' as 'absolute',
      left: `${(field.x / A4_WIDTH_MM) * 100}%`,
      top: `${(field.y / A4_HEIGHT_MM) * 100}%`,
      fontSize: `${field.fontSize * 0.1187}cqi`,
      color: field.color || '#000000',
      textAlign: field.align || 'left',
      transform: `translate(${field.align === 'center' ? '-50%' : field.align === 'right' ? '-100%' : '0'}, -100%)`,
      maxWidth: field.align === 'center' ? '90%' : '80%',
      wordBreak: 'break-word' as 'break-word',
      lineHeight: 1.2
    };
  };

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      studentName: 'Name',
      studentEmail: 'Email',
      quizTitle: 'Quiz Title',
      score: 'Score',
      percentage: 'Percentage',
      rank: 'Rank',
      issueDate: 'Date',
      certificateId: 'Certificate ID'
    };
    return labels[key] || key;
  };

  return (
    <div 
      className="relative w-full overflow-hidden flex items-center justify-center" 
      style={{ 
        aspectRatio: '297/210',
        containerType: 'inline-size',
        ...bgStyle
      }}
    >
      {/* HTML Fallback Design (Only shown if no background image is uploaded) */}
      {!hasBg && (
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
            <img src="/devnexus-logo.jpg" alt="DEVNEXUS Logo" className="h-[12cqi] w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
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
      )}

      {Object.entries(layout).map(([key, config]: [string, any]) => {
        if (!config.enabled) return null;
        
        let value = data ? data[key] : '';
        
        return (
          <div key={key} style={getPositionStyle(config, key)} className="font-serif flex items-baseline gap-[1cqi]">
            <label className="text-[#64748b] font-medium text-[0.8em] whitespace-nowrap uppercase tracking-wider">{getLabel(key)}:</label>
            <span className={key === 'studentName' || key === 'quizTitle' ? 'font-bold text-[#0f172a]' : 'font-medium text-[#334155]'}>
              {value || ''}
            </span>
          </div>
        );
      })}

    </div>
  );
};
