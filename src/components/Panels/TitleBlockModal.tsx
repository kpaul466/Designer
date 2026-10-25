/**
 * Title Block & Project Metadata Editor Modal
 */

import React, { useEffect, useState } from 'react';
import { ProjectMetadata } from '../../types/electrical';
import { Check, X } from 'lucide-react';

interface TitleBlockModalProps {
  isOpen: boolean;
  metadata: ProjectMetadata;
  onSave: (updated: ProjectMetadata) => void;
  onClose: () => void;
}

export const TitleBlockModal: React.FC<TitleBlockModalProps> = ({
  isOpen,
  metadata,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<ProjectMetadata>({ ...metadata });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...metadata });
    }
  }, [isOpen, metadata]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ProjectMetadata, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-slate-700 bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 p-3 px-4 sm:p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white sm:text-base">Engineering Title Block & Details</h2>
            <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
              These details appear on the official A4 drawing sheet, legend, and export document.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Close title block">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs sm:p-5">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5 font-semibold">Work Classification</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('workType', 'new_work')}
                className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  (formData.workType ?? 'new_work') === 'new_work'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                New Work
              </button>
              <button
                type="button"
                onClick={() => handleChange('workType', 'maintenance_work')}
                className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  formData.workType === 'maintenance_work'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Maintenance Work
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Drawing Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-100"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Project Name</label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Drawing Number</label>
              <input
                type="text"
                value={formData.drawingNo}
                onChange={(e) => handleChange('drawingNo', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Application Number</label>
              <input
                type="text"
                value={formData.applicationNo}
                onChange={(e) => handleChange('applicationNo', e.target.value)}
                placeholder="e.g. 4003705061"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Consumer / Applicant Details */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Applicant / Consumer Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={formData.applicantName}
                  onChange={(e) => handleChange('applicantName', e.target.value)}
                  placeholder="e.g. ASHOK SAHA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.applicantPhone}
                  onChange={(e) => handleChange('applicantPhone', e.target.value)}
                  placeholder="e.g. 7602393385"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Address / Habitation</label>
                <input
                  type="text"
                  value={formData.applicantAddress}
                  onChange={(e) => handleChange('applicantAddress', e.target.value)}
                  placeholder="e.g. Satpukuriya, Falakata"
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Location & Authority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Location / Mouza</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Sub-Division / CCC</label>
              <input
                type="text"
                value={formData.subDivision}
                onChange={(e) => handleChange('subDivision', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-100"
              />
            </div>
          </div>

          {/* Engineering Sign-offs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              ['preparedBy', 'Prepared By (Surveyor)', 'preparedByOffice'],
              ['checkedBy', 'Checked By (JE / AE)', 'checkedByOffice'],
              ['approvedBy', 'Approved By (DE)', 'approvedByOffice'],
            ] as const).map(([designationField, designationLabel, officeField]) => (
              <div key={designationField} className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{designationLabel}</label>
                  <input
                    type="text"
                    value={formData[designationField]}
                    onChange={(e) => handleChange(designationField, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Office Name</label>
                  <input
                    type="text"
                    value={formData[officeField] || ''}
                    onChange={(e) => handleChange(officeField, e.target.value)}
                    placeholder="e.g. Falakata CCC"
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Date</label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Revision</label>
              <input
                type="text"
                value={formData.revision}
                onChange={(e) => handleChange('revision', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Scale</label>
              <input
                type="text"
                value={formData.scale}
                onChange={(e) => handleChange('scale', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-slate-800 px-4 py-1.5 font-medium text-slate-300 hover:bg-slate-700 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 font-semibold text-white shadow hover:bg-red-500 sm:w-auto"
            >
              <Check className="w-4 h-4" />
              <span>Apply Title Block</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
