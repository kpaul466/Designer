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
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden bg-slate-950/85 p-0 backdrop-blur-md sm:items-center sm:overflow-y-auto sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-slate-700 bg-slate-900 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 p-3 px-4 sm:p-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow">
              <Keyboard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <span>CAD Keyboard Shortcuts & Functions</span>
              </h2>
              <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
                Speed up engineering drafting with full keyboard controls.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Close keyboard shortcuts">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-xs sm:space-y-6 sm:p-6">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {sec.title}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sec.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/60 p-2 transition-colors hover:border-slate-700"
                  >
                    <span className="min-w-0 text-slate-300 font-medium">{sc.action}</span>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-200 shadow-sm"
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
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-800 bg-slate-900/60 p-3 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:px-6">
          <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-white text-[10px]">Esc</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-white text-[10px]">?</kbd> to toggle</span>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-800 px-4 py-1.5 font-medium text-white transition-colors hover:bg-slate-700 sm:w-auto"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
