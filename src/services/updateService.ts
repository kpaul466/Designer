/**
 * Software Update Service
 * Detects pushed updates across all installed instances (Web, PWA, Electron Desktop, Android)
 * and triggers immediate or one-click updates.
 */

import { APP_VERSION } from './pldFileService';

export interface RemoteVersionInfo {
  version: string;
  commit?: string;
  buildTimestamp?: number;
  buildDate?: string;
  releaseUrl: string;
  downloadUrl: string;
}

export type UpdateChannel = 'pwa' | 'electron' | 'web' | 'mobile';

export interface AppUpdateEvent {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  channel: UpdateChannel;
  downloadUrl?: string;
  releaseNotes?: string;
  isDownloaded?: boolean; // Electron only: downloaded and ready to restart
}

type UpdateCallback = (event: AppUpdateEvent) => void;

class UpdateService {
  private listeners: Set<UpdateCallback> = new Set();
  private isChecking: boolean = false;
  private currentUpdate: AppUpdateEvent | null = null;
  private checkIntervalTimer: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === 'undefined') return;

    // 1. Electron Desktop Update Listeners
    if ((window as any).electronAPI) {
      const api = (window as any).electronAPI;
      api.onUpdateAvailable?.((info: any) => {
        const updateEvent: AppUpdateEvent = {
          hasUpdate: true,
          currentVersion: APP_VERSION,
          latestVersion: info?.version || 'Latest',
          channel: 'electron',
          downloadUrl: info?.downloadUrl,
          isDownloaded: false,
        };
        this.notify(updateEvent);
      });

      api.onUpdateDownloaded?.((info: any) => {
        const updateEvent: AppUpdateEvent = {
          hasUpdate: true,
          currentVersion: APP_VERSION,
          latestVersion: info?.version || 'Latest',
          channel: 'electron',
          downloadUrl: info?.downloadUrl,
          isDownloaded: true,
        };
        this.notify(updateEvent);
      });
    }

    // 2. Service Worker PWA Listeners
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        this.swRegistration = reg;

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // A new version of the app shell is installed and waiting to activate
                this.notify({
                  hasUpdate: true,
                  currentVersion: APP_VERSION,
                  latestVersion: 'New Update',
                  channel: 'pwa',
                  downloadUrl: window.location.href,
                  isDownloaded: true,
                });
              }
            });
          }
        });
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_ACTIVATED') {
          // If a new SW activated in the background, reload to run fresh code
          console.log('[UpdateService] New Service Worker activated. Reloading page...');
          window.location.reload();
        }
      });
    }

    // 3. Periodic Poll & Focus Poll
    this.startPeriodicCheck();

    window.addEventListener('focus', () => {
      this.checkForUpdates(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates(false);
      }
    });

    // Check once on load
    setTimeout(() => this.checkForUpdates(false), 2000);
  }

  public subscribe(callback: UpdateCallback): () => void {
    this.listeners.add(callback);
    if (this.currentUpdate) {
      callback(this.currentUpdate);
    }
    return () => this.listeners.delete(callback);
  }

  private notify(event: AppUpdateEvent) {
    this.currentUpdate = event;
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('Update callback error:', err);
      }
    });
  }

  public startPeriodicCheck(intervalMinutes: number = 3) {
    if (this.checkIntervalTimer) clearInterval(this.checkIntervalTimer);
    this.checkIntervalTimer = setInterval(() => {
      this.checkForUpdates(false);
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Proactively checks version.json (and GitHub API) for new pushes
   */
  public async checkForUpdates(forceNotify: boolean = false): Promise<AppUpdateEvent | null> {
    if (this.isChecking) return this.currentUpdate;
    this.isChecking = true;

    try {
      // 1. Check if Electron has its own updater
      if ((window as any).electronAPI?.checkForUpdates) {
        (window as any).electronAPI.checkForUpdates();
      }

      // 2. Check service worker registration for SW updates
      if (this.swRegistration) {
        try {
          await this.swRegistration.update();
        } catch (e) {
          // offline or transient
        }
      }

      // 3. Fetch version.json from web root with cache buster
      const baseUrl = import.meta.env.BASE_URL || './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const versionUrl = `${cleanBase}version.json?_t=${Date.now()}`;

      const res = await fetch(versionUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (res.ok) {
        const data: RemoteVersionInfo = await res.json();
        const remoteVersion = data.version?.trim();

        // Compare version strings (e.g. 2.4.1 vs 2.4.0)
        const hasNewerVersion = this.isVersionGreater(remoteVersion, APP_VERSION);

        if (hasNewerVersion) {
          const channel: UpdateChannel = (window as any).electronAPI
            ? 'electron'
            : (window as any).Capacitor
            ? 'mobile'
            : this.swRegistration
            ? 'pwa'
            : 'web';

          const updateEvent: AppUpdateEvent = {
            hasUpdate: true,
            currentVersion: APP_VERSION,
            latestVersion: remoteVersion,
            channel,
            downloadUrl: data.downloadUrl || data.releaseUrl,
            isDownloaded: Boolean((window as any).electronAPI && this.currentUpdate?.isDownloaded),
          };

          this.notify(updateEvent);
          return updateEvent;
        }
      }
    } catch (err) {
      console.warn('[UpdateService] Update check failed:', err);
    } finally {
      this.isChecking = false;
    }

    if (forceNotify && !this.currentUpdate?.hasUpdate) {
      const upToDateEvent: AppUpdateEvent = {
        hasUpdate: false,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        channel: 'web',
      };
      this.notify(upToDateEvent);
      return upToDateEvent;
    }

    return this.currentUpdate;
  }

  /**
   * Applies the update immediately on the current platform
   */
  public async applyUpdate() {
    if (!this.currentUpdate) return;

    // 1. Electron Desktop: quit and install downloaded update
    if (this.currentUpdate.channel === 'electron' && (window as any).electronAPI?.quitAndInstall) {
      (window as any).electronAPI.quitAndInstall();
      return;
    }

    // 2. PWA: tell waiting service worker to skipWaiting and reload
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // The message handler on SW will activate and clients.claim(), triggering a reload
        setTimeout(() => window.location.reload(), 300);
        return;
      }
    }

    // 3. Android / Mobile: open download URL
    if (this.currentUpdate.channel === 'mobile' && this.currentUpdate.downloadUrl) {
      window.open(this.currentUpdate.downloadUrl, '_blank');
      return;
    }

    // 4. Standard Web Browser: hard reload
    window.location.reload();
  }

  public dismissUpdate() {
    this.currentUpdate = null;
    this.notify({
      hasUpdate: false,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      channel: 'web',
    });
  }

  private isVersionGreater(remote: string, local: string): boolean {
    if (!remote || !local) return false;
    if (remote === local) return false;

    const rParts = remote.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
    const lParts = local.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
      const r = rParts[i] || 0;
      const l = lParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    return false;
  }
}

export const updateService = new UpdateService();

