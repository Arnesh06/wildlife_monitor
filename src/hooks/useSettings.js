import { useCallback, useEffect, useState } from "react";

const KEY = "wildlife-settings-v3";

export const DEFAULT_SETTINGS = {
  theme: "dark", // dark | light | auto
  accent: "forest", // forest | savanna | dusk
  sound: true,
  toasts: true,
  desktopNotify: false,
  ambient: true,
  compact: false,
  defaultRange: "24h"
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    // migrate from v2 single-purpose keys
    const legacyTheme = localStorage.getItem("wildlife-theme");
    const legacySound = localStorage.getItem("wildlife-sound");
    const base = { ...DEFAULT_SETTINGS };
    if (legacyTheme === "light" || legacyTheme === "dark") base.theme = legacyTheme;
    if (legacySound === "off") base.sound = false;
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = settings.theme === "auto" ? (systemDark ? "dark" : "light") : settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-compact", settings.compact ? "1" : "0");
    root.setAttribute("data-ambient", settings.ambient ? "1" : "0");
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
      localStorage.setItem("wildlife-theme", resolvedTheme);
    } catch {
      /* storage unavailable */
    }
  }, [settings, resolvedTheme]);

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), []);

  return { settings, update, reset, resolvedTheme };
}
