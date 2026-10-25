/**
 * Custom Tool Creation Modal
 * Allows engineers to design custom electrical and civil symbols on the fly
 */

import React, { useState } from 'react';
import { CustomToolDefinition, InfrastructureStatus } from '../../types/electrical';
import { Plus, Sparkles, Wrench, X } from 'lucide-react';

interface CustomToolModalProps {
  isOpen: boolean;
  onAddCustomTool: (tool: CustomToolDefinition) => void;
  onClose: () => void;
}

export const CustomToolModal: React.FC<CustomToolModalProps> = ({
  isOpen,
  onAddCustomTool,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'pole' | 'equipment' | 'line' | 'landmark'>('equipment');
  const [shape, setShape] = useState<'circle' | 'square' | 'diamond' | 'hexagon' | 'coil' | 'cross' | 'text'>('diamond');
  const [color, setColor] = useState('#d97706');
  const [iconText, setIconText] = useState('INS');
  const [unit, setUnit] = useState<'Nos' | 'Set' | 'KM' | 'Mtr'>('Nos');
  const [defaultStatus, setDefaultStatus] = useState<InfrastructureStatus>('proposed');
  const [boqDescription, setBoqDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTool: CustomToolDefinition = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      category,
      shape,
      color,
      defaultStatus,
      unit,
      boqDescription: boqDescription.trim() || name.trim(),
      iconText: iconText.trim() || name.substr(0, 3).toUpperCase(),
    };

    onAddCustomTool(newTool);
    onClose();
  };

  const presetColors = [
    '#dc2626', // Red
    '#d97706', // Amber
    '#059669', // Emerald
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#0891b2', // Cyan
    '#e11d48', // Rose
    '#1e293b', // Slate
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:overflow-y-auto sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-slate-700 bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 p-3 px-4 sm:p-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 shadow">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <span>Create Custom Drawing Tool & Symbol</span>
              </h2>
              <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
                Design custom insulators, switchgear, structures or landmarks that integrate into the canvas and BOQ.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Close custom tool">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs sm:p-6">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Custom Tool Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!boqDescription) setBoqDescription(e.target.value);
                if (iconText === 'INS' || !iconText) setIconText(e.target.value.substr(0, 3).toUpperCase());
              }}
              placeholder="e.g. Pin Insulator Set, 11kV V-Cross Arm, Earth Pipe"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="equipment">Equipment & Switchgear</option>
                <option value="pole">Poles & Structures</option>
                <option value="line">Lines & Conductors</option>
                <option value="landmark">Civil & Landmarks</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Symbol Shape
              </label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="diamond">Diamond (Switchgear / Insulators)</option>
                <option value="square">Square (Boxes / Terminals)</option>
                <option value="circle">Circle (Poles / Ground Pins)</option>
                <option value="hexagon">Hexagon (Substation Gear)</option>
                <option value="coil">Coil (Reactors / Transformers)</option>
                <option value="cross">Cross (Arresters / Links)</option>
                <option value="text">Text Badge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Short Badge (1-4 chars)
              </label>
              <input
                type="text"
                maxLength={4}
                value={iconText}
                onChange={(e) => setIconText(e.target.value.toUpperCase())}
                placeholder="e.g. PIN, LA, AB"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-center font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                BOQ Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="Nos">Nos (Count)</option>
                <option value="Set">Set</option>
                <option value="KM">KM (Kilometer)</option>
                <option value="Mtr">Mtr (Meters)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Default State
              </label>
              <select
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="proposed">Proposed</option>
                <option value="existing">Existing</option>
              </select>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Symbol Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg border-2 transition-transform ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Use ${c} color`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="ml-1 h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                title="Custom color picker"
              />
            </div>
          </div>

          {/* BOQ Description */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              BOQ Schedule Table Description
            </label>
            <input
              type="text"
              value={boqDescription}
              onChange={(e) => setBoqDescription(e.target.value)}
              placeholder="e.g. Supply & Erection of 11kV Pin Insulator with Pin"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
            <p className="text-[10.5px] text-slate-400 mt-1">
              This exact description will be listed in the Bill of Quantities schedule when instances are placed.
            </p>
          </div>

          {/* Live Symbol Preview */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* Preview Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow"
                style={{ backgroundColor: color }}
              >
                {iconText || 'SYM'}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-100">{name || 'Tool Name'}</div>
                <div className="truncate text-[10px] text-slate-400">
                  {category.toUpperCase()} · Unit: {unit} · {shape}
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              READY TO ADD
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 flex-col-reverse items-stretch gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2 font-bold text-slate-950 shadow-lg shadow-amber-950 transition-colors hover:bg-amber-400 sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Tool to Palette</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
