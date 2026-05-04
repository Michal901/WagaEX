// ===== UTILS MODULE =====
export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (err ? " error" : "");
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.className = "toast";
  }, 3200);
}
