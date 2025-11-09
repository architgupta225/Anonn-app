import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Always use light theme
    setTheme("light");
    localStorage.setItem("theme", "light");
    applyTheme("light");
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    // Always remove dark class to ensure light theme
    root.classList.remove("dark");
  };

  const handleThemeChange = (newTheme: Theme) => {
    // Only allow light theme
    setTheme("light");
    localStorage.setItem("theme", "light");
    applyTheme("light");
  };

  const getThemeIcon = () => {
    return <Sun className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
          {getThemeIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleThemeChange("light")}
          className="flex items-center space-x-2 cursor-pointer bg-reddit-orange/10 text-reddit-orange"
        >
          <Sun className="h-4 w-4" />
          <span>Light (Only)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}