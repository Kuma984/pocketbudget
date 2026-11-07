// Owner C — C02 / C03. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = "Danh sách chờ mua";
  const owner = document.createElement('p');
  owner.className = 'owner';
  owner.textContent = "TODO · Thành viên C · C02 / C03";
  const list = document.createElement('ul');
  for (const text of ["Lưu món, giá dự kiến, ngày xem lại và trạng thái.", "Đến ngày hiện nhắc khi mở app; chưa có Web Push.", "Món bị bỏ qua không được cộng vào số tiền tiết kiệm thật."]) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  }
  container.append(heading, owner, list);
}
