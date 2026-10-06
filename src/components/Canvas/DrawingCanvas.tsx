/**
 * Interactive SVG Drawing Canvas Engine
 * Implements User Requirements:
 * - Canvas is fixed in size after selecting page size (Page size and canvas size are strictly identical 1:1)
 * - Canvas cannot zoom out less than the viewing area (minZoom = fitZoom to viewport)
 * - When zoomed in, it can be dragged smoothly by the Hand Tool (H / Spacebar / Middle-click)
 * - Map size and canvas size are strictly identical (Map renders inside canvas sheet bounds)
 * - Real-time Google Maps zoom with continuous sub-tile scaling (Levels 12 to 20)
 * - Area / Location search with instant navigation and "Place Canvas Here" action
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveTool,
  CanvasBounds,
  ConductorEdge,
  CustomToolDefinition,
  DrawingProject,
  ElectricalNode,
  GeoLocation,
  SelectedItem,
  StayItem,
  SheetSizeType,
} from '../../types/electrical';
import { distance, pixelDistanceToSpanMeters, snapPointToGrid } from '../../utils/geometry';
import { ConductorRenderer } from './ConductorRenderer';
import { CrossingRenderer } from './CrossingRenderer';
import { GridBackground } from './GridBackground';
import { MapUnderlay } from './MapUnderlay';
import { NodeRenderer } from './NodeRenderer';
import { StayRenderer } from './StayRenderer';
import { LocationSearchBar } from '../Toolbar/LocationSearchBar';
import {
  ALL_PAGE_SIZES,
  PAGE_SIZE_DEFINITIONS,
  getCanvasBoundsForPageSize,
} from '../../constants/pageSizes';
import {
  Crosshair,
  FileText,
  Hand,
  Layers,
  Map,
  Move,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface DrawingCanvasProps {
  project: DrawingProject;
  activeTool: ActiveTool;
  showGrid: boolean;
  snapEnabled: boolean;
  gridType: 'dots' | 'lines';
  isDarkCanvas: boolean;
  selectedEntities: SelectedItem[];
  onSelectEntities: (entities: SelectedItem[]) => void;
  onUpdateProject: (updated: DrawingProject) => void;
  showMap: boolean;
  mapOpacity: number;
  mapType: 'satellite' | 'roadmap' | 'terrain' | 'osm';
  mapLocked: boolean;
  mapLayerPosition?: 'underlay' | 'overlay';
  onMapTypeChange?: (type: 'satellite' | 'roadmap' | 'terrain' | 'osm') => void;
  onMapOpacityChange?: (opacity: number) => void;
  onToggleMap?: () => void;
  onSelectLocation?: (loc: GeoLocation) => void;
  onCursorMove?: (x: number, y: number) => void;
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (zoom: number) => void;
  onPanChange: (panX: number, panY: number) => void;
  onSelectTool?: (tool: ActiveTool) => void;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isShift: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  project,
  activeTool,
  showGrid,
  snapEnabled,
  gridType,
  isDarkCanvas,
  selectedEntities,
  onSelectEntities,
  onUpdateProject,
  showMap,
  mapOpacity,
  mapType,
  mapLocked,
  mapLayerPosition = 'underlay',
  onMapTypeChange,
  onMapOpacityChange,
  onToggleMap,
  onSelectLocation,
  onCursorMove,
  zoom,
  panX,
  panY,
  onZoomChange,
  onPanChange,
  onSelectTool,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Requirement: Canvas size is FIXED to selected page size (1:1 lock)
  const currentSheetSize: SheetSizeType = project.metadata.sheetSize || 'A4';
  const currentPageDef = PAGE_SIZE_DEFINITIONS[currentSheetSize] || PAGE_SIZE_DEFINITIONS.A4;

  const canvasBounds: CanvasBounds = project.canvasBounds && project.canvasBounds.width === currentPageDef.width
    ? project.canvasBounds
    : getCanvasBoundsForPageSize(currentSheetSize, project.canvasBounds);

  // Viewport tracking for minimum zoom calculation
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportSize({ width: rect.width || 1200, height: rect.height || 800 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Requirement: "canvas not zoom out less then the viewing area"
  const fitZoom = Math.min(
    viewportSize.width / Math.max(canvasBounds.width, 100),
    viewportSize.height / Math.max(canvasBounds.height, 100)
  );
  const minZoom = fitZoom;
  const isZoomedIn = zoom > minZoom + 0.005;

  // Spacebar tracking for Hand Tool pan
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Enforce minZoom: if current zoom is less than viewing area fit, lock to minZoom & center
  useEffect(() => {
    if (zoom < minZoom - 0.005) {
      const centerPanX = (viewportSize.width - canvasBounds.width * minZoom) / 2 - canvasBounds.x * minZoom;
      const centerPanY = (viewportSize.height - canvasBounds.height * minZoom) / 2 - canvasBounds.y * minZoom;
      onZoomChange(minZoom);
      onPanChange(centerPanX, centerPanY);
    }
  }, [minZoom, zoom, viewportSize, canvasBounds, onZoomChange, onPanChange]);

  // Google Maps Base Zoom Level State
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(project.mapSettings?.zoomLevel || 16);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState<boolean>(false);

  // Moving Canvas on Map State
  const [isMovingCanvasMode, setIsMovingCanvasMode] = useState<boolean>(false);
  const [moveWithElements, setMoveWithElements] = useState<boolean>(true);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [canvasDragStart, setCanvasDragStart] = useState<{ mouseX: number; mouseY: number; originX: number; originY: number }>({
    mouseX: 0,
    mouseY: 0,
    originX: 0,
    originY: 0,
  });
  const [initialEntityOffsets, setInitialEntityOffsets] = useState<{
    nodes: { [id: string]: { x: number; y: number } };
    stays: { [id: string]: { anchorX: number; anchorY: number } };
    crossings: { [id: string]: { x: number; y: number } };
    annotations: { [id: string]: { x: number; y: number } };
  }>({ nodes: {}, stays: {}, crossings: {}, annotations: {} });

  // Viewport Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dragging Nodes State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragInitialPositions, setDragInitialPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [dragStartCursor, setDragStartCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Line Drafting State
  const [lineStartNodeId, setLineStartNodeId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Marquee Drag Selection Box
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Quick lookup set for selected IDs
  const selectedIdSet = new Set(selectedEntities.map((e) => e.id));
  const isSelected = (id: string) => selectedIdSet.has(id);

  // Convert client viewport coordinates to canvas coordinates
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - panX) / zoom;
      const y = (clientY - rect.top - panY) / zoom;
      return { x, y };
    },
    [panX, panY, zoom]
  );

  // Native wheel handler: Clamps zoom so canvas CANNOT zoom out less than viewing area
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zooming with Ctrl + Scroll
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        const targetZoom = zoom * zoomFactor;
        const newZoom = Math.min(Math.max(targetZoom, minZoom), 5.0);

        const rect = container.getBoundingClientRect();

        if (newZoom <= minZoom + 0.002) {
          // Locked to minimum zoom (fits viewing area exactly)
          const centerPanX = (rect.width - canvasBounds.width * minZoom) / 2 - canvasBounds.x * minZoom;
          const centerPanY = (rect.height - canvasBounds.height * minZoom) / 2 - canvasBounds.y * minZoom;
          onZoomChange(minZoom);
          onPanChange(centerPanX, centerPanY);
        } else {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
          const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);

          onZoomChange(newZoom);
          onPanChange(newPanX, newPanY);
        }
      } else {
        // Normal scroll: pan canvas viewport
        onPanChange(panX - e.deltaX, panY - e.deltaY);
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [zoom, minZoom, panX, panY, canvasBounds, onZoomChange, onPanChange]);

  // Center Canvas on current viewport
  const handleCenterCanvasOnView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentFit = Math.min(rect.width / canvasBounds.width, rect.height / canvasBounds.height);
    const targetZoom = Math.max(zoom, currentFit);

    const centerPanX = (rect.width - canvasBounds.width * targetZoom) / 2 - canvasBounds.x * targetZoom;
    const centerPanY = (rect.height - canvasBounds.height * targetZoom) / 2 - canvasBounds.y * targetZoom;

    onZoomChange(targetZoom);
    onPanChange(centerPanX, centerPanY);
  }, [zoom, canvasBounds, onZoomChange, onPanChange]);

  // Reset View to Fit Viewport Exactly (minZoom)
  const handleFitToViewport = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentFit = Math.min(rect.width / canvasBounds.width, rect.height / canvasBounds.height);

    const centerPanX = (rect.width - canvasBounds.width * currentFit) / 2 - canvasBounds.x * currentFit;
    const centerPanY = (rect.height - canvasBounds.height * currentFit) / 2 - canvasBounds.y * currentFit;

    onZoomChange(currentFit);
    onPanChange(centerPanX, centerPanY);
  }, [canvasBounds, onZoomChange, onPanChange]);

  // Handle Location Selected from Search Bar
  const handleLocationSelected = useCallback(
    (loc: GeoLocation) => {
      if (onSelectLocation) {
        onSelectLocation(loc);
      }
      onUpdateProject({
        ...project,
        metadata: {
          ...project.metadata,
          location: loc.name,
        },
        geoLocation: loc,
      });
    },
    [project, onUpdateProject, onSelectLocation]
  );

  // Place Canvas directly at searched location
  const handlePlaceCanvasAtLocation = useCallback(
    (loc: GeoLocation) => {
      handleLocationSelected(loc);
      handleFitToViewport();
    },
    [handleLocationSelected, handleFitToViewport]
  );

  // Page Size Change: Locks Canvas Size and Map Size 1:1 to selected Page Size
  const handleSelectPageSize = useCallback(
    (pageSizeId: SheetSizeType) => {
      const newBounds = getCanvasBoundsForPageSize(pageSizeId, canvasBounds);
      onUpdateProject({
        ...project,
        metadata: {
          ...project.metadata,
          sheetSize: pageSizeId,
        },
        canvasBounds: newBounds,
      });
      setShowPageSizeDropdown(false);
    },
    [project, canvasBounds, onUpdateProject]
  );

  // Start Canvas Repositioning Drag
  const handleStartCanvasMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingCanvas(true);
    const canvasPoint = clientToCanvas(e.clientX, e.clientY);
    setCanvasDragStart({
      mouseX: canvasPoint.x,
      mouseY: canvasPoint.y,
      originX: canvasBounds.x,
      originY: canvasBounds.y,
    });

    const nodeMap: { [id: string]: { x: number; y: number } } = {};
    project.nodes.forEach((n) => {
      nodeMap[n.id] = { x: n.x, y: n.y };
    });
    const crossMap: { [id: string]: { x: number; y: number } } = {};
    project.crossings.forEach((c) => {
      crossMap[c.id] = { x: c.x, y: c.y };
    });
    const annMap: { [id: string]: { x: number; y: number } } = {};
    project.annotations.forEach((a) => {
      annMap[a.id] = { x: a.x, y: a.y };
    });

    setInitialEntityOffsets({
      nodes: nodeMap,
      stays: {},
      crossings: crossMap,
      annotations: annMap,
    });
  };

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // Requirement: "if zoomed in it must be draged by hand tool"
    if (activeTool === 'pan' || isSpaceDown || e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    if (e.button !== 0) return; // Only primary button for drafting

    // If moving canvas mode is toggled, treat canvas click as canvas move
    if (isMovingCanvasMode) {
      handleStartCanvasMove(e);
      return;
    }

    const canvasPoint = clientToCanvas(e.clientX, e.clientY);
    const snapped = snapEnabled ? snapPointToGrid(canvasPoint, 20) : canvasPoint;

    // 1. Tool: Selection Tool -> Marquee Selection Box
    if (activeTool === 'select') {
      if (!e.shiftKey) {
        onSelectEntities([]);
      }
      setSelectionBox({
        startX: canvasPoint.x,
        startY: canvasPoint.y,
        currentX: canvasPoint.x,
        currentY: canvasPoint.y,
        isShift: e.shiftKey,
      });
      return;
    }

    // 2. Line drafting tools
    const isLineTool = [
      'acsr_2wire',
      'acsr_3wire',
      'acsr_4wire',
      'lt_ab_cable',
      'ht_ug_cable',
      'earth_wire',
      'jumper_connection',
    ].includes(activeTool);

    if (isLineTool && lineStartNodeId) {
      const targetNode = project.nodes.find((n) => distance(n, canvasPoint) < 25);
      if (targetNode && targetNode.id !== lineStartNodeId) {
        const spanDist = Math.round(distance(project.nodes.find((n) => n.id === lineStartNodeId)!, targetNode));
        const newEdge: ConductorEdge = {
          id: `edge-${Date.now()}`,
          fromNodeId: lineStartNodeId,
          toNodeId: targetNode.id,
          type: activeTool as any,
          spanMeters: pixelDistanceToSpanMeters(spanDist),
          status: 'proposed',
        };
        onUpdateProject({
          ...project,
          edges: [...project.edges, newEdge],
        });
        setLineStartNodeId(null);
      } else {
        setLineStartNodeId(null);
      }
      return;
    }

    // 3. Stays
    if (activeTool === 'ht_stay' || activeTool === 'lt_stay') {
      const nearestPole = project.nodes.find(
        (n) => n.type.startsWith('pole') || n.type === 'dp_structure' || n.type === 'four_pole'
      );
      if (nearestPole && distance(nearestPole, canvasPoint) < 80) {
        const angle = Math.round(
          (Math.atan2(snapped.y - nearestPole.y, snapped.x - nearestPole.x) * 180) / Math.PI
        );
        const newStay: StayItem = {
          id: `stay-${Date.now()}`,
          poleId: nearestPole.id,
          angle,
          length: 35,
          count: 1,
          type: activeTool === 'ht_stay' ? 'ht_stay' : 'lt_stay',
          status: 'proposed',
        };
        onUpdateProject({
          ...project,
          stays: [...project.stays, newStay],
        });
      }
      return;
    }

    // 4. Crossings
    if (activeTool === 'river_crossing' || activeTool === 'road_crossing' || activeTool === 'railway_crossing') {
      const crossingType =
        activeTool === 'river_crossing' ? 'river' : activeTool === 'road_crossing' ? 'road' : 'railway';
      const newCrossing = {
        id: `cross-${Date.now()}`,
        type: crossingType as any,
        name:
          crossingType === 'river'
            ? 'MUJNAI RIVER CROSSING'
            : crossingType === 'road'
            ? 'NH-31D ROAD CROSSING'
            : 'RAILWAY CROSSING',
        x: snapped.x - 70,
        y: snapped.y - 100,
        width: 140,
        height: 200,
        rotation: 0,
        spans: crossingType === 'river' ? ['50M', '60M', '32M'] : ['35M'],
      };
      onUpdateProject({
        ...project,
        crossings: [...project.crossings, newCrossing],
      });
      return;
    }

    // 5. Pole and Structure Placements
    const nodeTools = [
      'pole_8m',
      'pole_9m',
      'pole_single',
      'pole_rsj',
      'pole_stp',
      'dp_structure',
      'four_pole',
      'dtr_25kva',
      'dtr_63kva',
      'dtr_100kva',
      'dtr_conversion',
      'ab_switch',
      'hg_fuse',
      'lt_distribution_box',
      'lightning_arrester',
      'consumer_house',
      'commercial_facility',
      'landmark_religious',
      'landmark_school',
    ];

    if (nodeTools.includes(activeTool) || activeTool.startsWith('custom_')) {
      let customDef: CustomToolDefinition | undefined;
      if (activeTool.startsWith('custom_')) {
        const customId = activeTool.replace('custom_', '');
        customDef = project.customTools?.find((c) => c.id === customId);
      }

      const newNode: ElectricalNode = {
        id: `node-${Date.now()}`,
        type: customDef ? 'custom_symbol' : (activeTool as any),
        x: snapped.x,
        y: snapped.y,
        rotation: 0,
        status: customDef ? customDef.defaultStatus : 'proposed',
        customToolId: customDef?.id,
        properties: {
          poleNumber: `P-${project.nodes.length + 1}`,
          material: activeTool.includes('rsj') ? 'RSJ' : activeTool.includes('stp') ? 'STP' : 'PCC',
          height: activeTool.includes('8m') ? '8M' : '9M',
          capacityKva: activeTool.includes('25kva')
            ? 25
            : activeTool.includes('63kva')
            ? 63
            : activeTool.includes('100kva')
            ? 100
            : undefined,
          conversionCapacityKva: activeTool === 'dtr_conversion' ? 100 : undefined,
          customName: customDef?.name,
          customShape: customDef?.shape,
          customColor: customDef?.color,
        },
      };

      onUpdateProject({
        ...project,
        nodes: [...project.nodes, newNode],
      });
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPoint = clientToCanvas(e.clientX, e.clientY);
    setCursorPos(canvasPoint);
    if (onCursorMove) onCursorMove(Math.round(canvasPoint.x), Math.round(canvasPoint.y));

    // Requirement: Dragged by hand tool when zoomed in
    if (isPanning) {
      onPanChange(e.clientX - startPan.x, e.clientY - startPan.y);
      return;
    }

    // Dragging Canvas on Map (Reposition sheet)
    if (isDraggingCanvas) {
      const deltaX = Math.round(canvasPoint.x - canvasDragStart.mouseX);
      const deltaY = Math.round(canvasPoint.y - canvasDragStart.mouseY);

      const newCanvasBounds: CanvasBounds = {
        ...canvasBounds,
        x: canvasDragStart.originX + deltaX,
        y: canvasDragStart.originY + deltaY,
      };

      if (moveWithElements) {
        const updatedNodes = project.nodes.map((n) => {
          const init = initialEntityOffsets.nodes[n.id] || { x: n.x, y: n.y };
          return { ...n, x: init.x + deltaX, y: init.y + deltaY };
        });
        const updatedCrossings = project.crossings.map((c) => {
          const init = initialEntityOffsets.crossings[c.id] || { x: c.x, y: c.y };
          return { ...c, x: init.x + deltaX, y: init.y + deltaY };
        });
        const updatedAnnotations = project.annotations.map((a) => {
          const init = initialEntityOffsets.annotations[a.id] || { x: a.x, y: a.y };
          return { ...a, x: init.x + deltaX, y: init.y + deltaY };
        });

        onUpdateProject({
          ...project,
          canvasBounds: newCanvasBounds,
          nodes: updatedNodes,
          stays: project.stays,
          crossings: updatedCrossings,
          annotations: updatedAnnotations,
        });
      } else {
        onUpdateProject({
          ...project,
          canvasBounds: newCanvasBounds,
        });
      }
      return;
    }

    // Dragging Node(s)
    if (draggingNodeId && dragStartCursor) {
      const deltaX = canvasPoint.x - dragStartCursor.x;
      const deltaY = canvasPoint.y - dragStartCursor.y;

      const updatedNodes = project.nodes.map((n) => {
        const initial = dragInitialPositions[n.id];
        if (initial) {
          const target = { x: initial.x + deltaX, y: initial.y + deltaY };
          const snappedPos = snapEnabled ? snapPointToGrid(target, 20) : target;
          return { ...n, x: snappedPos.x, y: snappedPos.y };
        }
        return n;
      });

      onUpdateProject({
        ...project,
        nodes: updatedNodes,
      });
      return;
    }

    // Update Selection Marquee Box
    if (selectionBox) {
      setSelectionBox({
        ...selectionBox,
        currentX: canvasPoint.x,
        currentY: canvasPoint.y,
      });
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
    }

    // Finalize Marquee Selection Box
    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.currentX);
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const selectedItems: SelectedItem[] = [];

        project.nodes.forEach((n) => {
          if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) {
            selectedItems.push({ type: 'node', id: n.id });
          }
        });

        project.edges.forEach((e) => {
          const fn = project.nodes.find((n) => n.id === e.fromNodeId);
          const tn = project.nodes.find((n) => n.id === e.toNodeId);
          if (fn && tn) {
            const edgeMinX = Math.min(fn.x, tn.x);
            const edgeMaxX = Math.max(fn.x, tn.x);
            const edgeMinY = Math.min(fn.y, tn.y);
            const edgeMaxY = Math.max(fn.y, tn.y);

            const overlaps = !(edgeMaxX < minX || edgeMinX > maxX || edgeMaxY < minY || edgeMinY > maxY);
            if (overlaps) {
              selectedItems.push({ type: 'edge', id: e.id });
            }
          }
        });

        project.stays.forEach((st) => {
          const pole = project.nodes.find((n) => n.id === st.poleId);
          if (pole) {
            const rad = (st.angle * Math.PI) / 180;
            const endX = pole.x + Math.cos(rad) * (st.length || 30);
            const endY = pole.y + Math.sin(rad) * (st.length || 30);
            const inside =
              (endX >= minX && endX <= maxX && endY >= minY && endY <= maxY) ||
              (pole.x >= minX && pole.x <= maxX && pole.y >= minY && pole.y <= maxY);
            if (inside) {
              selectedItems.push({ type: 'stay', id: st.id });
            }
          }
        });

        project.crossings.forEach((c) => {
          const overlaps = !(c.x + c.width < minX || c.x > maxX || c.y + c.height < minY || c.y > maxY);
          if (overlaps) {
            selectedItems.push({ type: 'crossing', id: c.id });
          }
        });

        if (selectionBox.isShift) {
          const merged = [...selectedEntities];
          selectedItems.forEach((item) => {
            if (!merged.some((m) => m.id === item.id)) merged.push(item);
          });
          onSelectEntities(merged);
        } else {
          onSelectEntities(selectedItems);
        }
      }
      setSelectionBox(null);
    }

    setDraggingNodeId(null);
    setDragInitialPositions({});
  };

  // Node Click handler
  const handleNodeClick = (e: React.MouseEvent, node: ElectricalNode) => {
    e.stopPropagation();

    const isLineTool = [
      'acsr_2wire',
      'acsr_3wire',
      'acsr_4wire',
      'lt_ab_cable',
      'ht_ug_cable',
      'earth_wire',
      'jumper_connection',
    ].includes(activeTool);

    if (isLineTool) {
      if (!lineStartNodeId) {
        setLineStartNodeId(node.id);
      } else if (lineStartNodeId !== node.id) {
        const fromNode = project.nodes.find((n) => n.id === lineStartNodeId);
        if (fromNode) {
          const spanDist = Math.round(distance(fromNode, node));
          const newEdge: ConductorEdge = {
            id: `edge-${Date.now()}`,
            fromNodeId: lineStartNodeId,
            toNodeId: node.id,
            type: activeTool as any,
            spanMeters: pixelDistanceToSpanMeters(spanDist),
            status: 'proposed',
          };
          onUpdateProject({
            ...project,
            edges: [...project.edges, newEdge],
          });
          setLineStartNodeId(null);
        }
      }
      return;
    }

    if (activeTool === 'select') {
      if (e.shiftKey) {
        if (isSelected(node.id)) {
          onSelectEntities(selectedEntities.filter((item) => item.id !== node.id));
        } else {
          onSelectEntities([...selectedEntities, { type: 'node', id: node.id }]);
        }
      } else {
        onSelectEntities([{ type: 'node', id: node.id }]);
      }
    }
  };

  // Node Mouse Down handler for dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: ElectricalNode) => {
    if (e.button !== 0) return;
    if (activeTool === 'select') {
      e.stopPropagation();
      setDraggingNodeId(node.id);
      const canvasPoint = clientToCanvas(e.clientX, e.clientY);
      setDragStartCursor(canvasPoint);

      const nodesToDrag = isSelected(node.id)
        ? project.nodes.filter((n) => isSelected(n.id))
        : [node];

      const initialPositions: { [id: string]: { x: number; y: number } } = {};
      nodesToDrag.forEach((n) => {
        initialPositions[n.id] = { x: n.x, y: n.y };
      });
      setDragInitialPositions(initialPositions);

      if (!isSelected(node.id) && !e.shiftKey) {
        onSelectEntities([{ type: 'node', id: node.id }]);
      }
    }
  };

  const lineStartNode = project.nodes.find((n) => n.id === lineStartNodeId);

  // Dynamic Cursor
  const getCursorStyle = () => {
    if (isPanning) return 'cursor-grabbing';
    if (activeTool === 'pan' || isSpaceDown) return 'cursor-grab';
    if (isMovingCanvasMode) return 'cursor-move';
    if (activeTool === 'select') return 'cursor-default';
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden select-none bg-slate-950 ${getCursorStyle()}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. GIS Map Layer (Underlay: Map size and Canvas size are 100% Identical) */}
      {mapLayerPosition === 'underlay' && (
        <MapUnderlay
          isVisible={showMap}
          opacity={mapOpacity}
          mapType={mapType}
          locationName={project.metadata.location}
          geoLocation={project.geoLocation}
          zoom={zoom}
          fitZoom={fitZoom}
          panX={panX}
          panY={panY}
          isLocked={mapLocked}
          layerPosition="underlay"
          mapZoomLevel={mapZoomLevel}
          canvasBounds={canvasBounds}
          onMapZoomIn={() => setMapZoomLevel((prev) => Math.min(prev + 1, 19))}
          onMapZoomOut={() => setMapZoomLevel((prev) => Math.max(prev - 1, 12))}
          onMapZoomLevelChange={(lvl) => setMapZoomLevel(lvl)}
          onPlaceCanvasHere={handlePlaceCanvasAtLocation}
        />
      )}

      {/* 2. SVG Vector Drawing Canvas with Fixed Sheet Boundary */}
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0 pointer-events-auto"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* CAD Grid Mesh */}
        <GridBackground
          showGrid={showGrid}
          gridType={gridType}
          gridSize={20}
          isDarkCanvas={isDarkCanvas}
          isMapVisible={showMap}
        />

        {/* ---------------- FIXED CANVAS SHEET (LOCKED 1:1 TO PAGE SIZE) ---------------- */}
        <g id="cad-sheet-boundary">
          {/* Sheet Paper Surface */}
          <rect
            x={canvasBounds.x}
            y={canvasBounds.y}
            width={canvasBounds.width}
            height={canvasBounds.height}
            fill={
              showMap
                ? isDarkCanvas
                  ? '#090d16'
                  : '#ffffff'
                : isDarkCanvas
                ? '#0f172a'
                : '#ffffff'
            }
            fillOpacity={
              showMap
                ? canvasBounds.sheetFillOpacity !== undefined
                  ? canvasBounds.sheetFillOpacity
                  : 0.8
                : 1
            }
            stroke={showMap ? '#38bdf8' : isDarkCanvas ? '#334155' : '#94a3b8'}
            strokeWidth={showMap ? 2.5 : 1.5}
            className="transition-opacity pointer-events-none"
          />

          {/* Sheet Engineering Inner Margin (Standard 20mm left margin, 10mm other sides) */}
          <rect
            x={canvasBounds.x + 20}
            y={canvasBounds.y + 12}
            width={canvasBounds.width - 32}
            height={canvasBounds.height - 24}
            fill="none"
            stroke={isDarkCanvas ? '#475569' : '#cbd5e1'}
            strokeWidth="1.2"
            className="pointer-events-none"
          />

          {/* Top Banner on Sheet: Page Size & Canvas Fixed Lock Notice */}
          <g
            transform={`translate(${canvasBounds.x}, ${canvasBounds.y - 28})`}
            className="cursor-move"
            onMouseDown={handleStartCanvasMove}
          >
            <rect
              x="0"
              y="0"
              width={canvasBounds.width}
              height="28"
              fill={isMovingCanvasMode ? '#dc2626' : '#1e293b'}
              fillOpacity="0.95"
              rx="4"
              stroke={isMovingCanvasMode ? '#fca5a5' : '#334155'}
              strokeWidth="1"
            />
            <text
              x="12"
              y="18"
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              className="select-none font-sans"
            >
              📄 {currentPageDef.label} ({canvasBounds.width} × {canvasBounds.height} px) — Locked 1:1 with Page Size
            </text>
            <g transform={`translate(${canvasBounds.width - 240}, 6)`}>
              <rect x="0" y="0" width="228" height="16" fill="#0f172a" fillOpacity="0.6" rx="3" />
              <text x="114" y="12" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="bold">
                ✥ DRAG HERE TO MOVE SHEET ON MAP
              </text>
            </g>
          </g>

          {/* North Direction Arrow in Top-Right of Sheet */}
          <g transform={`translate(${canvasBounds.x + canvasBounds.width - 45}, ${canvasBounds.y + 35})`}>
            <circle cx="0" cy="0" r="14" fill="#1e293b" fillOpacity="0.8" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M 0 -11 L 4 3 L 0 1 L -4 3 Z" fill="#dc2626" />
            <path d="M 0 11 L 4 -3 L 0 -1 L -4 -3 Z" fill="#94a3b8" />
            <text x="0" y="-14" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#dc2626">
              N
            </text>
          </g>

          {/* Sheet Corner Registration Cut Marks */}
          {[
            { cx: canvasBounds.x, cy: canvasBounds.y },
            { cx: canvasBounds.x + canvasBounds.width, cy: canvasBounds.y },
            { cx: canvasBounds.x, cy: canvasBounds.y + canvasBounds.height },
            { cx: canvasBounds.x + canvasBounds.width, cy: canvasBounds.y + canvasBounds.height },
          ].map((pt, idx) => (
            <g key={idx} transform={`translate(${pt.cx}, ${pt.cy})`} className="pointer-events-none">
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#dc2626" strokeWidth="1" opacity="0.6" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#dc2626" strokeWidth="1" opacity="0.6" />
            </g>
          ))}
        </g>

        {/* 1. River and Road Crossings (Underneath conductors) */}
        {project.crossings.map((crossing) => (
          <CrossingRenderer
            key={crossing.id}
            crossing={crossing}
            isSelected={isSelected(crossing.id)}
            onSelect={(e, c) => {
              e.stopPropagation();
              if (e.shiftKey) {
                if (isSelected(c.id)) {
                  onSelectEntities(selectedEntities.filter((item) => item.id !== c.id));
                } else {
                  onSelectEntities([...selectedEntities, { type: 'crossing', id: c.id }]);
                }
              } else {
                onSelectEntities([{ type: 'crossing', id: c.id }]);
              }
            }}
          />
        ))}

        {/* 2. Conductor Edges */}
        {project.edges.map((edge) => {
          const fromNode = project.nodes.find((n) => n.id === edge.fromNodeId);
          const toNode = project.nodes.find((n) => n.id === edge.toNodeId);
          if (!fromNode || !toNode) return null;

          return (
            <ConductorRenderer
              key={edge.id}
              edge={edge}
              fromNode={fromNode}
              toNode={toNode}
              isSelected={isSelected(edge.id)}
              onSelect={(e, ed) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  if (isSelected(ed.id)) {
                    onSelectEntities(selectedEntities.filter((item) => item.id !== ed.id));
                  } else {
                    onSelectEntities([...selectedEntities, { type: 'edge', id: ed.id }]);
                  }
                } else {
                  onSelectEntities([{ type: 'edge', id: ed.id }]);
                }
              }}
            />
          );
        })}

        {/* 3. Stay Sets */}
        {project.stays.map((stay) => {
          const pole = project.nodes.find((n) => n.id === stay.poleId);
          if (!pole) return null;

          return (
            <StayRenderer
              key={stay.id}
              stay={stay}
              pole={pole}
              isSelected={isSelected(stay.id)}
              onSelect={(e, st) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  if (isSelected(st.id)) {
                    onSelectEntities(selectedEntities.filter((item) => item.id !== st.id));
                  } else {
                    onSelectEntities([...selectedEntities, { type: 'stay', id: st.id }]);
                  }
                } else {
                  onSelectEntities([{ type: 'stay', id: st.id }]);
                }
              }}
            />
          );
        })}

        {/* 4. Electrical Nodes (Poles, DTRs, Switchgear, Consumer Houses, Custom Symbols) */}
        {project.nodes.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            isSelected={isSelected(node.id)}
            onSelect={handleNodeClick}
            onMouseDown={handleNodeMouseDown}
          />
        ))}

        {/* 5. Custom Canvas Annotations */}
        {project.annotations.map((ann) => (
          <g
            key={ann.id}
            transform={`translate(${ann.x}, ${ann.y}) rotate(${ann.rotation || 0})`}
          >
            <text
              x="0"
              y="0"
              fontSize={ann.fontSize || 12}
              fontWeight={ann.isBold ? 'bold' : 'normal'}
              fill={ann.color || (isDarkCanvas ? '#f8fafc' : '#1e293b')}
              className="select-none pointer-events-none"
            >
              {ann.text}
            </text>
          </g>
        ))}

        {/* Active Line Drafting Rubber-band Preview */}
        {lineStartNode && (
          <g className="pointer-events-none">
            <line
              x1={lineStartNode.x}
              y1={lineStartNode.y}
              x2={cursorPos.x}
              y2={cursorPos.y}
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <g
              transform={`translate(${(lineStartNode.x + cursorPos.x) / 2}, ${(lineStartNode.y + cursorPos.y) / 2 - 12})`}
            >
              <rect x="-18" y="-7" width="36" height="14" fill="#ffffff" stroke="#dc2626" strokeWidth="1" rx="2" />
              <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#dc2626">
                {pixelDistanceToSpanMeters(distance(lineStartNode, cursorPos))} M
              </text>
            </g>
          </g>
        )}

        {/* Marquee Selection Box */}
        {selectionBox && (
          <rect
            x={Math.min(selectionBox.startX, selectionBox.currentX)}
            y={Math.min(selectionBox.startY, selectionBox.currentY)}
            width={Math.abs(selectionBox.currentX - selectionBox.startX)}
            height={Math.abs(selectionBox.currentY - selectionBox.startY)}
            fill="#3b82f6"
            fillOpacity="0.18"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            className="pointer-events-none"
          />
        )}
      </svg>

      {/* 3. GIS Map Layer (Overlay mode) */}
      {mapLayerPosition === 'overlay' && (
        <MapUnderlay
          isVisible={showMap}
          opacity={mapOpacity}
          mapType={mapType}
          locationName={project.metadata.location}
          geoLocation={project.geoLocation}
          zoom={zoom}
          fitZoom={fitZoom}
          panX={panX}
          panY={panY}
          isLocked={true}
          layerPosition="overlay"
          mapZoomLevel={mapZoomLevel}
          canvasBounds={canvasBounds}
          onMapZoomIn={() => setMapZoomLevel((prev) => Math.min(prev + 1, 19))}
          onMapZoomOut={() => setMapZoomLevel((prev) => Math.max(prev - 1, 12))}
          onMapZoomLevelChange={(lvl) => setMapZoomLevel(lvl)}
          onPlaceCanvasHere={handlePlaceCanvasAtLocation}
        />
      )}

      {/* ---------------- FLOATING CANVAS & MAP MANAGER CONTROLLER ---------------- */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2 px-3 flex items-center gap-2 text-xs text-slate-200">
          {/* Location Search Input */}
          <div className="w-64 sm:w-80">
            <LocationSearchBar
              compact={true}
              currentLocationName={project.metadata.location}
              onSelectLocation={handleLocationSelected}
              onPlaceCanvasHere={handlePlaceCanvasAtLocation}
            />
          </div>

          <div className="h-5 w-px bg-slate-700" />

          {/* Page Size Selector (Canvas Size & Map Size Locked 1:1) */}
          <div className="relative">
            <button
              onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700"
              title="Page Size & Canvas Sheet Size are 1:1 locked"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>{currentPageDef.shortLabel}</span>
            </button>

            {showPageSizeDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="font-bold text-white mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span>Page Size (1:1 Canvas Lock)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Fixed</span>
                </div>

                <div className="space-y-1">
                  {ALL_PAGE_SIZES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPageSize(p.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex flex-col transition-colors ${
                        currentSheetSize === p.id
                          ? 'bg-sky-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{p.label}</span>
                        <span className="text-[10px] font-mono opacity-80">{p.width} × {p.height}</span>
                      </div>
                      <span className="text-[9.5px] opacity-70 mt-0.5">{p.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Requirement: "if zoomed in it must be draged by hand tool" */}
          <button
            onClick={() => {
              if (onSelectTool) {
                onSelectTool(activeTool === 'pan' ? 'select' : 'pan');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
              activeTool === 'pan' || isSpaceDown
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 animate-pulse'
                : isZoomedIn
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60 hover:bg-amber-900/80'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Hand Tool: Drag to pan canvas when zoomed in (Key: H or hold Spacebar)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeTool === 'pan' ? 'Hand Active' : isZoomedIn ? 'Hand Pan (H)' : 'Hand (H)'}
            </span>
            {isZoomedIn && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>

          {/* Fit Viewport Button */}
          <button
            onClick={handleFitToViewport}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Fit Canvas Page to Viewing Area (Min Zoom)"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
          </button>

          {/* Move Canvas on Map Mode Toggle */}
          <button
            onClick={() => setIsMovingCanvasMode(!isMovingCanvasMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
              isMovingCanvasMode
                ? 'bg-red-600 text-white shadow-lg shadow-red-950 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Move Canvas mode: drag the sheet to position it over any area on the map"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isMovingCanvasMode ? 'Moving Sheet' : 'Move Sheet'}</span>
          </button>

          {/* Move with elements checkbox */}
          {isMovingCanvasMode && (
            <label className="flex items-center gap-1.5 text-[10px] text-amber-300 cursor-pointer bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/60">
              <input
                type="checkbox"
                checked={moveWithElements}
                onChange={(e) => setMoveWithElements(e.target.checked)}
                className="rounded accent-red-500"
              />
              <span>With Drawing</span>
            </label>
          )}

          <div className="h-5 w-px bg-slate-700" />

          {/* Map Quick Toggle */}
          {onToggleMap && (
            <button
              onClick={onToggleMap}
              className={`p-1.5 rounded-xl flex items-center gap-1 transition-colors ${
                showMap
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle GIS Map Layer (1:1 with Canvas Sheet)"
            >
              <Map className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono hidden lg:inline">{showMap ? 'Map ON' : 'Map OFF'}</span>
            </button>
          )}

          {/* Paper Sheet Opacity Toggle (Solid Paper / Translucent / Transparent) */}
          <button
            onClick={() => {
              const current = canvasBounds.sheetFillOpacity ?? 0.8;
              const next = current > 0.4 ? 0 : current === 0 ? 0.6 : 0.85;
              onUpdateProject({
                ...project,
                canvasBounds: {
                  ...canvasBounds,
                  sheetFillOpacity: next,
                },
              });
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Toggle Paper Sheet Transparency (Solid Paper / Translucent / Transparent Vectors on Map)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
