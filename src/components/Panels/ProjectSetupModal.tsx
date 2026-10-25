/**
 * Project Setup & Configuration Modal
 * Comprehensive setup for Application No., PO No., Drawing Name, Area/Location, Agency Name, CCC Name, etc.
 */

import React, { useEffect, useState } from 'react';
import { ProjectMetadata } from '../../types/electrical';
import {
  Building2,
  Check,
  FileSpreadsheet,
  FileText,
  MapPin,
  PlusCircle,
  Settings2,
  UserCheck,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { LocationSearchBar } from '../Toolbar/LocationSearchBar';
import { ALL_PAGE_SIZES } from '../../constants/pageSizes';
import { parseCoordinateText } from '../../utils/geoReference';

interface ProjectSetupModalProps {
  isOpen: boolean;
  metadata: ProjectMetadata;
  onSave: (updated: ProjectMetadata) => void;
  onClose: () => void;
}

export const ProjectSetupModal: React.FC<ProjectSetupModalProps> = ({
  isOpen,
  metadata,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<ProjectMetadata>({ ...metadata });
  const [activeTab, setActiveTab] = useState<'project' | 'admin' | 'signoff'>('project');

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...metadata });
      setActiveTab('project');
    }
  }, [isOpen, metadata]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ProjectMetadata, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      title: formData.title?.trim() || 'New Drawing',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden bg-slate-950/85 backdrop-blur-md p-0 sm:items-center sm:p-4">
      <div className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-slate-700 bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 p-3 px-4 sm:p-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-950">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                <span>Project Setup & Engineering Configuration</span>
              </h2>
              <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
                Configure Application No., PO No., Drawing Name, Area/Location, Agency Name, and CCC Name for drawing sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close project setup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/60 px-3 pb-1 pt-2 sm:gap-2 sm:px-6 sm:pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('project')}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3.5 sm:text-xs ${
              activeTab === 'project'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="sm:hidden">Project</span>
            <span className="hidden sm:inline">Project & Drawing</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3.5 sm:text-xs ${
              activeTab === 'admin'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="sm:hidden">Agency</span>
            <span className="hidden sm:inline">Agency, CCC & Location</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signoff')}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3.5 sm:text-xs ${
              activeTab === 'signoff'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="sm:hidden">Sign-off</span>
            <span className="hidden sm:inline">Applicant & Approvals</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs sm:p-6">
          {/* TAB 1: Project & Drawing Identification */}
          {activeTab === 'project' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Work Classification: New Work vs Maintenance Work */}
              <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Work Classification / Scheme Type</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formData.workType === 'maintenance_work' ? 'Maintenance Scheme' : 'New Installation Scheme'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('workType', 'new_work')}
                    className={`flex items-center justify-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      (formData.workType ?? 'new_work') === 'new_work'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight">New Work</div>
                      <div className="text-[9.5px] font-normal text-slate-400">New line / extension / electrification</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('workType', 'maintenance_work')}
                    className={`flex items-center justify-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      formData.workType === 'maintenance_work'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight">Maintenance Work</div>
                      <div className="text-[9.5px] font-normal text-slate-400">Repair / renovation / reconductoring</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Drawing Title / Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g. Erection & Phase Conversion Scheme with River Crossing"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Project / Scheme Name
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => handleChange('projectName', e.target.value)}
                    placeholder="e.g. River Crossing & 25 kVA DTR Sub-Station Installation"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                    Application Number
                  </label>
                  <input
                    type="text"
                    value={formData.applicationNo}
                    onChange={(e) => handleChange('applicationNo', e.target.value)}
                    placeholder="e.g. 4003705061"
                    className="w-full bg-slate-800 border border-amber-600/50 rounded-lg px-3 py-2 text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                    PO Number / Work Order No.
                  </label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    onChange={(e) => handleChange('poNumber', e.target.value)}
                    placeholder="e.g. PO/DIS/2026/089"
                    className="w-full bg-slate-800 border border-amber-600/50 rounded-lg px-3 py-2 text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Drawing Number
                  </label>
                  <input
                    type="text"
                    value={formData.drawingNo}
                    onChange={(e) => handleChange('drawingNo', e.target.value)}
                    placeholder="e.g. DWG/DIS/2026/RC-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono font-semibold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Sanction / Work Order Ref No.
                  </label>
                  <input
                    type="text"
                    value={formData.workOrderNo}
                    onChange={(e) => handleChange('workOrderNo', e.target.value)}
                    placeholder="e.g. WO/SE/APD/2026/412"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Drawing Scale
                  </label>
                  <input
                    type="text"
                    value={formData.scale}
                    onChange={(e) => handleChange('scale', e.target.value)}
                    placeholder="e.g. 1:500 (NTS)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-sky-300 block mb-1">
                  Page Size & Drawing Sheet Format <span className="text-[10px] text-emerald-400 font-mono">(Drawing Sheet Locked 1:1)</span>
                </label>
                <select
                  value={formData.sheetSize || 'A4'}
                  onChange={(e) => handleChange('sheetSize', e.target.value)}
                  className="w-full bg-slate-800 border border-sky-600/50 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-sky-400"
                >
                  {ALL_PAGE_SIZES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.width} × {p.height} px ({p.dimensionsMm}) · {p.description}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Changing page size automatically locks the CAD drawing sheet and GIS map background to this exact fixed dimension.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Agency, CCC & Location Details */}
          {activeTab === 'admin' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                  <Building2 className="w-4 h-4 text-red-500" />
                  <span>Administrative & Agency Setup</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                      Agency Name (Contractor / Vendor)
                    </label>
                    <input
                      type="text"
                      value={formData.agencyName}
                      onChange={(e) => handleChange('agencyName', e.target.value)}
                      placeholder="e.g. M/s Eastern Power Infra Pvt. Ltd."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-amber-300 block mb-1">
                      Customer Care Centre (CCC) Name
                    </label>
                    <input
                      type="text"
                      value={formData.cccName}
                      onChange={(e) => handleChange('cccName', e.target.value)}
                      placeholder="e.g. Falakata Customer Care Centre"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Sub-Division Name
                    </label>
                    <input
                      type="text"
                      value={formData.subDivision}
                      onChange={(e) => handleChange('subDivision', e.target.value)}
                      placeholder="e.g. Falakata Sub-Division"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Division Name
                    </label>
                    <input
                      type="text"
                      value={formData.divisionName}
                      onChange={(e) => handleChange('divisionName', e.target.value)}
                      placeholder="e.g. Alipurduar Division"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Area / Location / Habitation / Mouza <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  <LocationSearchBar
                    currentLocationName={formData.location}
                    onSelectLocation={(loc) => {
                      handleChange('location', loc.name);
                      if (loc.district && !formData.divisionName) {
                        handleChange('divisionName', `${loc.district} Division`);
                      }
                    }}
                    origin={parseCoordinateText(formData.coordinates) ?? undefined}
                  />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="e.g. Satpukuriya, Falakata / Falakata-Birpara Road Crossing"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-red-500 text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Applicant & Engineering Sign-offs */}
          {activeTab === 'signoff' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Applicant / Beneficiary Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Applicant Name</label>
                    <input
                      type="text"
                      value={formData.applicantName}
                      onChange={(e) => handleChange('applicantName', e.target.value)}
                      placeholder="e.g. ASHOK SAHA"
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.applicantPhone}
                      onChange={(e) => handleChange('applicantPhone', e.target.value)}
                      placeholder="e.g. 9474123890"
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Address / Landmark</label>
                    <input
                      type="text"
                      value={formData.applicantAddress}
                      onChange={(e) => handleChange('applicantAddress', e.target.value)}
                      placeholder="e.g. Satpukuriya, Falakata"
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <span>Engineering Approvals & Revision</span>
                </div>
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
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Office Name</label>
                        <input
                          type="text"
                          value={formData[officeField] || ''}
                          onChange={(e) => handleChange(officeField, e.target.value)}
                          placeholder="e.g. Falakata CCC"
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Survey / Drawing Date</label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Revision Number</label>
                    <input
                      type="text"
                      value={formData.revision}
                      onChange={(e) => handleChange('revision', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Preview Summary Card */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div>
              <span className="text-slate-500">Active Setup: </span>
              <strong className="text-slate-200">{formData.title || 'Untitled'}</strong>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-amber-300 font-mono">App: {formData.applicationNo || 'N/A'}</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-amber-300 font-mono">PO: {formData.poNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-300 font-semibold">{formData.cccName || 'CCC'}</span>
              <span className="mx-1 text-slate-600">|</span>
              <span className="text-slate-400">{formData.agencyName || 'Agency'}</span>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex shrink-0 flex-col-reverse items-stretch gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-slate-800 px-4 py-2 font-medium text-slate-300 transition-colors hover:bg-slate-700 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-bold text-white shadow-lg shadow-red-950 transition-colors hover:bg-red-500 sm:w-auto"
            >
              <Check className="w-4 h-4" />
              <span>Apply Project Setup</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
