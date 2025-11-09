import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { getBackNavigation } from "@/lib/navigationUtils";

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
  fallbackTitle?: string;
}

export default function BackButton({ 
  className = "flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
  fallbackPath = "/",
  fallbackTitle = "Home"
}: BackButtonProps) {
  const [, setLocation] = useLocation();
  
  const { path, title } = getBackNavigation();
  const backPath = path || fallbackPath;
  const backTitle = title || fallbackTitle;

  const handleBack = () => {
    setLocation(backPath);
  };

  return (
    <Button 
      variant="ghost" 
      onClick={handleBack}
      className={className}
    >
      <ChevronDown className="w-4 h-4 rotate-90" />
      <span>Back to {backTitle}</span>
    </Button>
  );
}
