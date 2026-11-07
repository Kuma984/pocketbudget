// Owner C — C01. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = "Mô phỏng trước khi mua";
  const owner = document.createElement('p');
  owner.className = 'owner';
  owner.textContent = "TODO · Thành viên C · C01";
  const list = document.createElement('ul');
  for (const text of ["Nhập giá, số ngày và khoản muốn giữ lại.", "Dùng domain/finance.js, không tự ghi khoản chi.", "Xác nhận đã mua phải mở bản nháp theo luồng giao dịch."]) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  }
  container.append(heading, owner, list);
}
