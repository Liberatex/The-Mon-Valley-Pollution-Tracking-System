import React from 'react';

interface LogoProps {
  onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ onClick }) => {
  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      aria-label={onClick ? 'Go to home page' : undefined}
    >
      <div style={{ 
        width: '48px', 
        height: '48px', 
        background: 'white', 
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36">
          {/* Mountains */}
          <g>
            <path d="M10 25 L15 15 L20 25 Z" fill="#16A085" stroke="none"/>
            <path d="M16 25 L25 10 L30 25 Z" fill="none" stroke="#5D6D7E" strokeWidth="1.5"/>
          </g>
          {/* Air particles */}
          <circle cx="32" cy="12" r="2" fill="#16A085"/>
          <circle cx="36" cy="9" r="1.5" fill="#5D6D7E" opacity="0.7"/>
          <circle cx="39" cy="11" r="1" fill="#16A085" opacity="0.8"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'white', lineHeight: '1.2' }}>Mon Valley</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.2' }}>Pollution Tracking</div>
      </div>
    </div>
  );
};

export default Logo;

