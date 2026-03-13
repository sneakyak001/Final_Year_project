// ── Sync API Integration for HMS Web App ─────────────────────────────────────
// Add this to the HMS Web admin panel's AdminDashboard.tsx or a dedicated page.
// This module provides functions to export/import data with the sync bridge.

const SYNC_SERVER = 'http://localhost:3001';

/**
 * Export all patients from the HMS Web app (Dexie.js) to the sync bridge.
 * Call this when the admin clicks "Export to Mobile Sync".
 */
export async function exportToSyncBridge(patients: any[], aiReports?: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${SYNC_SERVER}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patients, diagnoses: aiReports || [] }),
    });
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    const data = await response.json();
    return { success: true, message: `Exported ${data.patients} patient records to sync bridge.` };
  } catch (err: any) {
    return { success: false, message: `Export failed: ${err.message}. Is the sync server running? (node sync-server/server.js)` };
  }
}

/**
 * Import patients pushed by the mobile app from the sync bridge.
 * Call this when the admin clicks "Import from Mobile Sync".
 */
export async function importFromSyncBridge(): Promise<{ success: boolean; patients: any[]; diagnoses: any[]; message: string }> {
  try {
    const response = await fetch(`${SYNC_SERVER}/api/import`);
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    const data = await response.json();
    return {
      success: true,
      patients: data.patients || [],
      diagnoses: data.diagnoses || [],
      message: `Imported ${(data.patients || []).length} patients and ${(data.diagnoses || []).length} diagnoses from mobile.`,
    };
  } catch (err: any) {
    return { success: false, patients: [], diagnoses: [], message: `Import failed: ${err.message}` };
  }
}

/**
 * Check if the sync bridge server is online.
 */
export async function checkSyncServerHealth(): Promise<{ online: boolean; info?: any }> {
  try {
    const response = await fetch(`${SYNC_SERVER}/api/health`, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    return { online: true, info: data };
  } catch {
    return { online: false };
  }
}
