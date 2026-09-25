const THEME_KEY = "theme";
const LIGHT = "light";
const DARK = "dark";

type Theme = typeof LIGHT | typeof DARK;

type ThemeWindow = Window & {
  __theme?: {
    value: Theme;
  };
};

const themeWindow = window as ThemeWindow;

function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === LIGHT || stored === DARK) {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// Reuse the value already set by the inline FOUC-prevention script if available.
let themeValue: Theme =
  themeWindow.__theme?.value ?? getPreferredTheme();

function reflect(): void {
  const root = document.documentElement;

  root.setAttribute("data-theme", themeValue);
  root.classList.toggle("dark", themeValue === DARK);

  // theme.ts 只负责反映当前主题。
  // aria-label 保留给页面上的国际化文本，不在这里覆盖。

  const bg = window.getComputedStyle(document.body).backgroundColor;

  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);
}

function persist(): void {
  localStorage.setItem(THEME_KEY, themeValue);
  reflect();
}

function setup(): void {
  reflect();

  const button =
    document.querySelector<HTMLButtonElement>("#theme-btn");

  if (!button || button.dataset.themeInitialized === "true") {
    return;
  }

  button.dataset.themeInitialized = "true";

  button.addEventListener("click", () => {
    themeValue = themeValue === LIGHT ? DARK : LIGHT;
    persist();
  });
}

setup();

// Re-run after View Transitions navigation.
document.addEventListener("astro:after-swap", setup);

// Carry the current theme-color across View Transitions.
document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");

  if (!color) {
    return;
  }

  const newDocument = (
    event as unknown as {
      newDocument: Document;
    }
  ).newDocument;

  newDocument
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", color);
});

// Only follow OS theme changes when the user has NOT made
// an explicit manual theme choice.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => {
    if (localStorage.getItem(THEME_KEY)) {
      return;
    }

    themeValue = matches ? DARK : LIGHT;
    reflect();
  });