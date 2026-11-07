// Owner C — C02 / C03. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.innerHTML = `
    <section class="card">
      <h2><i class="ri-heart-line"></i> Danh sách chờ mua (Wishlist) (C02 / C03)</h2>
      <p class="section-desc">Trì hoãn mua sắm bốc đồng bằng quy tắc 72 giờ và danh sách ước muốn có kỷ luật.</p>
      <div style="background:var(--bg); border:1px solid var(--line-strong); padding:16px; border-radius:var(--radius-sm);">
        <p style="margin:0 0 10px; font-weight:700; color:var(--muted);">TODO · Nhiệm vụ Thành viên C · C02 / C03:</p>
        <ul style="margin:0; padding-left:20px; color:var(--text);">
          <li style="margin-bottom:6px;">Lưu món, giá dự kiến, ngày xem lại và trạng thái mong muốn.</li>
          <li style="margin-bottom:6px;">Đến ngày hiện nhắc khi mở app; chưa có Web Push.</li>
          <li>Món bị bỏ qua không được cộng vào số tiền tiết kiệm thật.</li>
        </ul>
      </div>
    </section>
  `;
}
