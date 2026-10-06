/**
 * River and Road Crossing Feature Renderer
 */

import React from 'react';
import { CrossingFeature } from '../../types/electrical';

interface CrossingRendererProps {
  crossing: CrossingFeature;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent, crossing: CrossingFeature) => void;
}

export const CrossingRenderer: React.FC<CrossingRendererProps> = ({
  crossing,
  isSelected,
  onSelect,
}) => {
  const isRiver = crossing.type === 'river';

  return (
    <g
      transform={`translate(${crossing.x}, ${crossing.y}) rotate(${crossing.rotation || 0})`}
      className="cursor-pointer select-none"
      onClick={(e) => onSelect(e, crossing)}
    >
      {isSelected && (
        <rect
          x={-crossing.width / 2 - 4}
          y={-crossing.height / 2 - 4}
          width={crossing.width + 8}
          height={crossing.height + 8}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      )}

      {isRiver ? (
        // River Crossing Ribbon
        <g>
          {/* Water channel fill */}
          <rect
            x={-crossing.width / 2}
            y={-crossing.height / 2}
            width={crossing.width}
            height={crossing.height}
            fill="#e0f2fe"
            fillOpacity="0.45"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />

          {/* Riparian bank wavy boundary lines */}
          <path
            d={`M ${-crossing.width / 2} ${-crossing.height / 2} 
                Q ${-crossing.width / 2 + 10} 0, ${-crossing.width / 2} ${crossing.height / 2}`}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
          />
          <path
            d={`M ${crossing.width / 2} ${-crossing.height / 2} 
                Q ${crossing.width / 2 - 10} 0, ${crossing.width / 2} ${crossing.height / 2}`}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
          />

          {/* River Name Tag */}
          <g transform="translate(0, 0) rotate(-90)">
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#0369a1"
              letterSpacing="2"
            >
              {crossing.name || 'RIVER CROSSING'}
            </text>
          </g>

          {/* Span labels if specified */}
          {crossing.spans && crossing.spans.length > 0 && (
            <g transform="translate(0, -crossing.height / 2 + 20)">
              {crossing.spans.map((span, i) => (
                <text
                  key={i}
                  x={0}
                  y={i * 16}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="bold"
                  fill="#0369a1"
                >
                  {span}
                </text>
              ))}
            </g>
          )}
        </g>
      ) : (
        // Road Crossing Ribbon
        <g>
          {/* Road Surface */}
          <rect
            x={-crossing.width / 2}
            y={-crossing.height / 2}
            width={crossing.width}
            height={crossing.height}
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          {/* Dashed Center Median Line */}
          <line
            x1="0"
            y1={-crossing.height / 2}
            x2="0"
            y2={crossing.height / 2}
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeDasharray="10 8"
          />
          {/* Road Name Label */}
          <g transform="translate(0, 0) rotate(-90)">
            <rect
              x="-60"
              y="-10"
              width="120"
              height="20"
              fill="#ffffff"
              fillOpacity="0.8"
              rx="3"
            />
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#334155"
              letterSpacing="1"
            >
              {crossing.name || 'ROAD'}
            </text>
          </g>
        </g>
      )}
    </g>
  );
};
