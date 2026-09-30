document.addEventListener("click", (e) => {
  const btn = e.target.closest(".primary-nav-button");
  const open = Boolean(btn) && !btn.classList.contains("open");
  document.querySelectorAll(".primary-nav-button, .primary-nav").forEach((el) => el.classList.toggle("open", open));
});
