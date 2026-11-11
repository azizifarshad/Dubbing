/**
 * Update Manager - Client-side state and API client for Dubbing Vidans Auto-Updater
 */

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  channel?: 'stable' | 'beta';
  releaseDate?: string;
  releaseName?: string;
  downloadUrl?: string;
  sizeBytes?: number;
  sha256?: string;
  signature?: string;
  minSupportedVersion?: string;
  releaseNotes?: string;
  releaseNotesFa?: string;
  status?: 'idle' | 'available' | 'up_to_date' | 'unreachable' | 'offline' | 'timeout' | 'error';
  errorMessageFa?: string;
  technicalDetails?: string;
  endpoint?: string;
  isRetryable?: boolean;
}

export interface UpdateProgress {
  status:
    | 'idle'
    | 'checking'
    | 'available'
    | 'up_to_date'
    | 'downloading'
    | 'downloaded'
    | 'verifying'
    | 'ready_to_install'
    | 'installing'
    | 'error';
  progressPercent: number;
  downloadedBytes: number;
  totalBytes: number;
  errorMessage?: string;
  errorMessageFa?: string;
  technicalDetails?: string;
}

export const CURRENT_APP_VERSION = '1.0.1';

export async function fetchUpdateStatus(): Promise<{
  currentVersion: string;
  progress: UpdateProgress;
  updateInfo: UpdateInfo | null;
  autoUpdateEnabled: boolean;
  channel: 'stable' | 'beta';
}> {
  const res = await fetch('/api/app-update/status');
  if (!res.ok) {
    throw new Error(`Failed to fetch update status (${res.status})`);
  }
  return res.json();
}

export async function checkForUpdates(channel: 'stable' | 'beta' = 'stable'): Promise<UpdateInfo> {
  const res = await fetch('/api/app-update/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  });
  const data: UpdateInfo = await res.json().catch(() => ({
    updateAvailable: false,
    currentVersion: CURRENT_APP_VERSION,
    status: 'error',
    errorMessageFa: 'قالب پاسخ سرور نامعتبر است.',
  }));

  if (!res.ok && !data.errorMessageFa) {
    throw new Error((data as any).error || `Update check failed (${res.status})`);
  }
  return data;
}

export async function startDownload(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/app-update/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.errorMessageFa || data.error || `Download failed (${res.status})`);
  }
  return data;
}

export async function triggerInstall(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/app-update/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.errorMessageFa || data.error || `Installation failed (${res.status})`);
  }
  return data;
}

export async function setAutoUpdatePreference(enabled: boolean, channel: 'stable' | 'beta'): Promise<void> {
  await fetch('/api/app-update/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoUpdateEnabled: enabled, channel }),
  }).catch(() => {});
}
