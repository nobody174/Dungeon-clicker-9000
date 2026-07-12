// ─────────────────────────────────────
// Toast notifications
// ─────────────────────────────────────

export function showToast(title, desc) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-desc">${desc}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    setTimeout(() => toast.remove(), 420);
  }, 3000);
}
