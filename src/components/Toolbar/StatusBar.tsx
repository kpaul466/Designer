/**
 * Bottom CAD Status Bar
 * Clean Light Theme:
 * Displays live cursor coordinates, active tool, zoom level, element count, snap state, and keyboard shortcuts
 */

import React from 'react';
import { ActiveTool } from '../../types/electrical';

interface StatusBarProps {
  cursorX: number;
  cursorY: number;
  activeTool: ActiveTool;
  zoom: number;
  nodeCount: number;
  edgeCount: number;
  stayCount: number;
  selectedCount: number;
  snapEnabled: boolean;
  onResetZoom: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorX,
  cursorY,
  activeTool,
  zoom,
  nodeCount,
  edgeCount,
  stayCount,
  selectedCount,
  snapEnabled,
  onResetZoom,
}) => {
  return (
    <footer className="h-8 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] font-mono text-slate-600 select-none z-20 shrink-0">
      {/* Left: Active Tool & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-800 uppercase font-semibold">TOOL: {activeTool.replace('_', ' ')}</span>
        </div>
        <div className="hidden sm:block text-slate-300">|</div>
        <div className="hidden sm:flex items-center gap-1">
          <span>SNAP:</span>
          <span className={snapEnabled ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
            {snapEnabled ? '20px ON' : 'OFF'}
          </span>
        </div>
        {selectedCount > 0 && (
          <>
            <div className="hidden md:block text-slate-300">|</div>
            <div className="hidden md:flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-300 px-1.5 py-0.5 rounded font-bold">
              <span>SELECTED:</span>
              <span>{selectedCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Center: Cursor & Interaction Tips */}
      <div className="hidden lg:flex items-center gap-3 bg-white px-3 py-0.5 rounded border border-slate-200 text-[10.5px]">
        <span>X: <strong className="text-slate-900 font-mono">{cursorX}</strong></span>
        <span>Y: <strong className="text-slate-900 font-mono">{cursorY}</strong></span>
        <span className="text-slate-300">|</span>
        <span className="text-amber-700 font-sans font-semibold">Ctrl + Scroll to Zoom</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-600 font-sans">Space / H to Pan</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-600 font-sans">Click+Drag to Select</span>
      </div>

      {/* Right: Quantities & Zoom Control */}
      <div className="flex items-center gap-4">
        <div className="hidden xl:flex items-center gap-2 text-slate-600">
          <span>Poles: <strong className="text-slate-900">{nodeCount}</strong></span>
          <span>·</span>
          <span>Lines: <strong className="text-slate-900">{edgeCount}</strong></span>
          <span>·</span>
          <span>Stays: <strong className="text-slate-900">{stayCount}</strong></span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onResetZoom}
            className="hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-200 font-bold text-slate-700 border border-slate-200 bg-white"
            title="Reset Zoom to 100% (Key: 0 or F)"
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </footer>
  );
};
