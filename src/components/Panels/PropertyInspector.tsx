/**
 * Property Inspector Dock
 * Context-sensitive property editor for single or multiple selected entities
 */

import React from 'react';
import {
  ConductorEdge,
  CrossingFeature,
  DrawingProject,
  ElectricalNode,
  SelectedItem,
  StayItem,
} from '../../types/electrical';
import { Layers, Trash2, X } from 'lucide-react';

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

      onUpdateProject({
        ...project,
        nodes: updatedNodes,
        edges: updatedEdges,
        stays: updatedStays,
        crossings: updatedCrossings,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    };

    return (
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
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

    return (
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
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
            node.type === 'dtr_conversion') && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">DTR Capacity (kVA)</label>
              <select
                value={node.properties.capacityKva || 25}
                onChange={(e) => handleUpdateProps({ capacityKva: Number(e.target.value) as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              >
                <option value={25}>25 kVA DTR</option>
                <option value={63}>63 kVA DTR</option>
                <option value={100}>100 kVA DTR</option>
                <option value={160}>160 kVA DTR</option>
                <option value={250}>250 kVA DTR</option>
              </select>
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
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
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
              <option value="phase_conversion">Phase Conversion 1-Ph to 3-Ph</option>
              <option value="cradle_guard">Cradle Guard upto 50M</option>
              <option value="ht_oh_line">Existing HT-OH Line</option>
            </select>
          </div>

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
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
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
      <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col text-slate-200 select-none z-20 shrink-0 overflow-y-auto">
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

  return null;
};
