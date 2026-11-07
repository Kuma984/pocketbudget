import { render as dashboard } from './modules/dashboard.js';
import { render as transactions } from './modules/transactions.js';
import { render as budget } from './modules/budget.js';
import { render as simulation } from './modules/simulation.js';
import { render as wishlist } from './modules/wishlist.js';
import { render as chat } from './modules/chat.js';
import { apiRequest } from './api.js';

const routes = { dashboard, transactions, budget, simulation, wishlist, chat };
function route() {
  const raw = location.hash.slice(1) || 'dashboard';
  const name = Object.hasOwn(routes, raw) ? raw : 'dashboard';
  routes[name](document.querySelector('#content'));
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === `#${name}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
function networkHint() {
  document.querySelector('#network').textContent = navigator.onLine
    ? 'Mạng: có tín hiệu, chưa xác nhận server'
    : 'Mạng: offline';
}
window.addEventListener('hashchange', route);
window.addEventListener('online', networkHint);
window.addEventListener('offline', networkHint);
route(); networkHint();

const swStatus = document.querySelector('#sw-status');
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(() => {
    swStatus.textContent = 'Service Worker đã đăng ký. Tải lại để kiểm tra app shell offline; chưa có lưu thu chi hoặc sync.';
  }).catch(error => { swStatus.textContent = `Không đăng ký được Service Worker: ${error.message}`; });
} else {
  swStatus.textContent = 'Service Worker cần trình duyệt hỗ trợ và HTTPS hoặc localhost.';
}
document.querySelector('#health-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  const status = document.querySelector('#health-status');
  button.disabled = true;
  status.textContent = 'Đang kiểm tra…';
  try {
    const result = await apiRequest('health.php');
    status.textContent = `Backend: ${result.status}. Health chưa kiểm tra MySQL hoặc Ollama.`;
  } catch (error) {
    status.textContent = `Backend chưa sẵn sàng: ${error.message}`;
  } finally { button.disabled = false; }
});
