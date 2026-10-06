/**
 * High-fidelity electrical node renderer for CAD Canvas
 * Supports PCC Poles (8m/9m), RSJ/Rail Poles, Steel Tubular, DP Structures, 4-Pole,
 * Transformers (DTR), Switchgear (AB Switch, HG Fuse, LA, LT Box), Consumer Houses,
 * Landmarks, and dynamic Custom User-Defined Symbols.
 */

import React from 'react';
import { ElectricalNode } from '../../types/electrical';

interface NodeRendererProps {
  node: ElectricalNode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent, node: ElectricalNode) => void;
  onMouseDown: (e: React.MouseEvent, node: ElectricalNode) => void;
}

export const NodeRenderer: React.FC<NodeRendererProps> = ({
  node,
  isSelected,
  onSelect,
  onMouseDown,
}) => {
  const isProposed = node.status === 'proposed';
  const primaryColor = isProposed ? '#dc2626' : '#1e293b';
  const secondaryColor = isProposed ? '#f87171' : '#64748b';

  return (
    <g
      transform={`translate(${node.x}, ${node.y}) rotate(${node.rotation || 0})`}
      className="cursor-pointer select-none"
      onClick={(e) => onSelect(e, node)}
      onMouseDown={(e) => onMouseDown(e, node)}
    >
      {/* Selection Halo */}
      {isSelected && (
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="4 3"
          className="animate-pulse"
        />
      )}

      {/* 1. 8m PCC Pole */}
      {node.type === 'pole_8m' && (
        <g>
          {isProposed ? (
            <g>
              <circle cx="0" cy="0" r="10" fill="#fff" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="5 3" />
              <circle cx="0" cy="0" r="6" fill="none" stroke="#dc2626" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="2.5" fill="#dc2626" />
            </g>
          ) : (
            <g>
              <circle cx="0" cy="0" r="9" fill="#fff" stroke="#1e293b" strokeWidth="2" />
              <circle cx="0" cy="0" r="2.5" fill="#1e293b" />
            </g>
          )}
        </g>
      )}

      {/* 2. 9m PCC Pole / Single Pole */}
      {(node.type === 'pole_9m' || node.type === 'pole_single') && (
        <g>
          {isProposed ? (
            <g>
              <circle cx="0" cy="0" r="11" fill="#fff" stroke="#dc2626" strokeWidth="2.8" />
              <circle cx="0" cy="0" r="3" fill="#dc2626" />
              <text x="0" y="3.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#dc2626">9</text>
            </g>
          ) : (
            <g>
              <circle cx="0" cy="0" r="10" fill="#fff" stroke="#1e293b" strokeWidth="2" />
              <line x1="-7" y1="0" x2="7" y2="0" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="0" y1="-7" x2="0" y2="7" stroke="#1e293b" strokeWidth="1.5" />
            </g>
          )}
        </g>
      )}

      {/* 3. RSJ / Rail Pole (I-Beam section) */}
      {node.type === 'pole_rsj' && (
        <g>
          <circle cx="0" cy="0" r="11" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          {/* I-beam representation */}
          <line x1="-6" y1="-6" x2="6" y2="-6" stroke={primaryColor} strokeWidth="2" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke={primaryColor} strokeWidth="2" />
          <line x1="-6" y1="6" x2="6" y2="6" stroke={primaryColor} strokeWidth="2" />
        </g>
      )}

      {/* 4. Steel Tubular Pole (STP) */}
      {node.type === 'pole_stp' && (
        <g>
          <circle cx="0" cy="0" r="11" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          <circle cx="0" cy="0" r="7" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="0" cy="0" r="3" fill={primaryColor} />
        </g>
      )}

      {/* 5. DP Structure (Double Pole Structure) */}
      {node.type === 'dp_structure' && (
        <g>
          <line x1="-12" y1="0" x2="12" y2="0" stroke={primaryColor} strokeWidth="3" />
          <circle cx="-12" cy="0" r="8" fill="#fff" stroke={primaryColor} strokeWidth="2.5" />
          <circle cx="-12" cy="0" r="2" fill={primaryColor} />
          <circle cx="12" cy="0" r="8" fill="#fff" stroke={primaryColor} strokeWidth="2.5" />
          <circle cx="12" cy="0" r="2" fill={primaryColor} />
        </g>
      )}

      {/* 6. 4-Pole Substation Structure */}
      {node.type === 'four_pole' && (
        <g>
          <rect x="-18" y="-18" width="36" height="36" fill="#f1f5f9" stroke={primaryColor} strokeWidth="2" rx="3" />
          <circle cx="-10" cy="-10" r="5" fill="#3b82f6" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="10" cy="-10" r="5" fill="#3b82f6" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="-10" cy="10" r="5" fill="#3b82f6" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="10" cy="10" r="5" fill="#3b82f6" stroke={primaryColor} strokeWidth="1.5" />
        </g>
      )}

      {/* 7. 25 kVA, 63 kVA, 100 kVA DTR (Distribution Transformer) */}
      {(node.type === 'dtr_25kva' || node.type === 'dtr_63kva' || node.type === 'dtr_100kva') && (
        <g>
          <ellipse cx="-10" cy="0" rx="9" ry="14" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
          <ellipse cx="10" cy="0" rx="9" ry="14" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
          <line x1="-10" y1="-14" x2="-10" y2="-20" stroke="#dc2626" strokeWidth="2" />
          <line x1="0" y1="-14" x2="0" y2="-20" stroke="#dc2626" strokeWidth="2" />
          <line x1="10" y1="-14" x2="10" y2="-20" stroke="#dc2626" strokeWidth="2" />
          <circle cx="-10" cy="-20" r="2" fill="#dc2626" />
          <circle cx="0" cy="-20" r="2" fill="#dc2626" />
          <circle cx="10" cy="-20" r="2" fill="#dc2626" />
          <text
            x="0"
            y="26"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#dc2626"
            className="tracking-tight"
          >
            {node.type === 'dtr_25kva' ? '25 KVA' : node.type === 'dtr_63kva' ? '63 KVA' : '100 KVA'}
          </text>
        </g>
      )}

      {/* 8. DTR Capacity Conversion */}
      {node.type === 'dtr_conversion' && (
        <g>
          <ellipse cx="-16" cy="0" rx="8" ry="13" fill="#fff" stroke="#1e293b" strokeWidth="2" />
          <ellipse cx="-4" cy="0" rx="8" ry="13" fill="#fff" stroke="#1e293b" strokeWidth="2" />
          <path d="M 6 0 L 16 0 M 12 -4 L 16 0 L 12 4" stroke="#dc2626" strokeWidth="2" />
          <ellipse cx="26" cy="0" rx="9" ry="14" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
          <ellipse cx="40" cy="0" rx="9" ry="14" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
          <text x="12" y="26" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#dc2626">
            63 TO 100 KVA
          </text>
        </g>
      )}

      {/* 9. Air Break (AB) Switch */}
      {node.type === 'ab_switch' && (
        <g>
          <circle cx="-12" cy="0" r="4" fill={primaryColor} />
          <circle cx="12" cy="0" r="4" fill={primaryColor} />
          <line x1="-12" y1="0" x2="8" y2="-12" stroke={primaryColor} strokeWidth="3" />
          <text x="0" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill={primaryColor}>
            AB SWITCH
          </text>
        </g>
      )}

      {/* 10. Horn Gap (HG) Fuse */}
      {node.type === 'hg_fuse' && (
        <g>
          <line x1="-10" y1="0" x2="-4" y2="0" stroke={primaryColor} strokeWidth="2" />
          <line x1="4" y1="0" x2="10" y2="0" stroke={primaryColor} strokeWidth="2" />
          {/* Horn Gap arcs */}
          <path d="M -4 0 Q -8 -8 -4 -12" fill="none" stroke={primaryColor} strokeWidth="2" />
          <path d="M 4 0 Q 8 -8 4 -12" fill="none" stroke={primaryColor} strokeWidth="2" />
          <text x="0" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill={primaryColor}>
            HG FUSE
          </text>
        </g>
      )}

      {/* 11. LT Distribution Box / Feeder Pillar */}
      {node.type === 'lt_distribution_box' && (
        <g>
          <rect x="-14" y="-12" width="28" height="24" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" rx="2" />
          <line x1="-10" y1="-4" x2="10" y2="-4" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="-10" y1="4" x2="10" y2="4" stroke="#0284c7" strokeWidth="1.5" />
          <text x="0" y="20" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#0284c7">
            LT BOX
          </text>
        </g>
      )}

      {/* 12. Lightning Arrester (LA) */}
      {node.type === 'lightning_arrester' && (
        <g>
          <polygon points="0,-16 -6,-6 2,-6 -4,6 4,6 -2,16 6,4 0,4 4,-4" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
          {/* Ground symbol */}
          <line x1="-6" y1="18" x2="6" y2="18" stroke="#1e293b" strokeWidth="2" />
          <line x1="-4" y1="21" x2="4" y2="21" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="-2" y1="24" x2="2" y2="24" stroke="#1e293b" strokeWidth="1" />
          <text x="0" y="-20" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b45309">
            LA SET
          </text>
        </g>
      )}

      {/* 13. Consumer House */}
      {node.type === 'consumer_house' && (
        <g transform="translate(-16, -14)">
          <rect x="0" y="10" width="32" height="20" fill="#15803d" stroke="#14532d" strokeWidth="1.5" rx="1" />
          <polygon points="16,0 -3,11 35,11" fill="#b91c1c" stroke="#991b1b" strokeWidth="1.5" />
          <rect x="12" y="17" width="8" height="13" fill="#fef08a" />
          <rect x="4" y="15" width="5" height="6" fill="#67e8f9" />
          <rect x="23" y="15" width="5" height="6" fill="#67e8f9" />
          
          <g transform="translate(40, 10)">
            {node.properties.consumerName && (
              <text x="0" y="0" fontSize="9" fontWeight="bold" fill="#0f172a">
                NAME: {node.properties.consumerName}
              </text>
            )}
            {node.properties.consumerPhone && (
              <text x="0" y="11" fontSize="8.5" fontWeight="600" fill="#475569">
                PH: {node.properties.consumerPhone}
              </text>
            )}
            {node.properties.consumerAddress && (
              <text x="0" y="21" fontSize="8" fill="#64748b">
                {node.properties.consumerAddress}
              </text>
            )}
          </g>
        </g>
      )}

      {/* 14. Commercial Facility */}
      {node.type === 'commercial_facility' && (
        <g transform="translate(-20, -18)">
          <rect x="0" y="8" width="40" height="26" fill="#fff" stroke="#b91c1c" strokeWidth="2" rx="2" />
          <polygon points="0,8 40,8 36,0 4,0" fill="#ef4444" />
          <text x="20" y="22" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#b91c1c">
            COMMERCIAL
          </text>
          <g transform="translate(0, 44)">
            {node.properties.consumerName && (
              <text x="20" y="0" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">
                {node.properties.consumerName}
              </text>
            )}
          </g>
        </g>
      )}

      {/* 15. Religious Landmark (Temple / Mosque / Church) */}
      {node.type === 'landmark_religious' && (
        <g transform="translate(-16, -16)">
          <rect x="2" y="14" width="28" height="18" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
          {/* Dome / Spire */}
          <path d="M 2 14 Q 16 0 30 14 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <line x1="16" y1="0" x2="16" y2="-8" stroke="#b45309" strokeWidth="2" />
          <polygon points="16,-8 24,-5 16,-2" fill="#ef4444" />
          <text x="16" y="42" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b45309">
            TEMPLE / SHRINE
          </text>
        </g>
      )}

      {/* 16. School / Public Institution */}
      {node.type === 'landmark_school' && (
        <g transform="translate(-20, -16)">
          <rect x="0" y="10" width="40" height="22" fill="#f1f5f9" stroke="#475569" strokeWidth="1.5" rx="1" />
          <polygon points="0,10 40,10 20,0" fill="#3b82f6" />
          <text x="20" y="23" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#1e293b">
            SCHOOL
          </text>
        </g>
      )}

      {/* 17. DYNAMIC CUSTOM TOOL SYMBOL */}
      {node.type === 'custom_symbol' && (
        <g>
          {node.properties.customShape === 'square' ? (
            <rect
              x="-12"
              y="-12"
              width="24"
              height="24"
              fill="#fff"
              stroke={node.properties.customColor || '#d97706'}
              strokeWidth="2.5"
              rx="2"
            />
          ) : node.properties.customShape === 'hexagon' ? (
            <polygon
              points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7"
              fill="#fff"
              stroke={node.properties.customColor || '#d97706'}
              strokeWidth="2.5"
            />
          ) : node.properties.customShape === 'circle' ? (
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#fff"
              stroke={node.properties.customColor || '#d97706'}
              strokeWidth="2.5"
            />
          ) : (
            // Default Diamond shape
            <polygon
              points="0,-14 14,0 0,14 -14,0"
              fill="#fff"
              stroke={node.properties.customColor || '#d97706'}
              strokeWidth="2.5"
            />
          )}

          <text
            x="0"
            y="3"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={node.properties.customColor || '#d97706'}
          >
            {node.label || node.properties.customName?.substr(0, 3).toUpperCase() || 'SYM'}
          </text>

          {node.properties.customName && (
            <text
              x="0"
              y="24"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="bold"
              fill={node.properties.customColor || '#d97706'}
            >
              {node.properties.customName}
            </text>
          )}
        </g>
      )}

      {/* Pole Label / Number / S/C indicator */}
      {node.properties.poleNumber && (
        <text
          x="0"
          y="-14"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fill={secondaryColor}
          className="pointer-events-none"
        >
          {node.properties.poleNumber}
        </text>
      )}

      {/* Service Connection Badge (e.g. S/C-6, S/C-4) */}
      {node.properties.serviceConnectionCount !== undefined && (
        <g transform="translate(0, -22)">
          <rect x="-14" y="-8" width="28" height="13" fill="#f8fafc" stroke="#64748b" strokeWidth="1" rx="2" />
          <text x="0" y="2" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1e293b">
            S/C-{node.properties.serviceConnectionCount}
          </text>
        </g>
      )}

      {/* Direct Label */}
      {node.label && node.type !== 'custom_symbol' && (
        <text
          x="0"
          y="28"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="bold"
          fill={primaryColor}
          className="pointer-events-none tracking-tight"
        >
          {node.label}
        </text>
      )}
    </g>
  );
};
