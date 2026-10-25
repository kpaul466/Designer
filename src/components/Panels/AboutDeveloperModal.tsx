/**
 * About Developer Page / Modal
 * Displays information about the developer, project mission, technical architecture,
 * and contact / open-source links.
 */

import React from 'react';
import {
  Code2,
  ExternalLink,
  Github,
  Heart,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  X,
  Zap,
} from 'lucide-react';

interface AboutDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVersionModal?: () => void;
}

export const AboutDeveloperModal: React.FC<AboutDeveloperModalProps> = ({
  isOpen,
  onClose,
  onOpenVersionModal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header with decorative gradient banner */}
        <div className="relative border-b border-slate-800 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-lg shadow-red-950/80 ring-2 ring-red-400/30">
                <Zap className="h-6 w-6 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">About the Developer</h2>
                  <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    Lead Creator
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  PowerLine Designer • Electrical CAD &amp; Engineering System
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Developer Profile Card */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-slate-200 border border-slate-700 shadow-inner">
                <User className="h-8 w-8 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">kpaul466@gmail.com</h3>
                  <span className="text-xs font-mono text-slate-400">(@kpaul466)</span>
                </div>
                <p className="text-xs text-red-400 font-medium mt-0.5">
                     Developer( Hobby Project)
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-slate-300">
                 
                </p>
              </div>
            </div>

            {/* Quick Action Badges / Links */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
              <a
                href="https://github.com/kpaul466/Designer"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white hover:border-slate-500"
              >
                <Github className="h-3.5 w-3.5 text-slate-300" />
                <span>GitHub Repository</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="https://github.com/kpaul466"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white hover:border-slate-500"
              >
                <User className="h-3.5 w-3.5 text-slate-300" />
                <span>Developer Profile</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="https://kpaul466.github.io/Designer/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:border-red-400"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Live Web App on GitHub Pages</span>
              </a>
            </div>
          </div>

          {/* Project Mission & Purpose */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Project Mission
            </h4>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-[11.5px] leading-relaxed text-slate-300 space-y-2">
              <p>
                <strong>PowerLine Designer</strong> was created to eliminate the bottlenecks of legacy CAD software
                in power distribution engineering. Traditional tools are heavy, expensive, and require tedious manual
                estimation of Bill of Quantities (BOQ), line spans, and title blocks.
              </p>
              <p>
                This application gives electrical engineers, project managers, and survey teams a fast, modern,
                and intuitive CAD drafting experience directly on laptops, desktops, and mobile phones — 100% offline
                with zero server latency.
              </p>
            </div>
          </div>

          {/* Key Engineering Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>100% Offline &amp; Private</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                All drawings, GPS coordinates, and BOQ estimates are stored exclusively in your local storage or
                direct .pld files. No sensitive substation or grid data is ever uploaded to third-party servers.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <Terminal className="h-4 w-4" />
                <span>Native .PLD File Format</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Files saved on your local hard drive or cloud drive hold the exact drawing model, symbols, conductors,
                and canvas viewport zoom/pan so you resume right where you left off.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Layers className="h-4 w-4" />
                <span>Multi-Platform Compilation</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Compiled via automated GitHub Actions into standalone installers for Windows (.exe), Android (.apk),
                macOS (.dmg), and Linux (.AppImage/.deb).
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <Code2 className="h-4 w-4" />
                <span>Modern Technical Core</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Built with React 19, TypeScript, Vite, Tailwind CSS v4, Electron, Capacitor, OpenLayers,
                and jsPDF for engineering precision.
              </p>
            </div>
          </div>

          {/* Open Source Notice */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
              Crafted for power engineers &amp; turnkey agencies.
            </span>
            <span className="font-mono text-[10px] text-slate-500">MIT Open Source License</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-6 py-3.5">
          {onOpenVersionModal ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVersionModal();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              <span>View App Version &amp; Download Center →</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

