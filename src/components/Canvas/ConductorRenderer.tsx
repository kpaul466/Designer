/**
 * High-fidelity Conductor & Line Renderer for CAD Canvas
 * Supports ACSR 3-wire, ACSR 4-wire (with 4-cross tick marks), LT AB Cable, Phase Conversion, Cradle Guard, and Span Dimensions
 */

import React from 'react';
import { ConductorEdge, ElectricalNode } from '../../types/electrical';
import { angleBetween, midpoint, radToDeg } from '../../utils/geometry';

interface ConductorRendererProps {
  edge: ConductorEdge;
  fromNode: ElectricalNode;
  toNode: ElectricalNode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent, edge: ConductorEdge) => void;
}

export const ConductorRenderer: React.FC<ConductorRendererProps> = ({
  edge,
  fromNode,
  toNode,
  isSelected,
  onSelect,
}) => {
  const isProposed = edge.status === 'proposed';
  const color =
    edge.type === 'lt_ab_cable'
      ? '#2563eb'
      : isProposed
      ? '#dc2626'
      : '#1e293b';

  const strokeWidth = edge.type === 'ht_oh_line' ? 2.8 : 2.2;
  const isDashed = isProposed || edge.type === 'lt_ab_cable';

  const mid = midpoint(fromNode, toNode);
  const angle = angleBetween(fromNode, toNode);
  const angleDeg = radToDeg(angle);

  // Normalize rotation so text is never upside down (between -90 and 90 deg)
  let textAngle = angleDeg;
  if (textAngle > 90) textAngle -= 180;
  if (textAngle < -90) textAngle += 180;

  // Offset vector perpendicular to the line for span text
  const perpX = -Math.sin(angle) * 14;
  const perpY = Math.cos(angle) * 14;

  const spanText = edge.manualSpanOverride || `${edge.spanMeters || 40} M`;

  return (
    <g className="cursor-pointer select-none" onClick={(e) => onSelect(e, edge)}>
      {/* Invisible wider hit area for easy selection */}
      <line
        x1={fromNode.x}
        y1={fromNode.y}
        x2={toNode.x}
        y2={toNode.y}
        stroke="transparent"
        strokeWidth="16"
      />

      {/* Selection Glow */}
      {isSelected && (
        <line
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke="#3b82f6"
          strokeWidth="6"
          strokeOpacity="0.4"
        />
      )}

      {/* Main Conductor Line */}
      <line
        x1={fromNode.x}
        y1={fromNode.y}
        x2={toNode.x}
        y2={toNode.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={isDashed ? (edge.type === 'lt_ab_cable' ? '6 4' : '8 4') : undefined}
      />

      {/* Conductor Cross Tick Marks at the Midpoint */}
      {/* 4-wire: 4 cross ticks */}
      {edge.type === 'acsr_4wire' && (
        <g transform={`translate(${mid.x}, ${mid.y}) rotate(${angleDeg})`}>
          {[-9, -3, 3, 9].map((offset, i) => (
            <line
              key={i}
              x1={offset}
              y1="-7"
              x2={offset}
              y2="7"
              stroke={color}
              strokeWidth="2"
            />
          ))}
        </g>
      )}

      {/* 3-wire: 3 cross ticks */}
      {edge.type === 'acsr_3wire' && (
        <g transform={`translate(${mid.x}, ${mid.y}) rotate(${angleDeg})`}>
          {[-6, 0, 6].map((offset, i) => (
            <line
              key={i}
              x1={offset}
              y1="-7"
              x2={offset}
              y2="7"
              stroke={color}
              strokeWidth="2"
            />
          ))}
        </g>
      )}

      {/* 2-wire: 2 cross ticks */}
      {edge.type === 'acsr_2wire' && (
        <g transform={`translate(${mid.x}, ${mid.y}) rotate(${angleDeg})`}>
          {[-4, 4].map((offset, i) => (
            <line
              key={i}
              x1={offset}
              y1="-6"
              x2={offset}
              y2="6"
              stroke={color}
              strokeWidth="2"
            />
          ))}
        </g>
      )}

      {/* Cradle Guard Brackets [ ] along the span */}
      {edge.type === 'cradle_guard' && (
        <g transform={`translate(${mid.x}, ${mid.y}) rotate(${angleDeg})`}>
          <path d="M -16 -8 L -12 -8 L -12 8 L -16 8" fill="none" stroke="#059669" strokeWidth="2" />
          <path d="M 16 -8 L 12 -8 L 12 8 L 16 8" fill="none" stroke="#059669" strokeWidth="2" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#059669" strokeWidth="1.5" />
        </g>
      )}

      {/* Span Dimension Label (e.g. 45 M, 40 M, 35 M) */}
      <g transform={`translate(${mid.x + perpX}, ${mid.y + perpY})`}>
        <rect
          x="-16"
          y="-8"
          width="32"
          height="14"
          fill="#ffffff"
          fillOpacity="0.88"
          rx="2"
        />
        <text
          x="0"
          y="2.5"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="bold"
          fill={color}
          className="font-mono tracking-tight"
        >
          {spanText}
        </text>
      </g>

      {/* Additional Line Label (e.g. S/C-6 or Special Feeder Name) */}
      {edge.label && (
        <g transform={`translate(${mid.x - perpX}, ${mid.y - perpY})`}>
          <rect
            x="-20"
            y="-7"
            width="40"
            height="13"
            fill="#ffffff"
            fillOpacity="0.85"
            rx="2"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={color}
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
};
