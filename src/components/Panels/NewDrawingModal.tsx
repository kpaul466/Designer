/**
 * New Drawing Confirmation & Workspace Prompt Modal
 * Prompts the user to Save Updates, Discard Updates, or Delete Previous Drawing
 * before initializing a new drawing and automatically opening Project Setup.
 */

import React from 'react';
import { DrawingProject } from '../../types/electrical';
import {
  AlertTriangle,
  Clock,
  FilePlus2,
  FileText,
  RotateCcw,
  Save,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface NewDrawingModalProps {
  isOpen: boolean;
  currentProject: DrawingProject;
  onSaveAndCreate: () => void;
  onDiscardAndCreate: () => void;
  onDeleteAndCreate: () => void;
  onClose: () => void;
}

export const NewDrawingModal: React.FC<NewDrawingModalProps> = ({
  isOpen,
  currentProject,
  onSaveAndCreate,
  onDiscardAndCreate,
  onDeleteAndCreate,
  onClose,
}) => {
  if (!isOpen) return null;

  const title =
    currentProject.title?.trim() ||
    currentProject.metadata.title?.trim() ||
    'Untitled Drawing';
  const nodesCount = currentProject.nodes?.length ?? 0;
  const edgesCount = currentProject.edges?.length ?? 0;
  const staysCount = currentProject.stays?.length ?? 0;
  const hasContent = nodesCount > 0 || edgesCount > 0 || staysCount > 0;
  const isMaintenance = currentProject.metadata.workType === 'maintenance_work';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/90 text-white shadow-lg shadow-red-950">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Drawing</h2>
              <p className="text-xs text-slate-400">
                Handle your current drawing before starting a new one
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Cancel new drawing"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5 text-xs">
          {/* Current Drawing Context Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-sky-400" />
                Current Workspace Drawing
              </span>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isMaintenance
                    ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {isMaintenance ? (
                  <>
                    <Wrench className="h-3 w-3" />
                    Maintenance
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3" />
                    New Work
                  </>
                )}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-white truncate">{title}</div>
              {currentProject.metadata.projectName && (
                <div className="text-[11px] text-slate-400 truncate">
                  {currentProject.metadata.projectName}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-slate-300">
                {nodesCount} symbols · {edgesCount} lines · {staysCount} stays
              </span>
              {currentProject.metadata.applicationNo && (
                <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-amber-300">
                  App #{currentProject.metadata.applicationNo}
                </span>
              )}
              {currentProject.updatedAt && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
                  <Clock className="h-3 w-3" />
                  {new Date(currentProject.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-300">
            How would you like to handle this drawing before starting your new drawing?
          </p>

          {/* Action Options */}
          <div className="space-y-2.5">
            {/* Option 1: Save & Create */}
            <button
              type="button"
              onClick={onSaveAndCreate}
              className="w-full group flex items-start gap-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-left transition-all hover:bg-emerald-500/15 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-950">
                <Save className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Save Updates &amp; Start New
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9.5px] font-semibold text-emerald-300">
                    Recommended
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Saves all changes to your offline catalog, then opens the new drawing configuration window.
                </p>
              </div>
            </button>

            {/* Option 2: Discard & Create */}
            <button
              type="button"
              onClick={onDiscardAndCreate}
              className="w-full group flex items-start gap-3.5 rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-left transition-all hover:bg-slate-800 hover:border-slate-500"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-slate-200">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
                  Discard Updates &amp; Start New
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {hasContent
                    ? 'Discards any unsaved workspace updates without saving to the catalog, then starts a new drawing.'
                    : 'Discards the current workspace and starts fresh with project setup.'}
                </p>
              </div>
            </button>

            {/* Option 3: Delete & Create */}
            <button
              type="button"
              onClick={onDeleteAndCreate}
              className="w-full group flex items-start gap-3.5 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-left transition-all hover:bg-red-500/15 hover:border-red-500"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/80 text-white">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-red-300 group-hover:text-red-200 transition-colors">
                    Delete Previous Drawing &amp; Start New
                  </span>
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Permanently deletes this drawing from your saved catalog and local storage, then opens project setup.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 bg-slate-900/90 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Cancel (Keep Current Drawing)
          </button>
        </div>
      </div>
    </div>
  );
};

