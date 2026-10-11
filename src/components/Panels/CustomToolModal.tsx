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
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shadow">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Create Custom Drawing Tool & Symbol</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Design custom insulators, switchgear, structures or landmarks that integrate into the canvas and BOQ.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
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
            <div className="flex items-center gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 ml-2"
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
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Preview Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow"
                style={{ backgroundColor: color }}
              >
                {iconText || 'SYM'}
              </div>
              <div>
                <div className="font-semibold text-slate-100">{name || 'Tool Name'}</div>
                <div className="text-[10px] text-slate-400">
                  {category.toUpperCase()} · Unit: {unit} · {shape}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              READY TO ADD
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-950 transition-colors"
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
