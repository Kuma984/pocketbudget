// C integration points. A/B still own authentication, IndexedDB and synchronization.
import { apiRequest } from '../api.js';
import { listRecords } from '../db.js';

const SESSION_KEY = 'pocketbudget-session';
let session = null;
try {
  const cached = JSON.parse(sessionStorage.getItem(SESSION_KEY));
  if (/^[1-9][0-9]{0,19}$/.test(cached?.id)) session = { user: cached, csrf_token: null };
} catch { /* No previously verified user in this tab. */ }
let simulationPreset = null;
let wishlistPreset = null;

export function setCSession(value) {
  const id = String(value?.user?.id ?? '');
  if (!/^[1-9][0-9]{0,19}$/.test(id)) return clearCSession();
  if (session?.user.id !== id) clearCSession();
  session = { user: { id, name: value.user.name ?? '', email: value.user.email ?? '' }, csrf_token: typeof value.csrf_token === 'string' ? value.csrf_token : null };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, name: session.user.name })); } catch { /* Session memory still works. */ }
  return session;
}

export function clearCSession() {
  session = simulationPreset = wishlistPreset = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* No browser session storage. */ }
  return null;
}

export function assertCSession(expected) {
  if (!expected || session?.user.id !== expected.user.id) throw new Error('Tài khoản đã thay đổi. Mở lại màn hình.');
}

export async function getCSession() {
  if (navigator.onLine === false) {
    if (session) return session;
    throw new Error('Hãy đăng nhập trực tuyến trước khi dùng dữ liệu cá nhân.');
  }
  try {
    const result = setCSession(await apiRequest('auth.php?action=me'));
    if (!result) throw new Error('Chưa xác định được tài khoản. Hãy đăng nhập.');
    return result;
  } catch (error) {
    if (error instanceof TypeError && session) {
      session = { user: session.user, csrf_token: null };
      return session;
    }
    clearCSession();
    if ([501, 503].includes(error.status) && ['NOT_IMPLEMENTED', 'FRONTEND_PREVIEW_ONLY'].includes(error.code)) {
      throw new Error('Trang xem thử không chạy PHP. Khởi động backend để đăng nhập và xem dữ liệu.');
    }
    if (error.status === 401) throw new Error('Hãy đăng nhập để dùng chức năng này.');
    if (error instanceof TypeError) throw new Error('Không kết nối được máy chủ để kiểm tra phiên đăng nhập.');
    throw error;
  }
}

export async function readCRecords(store, current) {
  assertCSession(current);
  let rows;
  try {
    rows = await listRecords(store, current.user.id);
  } catch (error) {
    if (String(error.message).includes('NOT_IMPLEMENTED')) throw new Error('Bản sườn chưa có lưu dữ liệu. Cần ghép IndexedDB của B.');
    throw error;
  }
  assertCSession(current);
  return rows.filter(row => String(row.user_id) === current.user.id && !row.deleted_at);
}

export function openSimulation(preset) {
  simulationPreset = preset;
  location.hash = 'simulation';
}
export function takeSimulationPreset() {
  const preset = simulationPreset;
  simulationPreset = null;
  return preset;
}
export function openWishlist(preset) {
  wishlistPreset = preset;
  location.hash = 'wishlist';
}
export function takeWishlistPreset() {
  const preset = wishlistPreset;
  wishlistPreset = null;
  return preset;
}

// Guest data is isolated from numeric account IDs, including the first registered user.
export const GUEST_USER_ID = 'guest';
export async function getAppSession() {
  try { return await getCSession(); } catch { return null; }
}
