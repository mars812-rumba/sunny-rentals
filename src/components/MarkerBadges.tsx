import React from 'react';
import { MarkerType, MARKER_CONFIGS } from '@/types/crm';

interface MarkerBadgesProps {
  currentMarker: MarkerType | null;
  onMarkerChange: (marker: MarkerType | null) => void;
  className?: string;
}

const MarkerBadges: React.FC<MarkerBadgesProps> = ({
  currentMarker,
  onMarkerChange,
  className = ''
}) => {
  const handleBadgeClick = (markerType: MarkerType) => {
    // Если кликнули на активный маркер - сбрасываем (делаем серым)
    if (currentMarker === markerType) {
      onMarkerChange(null);
    } else {
      // Если кликнули на другой маркер - переключаемся на него
      onMarkerChange(markerType);
    }
  };

  const getBadgeStyle = (markerType: MarkerType) => {
    const config = MARKER_CONFIGS[markerType];
    const isActive = currentMarker === markerType;
    
    if (isActive) {
      return {
        backgroundColor: config.bgColor,
        color: config.color,
        borderColor: config.color,
      };
    } else {
      return {
        backgroundColor: '#f8fafc',
        color: '#6b7280',
        borderColor: '#e2e8f0',
      };
    }
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {(Object.keys(MARKER_CONFIGS) as MarkerType[]).map((markerType) => {
        const config = MARKER_CONFIGS[markerType];
        const isActive = currentMarker === markerType;
        
        return (
          <button
            key={markerType}
            onClick={() => handleBadgeClick(markerType)}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all duration-200 hover:scale-105 active:scale-95
              ${isActive ? 'shadow-sm' : 'hover:shadow-sm'}
            `}
            style={getBadgeStyle(markerType)}
            title={config.label}
          >
            <span className="text-[10px]">{config.emoji}</span>
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MarkerBadges;