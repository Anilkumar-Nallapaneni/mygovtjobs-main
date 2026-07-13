import { useCallback, useEffect, useState } from "react";
import { applyColorMode } from "@/theme/designSystem";

export type ColorMode = "dark" | "bw";

const COLOR_MODE_KEY = "mygovtjobs-color-mode";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredColorMode(): ColorMode | null {
  try {
    const v = localStorage.getItem(COLOR_MODE_KEY);
    if (v === "night") {
      localStorage.setItem(COLOR_MODE_KEY, "dark");
      return "dark";
    }
    if (v === "bw" || v === "dark") return v;
    return null;
  } catch {
    return null;
  }
}

function initialColorMode(): ColorMode {
  return readStoredColorMode() ?? (systemPrefersDark() ? "dark" : "bw");
}

export function useColorMode() {
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode);

  const onColorModeChange = useCallback((next: ColorMode) => {
    try {
      localStorage.setItem(COLOR_MODE_KEY, next);
    } catch {
      /* ignore */
    }
    applyColorMode(next);
    setColorMode(next);
  }, []);

  useEffect(() => {
    applyColorMode(colorMode);
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredColorMode() !== null) return;
      const next: ColorMode = media.matches ? "dark" : "bw";
      applyColorMode(next);
      setColorMode(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return { colorMode, onColorModeChange };
}
