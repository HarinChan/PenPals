import { isTauri } from '@tauri-apps/api/core';

export async function openExternalLink(url: string): Promise<void> {
  if (!url) return;

  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch (error) {
      console.error('Failed to open external URL via Tauri opener plugin', error);
    }
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}