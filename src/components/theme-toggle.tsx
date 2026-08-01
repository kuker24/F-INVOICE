"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark" | "system";

function apply(mode: Mode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode === "system") {
    localStorage.removeItem("finv-theme");
    return;
  }
  root.classList.add(mode);
  localStorage.setItem("finv-theme", mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = localStorage.getItem("finv-theme") as Mode | null;
    if (saved === "light" || saved === "dark") {
      setMode(saved);
      apply(saved);
    }
  }, []);

  function cycle() {
    const next: Mode =
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    apply(next);
  }

  const label =
    mode === "dark"
      ? "Tema gelap"
      : mode === "light"
        ? "Tema terang"
        : "Tema sistem";

  const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
}
