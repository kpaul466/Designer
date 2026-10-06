/**
 * Top CAD Navigation & Action Bar
 * 100% Client-Side Local Storage & Precision CAD Controls:
 * - Brand & Project Breadcrumb
 * - Project Setup & Title Block
 * - Saved Drawings Manager (LocalStorage)
 * - Templates & Sample Blueprints
 * - Undo/Redo/Delete & Grid/Snap/Theme
 * - GIS Map Layer controls
 * - Direct Save to LocalStorage (Ctrl+S) & ISO A4 PDF Export
 */

import React, { useState } from 'react';
import {
  Building2,
  Check,
  Download,
  FileText,
  FolderOpen,
  Grid,
  HardDrive,
  Keyboard,
  Layers,
  Map,
  Moon,
  Plus,
  Redo2,
  Save,
  Settings2,
  Sun,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import { DrawingProject, SheetSizeType } from '../../types/electrical';
import { ALL_PAGE_SIZES, PAGE_SIZE_DEFINITIONS } from '../../constants/pageSizes';

interface TopBarProps {
  project: DrawingProject;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  showGrid: boolean;
  onToggleGrid: () => void;
  gridType: 'dots' | 'lines';
  onToggleGridType: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  isDarkCanvas: boolean;
  onToggleDarkCanvas: () => void;
  showMap: boolean;
  onToggleMap: () => void;
  mapOpacity: number;
  onMapOpacityChange: (opacity: number) => void;
  mapType: 'satellite' | 'roadmap' | 'terrain' | 'osm';
  onMapTypeChange: (type: 'satellite' | 'roadmap' | 'terrain' | 'osm') => void;
  mapLayerPosition?: 'underlay' | 'overlay';
  onToggleMapLayerPosition?: () => void;
  onOpenTemplates: () => void;
  onOpenProjectSetup: () => void;
  onOpenTitleBlock: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  onSave: () => void;
  isSaving: boolean;
  onOpenSavedProjects: () => void;
  savedProjectsCount?: number;
  onSelectPageSize?: (size: SheetSizeType) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  hasSelection,
  showGrid,
  onToggleGrid,
  gridType,
  onToggleGridType,
  snapEnabled,
  onToggleSnap,
  isDarkCanvas,
  onToggleDarkCanvas,
  showMap,
  onToggleMap,
  mapOpacity,
  onMapOpacityChange,
  mapType,
  onMapTypeChange,
  mapLayerPosition = 'underlay',
  onToggleMapLayerPosition,
  onOpenTemplates,
  onOpenProjectSetup,
  onOpenTitleBlock,
  onOpenExport,
  onOpenShortcuts,
  onSave,
  isSaving,
  onOpenSavedProjects,
  savedProjectsCount = 1,
  onSelectPageSize,
}) => {
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);

  const currentPageDef = PAGE_SIZE_DEFINITIONS[project.metadata.sheetSize || 'A4'] || PAGE_SIZE_DEFINITIONS.A4;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between text-slate-200 select-none z-30 shrink-0">
      {/* Zone 1: Wordmark, Project Breadcrumb, & Setup */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenTemplates} title="Browse Sample Templates">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-950">
            <Zap className="w-5 h-5" />
          </div>
          <div className="hidden lg:block">
            <div className="font-bold text-sm tracking-tight text-white leading-none">
              PowerLine Designer
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wide leading-tight">
              ELECTRICAL CAD v2.8
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden md:block" />

        {/* Project Setup Button with Application & PO badges */}
        <button
          onClick={onOpenProjectSetup}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-left transition-colors max-w-[240px]"
          title="Configure Application No., PO No., Drawing Name, Location, Agency & CCC"
        >
          <Building2 className="w-4 h-4 text-red-400 shrink-0" />
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-bold text-white truncate">
                {project.metadata.title || project.title || 'Project Setup'}
              </span>
              <span className="text-[9px] bg-red-950 text-red-300 font-semibold px-1 rounded uppercase shrink-0">
                SETUP
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate hidden sm:block">
              App: {project.metadata.applicationNo || 'N/A'} · PO: {project.metadata.poNumber || 'N/A'}
            </div>
          </div>
        </button>

        {/* Page Size Selector (Locks Canvas Size and Map Size 1:1) */}
        <div className="relative">
          <button
            onClick={() => setShowPageSizeMenu(!showPageSizeMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/70 hover:bg-sky-900/80 text-xs font-semibold text-sky-200 border border-sky-600/60 transition-colors"
            title="Select Page Size (Canvas and Map are permanently locked 1:1 to this size)"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold">{currentPageDef.shortLabel}</span>
            <span className="text-[9px] bg-sky-900 text-sky-200 font-mono px-1 rounded border border-sky-700/60 hidden xl:inline">
              1:1 LOCKED
            </span>
          </button>

          {showPageSizeMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 border-b border-slate-800 mb-1 flex items-center justify-between">
                <span>Select Page Size</span>
                <span className="text-emerald-400 font-mono">1:1 Canvas Lock</span>
              </div>
              <div className="space-y-1">
                {ALL_PAGE_SIZES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (onSelectPageSize) onSelectPageSize(p.id);
                      setShowPageSizeMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex flex-col ${
                      (project.metadata.sheetSize || 'A4') === p.id
                        ? 'bg-sky-600 text-white font-bold'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{p.label}</span>
                      <span className="font-mono text-[10px] opacity-80">{p.width} × {p.height} px</span>
                    </div>
                    <span className="text-[10px] opacity-75 mt-0.5">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Saved Drawings (LocalStorage Catalog) */}
        <button
          onClick={onOpenSavedProjects}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          title="Manage Saved Drawings in Local Storage"
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">My Drawings</span>
          <span className="bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-emerald-800/60">
            {savedProjectsCount}
          </span>
        </button>
      </div>

      {/* Zone 2: CAD Drafting & View Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Templates Picker */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
          title="Browse real-world sample drawings & starter templates"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Templates</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
          title="Delete Selected Items (Del / Backspace)"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Grid & Snap Controls */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5">
          <button
            onClick={onToggleGrid}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
              showGrid ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle CAD Drafting Grid (G)"
          >
            <Grid className="w-4 h-4" />
            <span className="text-[11px] font-mono hidden xl:inline">
              {showGrid ? gridType : 'Off'}
            </span>
          </button>
          {showGrid && (
            <button
              onClick={onToggleGridType}
              className="px-1.5 py-1 text-[10px] font-mono text-slate-400 hover:text-white"
              title="Switch Grid Mode (Dots / Mesh Lines)"
            >
              ⇄
            </button>
          )}
          <button
            onClick={onToggleSnap}
            className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium ${
              snapEnabled ? 'bg-emerald-900/60 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 20px Grid Snap"
          >
            SNAP
          </button>
        </div>

        {/* GIS Map Controls Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMapMenu(!showMapMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showMap
                ? 'bg-sky-900/60 text-sky-200 border border-sky-600/70 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="GIS Map Underlay Settings"
          >
            <Map className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{showMap ? 'Map ON' : 'Map Underlay'}</span>
          </button>

          {showMapMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3.5 z-50 text-slate-200 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-sky-400" />
                  <span>GIS Map Configuration</span>
                </span>
                <button
                  onClick={onToggleMap}
                  className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold ${
                    showMap ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {showMap ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>

              {/* Map Layer Type */}
              <div className="mb-3">
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Map Imagery</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    onClick={() => onMapTypeChange('satellite')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'satellite' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    🛰️ Satellite
                  </button>
                  <button
                    onClick={() => onMapTypeChange('roadmap')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'roadmap' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    🗺️ Road Map
                  </button>
                  <button
                    onClick={() => onMapTypeChange('osm')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'osm' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    🌐 OpenStreetMap
                  </button>
                  <button
                    onClick={() => onMapTypeChange('terrain')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'terrain' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    🏔️ Topo Terrain
                  </button>
                </div>
              </div>

              {/* Layer Position */}
              {onToggleMapLayerPosition && (
                <div className="mb-3">
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                    Layer Placement
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      onClick={() => mapLayerPosition !== 'underlay' && onToggleMapLayerPosition()}
                      className={`py-1 rounded-lg font-medium ${
                        mapLayerPosition === 'underlay' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      Under CAD Lines
                    </button>
                    <button
                      onClick={() => mapLayerPosition !== 'overlay' && onToggleMapLayerPosition()}
                      className={`py-1 rounded-lg font-medium ${
                        mapLayerPosition === 'overlay' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      Over CAD Lines
                    </button>
                  </div>
                </div>
              )}

              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Transparency / Opacity</span>
                  <span className="font-mono font-bold text-sky-400">{mapOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={mapOpacity}
                  onChange={(e) => onMapOpacityChange(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Dialog Button */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="CAD Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Canvas Dark/Light Toggle */}
        <button
          onClick={onToggleDarkCanvas}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Toggle Canvas Theme (White Paper / Dark Slate)"
        >
          {isDarkCanvas ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Zone 3: Primary Actions (Save to LocalStorage & Export A4 PDF) */}
      <div className="flex items-center gap-2">
        {/* LocalStorage Save (Ctrl+S) */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white shadow-md shadow-emerald-950 transition-colors"
          title="Save Drawing to Browser Local Storage (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-white" />
          <span>{isSaving ? 'Saved!' : 'Save (Ctrl+S)'}</span>
        </button>

        {/* Export A4 PDF */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-950 transition-colors whitespace-nowrap"
          title="Export A4 Landscape PDF with Title Block, Index & BOQ Schedule"
        >
          <Download className="w-4 h-4" />
          <span>Export A4 PDF</span>
        </button>
      </div>
    </header>
  );
};
