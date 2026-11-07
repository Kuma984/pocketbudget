// Owner B — B02 / B06. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = "Tổng quan";
  const owner = document.createElement('p');
  owner.className = 'owner';
  owner.textContent = "TODO · Thành viên B · B02 / B06";
  const list = document.createElement('ul');
  for (const text of ["Thẻ tổng thu, tổng chi, số dư và ngân sách.", "Biểu đồ từ dữ liệu IndexedDB, không tự gọi DB khác.", "Chưa có dữ liệu và thay đổi chưa đồng bộ phải hiển thị rõ."]) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  }
  container.append(heading, owner, list);
}
