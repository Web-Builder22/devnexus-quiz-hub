const fs = require('fs');
let content = fs.readFileSync('src/components/CertificateRenderer.tsx', 'utf8');

// Replace clipPath with SVG for left corner
const leftCorner = `<div className="absolute top-0 left-0 bg-[#0a192f]" style={{ width: '40cqi', height: '100%', clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)', borderRight: '1cqi solid #d4af37' }}>`;
const leftCornerSvg = `<svg className="absolute top-0 left-0 w-[40cqi] h-full" viewBox="0 0 400 1000" preserveAspectRatio="none">
        <polygon points="0,0 400,0 120,1000 0,1000" fill="#0a192f" stroke="#d4af37" strokeWidth="10" />
      </svg>
      <div className="absolute top-0 left-0" style={{ width: '40cqi', height: '100%' }}>`;

content = content.replace(leftCorner, leftCornerSvg);

// Replace clipPath with SVG for right corner
const rightCorner = `<div className="absolute bottom-0 right-0 bg-[#0a192f]" style={{ width: '25cqi', height: '30cqi', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', borderLeft: '1cqi solid #d4af37' }}></div>`;
const rightCornerSvg = `<svg className="absolute bottom-0 right-0 w-[25cqi] h-[30cqi]" viewBox="0 0 250 300" preserveAspectRatio="none">
        <polygon points="250,0 250,300 0,300" fill="#0a192f" stroke="#d4af37" strokeWidth="10" />
      </svg>`;
content = content.replace(rightCorner, rightCornerSvg);

// Replace gold ribbon bottom clipPath
const ribbon = `<div className="w-[6cqi] h-[2cqi] bg-[#f8f9fa] absolute bottom-0" style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0, 100% 100%, 0 100%)' }}></div>`;
const ribbonSvg = `<svg className="absolute bottom-0 w-[6cqi] h-[2cqi]" viewBox="0 0 60 20" preserveAspectRatio="none">
          <polygon points="0,20 0,0 30,20 60,0 60,20" fill="#f8f9fa" />
         </svg>`;
content = content.replace(ribbon, ribbonSvg);

fs.writeFileSync('src/components/CertificateRenderer.tsx', content);
