// Owner C — C04 / C05 / C06. This is a placeholder screen, not a completed feature.
export function render(container) {
  container.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = "Chatbot local";
  const owner = document.createElement('p');
  owner.className = 'owner';
  owner.textContent = "TODO · Thành viên C · C04 / C05 / C06";
  const list = document.createElement('ul');
  for (const text of ["Chat gọi PHP API, PHP gọi Ollama; chưa có kết nối trong starter.", "Model tạo intent hoặc draft có kiểm tra, không tự ghi tiền.", "Nếu AI không sẵn sàng, nhập liệu và mô phỏng thủ công vẫn dùng."]) {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  }
  container.append(heading, owner, list);
}
