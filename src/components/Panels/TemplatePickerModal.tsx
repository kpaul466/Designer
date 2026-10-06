/**
 * Template & Sample Blueprint Picker Modal
 * Lets users choose from all 6 real-world sample drawings or start with blank engineering presets
 */

import React, { useState } from 'react';
import { DrawingProject } from '../../types/electrical';
import { BLANK_TEMPLATES, SAMPLE_BLUEPRINTS } from '../../templates/sampleBlueprints';
import { FilePlus2, Layers, Sparkles, X, Zap } from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: DrawingProject) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const [activeTab, setActiveTab] = useState<'samples' | 'blank'>('samples');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Drawing Templates & Sample Blueprints</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a pre-loaded sample drawing for instant inspiration or start with a blank engineering template.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Filter Bar */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'samples'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            6 Real-World Sample Blueprints ({SAMPLE_BLUEPRINTS.length})
          </button>
          <button
            onClick={() => setActiveTab('blank')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'blank'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Blank Starter Presets ({BLANK_TEMPLATES.length})
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTab === 'samples'
            ? SAMPLE_BLUEPRINTS.map((sample, index) => (
                <div
                  key={sample.id}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 hover:border-red-500/80 hover:bg-slate-800 transition-all flex flex-col justify-between group cursor-pointer"
                  onClick={() => {
                    onSelectProject(JSON.parse(JSON.stringify(sample)));
                    onClose();
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-mono text-amber-400 font-bold">SAMPLE {index + 1}</span>
                      <span className="font-mono text-slate-400">{sample.metadata.drawingNo}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-red-400 transition-colors">
                      {sample.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {sample.metadata.projectName || sample.metadata.title}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-300">
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {sample.nodes.length} Poles/Structures
                      </span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {sample.edges.length} Spans
                      </span>
                      {sample.crossings.length > 0 && (
                        <span className="bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                          {sample.crossings[0].type.toUpperCase()} CROSSING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Applicant: <strong className="text-slate-200">{sample.metadata.applicantName}</strong>
                    </span>
                    <button className="px-3 py-1 bg-red-600 group-hover:bg-red-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors">
                      Load Blueprint
                    </button>
                  </div>
                </div>
              ))
            : BLANK_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 hover:border-slate-500 hover:bg-slate-800 transition-all flex flex-col justify-between group cursor-pointer"
                  onClick={() => {
                    onSelectProject(JSON.parse(JSON.stringify(tmpl)));
                    onClose();
                  }}
                >
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 mb-2">
                      <FilePlus2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-white">
                      {tmpl.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {tmpl.metadata.title}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-end">
                    <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-xs font-semibold transition-colors">
                      Create Project
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};
