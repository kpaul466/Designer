/**
 * Update Notification Banner
 * Visible alert shown across all instances (Web, PWA, Electron, Android)
 * when a new update is pushed, allowing one-click update and reload.
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpCircle, CheckCircle, RefreshCw, X, Zap } from 'lucide-react';
import { AppUpdateEvent, updateService } from '../../services/updateService';

export const UpdateNotificationBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateEvent | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = updateService.subscribe((evt) => {
      if (evt.hasUpdate) {
        setUpdateInfo(evt);
      } else {
        setUpdateInfo(null);
      }
    });
    return unsubscribe;
  }, []);

  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleApply = async () => {
    setIsUpdating(true);
    try {
      await updateService.applyUpdate();
    } catch (e) {
      console.error('Failed to apply update:', e);
      setIsUpdating(false);
    }
  };

  const getActionLabel = () => {
    if (isUpdating) return 'Updating…';
    if (updateInfo.channel === 'electron') {
      return updateInfo.isDownloaded ? 'Restart & Install' : 'Download Update';
    }
    if (updateInfo.channel === 'mobile') {
      return 'Download APK';
    }
    return 'Update & Reload';
  };

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,560px)] animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/50 bg-gradient-to-r from-red-950/95 via-slate-900/95 to-slate-900/95 p-3.5 sm:px-4 text-xs text-white shadow-2xl backdrop-blur-md ring-2 ring-red-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-950">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs sm:text-sm truncate">
                Update Pushed: v{updateInfo.latestVersion}
              </span>
              <span className="hidden sm:inline-block rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[9.5px] font-mono font-bold text-red-300">
                {updateInfo.channel.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {updateInfo.channel === 'electron' && updateInfo.isDownloaded
                ? 'Update downloaded. Restart the application to apply.'
                : updateInfo.channel === 'mobile'
                ? 'A new Android APK update is ready to download.'
                : 'A new version has been deployed. Refresh to update software.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleApply}
            disabled={isUpdating}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-red-500 shadow-lg shadow-red-950/80 active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{getActionLabel()}</span>
          </button>

          <button
            type="button"
            onClick={() => updateService.dismissUpdate()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Dismiss update banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

