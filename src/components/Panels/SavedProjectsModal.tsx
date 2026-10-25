/**
 * Saved Drawings & Local Storage Manager Modal
 * Allows engineers to manage multiple local CAD blueprints:
 * - Browse all drawings saved in browser localStorage
 * - Open, switch, and create new drawings
 * - Duplicate drawings for fast variation proposals
 * - Export and Import JSON backup files
 * - Delete old drawings
 */

import React, { useState, useEffect, useRef } from 'react';
import { DrawingProject } from '../../types/electrical';
import {
  getSavedProjectsCatalog,
  deleteProjectFromCatalog,
  duplicateProjectInCatalog,
  saveProjectAsTemplate,
  exportProjectAsJson,
  importProjectFromJson,
} from '../../services/localStorageService';
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  X,
  FileText,
  Calendar,
  Building2,
  MapPin,
  Check,
  HardDrive,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface SavedProjectsModalProps {
  isOpen: boolean;
  activeProjectId: string;
  onOpenProject: (project: DrawingProject) => void;
  onCreateNewDrawing: () => void;
  onClose: () => void;
}

export const SavedProjectsModal: React.FC<SavedProjectsModalProps> = ({
  isOpen,
  activeProjectId,
  onOpenProject,
  onCreateNewDrawing,
  onClose,
}) => {
  const [catalog, setCatalog] = useState<DrawingProject[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshCatalog = () => {
    setCatalog(getSavedProjectsCatalog());
  };

  useEffect(() => {
    if (isOpen) {
      refreshCatalog();
      setDeleteConfirmId(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = catalog.filter((p) => {
    const q = filterQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.metadata.applicationNo && p.metadata.applicationNo.toLowerCase().includes(q)) ||
      (p.metadata.poNumber && p.metadata.poNumber.toLowerCase().includes(q)) ||
      (p.metadata.location && p.metadata.location.toLowerCase().includes(q)) ||
      (p.metadata.agencyName && p.metadata.agencyName.toLowerCase().includes(q))
    );
  });

  const handleCreateNew = () => {
    onCreateNewDrawing();
  };

  const handleSaveTemplate = (project: DrawingProject) => {
    const result = saveProjectAsTemplate(project);
    if (result.success) {
      setSuccessMsg(result.message);
      setTimeout(() => setSuccessMsg(null), 2500);
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateProjectInCatalog(id);
    if (copy) {
      refreshCatalog();
      setSuccessMsg(`Created copy: "${copy.title}"`);
      setTimeout(() => setSuccessMsg(null), 2500);
    }
  };

  const handleDelete = (id: string) => {
    if (catalog.length <= 1) {
      setErrorMsg('Cannot delete the last remaining drawing.');
      return;
    }
    deleteProjectFromCatalog(id);
    refreshCatalog();
    setDeleteConfirmId(null);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importProjectFromJson(file);
      refreshCatalog();
      onOpenProject(imported);
      setSuccessMsg(`Imported drawing: "${imported.title}"`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to import JSON drawing file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:overflow-y-auto sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-slate-700 bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-4xl sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-800 bg-slate-900/95 p-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-950 sm:h-10 sm:w-10">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-white sm:text-base">
                <span>Local Drawings & Blueprints</span>
                <span className="rounded-full border border-emerald-800/60 bg-emerald-950 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  {catalog.length} Saved in LocalStorage
                </span>
              </h2>
              <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
                All drawings are securely stored inside your browser's local storage. No cloud login required.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-auto">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-red-500"
            >
              <Plus className="w-4 h-4" />
              <span>New Drawing</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close saved drawings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar & Actions */}
        <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-b border-slate-800 bg-slate-950/60 p-3 px-4 sm:flex-row sm:items-center sm:p-4 sm:px-6">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by drawing name, application no, PO no, or location..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Import JSON button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
              title="Import drawing from JSON backup file"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import JSON</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="flex shrink-0 items-center gap-2 border-b border-red-800 bg-red-950/80 px-4 py-2 text-xs text-red-200 sm:px-6">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex shrink-0 items-center gap-2 border-b border-emerald-800 bg-emerald-950/80 px-4 py-2 text-xs text-emerald-200 sm:px-6">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Drawings Grid */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No drawings found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for a different term or create a new drawing.
              </p>
            </div>
          ) : (
            filtered.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const nodeCount = proj.nodes.length;
              const edgeCount = proj.edges.length;

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                    isActive
                      ? 'bg-red-600/10 border border-red-500/40'
                      : 'hover:bg-slate-800/60 border border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md shadow-red-950'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-white truncate">{proj.title}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {proj.metadata.drawingNo && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                            {proj.metadata.drawingNo}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">
                            {proj.metadata.agencyName || 'Agency: N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{proj.metadata.location || 'Location: N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                        <div className="font-mono text-slate-300">
                          ⚡ {nodeCount} poles · {edgeCount} spans
                        </div>
                      </div>

                      {(proj.metadata.applicationNo || proj.metadata.poNumber) && (
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                          {proj.metadata.applicationNo && (
                            <span>App No: {proj.metadata.applicationNo}</span>
                          )}
                          {proj.metadata.poNumber && <span>PO No: {proj.metadata.poNumber}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-end md:self-center">
                    {!isActive ? (
                      <button
                        onClick={() => {
                          onOpenProject(proj);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Open Drawing
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Opened
                      </span>
                    )}

                    <button
                      onClick={() => handleDuplicate(proj.id)}
                      className="p-2 hover:bg-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
                      title="Duplicate this drawing"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSaveTemplate(proj)}
                      className="p-2 hover:bg-amber-950/80 bg-slate-800 text-slate-300 hover:text-amber-300 rounded-xl transition-colors"
                      title="Save this drawing as a reusable template"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => exportProjectAsJson(proj)}
                      className="p-2 hover:bg-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors"
                      title="Download JSON backup"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                    </button>

                    {deleteConfirmId === proj.id ? (
                      <div className="flex items-center gap-1 bg-red-950 p-1 rounded-xl border border-red-800">
                        <button
                          onClick={() => handleDelete(proj.id)}
                          className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(proj.id)}
                        className="p-2 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                        title="Delete drawing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
