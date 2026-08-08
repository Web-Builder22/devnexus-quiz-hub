import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const CertificateRenderer = ({ data, template, scale = 1 }: any) => {
  if (!template) return null;

  const bgStyle = template.backgroundImage ? {
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
  
  const getPositionStyle = (field: any) => {
    if (!field || !field.enabled) return { display: 'none' };
    return {
      position: 'absolute' as 'absolute',
      left: `${(field.x / A4_WIDTH_MM) * 100}%`,
      top: `${(field.y / A4_HEIGHT_MM) * 100}%`,
      fontSize: `${(field.fontSize / A4_HEIGHT_MM) * 100}cqi`,
      color: field.color || '#000000',
      textAlign: field.align || 'left',
      transform: field.align === 'center' ? 'translateX(-50%)' : field.align === 'right' ? 'translateX(-100%)' : 'none',
      whiteSpace: 'nowrap' as 'nowrap'
    };
  };

  return (
    <div 
      className="relative w-full overflow-hidden" 
      style={{ 
        aspectRatio: '297/210',
        containerType: 'inline-size',
        ...bgStyle
      }}
    >
      {Object.entries(layout).map(([key, config]: [string, any]) => {
        if (!config.enabled) return null;
        
        let value = data[key];
        
        return (
          <div key={key} style={getPositionStyle(config)} className="font-sans font-bold">
            {value}
          </div>
        );
      })}
    </div>
  );
};
