export async function syncNow(userId) {
  // B04 + A04/A05: single coordinator, push queue, ACK each operation, pull snapshot.
  // Preserve pending overlays, handle 401/409/422 and tombstones. Do not fake success.
  throw new Error('NOT_IMPLEMENTED B04: syncNow');
}
