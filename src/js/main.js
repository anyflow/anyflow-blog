// Dark mode toggle
const toggle = document.querySelector(".theme-toggle");
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  toggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

// Init from stored preference or system preference
const stored = localStorage.getItem("theme");
if (stored) {
  setTheme(stored);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  setTheme("dark");
}

toggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});
