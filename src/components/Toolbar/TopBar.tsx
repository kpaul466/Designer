/**
 * Top CAD Navigation & Action Bar
 * Clean Engineering Light Theme:
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
    <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between text-slate-700 select-none z-30 shrink-0 shadow-xs">
      {/* Zone 1: Wordmark, Project Breadcrumb, & Setup */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onOpenTemplates}
          title="Browse Sample Templates"
        >
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div className="hidden lg:block">
            <div className="font-bold text-sm tracking-tight text-slate-900 leading-none">
              PowerLine Designer
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wide leading-tight mt-0.5">
              ELECTRICAL CAD v2.8
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Project Setup Button with Application & PO badges */}
        <button
          onClick={onOpenProjectSetup}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-left transition-colors max-w-[240px]"
          title="Configure Application No., PO No., Drawing Name, Location, Agency & CCC"
        >
          <Building2 className="w-4 h-4 text-red-600 shrink-0" />
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-xs font-bold text-slate-900 truncate">
                {project.metadata.title || project.title || 'Project Setup'}
              </span>
              <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1 rounded uppercase shrink-0 border border-red-200">
                SETUP
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate hidden sm:block">
              App: {project.metadata.applicationNo || 'N/A'} · PO: {project.metadata.poNumber || 'N/A'}
            </div>
          </div>
        </button>

        {/* Page Size Selector (Locks Canvas Size and Map Size 1:1) */}
        <div className="relative">
          <button
            onClick={() => setShowPageSizeMenu(!showPageSizeMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-xs font-semibold text-sky-800 border border-sky-200 transition-colors"
            title="Select Page Size (Canvas and Map are permanently locked 1:1 to this size)"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-bold">{currentPageDef.shortLabel}</span>
            <span className="text-[9px] bg-sky-100 text-sky-800 font-mono font-bold px-1 rounded border border-sky-300 hidden xl:inline">
              1:1 LOCKED
            </span>
          </button>

          {showPageSizeMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>Select Page Size</span>
                <span className="text-emerald-700 font-mono font-bold">1:1 Canvas Lock</span>
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
                        : 'hover:bg-slate-100 text-slate-800'
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
          title="Manage Saved Drawings in Local Storage"
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">My Drawings</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
            {savedProjectsCount}
          </span>
        </button>
      </div>

      {/* Zone 2: CAD Drafting & View Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Templates Picker */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors"
          title="Browse real-world sample drawings & starter templates"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Templates</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Delete Selected Items (Del / Backspace)"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Grid & Snap Controls */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={onToggleGrid}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
              showGrid ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-800'
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
              className="px-1.5 py-1 text-[10px] font-mono text-slate-500 hover:text-slate-900"
              title="Switch Grid Mode (Dots / Mesh Lines)"
            >
              ⇄
            </button>
          )}
          <button
            onClick={onToggleSnap}
            className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium ${
              snapEnabled ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              showMap
                ? 'bg-sky-50 text-sky-800 border border-sky-300 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
            title="GIS Map Underlay Settings"
          >
            <Map className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">{showMap ? 'Map ON' : 'Map Underlay'}</span>
          </button>

          {showMapMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 z-50 text-slate-800 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                <span className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Map className="w-4 h-4 text-sky-600" />
                  <span>GIS Map Configuration</span>
                </span>
                <button
                  onClick={onToggleMap}
                  className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold ${
                    showMap ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {showMap ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>

              {/* Map Layer Type */}
              <div className="mb-3">
                <label className="text-[11px] text-slate-500 block mb-1 font-semibold">Map Imagery</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                  <button
                    onClick={() => onMapTypeChange('satellite')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'satellite' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛰️ Satellite
                  </button>
                  <button
                    onClick={() => onMapTypeChange('roadmap')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'roadmap' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗺️ Road Map
                  </button>
                  <button
                    onClick={() => onMapTypeChange('osm')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'osm' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌐 OpenStreetMap
                  </button>
                  <button
                    onClick={() => onMapTypeChange('terrain')}
                    className={`py-1.5 text-xs rounded-lg font-medium ${
                      mapType === 'terrain' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏔️ Topo Terrain
                  </button>
                </div>
              </div>

              {/* Layer Position */}
              {onToggleMapLayerPosition && (
                <div className="mb-3">
                  <label className="text-[11px] text-slate-500 block mb-1 font-semibold">
                    Layer Placement
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                    <button
                      onClick={() => mapLayerPosition !== 'underlay' && onToggleMapLayerPosition()}
                      className={`py-1 rounded-lg font-medium ${
                        mapLayerPosition === 'underlay' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Under CAD Lines
                    </button>
                    <button
                      onClick={() => mapLayerPosition !== 'overlay' && onToggleMapLayerPosition()}
                      className={`py-1 rounded-lg font-medium ${
                        mapLayerPosition === 'overlay' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Over CAD Lines
                    </button>
                  </div>
                </div>
              )}

              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Transparency / Opacity</span>
                  <span className="font-mono font-bold text-sky-700">{mapOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={mapOpacity}
                  onChange={(e) => onMapOpacityChange(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Dialog Button */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="CAD Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Canvas Dark/Light Toggle */}
        <button
          onClick={onToggleDarkCanvas}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Toggle Canvas Theme (White Paper / Dark Slate)"
        >
          {isDarkCanvas ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Zone 3: Primary Actions (Save to LocalStorage & Export A4 PDF) */}
      <div className="flex items-center gap-2">
        {/* LocalStorage Save (Ctrl+S) */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition-colors"
          title="Save Drawing to Browser Local Storage (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-white" />
          <span>{isSaving ? 'Saved!' : 'Save (Ctrl+S)'}</span>
        </button>

        {/* Export A4 PDF */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-xs transition-colors whitespace-nowrap"
          title="Export A4 Landscape PDF with Title Block, Index & BOQ Schedule"
        >
          <Download className="w-4 h-4" />
          <span>Export A4 PDF</span>
        </button>
      </div>
    </header>
  );
};
