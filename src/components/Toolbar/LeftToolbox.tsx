/**
 * Left CAD Tool Palette
 * High-density tool icons for electrical drafting entities, civil features, switchgear, and custom tools
 */

import React from 'react';
import {
  ActiveTool,
  CustomToolDefinition,
} from '../../types/electrical';
import {
  Circle,
  Home,
  Layers,
  Move,
  MousePointer,
  Spline,
  Waypoints,
  Waves,
  Route,
  Zap,
  ArrowUpRight,
  Plus,
  Wrench,
  Sparkles,
  Building,
  School,
  Shield,
  Activity,
  Box,
  SlidersHorizontal,
} from 'lucide-react';

interface LeftToolboxProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  customTools?: CustomToolDefinition[];
  onOpenCustomToolModal: () => void;
}

interface ToolItem {
  id: ActiveTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface ToolGroup {
  category: string;
  tools: ToolItem[];
}

export const LeftToolbox: React.FC<LeftToolboxProps> = ({
  activeTool,
  onSelectTool,
  customTools = [],
  onOpenCustomToolModal,
}) => {
  const toolGroups: ToolGroup[] = [
    {
      category: 'Drafting Tools',
      tools: [
        { id: 'select' as ActiveTool, label: 'Select & Move (V)', icon: MousePointer },
        { id: 'pan' as ActiveTool, label: 'Hand / Pan (H)', icon: Move },
      ],
    },
    {
      category: 'Poles & Structures',
      tools: [
        { id: 'pole_8m' as ActiveTool, label: '8m PCC Pole', badge: '8M', icon: Circle },
        { id: 'pole_9m' as ActiveTool, label: '9m PCC Pole', badge: '9M', icon: Circle },
        { id: 'pole_rsj' as ActiveTool, label: 'RSJ / Rail Pole', badge: 'RSJ', icon: Circle },
        { id: 'pole_stp' as ActiveTool, label: 'Steel Tubular (STP)', badge: 'STP', icon: Circle },
        { id: 'dp_structure' as ActiveTool, label: 'DP Structure', badge: 'DP', icon: Waypoints },
        { id: 'four_pole' as ActiveTool, label: '4-Pole Substation', badge: '4P', icon: Layers },
      ],
    },
    {
      category: 'Transformers & Gear',
      tools: [
        { id: 'dtr_25kva' as ActiveTool, label: '25 kVA DTR', badge: '25k', icon: Zap },
        { id: 'dtr_63kva' as ActiveTool, label: '63 kVA DTR', badge: '63k', icon: Zap },
        { id: 'dtr_100kva' as ActiveTool, label: '100 kVA DTR', badge: '100k', icon: Zap },
        { id: 'dtr_conversion' as ActiveTool, label: '63 to 100k Conv.', badge: 'Conv', icon: Zap },
        { id: 'ab_switch' as ActiveTool, label: 'AB Switch', badge: 'AB', icon: SlidersHorizontal },
        { id: 'hg_fuse' as ActiveTool, label: 'HG Fuse Set', badge: 'HG', icon: Activity },
        { id: 'lt_distribution_box' as ActiveTool, label: 'LT Distribution Box', badge: 'LT-B', icon: Box },
        { id: 'lightning_arrester' as ActiveTool, label: 'Lightning Arrester', badge: 'LA', icon: Shield },
      ],
    },
    {
      category: 'Lines & Conductors',
      tools: [
        { id: 'acsr_4wire' as ActiveTool, label: 'ACSR 4-Wire (3-Ph 4-W)', badge: '4-W', icon: Spline },
        { id: 'acsr_3wire' as ActiveTool, label: 'ACSR 3-Wire', badge: '3-W', icon: Spline },
        { id: 'lt_ab_cable' as ActiveTool, label: 'LT AB Cable', badge: 'AB', icon: Spline },
        { id: 'ht_ug_cable' as ActiveTool, label: 'HT-OH Line', badge: 'HT', icon: Spline },
        { id: 'earth_wire' as ActiveTool, label: 'Continuous Earth Wire', badge: 'EW', icon: Spline },
        { id: 'phase_conversion' as ActiveTool, label: 'Phase Conversion', badge: '1→3', icon: Spline },
        { id: 'cradle_guard' as ActiveTool, label: 'Cradle Guard', badge: 'CG', icon: Spline },
        { id: 'jumper_connection' as ActiveTool, label: 'Jumper Connection', badge: 'JMP', icon: Spline },
      ],
    },
    {
      category: 'Stay Sets',
      tools: [
        { id: 'ht_stay' as ActiveTool, label: 'HT Stay Set', badge: 'HT', icon: ArrowUpRight },
        { id: 'lt_stay' as ActiveTool, label: 'LT Stay Set', badge: 'LT', icon: ArrowUpRight },
      ],
    },
    {
      category: 'Civil & Landmarks',
      tools: [
        { id: 'consumer_house' as ActiveTool, label: 'Consumer Drop (S/C)', badge: 'S/C', icon: Home },
        { id: 'commercial_facility' as ActiveTool, label: 'Commercial / Petrol Pump', badge: 'Fuel', icon: Building },
        { id: 'landmark_religious' as ActiveTool, label: 'Religious Landmark', badge: 'Temple', icon: Building },
        { id: 'landmark_school' as ActiveTool, label: 'School / Institution', badge: 'School', icon: School },
        { id: 'river_crossing' as ActiveTool, label: 'River Crossing Feature', badge: 'River', icon: Waves },
        { id: 'road_crossing' as ActiveTool, label: 'Road Crossing Feature', badge: 'Road', icon: Route },
      ],
    },
  ];

  return (
    <aside className="w-16 md:w-56 bg-slate-900 border-r border-slate-800 flex flex-col justify-between overflow-y-auto select-none shrink-0 z-20">
      <div className="p-2 space-y-4">
        {/* Custom Tools Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Custom Tools
            </span>
            <button
              onClick={onOpenCustomToolModal}
              className="text-[10px] flex items-center gap-1 text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-900 px-1.5 py-0.5 rounded border border-amber-700/50 transition-colors"
              title="Create custom electrical / civil tool"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden md:inline">Add Custom</span>
            </button>
          </div>

          {customTools.length > 0 ? (
            <div className="grid grid-cols-1 gap-1">
              {customTools.map((ct) => {
                const isActive = activeTool === ct.id;
                return (
                  <button
                    key={ct.id}
                    onClick={() => onSelectTool(ct.id as ActiveTool)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-amber-600 text-white font-semibold shadow'
                        : 'text-amber-200 hover:bg-slate-800 hover:text-white border border-amber-900/30'
                    }`}
                    title={`${ct.name} (${ct.boqDescription})`}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: ct.color, color: '#ffffff' }}
                    >
                      {ct.iconText.slice(0, 2)}
                    </div>
                    <span className="text-xs truncate hidden md:inline">{ct.name}</span>
                    <span className="ml-auto text-[9px] font-mono px-1 py-0.2 rounded hidden md:inline bg-slate-800 text-slate-300">
                      {ct.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              onClick={onOpenCustomToolModal}
              className="w-full text-center py-2 px-2 border border-dashed border-slate-700 hover:border-amber-500 rounded-lg text-[11px] text-slate-400 hover:text-amber-300 transition-colors hidden md:block"
            >
              + Create Custom Symbol
            </button>
          )}
        </div>

        {/* Built-in Tool Groups */}
        {toolGroups.map((group) => (
          <div key={group.category} className="space-y-1">
            <div className="hidden md:block px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.category}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;

                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-red-600 text-white font-semibold shadow-md shadow-red-950'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={tool.label}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs truncate hidden md:inline">{tool.label}</span>
                    {tool.badge && (
                      <span
                        className={`ml-auto text-[9px] font-mono px-1 py-0.2 rounded hidden md:inline ${
                          isActive
                            ? 'bg-red-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tooltip at bottom */}
      <div className="hidden md:block p-3 border-t border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 leading-tight">
        <div className="font-semibold text-slate-300 mb-0.5">Quick Guide</div>
        <div>• Click 2 poles to draw conductor wire</div>
        <div>• Ctrl + Scroll to zoom in/out</div>
        <div>• Click + Drag to multi-select</div>
      </div>
    </aside>
  );
};
