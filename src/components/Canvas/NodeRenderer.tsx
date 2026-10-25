/**
 * High-fidelity electrical node renderer for CAD Canvas
 * Professional REC / CEA / WBSEDCL Standard CAD Symbols:
 * - DTR (Distribution Transformer): Authentic dual-winding coils with core, HT/LT bushings, cooling fins, and kVA rating
 * - DTR Conversion: Clear capacity enhancement diagram (63kVA -> 100kVA)
 * - 8m & 9m PCC Poles: Clear proposed vs existing distinctions, cross-arms, and concentric rings
 * - RSJ / Rail Pole: Authentic I-Beam girder profile cross section
 * - STP Pole: Telescopic 3-stage swaged concentric tubular sections
 * - DP Structure: H-frame double pole with channel beams, diagonal X-bracings, and insulator mounts
 * - 4-Pole Structure: Quad pole substation mounting plinth with cross-members
 * - Switchgear & Civil Features
 */

import React from 'react';
import { ElectricalNode } from '../../types/electrical';

/** Resolve the displayed DTR rating: explicit capacity attribute wins over the tool type. */
function getNodeDtrRating(node: ElectricalNode): number | null {
  const capacity = node.properties.capacityKva;
  if (capacity) return capacity;
  if (node.type === 'dtr_25kva') return 25;
  if (node.type === 'dtr_63kva') return 63;
  if (node.type === 'dtr_100kva') return 100;
  return null;
}

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
  const secondaryColor = isProposed ? '#ef4444' : '#64748b';
  const fillColor = isProposed ? '#fef2f2' : '#f8fafc';

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
          r="28"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* ---------------- 1. 8M PCC POLE ---------------- */}
      {node.type === 'pole_8m' && (
        <g>
          {isProposed ? (
            <g>
              {/* Proposed 8m Pole: Red dashed outer survey ring + solid inner core + cross-arm */}
              <circle cx="0" cy="0" r="11" fill="#fff" stroke="#dc2626" strokeWidth="2.2" strokeDasharray="4 2.5" />
              <circle cx="0" cy="0" r="6" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="2.5" fill="#dc2626" />
              {/* Cross-arm guide */}
              <line x1="-12" y1="0" x2="-6" y2="0" stroke="#dc2626" strokeWidth="1.5" />
              <line x1="6" y1="0" x2="12" y2="0" stroke="#dc2626" strokeWidth="1.5" />
            </g>
          ) : (
            <g>
              {/* Existing 8m Pole: Solid charcoal circle with survey cross-hairs (+) */}
              <circle cx="0" cy="0" r="10" fill="#fff" stroke="#1e293b" strokeWidth="2" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#1e293b" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="2.5" fill="#1e293b" />
            </g>
          )}
        </g>
      )}

      {/* ---------------- 2. 9M PCC POLE / HEAVY POLE ---------------- */}
      {(node.type === 'pole_9m' || node.type === 'pole_single') && (
        <g>
          {isProposed ? (
            <g>
              {/* Proposed 9m Pole: Double solid ring with clear "9" designation and V-cross arm */}
              <circle cx="0" cy="0" r="13" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="9" fill="#fff" stroke="#dc2626" strokeWidth="1.5" />
              <text x="0" y="3.2" textAnchor="middle" fontSize="9" fontWeight="900" fill="#dc2626" fontFamily="sans-serif">
                9
              </text>
              {/* 11kV V-Cross Arm pin markers */}
              <line x1="-16" y1="-5" x2="0" y2="0" stroke="#dc2626" strokeWidth="1.5" />
              <line x1="16" y1="-5" x2="0" y2="0" stroke="#dc2626" strokeWidth="1.5" />
              <circle cx="-16" cy="-5" r="1.8" fill="#dc2626" />
              <circle cx="16" cy="-5" r="1.8" fill="#dc2626" />
            </g>
          ) : (
            <g>
              {/* Existing 9m Pole */}
              <circle cx="0" cy="0" r="12" fill="#fff" stroke="#1e293b" strokeWidth="2.2" />
              <circle cx="0" cy="0" r="8" fill="#f1f5f9" stroke="#1e293b" strokeWidth="1.2" />
              <text x="0" y="3" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#1e293b" fontFamily="sans-serif">
                9
              </text>
              <line x1="-14" y1="0" x2="-8" y2="0" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="8" y1="0" x2="14" y2="0" stroke="#1e293b" strokeWidth="1.5" />
            </g>
          )}
        </g>
      )}

      {/* ---------------- 3. RSJ / RAIL POLE (I-BEAM) ---------------- */}
      {node.type === 'pole_rsj' && (
        <g>
          {/* Concrete Footing Base Circle */}
          <circle cx="0" cy="0" r="13" fill="#fff" stroke={primaryColor} strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Authentic Steel I-Beam Girder Profile */}
          {/* Top Flange */}
          <rect x="-8" y="-9" width="16" height="3" fill={primaryColor} rx="0.5" />
          {/* Central Web */}
          <rect x="-2" y="-6" width="4" height="12" fill={primaryColor} />
          {/* Bottom Flange */}
          <rect x="-8" y="6" width="16" height="3" fill={primaryColor} rx="0.5" />
          {/* Center alignment pin */}
          <circle cx="0" cy="0" r="1.5" fill="#fff" />
        </g>
      )}

      {/* ---------------- 4. STEEL TUBULAR POLE (STP) ---------------- */}
      {node.type === 'pole_stp' && (
        <g>
          {/* 3 Concentric Telescopic Swaged Sections (Bottom, Middle, Top) */}
          <circle cx="0" cy="0" r="13" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          <circle cx="0" cy="0" r="9" fill={fillColor} stroke={primaryColor} strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="0" cy="0" r="5" fill="#fff" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2" fill={primaryColor} />
          {/* Base plate bolts */}
          <circle cx="-10" cy="0" r="1" fill={primaryColor} />
          <circle cx="10" cy="0" r="1" fill={primaryColor} />
          <circle cx="0" cy="-10" r="1" fill={primaryColor} />
          <circle cx="0" cy="10" r="1" fill={primaryColor} />
        </g>
      )}

      {/* ---------------- 5. DP STRUCTURE (DOUBLE POLE / H-FRAME) ---------------- */}
      {node.type === 'dp_structure' && (
        <g>
          {/* Base Channel Iron Ties & Cross-arm */}
          <line x1="-16" y1="-8" x2="16" y2="-8" stroke={primaryColor} strokeWidth="3.5" strokeLinecap="square" />
          <line x1="-16" y1="8" x2="16" y2="8" stroke={primaryColor} strokeWidth="3" strokeLinecap="square" />
          {/* Diagonal Cross-Bracings (X-ties) */}
          <line x1="-14" y1="-8" x2="14" y2="8" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="-14" y1="8" x2="14" y2="-8" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="3 2" />

          {/* Left Pole Column */}
          <circle cx="-14" cy="0" r="9" fill="#fff" stroke={primaryColor} strokeWidth="2.5" />
          <circle cx="-14" cy="0" r="3" fill={primaryColor} />

          {/* Right Pole Column */}
          <circle cx="14" cy="0" r="9" fill="#fff" stroke={primaryColor} strokeWidth="2.5" />
          <circle cx="14" cy="0" r="3" fill={primaryColor} />

          {/* 3 Phase Insulator Mounting Pins on Top Channel */}
          <circle cx="-14" cy="-11" r="2" fill={primaryColor} />
          <circle cx="0" cy="-11" r="2" fill={primaryColor} />
          <circle cx="14" cy="-11" r="2" fill={primaryColor} />

          <text x="0" y="20" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill={primaryColor}>
            DP
          </text>
        </g>
      )}

      {/* ---------------- 6. 4-POLE SUBSTATION STRUCTURE ---------------- */}
      {node.type === 'four_pole' && (
        <g>
          {/* Plinth Mount Foundation Boundary */}
          <rect x="-22" y="-22" width="44" height="44" fill={fillColor} stroke={primaryColor} strokeWidth="2" rx="3" />
          {/* Steel Cross-channel Frame */}
          <rect x="-18" y="-18" width="36" height="36" fill="none" stroke={secondaryColor} strokeWidth="1.5" />
          {/* Diagonal X-bracing */}
          <line x1="-18" y1="-18" x2="18" y2="18" stroke={secondaryColor} strokeWidth="1" strokeDasharray="4 3" />
          <line x1="-18" y1="18" x2="18" y2="-18" stroke={secondaryColor} strokeWidth="1" strokeDasharray="4 3" />

          {/* 4 Corner Heavy Poles */}
          <circle cx="-14" cy="-14" r="6" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          <circle cx="-14" cy="-14" r="2" fill={primaryColor} />

          <circle cx="14" cy="-14" r="6" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          <circle cx="14" cy="-14" r="2" fill={primaryColor} />

          <circle cx="-14" cy="14" r="6" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          <circle cx="-14" cy="14" r="2" fill={primaryColor} />

          <circle cx="14" cy="14" r="6" fill="#fff" stroke={primaryColor} strokeWidth="2" />
          <circle cx="14" cy="14" r="2" fill={primaryColor} />

          {/* Transformer Plinth Center Graphic */}
          <rect x="-7" y="-7" width="14" height="14" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" rx="1" />
          <text x="0" y="3" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#dc2626">4P</text>
          {node.properties.capacityKva && (
            <text x="0" y="34" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#dc2626">
              {node.properties.capacityKva} kVA
            </text>
          )}
        </g>
      )}

      {/* ---------------- 7. DISTRIBUTION TRANSFORMERS (DTR: 25kVA, 63kVA, 100kVA) ---------------- */}
      {(node.type === 'dtr_25kva' || node.type === 'dtr_63kva' || node.type === 'dtr_100kva') && (
        <g>
          {/* Transformer Plinth Base / Foundation */}
          <rect x="-24" y="-18" width="48" height="36" fill={fillColor} stroke={primaryColor} strokeWidth="1.5" rx="4" />

          {/* Cooling Fins (Left & Right Radiator banks) */}
          <line x1="-24" y1="-12" x2="-27" y2="-12" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="-24" y1="-6" x2="-27" y2="-6" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="-24" y1="0" x2="-27" y2="0" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="-24" y1="6" x2="-27" y2="6" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="-24" y1="12" x2="-27" y2="12" stroke={primaryColor} strokeWidth="1.5" />

          <line x1="24" y1="-12" x2="27" y2="-12" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="24" y1="-6" x2="27" y2="-6" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="24" y1="0" x2="27" y2="0" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="24" y1="6" x2="27" y2="6" stroke={primaryColor} strokeWidth="1.5" />
          <line x1="24" y1="12" x2="27" y2="12" stroke={primaryColor} strokeWidth="1.5" />

          {/* Top HT 11kV Bushings (3 Phase Bushings: R, Y, B) */}
          <line x1="-12" y1="-18" x2="-12" y2="-24" stroke={primaryColor} strokeWidth="2" />
          <circle cx="-12" cy="-24" r="2" fill={primaryColor} />

          <line x1="0" y1="-18" x2="0" y2="-25" stroke={primaryColor} strokeWidth="2" />
          <circle cx="0" cy="-25" r="2" fill={primaryColor} />

          <line x1="12" y1="-18" x2="12" y2="-24" stroke={primaryColor} strokeWidth="2" />
          <circle cx="12" cy="-24" r="2" fill={primaryColor} />

          {/* Interlocking Twin Transformer Winding Coils (Standard IEEE / IS Electrical Symbol) */}
          {/* Primary High-Voltage Winding */}
          <circle cx="-7" cy="0" r="11" fill="none" stroke={primaryColor} strokeWidth="2.5" />
          {/* Secondary Low-Voltage Winding */}
          <circle cx="7" cy="0" r="11" fill="none" stroke={primaryColor} strokeWidth="2.5" />

          {/* Delta-Star (Δ-Y) Connection indicator inside coils */}
          <text x="-7" y="3" textAnchor="middle" fontSize="8" fontWeight="bold" fill={primaryColor}>
            Δ
          </text>
          <text x="7" y="3" textAnchor="middle" fontSize="8" fontWeight="bold" fill={primaryColor}>
            Y
          </text>

          {/* Bottom LT Bushings (4 Terminals: R, Y, B, N) */}
          <line x1="-12" y1="18" x2="-12" y2="22" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="-12" cy="22" r="1.5" fill={primaryColor} />
          <line x1="-4" y1="18" x2="-4" y2="22" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="-4" cy="22" r="1.5" fill={primaryColor} />
          <line x1="4" y1="18" x2="4" y2="22" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="4" cy="22" r="1.5" fill={primaryColor} />
          <line x1="12" y1="18" x2="12" y2="22" stroke={primaryColor} strokeWidth="1.5" />
          <circle cx="12" cy="22" r="1.5" fill={primaryColor} />

          {/* Rating Badge below */}
          <g transform="translate(0, 31)">
            <rect
              x="-24"
              y="-7"
              width="48"
              height="14"
              fill={isProposed ? '#dc2626' : '#1e293b'}
              rx="2.5"
            />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="900"
              fill="#ffffff"
              fontFamily="sans-serif"
              letterSpacing="0.3px"
            >
              {getNodeDtrRating(node) ?? 25} kVA
            </text>
          </g>
        </g>
      )}

      {/* ---------------- 8. DTR CAPACITY CONVERSION (63 TO 100 kVA) ---------------- */}
      {node.type === 'dtr_conversion' && (
        <g>
          {/* Left: Existing 63kVA DTR */}
          <g transform="translate(-24, 0)">
            <rect x="-14" y="-14" width="28" height="28" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" rx="3" />
            <circle cx="-4" cy="0" r="7" fill="none" stroke="#475569" strokeWidth="1.8" />
            <circle cx="4" cy="0" r="7" fill="none" stroke="#475569" strokeWidth="1.8" />
            <text x="0" y="21" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#475569">
              63kVA
            </text>
          </g>

          {/* Central Upgrade Arrow */}
          <g transform="translate(0, 0)">
            <path
              d="M -7 0 L 7 0 M 3 -4 L 7 0 L 3 4"
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="0" y="-8" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#dc2626">
              UPGRADE
            </text>
          </g>

          {/* Right: Proposed 100kVA DTR */}
          <g transform="translate(24, 0)">
            <rect x="-16" y="-16" width="32" height="32" fill="#fee2e2" stroke="#dc2626" strokeWidth="2" rx="3" />
            <circle cx="-5" cy="0" r="8" fill="none" stroke="#dc2626" strokeWidth="2.2" />
            <circle cx="5" cy="0" r="8" fill="none" stroke="#dc2626" strokeWidth="2.2" />
            <text x="0" y="23" textAnchor="middle" fontSize="8" fontWeight="900" fill="#dc2626">
              100kVA
            </text>
          </g>
        </g>
      )}

      {/* ---------------- 9. AIR BREAK (AB) SWITCH ---------------- */}
      {node.type === 'ab_switch' && (
        <g>
          <rect x="-16" y="-8" width="32" height="16" fill={fillColor} stroke={primaryColor} strokeWidth="1.5" rx="2" />
          <circle cx="-10" cy="0" r="3.5" fill={primaryColor} />
          <circle cx="10" cy="0" r="3.5" fill={primaryColor} />
          {/* Knife Switch Blade (Opened / Operational) */}
          <line x1="-10" y1="0" x2="6" y2="-10" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />
          <text x="0" y="18" textAnchor="middle" fontSize="8" fontWeight="bold" fill={primaryColor}>
            AB SWITCH
          </text>
        </g>
      )}

      {/* ---------------- 10. HORN GAP (HG) FUSE ---------------- */}
      {node.type === 'hg_fuse' && (
        <g>
          <rect x="-14" y="-8" width="28" height="16" fill={fillColor} stroke={primaryColor} strokeWidth="1.5" rx="2" />
          <line x1="-10" y1="0" x2="-4" y2="0" stroke={primaryColor} strokeWidth="2" />
          <line x1="4" y1="0" x2="10" y2="0" stroke={primaryColor} strokeWidth="2" />
          {/* Dual Horn Arc Tips */}
          <path d="M -4 0 Q -8 -8 -4 -13" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M 4 0 Q 8 -8 4 -13" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
          <text x="0" y="18" textAnchor="middle" fontSize="8" fontWeight="bold" fill={primaryColor}>
            HG FUSE
          </text>
        </g>
      )}

      {/* ---------------- 11. LT DISTRIBUTION BOX ---------------- */}
      {node.type === 'lt_distribution_box' && (
        <g>
          <rect x="-15" y="-13" width="30" height="26" fill="#f0f9ff" stroke="#0284c7" strokeWidth="2" rx="3" />
          {/* Inner Busbar Dividers */}
          <line x1="-11" y1="-5" x2="11" y2="-5" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="-11" y1="3" x2="11" y2="3" stroke="#0284c7" strokeWidth="1.5" />
          {/* 4 LT Outgoing Circuit Terminals */}
          <circle cx="-8" cy="9" r="1.5" fill="#0284c7" />
          <circle cx="-3" cy="9" r="1.5" fill="#0284c7" />
          <circle cx="3" cy="9" r="1.5" fill="#0284c7" />
          <circle cx="8" cy="9" r="1.5" fill="#0284c7" />
          <text x="0" y="-1" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0284c7">
            LT BOX
          </text>
        </g>
      )}

      {/* ---------------- 12. LIGHTNING ARRESTER (LA) ---------------- */}
      {node.type === 'lightning_arrester' && (
        <g>
          {/* Spark Gap Lightning Bolt */}
          <polygon
            points="0,-16 -6,-6 1,-6 -4,5 4,5 -1,15 6,3 0,3 4,-4"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth="1.2"
          />
          {/* Earth Ground Symbol */}
          <line x1="-7" y1="18" x2="7" y2="18" stroke="#1e293b" strokeWidth="2" />
          <line x1="-4" y1="21" x2="4" y2="21" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="-2" y1="24" x2="2" y2="24" stroke="#1e293b" strokeWidth="1.2" />
          <text x="0" y="-19" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b45309">
            LA
          </text>
        </g>
      )}

      {/* ---------------- 13. CONSUMER HOUSE ---------------- */}
      {node.type === 'consumer_house' && (
        <g transform="translate(-16, -14)">
          <rect x="0" y="10" width="32" height="20" fill="#15803d" stroke="#14532d" strokeWidth="1.5" rx="1" />
          <polygon points="16,0 -3,11 35,11" fill="#b91c1c" stroke="#991b1b" strokeWidth="1.5" />
          <rect x="12" y="17" width="8" height="13" fill="#fef08a" />
          <rect x="4" y="15" width="5" height="6" fill="#67e8f9" />
          <rect x="23" y="15" width="5" height="6" fill="#67e8f9" />

          <g transform="translate(38, 10)">
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

      {/* ---------------- 14. COMMERCIAL FACILITY ---------------- */}
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

      {/* ---------------- 15. RELIGIOUS LANDMARK ---------------- */}
      {node.type === 'landmark_religious' && (
        <g transform="translate(-16, -16)">
          <rect x="2" y="14" width="28" height="18" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
          <path d="M 2 14 Q 16 0 30 14 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <line x1="16" y1="0" x2="16" y2="-8" stroke="#b45309" strokeWidth="2" />
          <polygon points="16,-8 24,-5 16,-2" fill="#ef4444" />
          <text x="16" y="42" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b45309">
            TEMPLE / SHRINE
          </text>
        </g>
      )}

      {/* ---------------- 16. SCHOOL / INSTITUTION ---------------- */}
      {node.type === 'landmark_school' && (
        <g transform="translate(-20, -16)">
          <rect x="0" y="10" width="40" height="22" fill="#f1f5f9" stroke="#475569" strokeWidth="1.5" rx="1" />
          <polygon points="0,10 40,10 20,0" fill="#3b82f6" />
          <text x="20" y="23" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#1e293b">
            SCHOOL
          </text>
        </g>
      )}

      {/* ---------------- 17. DYNAMIC CUSTOM TOOL SYMBOL ---------------- */}
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

      {/* Pole Label / Number indicator */}
      {node.properties.poleNumber && (
        <text
          x="0"
          y="-15"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="bold"
          fill={secondaryColor}
          className="pointer-events-none font-mono"
        >
          {node.properties.poleNumber}
        </text>
      )}

      {/* Service Connection Badge (e.g. S/C-6, S/C-4) */}
      {node.properties.serviceConnectionCount !== undefined && (
        <g transform="translate(0, -25)">
          <rect x="-14" y="-8" width="28" height="13" fill="#ffffff" stroke="#64748b" strokeWidth="1" rx="2" />
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
