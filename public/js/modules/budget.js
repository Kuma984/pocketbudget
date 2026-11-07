// Owner B — B02 / B06. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = "Ngân sách";
  const owner = document.createElement('p');
  owner.className = 'owner';
  owner.textContent = "TODO · Thành viên B · B02 / B06";
  const list = document.createElement('ul');
  for (const text of ["Một ngân sách tổng cho mỗi tháng.", "Tổng chi theo ngày giao dịch, bỏ tombstones.", "Giữ số âm để người dùng biết đã vượt mức."]) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  }
  container.append(heading, owner, list);
}
