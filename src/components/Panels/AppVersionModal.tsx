/**
 * App Version, Release Notes & Cross-Platform Download Center Modal
 * Shows current app version, runtime platform detection, direct links to compiled
 * installers (Windows, Android, Linux, macOS), GitHub Releases, and changelog.
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Apple,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Github,
  Globe,
  Monitor,
  Package,
  RefreshCw,
  Smartphone,
  Sparkles,
  Terminal,
  User,
  X,
  Zap,
} from 'lucide-react';
import { APP_VERSION } from '../../services/pldFileService';
import { updateService } from '../../services/updateService';

interface AppVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAboutDeveloper?: () => void;
}

export type PlatformType = 'web' | 'windows' | 'mac' | 'linux' | 'android';

const GITHUB_REPO = 'kpaul466/Designer';
const GITHUB_RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases`;
const LATEST_RELEASE_URL = `${GITHUB_RELEASE_BASE}/latest`;
const GITHUB_PAGES_URL = `https://kpaul466.github.io/Designer/`;

interface ReleaseAssetInfo {
  platform: PlatformType;
  title: string;
  badge: string;
  fileName: string;
  description: string;
  icon: React.ReactNode;
  downloadUrl: string;
  recommendedFor?: PlatformType;
}

export const AppVersionModal: React.FC<AppVersionModalProps> = ({
  isOpen,
  onClose,
  onOpenAboutDeveloper,
}) => {
  const [currentPlatform, setCurrentPlatform] = useState<PlatformType>('web');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    latestVersion?: string;
    message?: string;
  }>({ checked: false, hasUpdate: false });

  useEffect(() => {
    // Detect environment
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if ((window as any).electronAPI?.isElectron) {
        const platform = (window as any).electronAPI.getPlatform?.();
        if (platform === 'win32') setCurrentPlatform('windows');
        else if (platform === 'darwin') setCurrentPlatform('mac');
        else setCurrentPlatform('linux');
      } else if ((window as any).Capacitor || ua.includes('android')) {
        setCurrentPlatform('android');
      } else if (ua.includes('win')) {
        setCurrentPlatform('windows');
      } else if (ua.includes('mac')) {
        setCurrentPlatform('mac');
      } else if (ua.includes('linux')) {
        setCurrentPlatform('linux');
      } else {
        setCurrentPlatform('web');
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      // Trigger update service across SW, Electron, and version.json
      const svcRes = await updateService.checkForUpdates(true);

      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (res.ok) {
        const data = await res.json();
        const tag = (data.tag_name || '').replace(/^v/, '');
        const hasUpdate = Boolean(tag && tag !== APP_VERSION) || Boolean(svcRes?.hasUpdate);
        const latestVer = tag || svcRes?.latestVersion || APP_VERSION;
        setUpdateStatus({
          checked: true,
          hasUpdate,
          latestVersion: latestVer,
          message: hasUpdate
            ? `New update v${latestVer} is ready!`
            : `You are running the latest version (v${APP_VERSION}).`,
        });
      } else if (svcRes?.hasUpdate) {
        setUpdateStatus({
          checked: true,
          hasUpdate: true,
          latestVersion: svcRes.latestVersion,
          message: `New update v${svcRes.latestVersion} is ready!`,
        });
      } else {
        setUpdateStatus({
          checked: true,
          hasUpdate: false,
          message: `You are running the latest version (v${APP_VERSION}).`,
        });
      }
    } catch (e: any) {
      setUpdateStatus({
        checked: true,
        hasUpdate: false,
        message: 'Could not connect to update servers. Please check your internet connection.',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const releaseAssets: ReleaseAssetInfo[] = [
    {
      platform: 'windows',
      title: 'Windows Desktop App',
      badge: '.EXE Installer & Portable',
      fileName: `PowerLine-Designer-Setup-${APP_VERSION}.exe`,
      description: 'Native 64-bit installer with automatic .pld file association and desktop shortcut.',
      icon: <Monitor className="h-5 w-5 text-sky-400" />,
      downloadUrl: `${GITHUB_RELEASE_BASE}/download/v${APP_VERSION}/PowerLine-Designer-Setup-${APP_VERSION}.exe`,
      recommendedFor: 'windows',
    },
    {
      platform: 'android',
      title: 'Android Phone & Tablet App',
      badge: '.APK Mobile Package',
      fileName: `PowerLine-Designer-${APP_VERSION}.apk`,
      description: 'Standalone Android APK for surveying, on-site drawings, and mobile field verification.',
      icon: <Smartphone className="h-5 w-5 text-emerald-400" />,
      downloadUrl: `${GITHUB_RELEASE_BASE}/download/v${APP_VERSION}/PowerLine-Designer-${APP_VERSION}.apk`,
      recommendedFor: 'android',
    },
    {
      platform: 'linux',
      title: 'Linux Desktop App',
      badge: '.AppImage & .deb',
      fileName: `PowerLine-Designer-${APP_VERSION}.AppImage`,
      description: 'Portable universal AppImage and Debian package for Ubuntu, Debian, Fedora, and Arch.',
      icon: <Terminal className="h-5 w-5 text-amber-400" />,
      downloadUrl: `${GITHUB_RELEASE_BASE}/download/v${APP_VERSION}/PowerLine-Designer-${APP_VERSION}.AppImage`,
      recommendedFor: 'linux',
    },
    {
      platform: 'mac',
      title: 'macOS Desktop App',
      badge: '.DMG Universal Binary',
      fileName: `PowerLine-Designer-${APP_VERSION}.dmg`,
      description: 'Universal macOS disk image compatible with Apple Silicon (M1/M2/M3) & Intel Macs.',
      icon: <Apple className="h-5 w-5 text-purple-400" />,
      downloadUrl: `${GITHUB_RELEASE_BASE}/download/v${APP_VERSION}/PowerLine-Designer-${APP_VERSION}.dmg`,
      recommendedFor: 'mac',
    },
    {
      platform: 'web',
      title: 'Web & PWA Edition',
      badge: 'Live GitHub Pages',
      fileName: 'kpaul466.github.io/Designer',
      description: 'Runs directly in any browser with offline caching and PWA installation support.',
      icon: <Globe className="h-5 w-5 text-rose-400" />,
      downloadUrl: GITHUB_PAGES_URL,
      recommendedFor: 'web',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-950">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">PowerLine Designer</h2>
                <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-mono text-xs font-bold text-red-300">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Multi-Platform Desktop &amp; Phone App Installer Center
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Current Environment & Update Status Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">Running Environment:</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                  {currentPlatform}
                </span>
                <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Stable Build
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated continuous compilation enabled via GitHub Actions CI/CD matrix.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingUpdate ? 'animate-spin text-red-400' : ''}`} />
              <span>{checkingUpdate ? 'Checking GitHub…' : 'Check for Updates'}</span>
            </button>
          </div>

          {/* Update result banner */}
          {updateStatus.checked && (
            <div
              className={`rounded-xl border p-3 flex items-start gap-2.5 text-xs ${
                updateStatus.hasUpdate
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {updateStatus.hasUpdate ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold">{updateStatus.message}</div>
                {updateStatus.hasUpdate && (
                  <a
                    href={LATEST_RELEASE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-amber-200 underline mt-1 hover:text-white"
                  >
                    <span>Download new release from GitHub</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Download Installers Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Download className="h-3.5 w-3.5 text-red-400" />
                Compiled Installers for All Platforms
              </h3>
              <a
                href={LATEST_RELEASE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200"
              >
                <Github className="h-3.5 w-3.5" />
                <span>All GitHub Releases</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {releaseAssets.map((asset) => {
                const isRecommended = asset.recommendedFor === currentPlatform;
                return (
                  <div
                    key={asset.platform}
                    className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isRecommended
                        ? 'border-red-500/50 bg-red-950/20 ring-1 ring-red-500/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                            {asset.icon}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{asset.title}</div>
                            <span className="font-mono text-[10px] text-slate-400">{asset.badge}</span>
                          </div>
                        </div>

                        {isRecommended && (
                          <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[9.5px] font-bold text-red-300">
                            Detected OS
                          </span>
                        )}
                      </div>

                      <p className="mt-2.5 text-[11px] leading-relaxed text-slate-300">
                        {asset.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-400 truncate max-w-[170px]" title={asset.fileName}>
                        {asset.fileName}
                      </span>
                      <a
                        href={asset.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                          isRecommended
                            ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-950'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special .PLD File Recognition Feature Highlight */}
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Zap className="h-4 w-4" />
              <span>Native .PLD File Association &amp; State Preservation</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              When you save drawings with <strong>.pld</strong> extension, the file is automatically recognized by
              PowerLine Designer across Windows, Mac, Linux, and Android. Opening a <strong>.pld</strong> file restores:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300 pt-1">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                All electrical nodes, ratings &amp; codes
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Conductor phases &amp; jumper routings
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Stay assemblies &amp; crossings
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Exact canvas viewport zoom &amp; pan
              </li>
            </ul>
          </div>

          {/* Release History / Changelog Timeline */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Release Changelog &amp; Roadmap
            </h3>

            <div className="space-y-3 text-[11.5px]">
              {/* v2.4.0 */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    v2.4.0 • Multi-Platform Installers &amp; Stateful .PLD Format
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Current Release</span>
                </div>
                <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                  <li>Native <code>.pld</code> file format with deep state preservation &amp; drag-and-drop loading</li>
                  <li>Automated GitHub Actions CI/CD matrix compiling Windows, Android, Linux, and macOS binaries</li>
                  <li>Desktop Electron application with OS file associations and native file dialogs</li>
                  <li>Capacitor Android phone app configuration for field work and tablet drafting</li>
                  <li>In-app About Developer modal and Multi-Platform Download Center</li>
                </ul>
              </div>

              {/* v2.3.0 */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    v2.3.0 • New Drawing Workflow &amp; Work Type Classification
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">October 2026</span>
                </div>
                <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                  <li>Save / Discard Updates / Delete Previous Drawing popup before new drawing initialization</li>
                  <li>Automatic Project Setup name window launch upon creating new drawing</li>
                  <li>Work Classification selector: "New Work" vs "Maintenance Work" schemes</li>
                </ul>
              </div>

              {/* v2.2.0 */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5 opacity-80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    v2.2.0 • Print Map Controls &amp; Mobile Search
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">October 2026</span>
                </div>
                <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                  <li>Map opacity adjustment slider in print &amp; PDF preview</li>
                  <li>Hidden OpenStreetMap watermark in official print sheets</li>
                  <li>Mobile-responsive floating map location search bar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-6 py-3.5">
          {onOpenAboutDeveloper ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAboutDeveloper();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              <span>About Developer →</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <a
              href={LATEST_RELEASE_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub Releases</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 shadow-md shadow-red-950"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

