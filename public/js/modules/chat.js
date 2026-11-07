// Owner C — C04 / C05 / C06. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.innerHTML = `
    <section class="card">
      <h2><i class="ri-chat-smile-2-line"></i> Trợ lý Tài chính AI (Ollama Local) (C04 / C05 / C06)</h2>
      <p class="section-desc">Tư vấn ngân sách và trích xuất ý định chi tiêu thông minh bằng mô hình ngôn ngữ chạy cục bộ.</p>
      <div style="background:var(--bg); border:1px solid var(--line-strong); padding:16px; border-radius:var(--radius-sm);">
        <p style="margin:0 0 10px; font-weight:700; color:var(--muted);">TODO · Nhiệm vụ Thành viên C · C04 / C05 / C06:</p>
        <ul style="margin:0; padding-left:20px; color:var(--text);">
          <li style="margin-bottom:6px;">Chat gọi PHP API (<code>api/chat.php</code>), PHP gọi Ollama LLM nội bộ.</li>
          <li style="margin-bottom:6px;">Model tạo intent hoặc draft có xác nhận của người dùng, không tự động âm thầm ghi tiền.</li>
          <li>Khi AI chưa khởi động, toàn bộ tính năng nhập liệu thủ công và PWA vẫn hoạt động bình thường.</li>
        </ul>
      </div>
    </section>
  `;
}
