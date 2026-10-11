/**
 * Keyboard Shortcuts Modal
 * Displays complete CAD keyboard shortcuts and navigation guide
 */

import React from 'react';
import { Command, Keyboard, MousePointer, Move, X, Zap } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'Canvas & Viewport Navigation',
      shortcuts: [
        { keys: ['Ctrl', 'Scroll'], action: 'Zoom In / Out (cursor centered)' },
        { keys: ['Scroll'], action: 'Pan Canvas (vertical & horizontal)' },
        { keys: ['Space + Drag'], action: 'Pan Canvas viewport' },
        { keys: ['H'], action: 'Pan / Hand Tool' },
        { keys: ['F', 'or', 'Z'], action: 'Fit drawing to screen' },
        { keys: ['0'], action: 'Reset Zoom to 100%' },
        { keys: ['+'], action: 'Zoom In (+20%)' },
        { keys: ['-'], action: 'Zoom Out (-20%)' },
      ],
    },
    {
      title: 'Selection & Manipulation',
      shortcuts: [
        { keys: ['Click + Drag'], action: 'Marquee box select multiple items' },
        { keys: ['Shift + Click'], action: 'Add / remove item from selection' },
        { keys: ['Ctrl', 'A'], action: 'Select all items on sheet' },
        { keys: ['Del', 'or', 'Bksp'], action: 'Delete selected items' },
        { keys: ['Ctrl', 'C'], action: 'Copy selected items' },
        { keys: ['Ctrl', 'V'], action: 'Paste copied items' },
        { keys: ['Ctrl', 'X'], action: 'Cut selected items' },
        { keys: ['Ctrl', 'D'], action: 'Duplicate selected items' },
        { keys: ['Arrow Keys'], action: 'Nudge items by 5px (20px with Shift)' },
        { keys: ['Esc'], action: 'Cancel active tool / Deselect all' },
      ],
    },
    {
      title: 'Quick CAD Tool Activation',
      shortcuts: [
        { keys: ['V'], action: 'Select Tool' },
        { keys: ['P'], action: '8m PCC Pole Tool' },
        { keys: ['L'], action: 'ACSR 4-Wire Conductor' },
        { keys: ['T'], action: 'Consumer Drop (S/C)' },
        { keys: ['G'], action: 'Toggle CAD Drafting Grid' },
        { keys: ['Ctrl', 'Z'], action: 'Undo last change' },
        { keys: ['Ctrl', 'Y'], action: 'Redo change' },
        { keys: ['Ctrl', 'S'], action: 'Quick Save project' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>CAD Keyboard Shortcuts & Functions</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Speed up engineering drafting with full keyboard controls.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {sec.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sec.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <span className="text-slate-300 font-medium">{sc.action}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[10px] shadow-sm font-semibold"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-white text-[10px]">Esc</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-white text-[10px]">?</kbd> to toggle</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
