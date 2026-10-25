/**
 * Application chrome
 * - Row 1: conventional software menu bar (File / Edit / View / Insert / Tools / Help)
 * - Row 2: a single-line ribbon with the most-used CAD and project tools
 * - Floating GIS map configuration panel (anchored below the header)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  FileText,
  FolderOpen,
  Grid,
  HardDrive,
  Keyboard,
  Layers,
  Magnet,
  Map,
  Maximize,
  Moon,
  MousePointer2,
  PanelLeft,
  Plus,
  Printer,
  Redo2,
  Save,
  Scissors,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Undo2,
  User,
  Package,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  ActiveTool,
  DrawingProject,
  MapFeatureSelection,
  MapRoadCandidate,
  RoadLineStyle,
  SelectedItem,
  SheetSizeType,
} from '../../types/electrical';
import { ALL_PAGE_SIZES, PAGE_SIZE_DEFINITIONS } from '../../constants/pageSizes';
import { APP_VERSION } from '../../services/pldFileService';

interface TopBarProps {
  project: DrawingProject;
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  selectedEntities: SelectedItem[];
  roadLineStyle: RoadLineStyle;
  roadWidth: number;
  onRoadLineStyleChange: (style: RoadLineStyle) => void;
  onRoadWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onFitToScreen: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
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
  mapFeatures: MapFeatureSelection;
  onMapFeatureChange: (key: keyof MapFeatureSelection, enabled: boolean) => void;
  availableMapRoads: MapRoadCandidate[];
  selectedMapRoadIds: string[];
  onToggleMapRoadSelection: (road: MapRoadCandidate) => void;
  onAddSelectedMapRoads: () => void;
  mapLocked: boolean;
  onToggleMapLock: () => void;
  mapLayerPosition?: 'underlay' | 'overlay';
  onToggleMapLayerPosition?: () => void;
  printIncludeMap: boolean;
  printMapOpacity?: number;
  onPrintMapOpacityChange?: (opacity: number) => void;
  onTogglePrintMap: () => void;
  onOpenTemplates: () => void;
  onCreateDrawing: () => void;
  onOpenProjectSetup: () => void;
  onOpenTitleBlock: () => void;
  onOpenExport: () => void;
  onOpenOutputSettings: () => void;
  onOpenCustomToolModal: () => void;
  onOpenToolDrawer: () => void;
  onOpenShortcuts: () => void;
  onSave: () => void;
  isSaving: boolean;
  onSavePld?: () => void;
  onOpenPld?: () => void;
  onOpenAboutDeveloper?: () => void;
  onOpenAppVersion?: () => void;
  onOpenSavedProjects: () => void;
  savedProjectsCount?: number;
  onSelectPageSize?: (size: SheetSizeType) => void;
}

type MenuKey = 'file' | 'edit' | 'view' | 'insert' | 'tools' | 'help';

interface MenuEntry {
  label?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  hint?: string;
}

interface RibbonButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  accent?: 'primary' | 'danger';
}

const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon,
  label,
  onClick,
  title,
  active = false,
  disabled = false,
  accent,
}) => {
  const tone = accent === 'primary'
    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-500'
    : accent === 'danger'
      ? 'border-red-600 bg-red-600 text-white hover:bg-red-500 hover:border-red-500'
      : active
        ? 'border-sky-300 bg-sky-50 text-sky-800'
        : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-pressed={active || undefined}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tone}`}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">{icon}</span>
      <span className="inline whitespace-nowrap lg:hidden xl:inline">{label}</span>
    </button>
  );
};

const RibbonGroup: React.FC<{ children: React.ReactNode; label?: string }> = ({
  children,
  label,
}) => (
  <div className="flex h-full shrink-0 flex-col justify-center gap-0.5 border-r border-slate-200 px-1 last:border-r-0">
    <div className="flex items-center gap-0.5">{children}</div>
    {label && (
      <span className="hidden text-center text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:block">
        {label}
      </span>
    )}
  </div>
);

const TOOL_LABELS: Partial<Record<ActiveTool, string>> = {
  select: 'Select & Move',
  pan: 'Hand / Pan',
  freeform_road: 'Freeform Road',
  road_segment: 'Straight Road',
  pole_8m: '8 m PCC Pole',
  pole_9m: '9 m PCC Pole',
  pole_single: 'PCC Pole',
  pole_rsj: 'RSJ / Rail Pole',
  pole_stp: 'Steel Tubular Pole',
  dp_structure: 'DP Structure',
  four_pole: '4-Pole Substation',
  dtr_25kva: '25 kVA DTR',
  dtr_63kva: '63 kVA DTR',
  dtr_100kva: '100 kVA DTR',
  dtr_conversion: '63 → 100 kVA Conversion',
  ab_switch: 'AB Switch',
  hg_fuse: 'HG Fuse Set',
  lt_distribution_box: 'LT Distribution Box',
  lightning_arrester: 'Lightning Arrester',
  acsr_2wire: 'ACSR 2-Wire',
  acsr_3wire: 'ACSR 3-Wire',
  acsr_4wire: 'ACSR 4-Wire',
  lt_ab_cable: 'LT AB Cable',
  service_cable: '1-Ph Service Cable (2C)',
  service_cable_3ph: '3-Ph Service Cable (4C)',
  ht_ug_cable: 'HT OH Line',
  earth_wire: 'Earth Wire',
  ht_stay: 'HT Stay Set',
  lt_stay: 'LT Stay Set',
  text_annotation: 'Manual Label',
  consumer_house: 'Consumer Drop',
  commercial_facility: 'Commercial / Petrol Pump',
  railway_crossing: 'Railway Crossing',
  river_crossing: 'River Crossing',
  road_crossing: 'Road Crossing',
};

const getToolLabel = (tool: string) =>
  TOOL_LABELS[tool as ActiveTool] ||
  tool
    .replace(/^custom_/, 'Custom ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const TopBar: React.FC<TopBarProps> = ({
  project,
  activeTool,
  onSelectTool,
  selectedEntities,
  roadLineStyle,
  roadWidth,
  onRoadLineStyleChange,
  onRoadWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onCut,
  onDuplicate,
  onSelectAll,
  onDeleteSelected,
  hasSelection,
  onFitToScreen,
  onZoomIn,
  onZoomOut,
  onResetZoom,
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
  mapFeatures,
  onMapFeatureChange,
  availableMapRoads,
  selectedMapRoadIds,
  onToggleMapRoadSelection,
  onAddSelectedMapRoads,
  mapLocked,
  onToggleMapLock,
  mapLayerPosition = 'underlay',
  onToggleMapLayerPosition,
  printIncludeMap,
  printMapOpacity,
  onPrintMapOpacityChange,
  onTogglePrintMap,
  onOpenTemplates,
  onCreateDrawing,
  onOpenProjectSetup,
  onOpenTitleBlock,
  onOpenExport,
  onOpenOutputSettings,
  onOpenCustomToolModal,
  onOpenToolDrawer,
  onOpenShortcuts,
  onSave,
  isSaving,
  onSavePld,
  onOpenPld,
  onOpenAboutDeveloper,
  onOpenAppVersion,
  onOpenSavedProjects,
  savedProjectsCount = 1,
  onSelectPageSize,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const [showAttributesMenu, setShowAttributesMenu] = useState(false);
  const menuBarRef = useRef<HTMLElement>(null);
  const pageSizeMenuRef = useRef<HTMLDivElement>(null);
  const mapMenuRef = useRef<HTMLDivElement>(null);
  const mapTriggerRef = useRef<HTMLButtonElement>(null);
  const attributesMenuRef = useRef<HTMLDivElement>(null);
  const attributesTriggerRef = useRef<HTMLDivElement>(null);

  const currentPageDef = PAGE_SIZE_DEFINITIONS[project.metadata.sheetSize || 'A4'] || PAGE_SIZE_DEFINITIONS.A4;
  const selectedItem = selectedEntities.length === 1 ? selectedEntities[0] : null;
  const selectedNode =
    selectedItem?.type === 'node' ? project.nodes.find((node) => node.id === selectedItem.id) : null;
  const selectedEdge =
    selectedItem?.type === 'edge' ? project.edges.find((edge) => edge.id === selectedItem.id) : null;
  const selectedRoad =
    selectedItem?.type === 'mapRoad'
      ? project.mapRoadOutlines?.find((road) => road.id === selectedItem.id)
      : null;
  const selectedStay =
    selectedItem?.type === 'stay' ? project.stays.find((stay) => stay.id === selectedItem.id) : null;
  const selectedCrossing =
    selectedItem?.type === 'crossing'
      ? project.crossings.find((crossing) => crossing.id === selectedItem.id)
      : null;
  const selectedAnnotation =
    selectedItem?.type === 'annotation'
      ? project.annotations.find((annotation) => annotation.id === selectedItem.id)
      : null;
  const selectionRows: Array<[string, string]> = selectedNode
    ? [
        ['Type', getToolLabel(selectedNode.type)],
        ['Status', selectedNode.status],
        ...(selectedNode.properties.height ? [['Height', selectedNode.properties.height] as [string, string]] : []),
        ...(selectedNode.properties.capacityKva
          ? [['Capacity', `${selectedNode.properties.capacityKva} kVA`] as [string, string]]
          : []),
        ...(selectedNode.properties.poleNumber
          ? [['Pole No.', selectedNode.properties.poleNumber] as [string, string]]
          : []),
      ]
    : selectedEdge
      ? [
          ['Conductor', getToolLabel(selectedEdge.type)],
          ['Status', selectedEdge.status],
          ['Span', `${Math.round(selectedEdge.spanMeters)} m`],
        ]
      : selectedRoad
        ? [
            ['Road', selectedRoad.name || 'New Road'],
            ['Style', selectedRoad.lineStyle === 'double' ? '2 lines' : '1 line'],
            ['Width', `${selectedRoad.roadWidth ?? 16} px`],
            ['Rotation', selectedRoad.labelRotation !== undefined ? `${selectedRoad.labelRotation}°` : 'Auto'],
          ]
        : selectedStay
          ? [
              ['Stay', getToolLabel(selectedStay.type)],
              ['Status', selectedStay.status],
              ['Sets', `${selectedStay.count}`],
            ]
          : selectedCrossing
            ? [
                ['Crossing', getToolLabel(`${selectedCrossing.type}_crossing`)],
                ['Name', selectedCrossing.name],
              ]
            : selectedAnnotation
              ? [
                  ['Annotation', selectedAnnotation.text || 'Manual label'],
                  ['Font size', `${selectedAnnotation.fontSize} px`],
                  ['Rotation', `${selectedAnnotation.rotation || 0}°`],
                ]
              : [];
  const roadToolActive = activeTool === 'freeform_road' || activeTool === 'road_segment';

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!showPageSizeMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(event.target as Node)) {
        setShowPageSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPageSizeMenu]);

  useEffect(() => {
    if (!showMapMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mapMenuRef.current?.contains(target) || mapTriggerRef.current?.contains(target)) return;
      setShowMapMenu(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMapMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMapMenu]);

  useEffect(() => {
    if (!showAttributesMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        attributesMenuRef.current?.contains(target) ||
        attributesTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setShowAttributesMenu(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowAttributesMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttributesMenu]);

  const openMapPanel = () => {
    setOpenMenu(null);
    setShowPageSizeMenu(false);
    setShowAttributesMenu(false);
    setShowMapMenu(true);
  };

  const openPageSizePanel = () => {
    setOpenMenu(null);
    setShowMapMenu(false);
    setShowAttributesMenu(false);
    setShowPageSizeMenu(true);
  };

  const openAttributesPanel = () => {
    setOpenMenu(null);
    setShowMapMenu(false);
    setShowPageSizeMenu(false);
    setShowAttributesMenu((visible) => !visible);
  };

  const renderMenuEntry = (entry: MenuEntry, index: number) => {
    if (entry.separator) {
      return <div key={`separator-${index}`} role="separator" className="my-1 border-t border-slate-100" />;
    }
    if (entry.hint) {
      return (
        <div
          key={`hint-${index}`}
          role="note"
          className="px-3 py-1 text-[10px] font-mono text-slate-400"
        >
          {entry.hint}
        </div>
      );
    }
    return (
      <button
        key={entry.label}
        type="button"
        role="menuitem"
        disabled={entry.disabled}
        onClick={() => {
          if (entry.disabled) return;
          entry.onSelect?.();
          setOpenMenu(null);
        }}
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
          entry.checked ? 'bg-sky-50 font-semibold text-sky-900' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-500">
          {entry.checked ? <Check className="h-3.5 w-3.5 text-sky-600" /> : entry.icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        {entry.shortcut && (
          <span className="shrink-0 font-mono text-[10px] text-slate-400">{entry.shortcut}</span>
        )}
      </button>
    );
  };

  const menuButton = (key: MenuKey, label: string, entries: MenuEntry[]) => (
    <div key={key} role="none" className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={openMenu === key}
        onClick={() => setOpenMenu((current) => (current === key ? null : key))}
        onMouseEnter={() => {
          if (openMenu) setOpenMenu(key);
        }}
        className={`h-7 rounded px-2 text-[11.5px] font-medium transition-colors sm:px-2.5 ${
          openMenu === key ? 'bg-sky-100 text-sky-900' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {label}
      </button>
      {openMenu === key && (
        <div
          role="menu"
          className="fixed left-2 right-2 top-10 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-2xl animate-in fade-in slide-in-from-top-1 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1 sm:w-64 sm:max-h-[70dvh]"
        >
          {entries.map(renderMenuEntry)}
        </div>
      )}
    </div>
  );

  const fileMenu: MenuEntry[] = [
    { label: 'New Drawing', icon: <Plus className="h-3.5 w-3.5" />, onSelect: onCreateDrawing },
    { label: 'Open Drawing…', icon: <FolderOpen className="h-3.5 w-3.5" />, onSelect: onOpenSavedProjects },
    { label: isSaving ? 'Saving…' : 'Save (Local Storage)', shortcut: 'Ctrl+S', icon: <Save className="h-3.5 w-3.5" />, onSelect: onSave, disabled: isSaving },
    { separator: true },
    ...(onSavePld ? [{ label: 'Save as .PLD Drawing (Stateful)…', icon: <HardDrive className="h-3.5 w-3.5 text-red-600" />, onSelect: onSavePld }] : []),
    ...(onOpenPld ? [{ label: 'Open .PLD Drawing File…', icon: <FolderOpen className="h-3.5 w-3.5 text-sky-600" />, onSelect: onOpenPld }] : []),
    { separator: true },
    { label: `My Drawings (${savedProjectsCount})`, icon: <HardDrive className="h-3.5 w-3.5" />, onSelect: onOpenSavedProjects },
    { label: 'Templates…', icon: <FileText className="h-3.5 w-3.5" />, onSelect: onOpenTemplates },
    { separator: true },
    { label: 'Print / PDF Setup…', icon: <Settings2 className="h-3.5 w-3.5" />, onSelect: onOpenOutputSettings },
    { label: 'Export A4 PDF…', icon: <Download className="h-3.5 w-3.5" />, onSelect: onOpenExport },
    { label: 'Print Preview…', icon: <Printer className="h-3.5 w-3.5" />, onSelect: onOpenExport },
  ];

  const editMenu: MenuEntry[] = [
    { label: 'Undo', shortcut: 'Ctrl+Z', icon: <Undo2 className="h-3.5 w-3.5" />, onSelect: onUndo, disabled: !canUndo },
    { label: 'Redo', shortcut: 'Ctrl+Y', icon: <Redo2 className="h-3.5 w-3.5" />, onSelect: onRedo, disabled: !canRedo },
    { separator: true },
    { label: 'Cut', shortcut: 'Ctrl+X', icon: <Scissors className="h-3.5 w-3.5" />, onSelect: onCut, disabled: !hasSelection },
    { label: 'Copy', shortcut: 'Ctrl+C', icon: <Copy className="h-3.5 w-3.5" />, onSelect: onCopy, disabled: !hasSelection },
    { label: 'Paste', shortcut: 'Ctrl+V', icon: <ClipboardPaste className="h-3.5 w-3.5" />, onSelect: onPaste },
    { label: 'Duplicate', shortcut: 'Ctrl+D', icon: <CopyPlus className="h-3.5 w-3.5" />, onSelect: onDuplicate, disabled: !hasSelection },
    { separator: true },
    { label: 'Delete', shortcut: 'Del', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: onDeleteSelected, disabled: !hasSelection },
    { label: 'Select All', shortcut: 'Ctrl+A', icon: <MousePointer2 className="h-3.5 w-3.5" />, onSelect: onSelectAll },
  ];

  const viewMenu: MenuEntry[] = [
    { label: 'Grid', shortcut: 'G', checked: showGrid, onSelect: onToggleGrid },
    { label: `Grid Style: ${gridType === 'lines' ? 'Mesh Lines' : 'Dots'}`, icon: <Grid className="h-3.5 w-3.5" />, onSelect: onToggleGridType },
    { label: 'Snap to Grid', checked: snapEnabled, onSelect: onToggleSnap },
    { label: 'Dark Canvas', checked: isDarkCanvas, onSelect: onToggleDarkCanvas },
    { separator: true },
    { label: 'Zoom In', shortcut: '+', onSelect: onZoomIn },
    { label: 'Zoom Out', shortcut: '−', onSelect: onZoomOut },
    { label: 'Reset Zoom', shortcut: '0', onSelect: onResetZoom },
    { label: 'Fit Drawing to Screen', shortcut: 'F', onSelect: onFitToScreen },
    { separator: true },
    { label: 'Map Underlay', shortcut: 'M', checked: showMap, onSelect: onToggleMap },
    { label: 'Include Map in PDF / Print', checked: printIncludeMap, onSelect: onTogglePrintMap },
    { label: 'Map Configuration…', icon: <Layers className="h-3.5 w-3.5" />, onSelect: openMapPanel },
  ];

  const insertMenu: MenuEntry[] = [
    { label: 'Project Setup…', icon: <Building2 className="h-3.5 w-3.5" />, onSelect: onOpenProjectSetup },
    { label: 'Title Block…', icon: <FileText className="h-3.5 w-3.5" />, onSelect: onOpenTitleBlock },
    { separator: true },
    { label: 'Custom Tool…', icon: <Wrench className="h-3.5 w-3.5" />, onSelect: onOpenCustomToolModal },
    { label: 'Template Gallery…', icon: <FolderOpen className="h-3.5 w-3.5" />, onSelect: onOpenTemplates },
    { separator: true },
    { label: 'Map Street Outlines…', icon: <Map className="h-3.5 w-3.5" />, onSelect: openMapPanel },
    { label: `Page Size: ${currentPageDef.shortLabel}…`, icon: <FileText className="h-3.5 w-3.5" />, onSelect: openPageSizePanel },
  ];

  const toolsMenu: MenuEntry[] = [
    { label: 'Print / PDF Setup…', icon: <Settings2 className="h-3.5 w-3.5" />, onSelect: onOpenOutputSettings },
    { label: 'Export A4 PDF…', icon: <Download className="h-3.5 w-3.5" />, onSelect: onOpenExport },
    { label: 'Print Preview…', icon: <Printer className="h-3.5 w-3.5" />, onSelect: onOpenExport },
    { separator: true },
    { label: 'Map Configuration…', icon: <Map className="h-3.5 w-3.5" />, onSelect: openMapPanel },
    { label: 'Keyboard Shortcuts…', icon: <Keyboard className="h-3.5 w-3.5" />, onSelect: onOpenShortcuts },
  ];

  const helpMenu: MenuEntry[] = [
    { label: 'Keyboard Shortcuts…', shortcut: '?', icon: <Keyboard className="h-3.5 w-3.5" />, onSelect: onOpenShortcuts },
    { separator: true },
    ...(onOpenAboutDeveloper ? [{ label: 'About Developer…', icon: <User className="h-3.5 w-3.5 text-red-500" />, onSelect: onOpenAboutDeveloper }] : []),
    ...(onOpenAppVersion ? [{ label: 'App Version & Downloads…', icon: <Package className="h-3.5 w-3.5 text-sky-500" />, onSelect: onOpenAppVersion }] : []),
    { separator: true },
    { hint: `PowerLine Designer v${APP_VERSION}` },
    { hint: 'Desktop, Phone & Web CAD' },
  ];

  return (
    <header className="relative z-30 shrink-0 select-none border-b border-slate-200 bg-white text-slate-700 shadow-xs">
      {/* Row 1: Software menu bar */}
      <div className="flex min-h-9 flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-slate-100 px-1.5 py-0.5 sm:px-2">
        <button
          type="button"
          onClick={onOpenTemplates}
          className="flex h-7 items-center gap-1.5 rounded px-1 transition-opacity hover:opacity-85"
          title="Browse saved drawing templates"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-red-600 text-white shadow-xs">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <span className="hidden whitespace-nowrap text-[12px] font-bold tracking-tight text-slate-900 sm:inline">
            PowerLine Designer
          </span>
          <span className="hidden whitespace-nowrap font-mono text-[9px] tracking-wide text-slate-400 lg:inline">
            v2.8
          </span>
        </button>

        {/* Quick access toolbar (duplicated in the ribbon on phones) */}
        <div className="hidden items-center gap-0.5 sm:flex">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-40"
            title="Save to local storage (Ctrl+S)"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />

        <nav ref={menuBarRef} role="menubar" aria-label="Application menu" className="flex items-center gap-0 sm:gap-0.5">
          {menuButton('file', 'File', fileMenu)}
          {menuButton('edit', 'Edit', editMenu)}
          {menuButton('view', 'View', viewMenu)}
          {menuButton('insert', 'Insert', insertMenu)}
          {menuButton('tools', 'Tools', toolsMenu)}
          {menuButton('help', 'Help', helpMenu)}
        </nav>

        <div className="ml-auto flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={onOpenProjectSetup}
            className="hidden h-7 max-w-[260px] items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 text-left transition-colors hover:bg-red-100 xl:flex"
            title="Configure Application No., PO No., Drawing Name, Location, Agency & CCC"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-red-600" />
            <span className="min-w-0 truncate text-[11px] font-semibold text-slate-800">
              {project.metadata.title || project.title || 'Untitled drawing'}
            </span>
          </button>

          <div ref={pageSizeMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowPageSizeMenu((visible) => !visible)}
              className="flex h-7 items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-800 transition-colors hover:bg-sky-100"
              title={`${currentPageDef.label} · ${currentPageDef.dimensionsMm} — fixed 1:1 drawing sheet`}
            >
              <FileText className="h-3.5 w-3.5 text-sky-600" />
              <span>{currentPageDef.shortLabel.split(' ')[0]}</span>
              <ChevronDown className="h-3 w-3 text-sky-600" />
            </button>

            {showPageSizeMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-2xl animate-in fade-in slide-in-from-top-1">
                <div className="mb-1 flex items-center justify-between border-b border-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                  <span>Select Page Size</span>
                  <span className="font-mono font-bold text-emerald-700">1:1 Canvas Lock</span>
                </div>
                <div className="space-y-1">
                  {ALL_PAGE_SIZES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectPageSize?.(p.id);
                        setShowPageSizeMenu(false);
                      }}
                      className={`flex w-full flex-col rounded-lg p-2 text-left transition-colors ${
                        (project.metadata.sheetSize || 'A4') === p.id
                          ? 'bg-sky-600 font-bold text-white'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{p.label}</span>
                        <span className="font-mono text-[10px] opacity-80">{p.width} × {p.height} px</span>
                      </div>
                      <span className="mt-0.5 text-[10px] opacity-75">{p.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenShortcuts}
            className="hidden rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>

          {/* App Version & Downloads Badge */}
          {onOpenAppVersion && (
            <button
              type="button"
              onClick={onOpenAppVersion}
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700 transition-colors hover:bg-red-100 hover:border-red-300"
              title="PowerLine Designer App Version & Cross-Platform Installers"
            >
              <Package className="h-3 w-3 text-red-600" />
              <span>v{APP_VERSION}</span>
            </button>
          )}

          {/* About Developer Button */}
          {onOpenAboutDeveloper && (
            <button
              type="button"
              onClick={onOpenAboutDeveloper}
              className="hidden rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
              title="About the Developer"
            >
              <User className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Single-line ribbon. Drawing tools live in the left tool rail/drawer;
          the ribbon is reserved for document setup, tool attributes and output. */}
      <div className="flex h-12 items-center gap-0 overflow-x-auto bg-slate-50/70 px-1.5">
        {/* File actions stay in the menu bar on desktop; phones get them here. */}
        <div className="flex h-full shrink-0 lg:hidden">
          <RibbonGroup label="File">
            <RibbonButton
              icon={<PanelLeft className="h-3.5 w-3.5" />}
              label="All Tools"
              title="Open the full CAD tool drawer"
              onClick={onOpenToolDrawer}
            />
            <RibbonButton icon={<Plus className="h-3.5 w-3.5" />} label="New" title="Create a new blank drawing" onClick={onCreateDrawing} />
            <RibbonButton icon={<FolderOpen className="h-3.5 w-3.5" />} label="Open" title="Open a saved drawing" onClick={onOpenSavedProjects} />
            <RibbonButton icon={<Save className="h-3.5 w-3.5" />} label={isSaving ? 'Saved' : 'Save'} title="Save drawing to local storage (Ctrl+S)" onClick={onSave} disabled={isSaving} />
            {onSavePld && (
              <RibbonButton icon={<Save className="h-3.5 w-3.5 text-red-600" />} label=".PLD Save" title="Save stateful .pld file to drive" onClick={onSavePld} />
            )}
            {onOpenPld && (
              <RibbonButton icon={<FolderOpen className="h-3.5 w-3.5 text-sky-600" />} label=".PLD Open" title="Open .pld file from drive" onClick={onOpenPld} />
            )}
            <RibbonButton icon={<HardDrive className="h-3.5 w-3.5" />} label={`Drawings ${savedProjectsCount}`} title="Manage saved drawings" onClick={onOpenSavedProjects} />
          </RibbonGroup>
        </div>

        <RibbonGroup label="Edit">
          <RibbonButton icon={<Undo2 className="h-3.5 w-3.5" />} label="Undo" title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
          <RibbonButton icon={<Redo2 className="h-3.5 w-3.5" />} label="Redo" title="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />
          <RibbonButton icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" title="Delete selected items (Del)" onClick={onDeleteSelected} disabled={!hasSelection} />
        </RibbonGroup>

        <RibbonGroup label="Page Setup">
          <RibbonButton
            icon={<Settings2 className="h-3.5 w-3.5" />}
            label="Page Setup"
            title="Page size, sheet format, project and drawing details"
            onClick={onOpenProjectSetup}
          />
          <RibbonButton
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Title Block"
            title="Edit the title block and sign-off details"
            onClick={onOpenTitleBlock}
          />
        </RibbonGroup>

        <RibbonGroup label="Tool Attributes">
          <div ref={attributesTriggerRef}>
            <RibbonButton
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              label="Attributes"
              title="Active tool defaults, road style/width and selected object attributes"
              onClick={openAttributesPanel}
              active={showAttributesMenu}
            />
          </div>
          <RibbonButton
            icon={<Wrench className="h-3.5 w-3.5" />}
            label="Custom Tool"
            title="Create a custom drawing tool and its BOQ attributes"
            onClick={onOpenCustomToolModal}
          />
        </RibbonGroup>

        <RibbonGroup label="Settings">
          <RibbonButton icon={<Grid className="h-3.5 w-3.5" />} label={showGrid ? 'Grid' : 'Grid Off'} title={`Toggle drafting grid (G) · ${gridType === 'lines' ? 'mesh lines' : 'dots'}`} onClick={onToggleGrid} active={showGrid} />
          {showGrid && (
            <RibbonButton icon={<Grid className="h-3.5 w-3.5 rotate-45" />} label="Style" title="Switch between dot and mesh grid" onClick={onToggleGridType} />
          )}
          <RibbonButton icon={<Magnet className="h-3.5 w-3.5" />} label="Snap" title="Toggle 20 px grid snap" onClick={onToggleSnap} active={snapEnabled} />
          <RibbonButton icon={isDarkCanvas ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />} label={isDarkCanvas ? 'Light' : 'Dark'} title="Toggle canvas theme" onClick={onToggleDarkCanvas} />
          <RibbonButton icon={<Maximize className="h-3.5 w-3.5" />} label="Fit" title="Fit drawing to screen (F)" onClick={onFitToScreen} />
        </RibbonGroup>

        <RibbonGroup label="Map">
          <RibbonButton icon={<Map className="h-3.5 w-3.5" />} label={showMap ? 'Map ON' : 'Map'} title="Toggle GIS map underlay (M)" onClick={onToggleMap} active={showMap} />
          <button
            ref={mapTriggerRef}
            type="button"
            onClick={() => {
              if (showMapMenu) {
                setShowMapMenu(false);
              } else {
                openMapPanel();
              }
            }}
            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors ${
              showMapMenu
                ? 'border-sky-300 bg-sky-50 text-sky-800'
                : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white'
            }`}
            title="Map layers, streets, opacity and print settings"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">Map Setup</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </RibbonGroup>

        <RibbonGroup label="Output">
          <RibbonButton icon={<Settings2 className="h-3.5 w-3.5" />} label="Print" title="Print setup: configure drawing canvas and PDF output" onClick={onOpenOutputSettings} />
          <RibbonButton icon={<Download className="h-3.5 w-3.5" />} label="Export PDF" title="Export A4 landscape PDF" onClick={onOpenExport} accent="danger" />
          {onOpenAppVersion && (
            <RibbonButton icon={<Package className="h-3.5 w-3.5 text-red-600" />} label="Installers" title="Download Windows, Android, Mac, Linux installers" onClick={onOpenAppVersion} />
          )}
        </RibbonGroup>
      </div>

      {/* Tool Attributes Panel */}
      {showAttributesMenu && (
        <div
          ref={attributesMenuRef}
          className="absolute right-2 top-full z-50 mt-1 max-h-[calc(100dvh-110px)] w-[min(340px,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-1"
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-sky-600" />
              <span>Tool Attributes</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAttributesMenu(false)}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="Close tool attributes"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                Active tool
              </div>
              <div className="truncate text-sm font-semibold text-slate-900">
                {getToolLabel(activeTool)}
              </div>
            </div>
            <span className="ml-2 shrink-0 rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700 shadow-xs">
              {activeTool === 'select' || activeTool === 'pan' ? 'NAV' : 'DRAW'}
            </span>
          </div>

          {roadToolActive && (
            <section className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Road defaults
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700">Line style</span>
                <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => onRoadLineStyleChange('single')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      roadLineStyle === 'single'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    1 line
                  </button>
                  <button
                    type="button"
                    onClick={() => onRoadLineStyleChange('double')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      roadLineStyle === 'double'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    2 lines
                  </button>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                  <span>Road width</span>
                  <span className="font-mono text-slate-500">{roadWidth} px</span>
                </span>
                <input
                  type="range"
                  min={4}
                  max={120}
                  step={2}
                  value={roadWidth}
                  onChange={(event) => onRoadWidthChange(Number(event.target.value))}
                  className="mt-1.5 w-full accent-sky-600"
                />
              </label>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Applies to new freeform and straight roads. Width is used by the 2-line style.
              </p>
            </section>
          )}

          {(activeTool === 'service_cable' || activeTool === 'service_cable_3ph') && (
            <section className="mb-3 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Service Cable System
                </span>
                <span className="rounded bg-purple-200 px-1.5 py-0.2 font-mono text-[10px] font-bold text-purple-900">
                  {activeTool === 'service_cable_3ph' ? '3-Phase' : '1-Phase'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal mb-2">
                {activeTool === 'service_cable_3ph'
                  ? '3-Phase 4-Core Armoured service line for commercial, industrial, or high-load consumers.'
                  : 'Single Phase 2-Core service line for domestic and general consumer connections.'}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectTool('service_cable')}
                  className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold border transition-colors ${
                    activeTool === 'service_cable'
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  1-Phase (2C)
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTool('service_cable_3ph')}
                  className={`flex-1 py-1.5 text-center rounded-lg text-xs font-bold border transition-colors ${
                    activeTool === 'service_cable_3ph'
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  3-Phase (4C)
                </button>
              </div>
            </section>
          )}

          {selectedEntities.length > 0 && (
            <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Selected attributes
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                  {selectedEntities.length} selected
                </span>
              </div>
              {selectionRows.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {selectionRows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="text-slate-500">{label}</span>
                      <span className="min-w-0 truncate text-right font-semibold text-slate-800">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  {selectedEntities.length > 1
                    ? 'Multiple objects selected. Use the property inspector to edit them together.'
                    : 'This item has no editable attributes in the ribbon. Use the property inspector.'}
                </p>
              )}
              <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                Full editing is available in the property panel.
              </p>
            </section>
          )}

          {!roadToolActive && selectedEntities.length === 0 && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold text-slate-700">
                {activeTool === 'select'
                  ? 'Nothing selected'
                  : 'This tool has no adjustable defaults'}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                {activeTool === 'select'
                  ? 'Select an object on the sheet to see its attributes here and in the property panel.'
                  : 'Placed attributes are edited after drawing by selecting the object on the sheet.'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => {
                onSelectTool('select');
                setShowAttributesMenu(false);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Switch to Select
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenProjectSetup();
                setShowAttributesMenu(false);
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Page Setup
            </button>
          </div>
        </div>
      )}

      {/* GIS Map Configuration Panel */}
      {showMapMenu && (
        <div
          ref={mapMenuRef}
          className="absolute right-2 top-full z-50 mt-1 w-[320px] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-110px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-1"
        >
          <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-900">
              <Map className="h-4 w-4 text-sky-600" />
              <span>GIS Map Configuration</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleMap}
                className={`rounded px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                  showMap ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {showMap ? 'ACTIVE' : 'DISABLED'}
              </button>
              <button
                type="button"
                onClick={() => setShowMapMenu(false)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Close map settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Map Imagery</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              OpenStreetMap
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-[11px] font-semibold text-slate-600">
              Local map features · canvas &amp; printed map
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {([
                ['roads', 'Road geometry'],
                ['rivers', 'Rivers & waterways'],
                ['streetNames', 'Street names'],
                ['placeNames', 'Buildings & places'],
                ['crossings', 'Road/river crossings'],
                ['wbPlaces', 'WB geo places (offline)'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={mapFeatures[key]}
                    onChange={(event) => onMapFeatureChange(key, event.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">Add street outlines to canvas</span>
              <span className="text-[10px] text-slate-500">{availableMapRoads.length} available</span>
            </div>
            {availableMapRoads.length > 0 ? (
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {availableMapRoads.map((road) => (
                  <label key={road.id} className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedMapRoadIds.includes(road.id)}
                      onChange={() => onToggleMapRoadSelection(road)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="truncate">{road.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[10px] leading-relaxed text-slate-500">
                Turn on the map and zoom in to load selectable OpenStreetMap road outlines.
              </p>
            )}
            <button
              type="button"
              disabled={selectedMapRoadIds.length === 0}
              onClick={onAddSelectedMapRoads}
              className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Add selected streets ({selectedMapRoadIds.length})
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
            <div>
              <div className="text-[11px] font-semibold text-slate-700">
                {mapLocked ? 'Map view locked' : 'Map view editable'}
              </div>
              <div className="text-[10px] text-slate-500">
                {mapLocked ? 'Saved with this drawing; unlock to reposition' : 'Pan or zoom, then lock to save this view'}
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleMapLock}
              aria-pressed={mapLocked}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                mapLocked
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              {mapLocked ? 'Unlock map' : 'Lock map'}
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
            <div>
              <div className="text-[11px] font-semibold text-slate-700">Include map in print</div>
              <div className="text-[10px] text-slate-500">Off by default · PDF and Print Sheet</div>
            </div>
            <button
              type="button"
              onClick={onTogglePrintMap}
              aria-pressed={printIncludeMap}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                printIncludeMap
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {printIncludeMap ? 'ON' : 'OFF'}
            </button>
          </div>

          {printIncludeMap && onPrintMapOpacityChange && (
            <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50/60 p-2.5">
              <div className="mb-1 flex justify-between text-[11px] text-slate-700">
                <span className="font-semibold">Print Map Opacity</span>
                <span className="font-mono font-bold text-sky-700">{printMapOpacity ?? mapOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={printMapOpacity ?? mapOpacity}
                onChange={(event) => onPrintMapOpacityChange(Number(event.target.value))}
                className="w-full cursor-pointer accent-sky-600"
                title="Map opacity for print & PDF export"
              />
            </div>
          )}

          {onToggleMapLayerPosition && (
            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Layer Placement
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => mapLayerPosition !== 'underlay' && onToggleMapLayerPosition()}
                  className={`rounded-lg py-1 font-medium ${
                    mapLayerPosition === 'underlay' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Under CAD Lines
                </button>
                <button
                  type="button"
                  onClick={() => mapLayerPosition !== 'overlay' && onToggleMapLayerPosition()}
                  className={`rounded-lg py-1 font-medium ${
                    mapLayerPosition === 'overlay' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Over CAD Lines
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 flex justify-between text-[11px] text-slate-500">
              <span>Transparency / Opacity</span>
              <span className="font-mono font-bold text-sky-700">{mapOpacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={mapOpacity}
              onChange={(event) => onMapOpacityChange(Number(event.target.value))}
              className="w-full cursor-pointer accent-sky-600"
            />
          </div>
        </div>
      )}
    </header>
  );
};
