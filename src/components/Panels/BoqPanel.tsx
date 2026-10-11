/**
 * Work Quantity / BOQ Schedule Panel
 * Displays live auto-calculated quantities with user overrides and summary metrics
 */

import React, { useState } from 'react';
import { BoqItem, DrawingProject } from '../../types/electrical';
import { calculateBoq } from '../../utils/boqCalculator';
import { Calculator, ChevronDown, ChevronUp, Copy, RotateCcw } from 'lucide-react';

interface BoqPanelProps {
  project: DrawingProject;
  onUpdateOverrides: (overrides: Record<string, string>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const BoqPanel: React.FC<BoqPanelProps> = ({
  project,
  onUpdateOverrides,
  isOpen,
  onToggleOpen,
}) => {
  const [copied, setCopied] = useState(false);
  const boqItems = calculateBoq(
    project.nodes,
    project.edges,
    project.stays,
    project.customBoqOverrides
  );

  const handleQuantityChange = (itemId: string, val: string) => {
    onUpdateOverrides({
      ...(project.customBoqOverrides || {}),
      [itemId]: val,
    });
  };

  const handleResetOverrides = () => {
    onUpdateOverrides({});
  };

  const handleCopyBoq = () => {
    const text = boqItems
      .map((item) => `${item.itemNumber}. ${item.description}: ${item.quantity} ${item.unit}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="h-[30dvh] min-h-36 max-h-[40dvh] w-full lg:h-full lg:max-h-none lg:w-[min(22rem,30vw)] lg:min-w-[18rem] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col text-slate-200 shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div
        className="h-12 px-4 bg-slate-800/90 flex items-center justify-between cursor-pointer border-b border-slate-700/60 select-none shrink-0"
        onClick={onToggleOpen}
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Work Quantities (BOQ Schedule)
          </span>
          <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800/50 px-1.5 py-0.5 rounded">
            {boqItems.length} ITEMS
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Table Body */}
      {isOpen && (
        <div className="p-3 text-xs flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 min-h-0 rounded-lg border border-slate-800 mb-3">
            <table className="w-full text-left text-slate-300">
              <thead className="bg-slate-950/70 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2 px-2.5 w-8">#</th>
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 text-right w-20">Qty</th>
                  <th className="py-2 px-2.5 w-12">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {boqItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                      No items placed yet. Draw poles and conductors on the canvas to auto-generate BOQ.
                    </td>
                  </tr>
                ) : (
                  boqItems.map((item) => {
                    const isOverridden = Boolean(project.customBoqOverrides?.[item.id]);

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-1.5 px-2.5 text-slate-400">{item.itemNumber}</td>
                        <td className="py-1.5 px-2 font-sans text-xs text-slate-200">
                          {item.description}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className={`w-16 px-1.5 py-0.5 text-right rounded border focus:outline-none focus:border-red-500 ${
                              isOverridden
                                ? 'bg-amber-950/40 text-amber-200 border-amber-700/60 font-bold'
                                : 'bg-slate-950/60 text-slate-100 border-slate-800'
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-400 font-sans">{item.unit}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <button
              onClick={handleResetOverrides}
              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
              title="Reset all quantities to calculated values"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset Auto</span>
            </button>

            <button
              onClick={handleCopyBoq}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy BOQ'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
