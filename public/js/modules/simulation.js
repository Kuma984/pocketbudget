// Owner C — C01. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.innerHTML = `
    <section class="card">
      <h2><i class="ri-calculator-line"></i> Mô phỏng trước khi mua (C01)</h2>
      <p class="section-desc">Phân tích khả năng chi tiêu và tác động đến số dư trước khi quyết định mua sắm.</p>
      <div style="background:var(--bg); border:1px solid var(--line-strong); padding:16px; border-radius:var(--radius-sm);">
        <p style="margin:0 0 10px; font-weight:700; color:var(--muted);">TODO · Nhiệm vụ Thành viên C · C01:</p>
        <ul style="margin:0; padding-left:20px; color:var(--text);">
          <li style="margin-bottom:6px;">Nhập giá sản phẩm, số ngày dự kiến và khoản tiết kiệm muốn giữ lại.</li>
          <li style="margin-bottom:6px;">Dùng hàm tài chính tính toán từ <code>domain/finance.js</code>, không tự ghi khoản chi giả.</li>
          <li>Xác nhận đã mua phải mở bản nháp theo luồng giao dịch chuẩn.</li>
        </ul>
      </div>
    </section>
  `;
}
