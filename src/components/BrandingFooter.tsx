import React from 'react';

export function BrandingFooter({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center text-xs text-slate-400 ${className}`}>
      Powered by DevNexus &bull; Built by Nomi
    </div>
  );
}
