import React, { useEffect, useState } from 'react';
import { DrawingProject } from '../../types/electrical';
import { FilePlus2, Layers, Sparkles, Trash2, X } from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  templates: DrawingProject[];
  onClose: () => void;
  onSelectProject: (project: DrawingProject) => void;
  onDeleteTemplate: (templateId: string) => boolean;
  onCreateNewDrawing: () => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  templates,
  onClose,
  onSelectProject,
  onDeleteTemplate,
  onCreateNewDrawing,
}) => {
  const [savedTemplates, setSavedTemplates] = useState(templates);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedTemplates(templates);
      setDeleteConfirmation(null);
    }
  }, [isOpen, templates]);

  if (!isOpen) return null;

  const handleDelete = (templateId: string) => {
    if (deleteConfirmation !== templateId) {
      setDeleteConfirmation(templateId);
      return;
    }
    if (onDeleteTemplate(templateId)) {
      setSavedTemplates((current) => current.filter((template) => template.id !== templateId));
      setDeleteConfirmation(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92dvh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600 shrink-0" />
              Saved Drawing Templates
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Reusable templates you saved from your drawings. Old bundled sample templates have been removed.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCreateNewDrawing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              <FilePlus2 className="w-4 h-4" />
              <span className="hidden sm:inline">New Drawing</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              aria-label="Close templates"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          {savedTemplates.length === 0 ? (
            <div className="min-h-48 flex flex-col items-center justify-center text-center">
              <Sparkles className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-800">No saved templates yet</h3>
              <p className="max-w-md text-xs text-slate-500 mt-1">
                Open My Drawings and choose “Save as template” on a drawing to keep a reusable copy here.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Go to My Drawings
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedTemplates.map((template) => (
                <article key={template.id} className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{template.nodes.length} poles/structures</span>
                      <span>·</span>
                      <span>{template.edges.length} conductor spans</span>
                    </div>
                    <h3 className="mt-1 font-semibold text-sm text-slate-900 break-words">
                      {template.title}
                    </h3>
                    {template.metadata.location && (
                      <p className="mt-1 text-xs text-slate-500 break-words">{template.metadata.location}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => onSelectProject(template)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                    >
                      Use Template
                    </button>
                    {deleteConfirmation === template.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(template.id)}
                        title="Delete template"
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
