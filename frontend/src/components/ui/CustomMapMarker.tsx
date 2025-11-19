import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';

interface CustomMapMarkerProps {
  position: [number, number];
  children: React.ReactNode;
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'purple';
  pulse?: boolean;
}

// Create custom colored markers
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: ${color === 'red' || color === 'purple' ? 'pulse 2s infinite' : 'none'};
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const colorMap = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
};

export const CustomMapMarker: React.FC<CustomMapMarkerProps> = ({
  position,
  children,
  color = 'green',
  pulse = false,
}) => {
  const icon = createCustomIcon(colorMap[color]);
  
  return (
    <Marker position={position} icon={icon}>
      <Popup className="custom-popup" maxWidth={300} minWidth={200}>
        {children}
      </Popup>
    </Marker>
  );
};

