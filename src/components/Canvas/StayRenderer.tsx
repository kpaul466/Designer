/**
 * Stay Set Renderer (HT Stay & LT Stay with anchor arrows and counts)
 */

import React from 'react';
import { ElectricalNode, StayItem } from '../../types/electrical';
import { degToRad } from '../../utils/geometry';

interface StayRendererProps {
  stay: StayItem;
  pole: ElectricalNode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent, stay: StayItem) => void;
}

export const StayRenderer: React.FC<StayRendererProps> = ({
  stay,
  pole,
  isSelected,
  onSelect,
}) => {
  const isHt = stay.type === 'ht_stay';
  const color = isHt ? '#dc2626' : '#2563eb';
  const length = stay.length || 30;

  const rad = degToRad(stay.angle);
  const endX = pole.x + Math.cos(rad) * length;
  const endY = pole.y + Math.sin(rad) * length;

  return (
    <g className="cursor-pointer select-none" onClick={(e) => onSelect(e, stay)}>
      {isSelected && (
        <line
          x1={pole.x}
          y1={pole.y}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth="6"
          strokeOpacity="0.4"
        />
      )}

      {/* Stay Guy Wire Line */}
      <line
        x1={pole.x}
        y1={pole.y}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth="2.5"
      />

      {/* Directional Arrow at Anchor Point */}
      <g transform={`translate(${endX}, ${endY}) rotate(${stay.angle})`}>
        <polygon points="0,0 -8,-5 -8,5" fill={color} />
        {/* Double arrow for multiple stays */}
        {stay.count > 1 && (
          <polygon points="-6,0 -14,-5 -14,5" fill={color} />
        )}
      </g>

      {/* Stay Count Badge */}
      {stay.count > 1 && (
        <g transform={`translate(${(pole.x + endX) / 2}, ${(pole.y + endY) / 2 - 10})`}>
          <rect x="-10" y="-6" width="20" height="12" fill="#ffffff" stroke={color} strokeWidth="1" rx="2" />
          <text x="0" y="3" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill={color}>
            {stay.count}x
          </text>
        </g>
      )}
    </g>
  );
};
