import { useCallback, useEffect, useState } from "react";
import { applyColorMode } from "@/theme/designSystem";

export type ColorMode = "dark" | "bw";

const COLOR_MODE_KEY = "mygovtjobs-color-mode";

export function useColorMode() {
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    try {
      const v = localStorage.getItem(COLOR_MODE_KEY);
      if (v === "night") {
        localStorage.setItem(COLOR_MODE_KEY, "dark");
        return "dark";
      }
      if (v === "bw") return "bw";
      if (v === "dark") return "dark";
      return "bw";
    } catch {
      return "bw";
    }
  });

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

  return { colorMode, onColorModeChange };
}
