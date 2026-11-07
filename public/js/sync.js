import { apiRequest } from './api.js';
import { openDatabase, getOutboxOperations, clearOutboxOperations, mergeSnapshotData } from './db.js';

let isSyncing = false;

/**
 * Đồng bộ hai chiều giữa IndexedDB và MySQL Server (Task B04)
 * 1. Đẩy các thao tác outbox cục bộ lên api/sync.php
 * 2. Kéo snapshot dữ liệu mới nhất từ api/snapshot.php về IndexedDB
 */
export async function syncNow(userId, csrfToken) {
  if (!userId) {
    throw new Error('Cần userId để đồng bộ dữ liệu.');
  }

  if (isSyncing) {
    console.log('Đang có một tiến trình đồng bộ khác chạy.');
    return { synced: false, message: 'Đang đồng bộ...' };
  }

  isSyncing = true;
  try {
    // 1. Đọc hàng đợi outbox
    const ops = await getOutboxOperations(userId);
    let pushedCount = 0;

    if (ops.length > 0) {
      // Gửi mẻ outbox lên api/sync.php
      const syncRes = await apiRequest('sync.php', {
        method: 'POST',
        body: { operations: ops },
        csrfToken: csrfToken,
      });

      if (syncRes && Array.isArray(syncRes.results)) {
        const successOpIds = [];
        for (const res of syncRes.results) {
          if (res.ok && res.operation_id) {
            successOpIds.push(res.operation_id);
            pushedCount++;
          }
        }
        // Xóa các thao tác đã được server xác nhận (ACK)
        if (successOpIds.length > 0) {
          await clearOutboxOperations(userId, successOpIds);
        }
      }
    }

    // 2. Kéo full snapshot mới nhất từ máy chủ
    const snapshotRes = await apiRequest('snapshot.php', {
      method: 'GET',
      csrfToken: csrfToken,
    });

    if (snapshotRes) {
      await mergeSnapshotData(userId, snapshotRes);
    }

    return {
      synced: true,
      pushed: pushedCount,
      outboxRemaining: ops.length - pushedCount,
      serverTime: snapshotRes?.server_time,
    };
  } finally {
    isSyncing = false;
  }
}
