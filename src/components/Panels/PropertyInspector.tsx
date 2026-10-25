/**
 * Property Inspector Dock
 * Context-sensitive property editor for single or multiple selected entities
 */

import React from 'react';
import {
  ConductorEdge,
  AnnotationItem,
  CrossingFeature,
  DrawingProject,
  ElectricalNode,
  SelectedItem,
  StayItem,
  MapRoadOutline,
  RoadLineStyle,
  ServiceCableCore,
  ServiceCableMaterial,
  ServiceCableArmour,
  ServiceCableSqmm,
} from '../../types/electrical';
import { Compass, Layers, MapPin, RotateCw, Trash2, X, Zap } from 'lucide-react';
import { formatGps } from '../../utils/geoReference';
import {
  SERVICE_CABLE_PRESETS,
  formatServiceCableShort,
  normalizeServiceCableSpec,
} from '../../utils/serviceCableUtils';
import { getRoadLabelPlacement } from '../../utils/geometry';

interface PropertyInspectorProps {
  selectedEntities: SelectedItem[];
  project: DrawingProject;
  onUpdateProject: (updated: DrawingProject) => void;
  onClose: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  selectedEntities,
  project,
  onUpdateProject,
  onClose,
}) => {
  if (!selectedEntities || selectedEntities.length === 0) return null;

  // MULTI-SELECTION VIEW (More than 1 item selected)
  if (selectedEntities.length > 1) {
    const selectedIds = new Set(selectedEntities.map((e) => e.id));
    const nodeCount = selectedEntities.filter((e) => e.type === 'node').length;
    const edgeCount = selectedEntities.filter((e) => e.type === 'edge').length;
    const stayCount = selectedEntities.filter((e) => e.type === 'stay').length;
    const crossingCount = selectedEntities.filter((e) => e.type === 'crossing').length;
    const annotationCount = selectedEntities.filter((e) => e.type === 'annotation').length;
    const mapRoadCount = selectedEntities.filter((e) => e.type === 'mapRoad').length;

    const handleBatchStatus = (status: 'proposed' | 'existing') => {
      const updatedNodes = project.nodes.map((n) =>
        selectedIds.has(n.id) ? { ...n, status } : n
      );
      const updatedEdges = project.edges.map((e) =>
        selectedIds.has(e.id) ? { ...e, status } : e
      );
      const updatedStays = project.stays.map((s) =>
        selectedIds.has(s.id) ? { ...s, status } : s
      );

      onUpdateProject({
        ...project,
        nodes: updatedNodes,
        edges: updatedEdges,
        stays: updatedStays,
        updatedAt: new Date().toISOString(),
      });
    };

    const handleBatchDelete = () => {
      const updatedNodes = project.nodes.filter((n) => !selectedIds.has(n.id));
      const remainingNodeIds = new Set(updatedNodes.map((n) => n.id));

      const updatedEdges = project.edges.filter(
        (e) =>
          !selectedIds.has(e.id) &&
          remainingNodeIds.has(e.fromNodeId) &&
          remainingNodeIds.has(e.toNodeId)
      );
      const updatedStays = project.stays.filter(
        (s) => !selectedIds.has(s.id) && remainingNodeIds.has(s.poleId)
      );
      const updatedCrossings = project.crossings.filter((c) => !selectedIds.has(c.id));
      const updatedAnnotations = project.annotations.filter((annotation) => !selectedIds.has(annotation.id));
      const updatedMapRoadOutlines = (project.mapRoadOutlines || []).filter((road) => !selectedIds.has(road.id));

      onUpdateProject({
        ...project,
        nodes: updatedNodes,
        edges: updatedEdges,
        stays: updatedStays,
        crossings: updatedCrossings,
        annotations: updatedAnnotations,
        mapRoadOutlines: updatedMapRoadOutlines,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    };

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-white uppercase tracking-wider">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Multi-Selection ({selectedEntities.length})</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
            {nodeCount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Poles & Structures:</span>
                <strong className="text-white">{nodeCount}</strong>
              </div>
            )}
            {edgeCount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Conductor Lines:</span>
                <strong className="text-white">{edgeCount}</strong>
              </div>
            )}
            {stayCount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Stay Sets:</span>
                <strong className="text-white">{stayCount}</strong>
              </div>
            )}
            {crossingCount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Crossings:</span>
                <strong className="text-white">{crossingCount}</strong>
              </div>
            )}
            {annotationCount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Street Labels:</span>
                <strong className="text-white">{annotationCount}</strong>
              </div>
            )}
            {mapRoadCount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Street Outlines:</span>
                <strong className="text-white">{mapRoadCount}</strong>
              </div>
            )}
          </div>

          {/* Batch Status Change */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Set Status for All Selected</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBatchStatus('proposed')}
                className="py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium text-xs shadow transition-colors"
              >
                All Proposed
              </button>
              <button
                onClick={() => handleBatchStatus('existing')}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium text-xs transition-colors"
              >
                All Existing
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/50 rounded-lg text-[11px] text-slate-400 leading-tight">
            💡 Drag any selected node to move all selected entities together. Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">Del</kbd> to delete.
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={handleBatchDelete}
            className="w-full py-2 bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected Items ({selectedEntities.length})</span>
          </button>
        </div>
      </div>
    );
  }

  // SINGLE SELECTION VIEW
  const selectedEntity = selectedEntities[0];

  // Selected Node
  if (selectedEntity.type === 'node') {
    const node = project.nodes.find((n) => n.id === selectedEntity.id);
    if (!node) return null;

    const handleUpdateNode = (updated: Partial<ElectricalNode>) => {
      const updatedNodes = project.nodes.map((n) =>
        n.id === node.id ? { ...n, ...updated } : n
      );
      onUpdateProject({ ...project, nodes: updatedNodes, updatedAt: new Date().toISOString() });
    };

    const handleUpdateProps = (props: Partial<ElectricalNode['properties']>) => {
      const updatedNodes = project.nodes.map((n) =>
        n.id === node.id ? { ...n, properties: { ...n.properties, ...props } } : n
      );
      onUpdateProject({ ...project, nodes: updatedNodes, updatedAt: new Date().toISOString() });
    };

    const handleDelete = () => {
      const updatedNodes = project.nodes.filter((n) => n.id !== node.id);
      const updatedEdges = project.edges.filter(
        (e) => e.fromNodeId !== node.id && e.toNodeId !== node.id
      );
      const updatedStays = project.stays.filter((s) => s.poleId !== node.id);
      onUpdateProject({
        ...project,
        nodes: updatedNodes,
        edges: updatedEdges,
        stays: updatedStays,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    };

    const isFourPoleStructure = node.type === 'four_pole';
    const defaultDtrCapacity =
      node.type === 'dtr_63kva' ? 63 : node.type === 'dtr_100kva' ? 100 : 25;
    const dtrCapacityValue =
      node.properties.capacityKva ?? (isFourPoleStructure ? '' : defaultDtrCapacity);

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="font-semibold text-xs text-white uppercase tracking-wider">
            {node.type.replace('_', ' ')}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Status (Existing vs Proposed) */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Status</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-lg">
              <button
                onClick={() => handleUpdateNode({ status: 'proposed' })}
                className={`py-1 text-xs rounded font-medium ${
                  node.status === 'proposed' ? 'bg-red-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Proposed
              </button>
              <button
                onClick={() => handleUpdateNode({ status: 'existing' })}
                className={`py-1 text-xs rounded font-medium ${
                  node.status === 'existing' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'
                }`}
              >
                Existing
              </button>
            </div>
          </div>

          {/* GPS Position */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/55 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
              <MapPin className="h-3.5 w-3.5" />
              <span>GPS Position</span>
            </div>
            <div className="mt-1 font-mono text-[11px] font-semibold leading-relaxed text-slate-200">
              {formatGps(node.gps)}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">
              Auto-captured from the drawing sheet map calibration and updated when the pole moves.
            </p>
          </div>

          {/* Pole Number */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Pole Number / ID</label>
            <input
              type="text"
              value={node.properties.poleNumber || ''}
              onChange={(e) => handleUpdateProps({ poleNumber: e.target.value })}
              placeholder="e.g. P-1, EX-2"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Height */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Height</label>
            <select
              value={node.properties.height || '8M'}
              onChange={(e) => handleUpdateProps({ height: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            >
              <option value="8M">8 Meter PCC</option>
              <option value="9M">9 Meter PCC</option>
              <option value="10M">10 Meter</option>
              <option value="11M">11 Meter</option>
            </select>
          </div>

          {/* Transformer Capacity */}
          {(node.type === 'dtr_25kva' ||
            node.type === 'dtr_63kva' ||
            node.type === 'dtr_100kva' ||
            node.type === 'dtr_conversion' ||
            isFourPoleStructure) && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isFourPoleStructure ? 'Mounted DTR Capacity (kVA)' : 'DTR Capacity (kVA)'}
              </label>
              <select
                value={String(dtrCapacityValue)}
                onChange={(e) =>
                  handleUpdateProps({
                    capacityKva: e.target.value ? (Number(e.target.value) as any) : undefined,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              >
                {isFourPoleStructure && <option value="">No DTR mounted</option>}
                <option value={25}>25 kVA DTR</option>
                <option value={63}>63 kVA DTR</option>
                <option value={100}>100 kVA DTR</option>
                <option value={160}>160 kVA DTR</option>
                <option value={250}>250 kVA DTR</option>
              </select>
              {isFourPoleStructure && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Select the transformer rating mounted on this structure; it is added to the BOQ.
                </p>
              )}
            </div>
          )}

          {/* Consumer House Details */}
          {node.type === 'consumer_house' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Consumer Name</label>
                <input
                  type="text"
                  value={node.properties.consumerName || ''}
                  onChange={(e) => handleUpdateProps({ consumerName: e.target.value })}
                  placeholder="e.g. PAPAI BARMAN"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={node.properties.consumerPhone || ''}
                  onChange={(e) => handleUpdateProps({ consumerPhone: e.target.value })}
                  placeholder="e.g. 7679166515"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
            </>
          )}

          {/* Service Connections Count (S/C) */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Service Connections (S/C)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={node.properties.serviceConnectionCount || ''}
              onChange={(e) => handleUpdateProps({ serviceConnectionCount: Number(e.target.value) || undefined })}
              placeholder="e.g. 4 for S/C-4"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Direct Label */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Direct Label</label>
            <input
              type="text"
              value={node.label || ''}
              onChange={(e) => handleUpdateNode({ label: e.target.value })}
              placeholder="e.g. PROP. 25 KVA DTR"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={handleDelete}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Entity</span>
          </button>
        </div>
      </div>
    );
  }

  // Selected Conductor Edge
  if (selectedEntity.type === 'edge') {
    const edge = project.edges.find((e) => e.id === selectedEntity.id);
    if (!edge) return null;
    const currentSpec = normalizeServiceCableSpec(edge.serviceCableSpec);

    const handleUpdateEdge = (updated: Partial<ConductorEdge>) => {
      const updatedEdges = project.edges.map((e) =>
        e.id === edge.id ? { ...e, ...updated } : e
      );
      onUpdateProject({ ...project, edges: updatedEdges, updatedAt: new Date().toISOString() });
    };

    const handleDelete = () => {
      const updatedEdges = project.edges.filter((e) => e.id !== edge.id);
      onUpdateProject({ ...project, edges: updatedEdges, updatedAt: new Date().toISOString() });
      onClose();
    };

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="font-semibold text-xs text-white uppercase tracking-wider">
            {edge.type.replace('_', ' ')}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Status</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-lg">
              <button
                onClick={() => handleUpdateEdge({ status: 'proposed' })}
                className={`py-1 text-xs rounded font-medium ${
                  edge.status === 'proposed' ? 'bg-red-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Proposed
              </button>
              <button
                onClick={() => handleUpdateEdge({ status: 'existing' })}
                className={`py-1 text-xs rounded font-medium ${
                  edge.status === 'existing' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'
                }`}
              >
                Existing
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Conductor Type</label>
            <select
              value={edge.type}
              onChange={(e) => handleUpdateEdge({ type: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            >
              <option value="acsr_4wire">ACSR 50 sq.mm 3-Phase 4-Wire</option>
              <option value="acsr_3wire">ACSR 50 sq.mm 3-Wire</option>
              <option value="acsr_2wire">ACSR 50 sq.mm 2-Wire</option>
              <option value="lt_ab_cable">LT AB Cable</option>
              <option value="service_cable">Service Cable to House</option>
              <option value="phase_conversion">Phase Conversion 1-Ph to 3-Ph</option>
              <option value="cradle_guard">Cradle Guard upto 50M</option>
              <option value="ht_oh_line">Existing HT-OH Line</option>
            </select>
          </div>

          {/* Service Cable Specification (Single Phase vs 3 Phase, Cores, sq.mm, Armour) */}
          {edge.type === 'service_cable' && (
            <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Zap className="h-3.5 w-3.5 text-purple-400" />
                  Service Cable Specification
                </span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-purple-200">
                  {formatServiceCableShort(currentSpec)}
                </span>
              </div>

              {/* Phase Selection: Single Phase vs Three Phase */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Phase System
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextSpec = normalizeServiceCableSpec({
                        ...currentSpec,
                        phase: '1_phase',
                        core: '2_core',
                        sizeSqmm: currentSpec.sizeSqmm || '6',
                      });
                      handleUpdateEdge({ serviceCableSpec: nextSpec });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      currentSpec.phase === '1_phase'
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    1-Phase (Single)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSpec = normalizeServiceCableSpec({
                        ...currentSpec,
                        phase: '3_phase',
                        core: '4_core',
                        sizeSqmm: currentSpec.sizeSqmm === '2.5' || currentSpec.sizeSqmm === '4' ? '16' : currentSpec.sizeSqmm,
                        armour: 'Armoured',
                      });
                      handleUpdateEdge({ serviceCableSpec: nextSpec });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      currentSpec.phase === '3_phase'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    3-Phase (Three)
                  </button>
                </div>
              </div>

              {/* Core Count Selection */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Number of Cores
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['2_core', '4_core', '3.5_core'] as ServiceCableCore[]).map((cr) => (
                    <button
                      key={cr}
                      type="button"
                      onClick={() => {
                        const nextSpec = normalizeServiceCableSpec({
                          ...currentSpec,
                          core: cr,
                          phase: cr === '2_core' ? '1_phase' : '3_phase',
                        });
                        handleUpdateEdge({ serviceCableSpec: nextSpec });
                      }}
                      className={`py-1 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                        currentSpec.core === cr
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cr === '2_core' ? '2-Core' : cr === '4_core' ? '4-Core' : '3.5-Core'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conductor Cross Section Size (sq.mm) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Conductor Size (sq.mm)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['2.5', '4', '6', '10', '16', '25', '35', '50'] as ServiceCableSqmm[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        const nextSpec = normalizeServiceCableSpec({ ...currentSpec, sizeSqmm: sz });
                        handleUpdateEdge({ serviceCableSpec: nextSpec });
                      }}
                      className={`py-1 rounded-md text-[11px] font-mono font-bold border transition-colors ${
                        currentSpec.sizeSqmm === sz
                          ? 'bg-purple-600 border-purple-400 text-white shadow-xs'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sz} mm²
                    </button>
                  ))}
                </div>
              </div>

              {/* Conductor Material & Armouring */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Conductor
                  </label>
                  <select
                    value={currentSpec.material || 'Al'}
                    onChange={(e) => {
                      const nextSpec = normalizeServiceCableSpec({
                        ...currentSpec,
                        material: e.target.value as ServiceCableMaterial,
                      });
                      handleUpdateEdge({ serviceCableSpec: nextSpec });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="Al">Aluminium (Al)</option>
                    <option value="Cu">Copper (Cu)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Armouring
                  </label>
                  <select
                    value={currentSpec.armour || 'Unarmoured'}
                    onChange={(e) => {
                      const nextSpec = normalizeServiceCableSpec({
                        ...currentSpec,
                        armour: e.target.value as ServiceCableArmour,
                      });
                      handleUpdateEdge({ serviceCableSpec: nextSpec });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="Unarmoured">Unarmoured (PVC)</option>
                    <option value="Armoured">Armoured (XLPE/PVC)</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Quick Standard Presets
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const preset = SERVICE_CABLE_PRESETS.find((p) => p.id === e.target.value);
                    if (preset) {
                      handleUpdateEdge({ serviceCableSpec: { ...preset.spec } });
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-red-500"
                >
                  <option value="" disabled>Select utility standard preset…</option>
                  {SERVICE_CABLE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Span Distance (Meters)</label>
            <input
              type="number"
              value={edge.spanMeters || 40}
              onChange={(e) => handleUpdateEdge({ spanMeters: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Manual Span Label Override</label>
            <input
              type="text"
              value={edge.manualSpanOverride || ''}
              onChange={(e) => handleUpdateEdge({ manualSpanOverride: e.target.value })}
              placeholder="e.g. 45 M, 10 MTR"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Service / Feature Label</label>
            <input
              type="text"
              value={edge.label || ''}
              onChange={(e) => handleUpdateEdge({ label: e.target.value })}
              placeholder="e.g. S/C-6, RIVER SPAN"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={handleDelete}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Conductor</span>
          </button>
        </div>
      </div>
    );
  }

  // Selected Stay Item
  if (selectedEntity.type === 'stay') {
    const stay = project.stays.find((s) => s.id === selectedEntity.id);
    if (!stay) return null;

    const handleUpdateStay = (updated: Partial<StayItem>) => {
      const updatedStays = project.stays.map((s) =>
        s.id === stay.id ? { ...s, ...updated } : s
      );
      onUpdateProject({ ...project, stays: updatedStays, updatedAt: new Date().toISOString() });
    };

    const handleDelete = () => {
      const updatedStays = project.stays.filter((s) => s.id !== stay.id);
      onUpdateProject({ ...project, stays: updatedStays, updatedAt: new Date().toISOString() });
      onClose();
    };

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="font-semibold text-xs text-white uppercase tracking-wider">
            {stay.type.replace('_', ' ')}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Stay Type</label>
            <select
              value={stay.type}
              onChange={(e) => handleUpdateStay({ type: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
            >
              <option value="ht_stay">HT Stay Set</option>
              <option value="lt_stay">LT Stay Set</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Stay Count (Sets)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={stay.count || 1}
              onChange={(e) => handleUpdateStay({ count: Number(e.target.value) || 1 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Angle (Degrees: 0 - 360°)</label>
            <input
              type="range"
              min="0"
              max="360"
              value={stay.angle || 0}
              onChange={(e) => handleUpdateStay({ angle: Number(e.target.value) })}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="text-right text-[11px] font-mono text-slate-400">{stay.angle}°</div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={handleDelete}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Stay</span>
          </button>
        </div>
      </div>
    );
  }

  // Selected Crossing Feature
  if (selectedEntity.type === 'crossing') {
    const crossing = project.crossings.find((c) => c.id === selectedEntity.id);
    if (!crossing) return null;

    const handleUpdateCrossing = (updated: Partial<CrossingFeature>) => {
      const updatedCrossings = project.crossings.map((c) =>
        c.id === crossing.id ? { ...c, ...updated } : c
      );
      onUpdateProject({ ...project, crossings: updatedCrossings, updatedAt: new Date().toISOString() });
    };

    const handleDelete = () => {
      const updatedCrossings = project.crossings.filter((c) => c.id !== crossing.id);
      onUpdateProject({ ...project, crossings: updatedCrossings, updatedAt: new Date().toISOString() });
      onClose();
    };

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="font-semibold text-xs text-white uppercase tracking-wider">
            {crossing.type.toUpperCase()} CROSSING
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Crossing Name</label>
            <input
              type="text"
              value={crossing.name || ''}
              onChange={(e) => handleUpdateCrossing({ name: e.target.value })}
              placeholder="e.g. RIVER CROSSING, NH ROAD"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Width (px)</label>
            <input
              type="number"
              value={crossing.width || 100}
              onChange={(e) => handleUpdateCrossing({ width: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Length / Span Height (px)</label>
            <input
              type="number"
              value={crossing.height || 200}
              onChange={(e) => handleUpdateCrossing({ height: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono"
            />
          </div>

          {/* Crossing Rotation Controls */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Crossing Rotation</span>
              </span>
              <span className="font-mono text-xs font-bold text-sky-400">
                {crossing.rotation || 0}°
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={crossing.rotation || 0}
              onChange={(e) => handleUpdateCrossing({ rotation: Number(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />

            <div className="grid grid-cols-5 gap-1">
              {[0, 45, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => handleUpdateCrossing({ rotation: deg })}
                  className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    (crossing.rotation || 0) === deg
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={handleDelete}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Crossing</span>
          </button>
        </div>
      </div>
    );
  }

  if (selectedEntity.type === 'annotation') {
    const annotation = project.annotations.find((item) => item.id === selectedEntity.id);
    if (!annotation) return null;

    const currentRotation = annotation.rotation || 0;

    const updateAnnotation = (updated: Partial<AnnotationItem>) => {
      onUpdateProject({
        ...project,
        annotations: project.annotations.map((item) =>
          item.id === annotation.id ? { ...item, ...updated } : item
        ),
        updatedAt: new Date().toISOString(),
      });
    };
    const deleteAnnotation = () => {
      onUpdateProject({
        ...project,
        annotations: project.annotations.filter((item) => item.id !== annotation.id),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    };

    const setNormalizedRotation = (deg: number) => {
      let normalized = Math.round(deg) % 360;
      if (normalized < 0) normalized += 360;
      updateAnnotation({ rotation: normalized });
    };

    const stepRotation = (delta: number) => {
      setNormalizedRotation(currentRotation + delta);
    };

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="font-semibold text-xs text-white uppercase tracking-wider">Street / Custom Label</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3.5 text-xs">
          <label className="block text-[11px] text-slate-400">
            Label text
            <input
              autoFocus
              type="text"
              value={annotation.text}
              onChange={(event) => updateAnnotation({ text: event.target.value })}
              placeholder="e.g. STATION ROAD, FEEDER-1"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-2 text-xs text-slate-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-slate-400">
              Text size (px)
              <input
                type="number"
                min="6"
                max="96"
                value={annotation.fontSize}
                onChange={(event) => updateAnnotation({ fontSize: Math.max(6, Number(event.target.value)) })}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 font-mono"
              />
            </label>
            <div className="flex flex-col justify-end pb-1.5">
              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annotation.isBold ?? false}
                  onChange={(event) => updateAnnotation({ isBold: event.target.checked })}
                  className="rounded accent-sky-500"
                />
                Bold text
              </label>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Label Rotation</span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={currentRotation}
                  onChange={(e) => setNormalizedRotation(Number(e.target.value))}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold text-sky-400 focus:outline-none focus:border-sky-500"
                />
                <span className="font-mono text-xs text-sky-400">°</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={currentRotation}
              onChange={(e) => setNormalizedRotation(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />

            {/* Steppers */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepRotation(-15)}
                className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors"
                title="Rotate -15 degrees"
              >
                -15°
              </button>
              <button
                type="button"
                onClick={() => stepRotation(-90)}
                className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors"
                title="Rotate -90 degrees"
              >
                -90°
              </button>
              <button
                type="button"
                onClick={() => stepRotation(15)}
                className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors"
                title="Rotate +15 degrees"
              >
                +15°
              </button>
              <button
                type="button"
                onClick={() => stepRotation(90)}
                className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors"
                title="Rotate +90 degrees"
              >
                +90°
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[0, 45, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setNormalizedRotation(deg)}
                  className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    currentRotation === deg
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={deleteAnnotation}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Label
          </button>
        </div>
      </div>
    );
  }

  if (selectedEntity.type === 'mapRoad') {
    const road = (project.mapRoadOutlines || []).find((item) => item.id === selectedEntity.id);
    if (!road) return null;
    const updateRoad = (updated: Partial<MapRoadOutline>) => {
      onUpdateProject({
        ...project,
        mapRoadOutlines: (project.mapRoadOutlines || []).map((item) =>
          item.id === road.id ? { ...item, ...updated } : item
        ),
        updatedAt: new Date().toISOString(),
      });
    };
    const deleteRoad = () => {
      onUpdateProject({
        ...project,
        mapRoadOutlines: (project.mapRoadOutlines || []).filter((item) => item.id !== road.id),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    };

    // Calculate auto alignment angle from road geometry
    const placement = getRoadLabelPlacement(road.points);
    const autoAngle = placement ? placement.angle : 0;
    const effectiveRotation = road.labelRotation !== undefined ? road.labelRotation : autoAngle;
    const isAutoAligned = road.labelRotation === undefined;

    const setNormalizedRotation = (deg: number) => {
      let normalized = Math.round(deg) % 360;
      if (normalized < 0) normalized += 360;
      updateRoad({ labelRotation: normalized });
    };

    const stepRotation = (delta: number) => {
      setNormalizedRotation(effectiveRotation + delta);
    };

    return (
      <div className="w-full h-[25dvh] min-h-32 lg:h-full lg:w-72 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="font-semibold text-xs text-white uppercase tracking-wider">Map Street Outline</div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <label className="block text-[11px] text-slate-400">
            Street name
            <input
              type="text"
              value={road.name}
              onChange={(event) => updateRoad({ name: event.target.value })}
              placeholder="e.g. NH-31, FALAKATA ROAD"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-2 text-xs text-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={road.showLabel !== false}
              onChange={(e) => updateRoad({ showLabel: e.target.checked })}
              className="rounded accent-sky-500"
            />
            Show street name on canvas
          </label>

          {road.showLabel !== false && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Street Label Rotation</span>
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={effectiveRotation}
                    onChange={(e) => setNormalizedRotation(Number(e.target.value))}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold text-sky-400 focus:outline-none focus:border-sky-500"
                  />
                  <span className="font-mono text-xs text-sky-400">°</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={effectiveRotation}
                onChange={(e) => setNormalizedRotation(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepRotation(-15)}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors"
                  title="Rotate -15 degrees"
                >
                  -15°
                </button>
                <button
                  type="button"
                  onClick={() => stepRotation(15)}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-mono transition-colors"
                  title="Rotate +15 degrees"
                >
                  +15°
                </button>
                <button
                  type="button"
                  onClick={() => updateRoad({ labelRotation: undefined })}
                  className={`px-2 py-1 border rounded text-[10px] font-medium transition-colors ${
                    isAutoAligned
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                  title="Reset to road natural angle"
                >
                  Auto ({autoAngle}°)
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1 pt-1">
                {[0, 45, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setNormalizedRotation(deg)}
                    className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                      !isAutoAligned && effectiveRotation === deg
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>

              <label className="block text-[11px] text-slate-400 pt-1">
                Label font size
                <input
                  type="number"
                  min="8"
                  max="48"
                  value={road.labelFontSize ?? 12}
                  onChange={(e) => updateRoad({ labelFontSize: Math.max(8, Number(e.target.value)) })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-100 font-mono"
                />
              </label>
            </div>
          )}

          <label className="block text-[11px] text-slate-400">
            Road drawing
            <select
              value={road.lineStyle ?? 'single'}
              onChange={(event) =>
                updateRoad({ lineStyle: event.target.value as RoadLineStyle })
              }
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-2 text-xs text-slate-100"
            >
              <option value="single">Single line (centerline)</option>
              <option value="double">Two lines (both road edges)</option>
            </select>
          </label>
          {road.lineStyle === 'double' && (
            <label className="block text-[11px] text-slate-400">
              Road width (canvas units)
              <input
                type="number"
                min={4}
                max={120}
                value={road.roadWidth ?? 16}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) {
                    updateRoad({ roadWidth: Math.min(120, Math.max(4, next)) });
                  }
                }}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-2 text-xs text-slate-100 font-mono"
              />
            </label>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={deleteRoad}
            className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Street Outline
          </button>
        </div>
      </div>
    );
  }

  return null;
};
