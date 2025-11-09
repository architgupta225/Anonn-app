import { useState, useEffect } from 'react';

// Enhanced mobile detection hook
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isMobile, isTablet, screenSize };
}

// Touch-friendly button sizes
export const mobileButtonSizes = {
  sm: 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm',
  default: 'min-h-[48px] min-w-[48px] px-4 py-3 text-base',
  lg: 'min-h-[56px] min-w-[56px] px-6 py-4 text-lg',
  xl: 'min-h-[64px] min-w-[64px] px-8 py-5 text-xl'
};

// Mobile-optimized spacing
export const mobileSpacing = {
  xs: 'space-y-2',
  sm: 'space-y-3',
  default: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8'
};

// Mobile-friendly grid layouts
export const mobileGrids = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  'auto': 'grid-cols-1 sm:grid-cols-auto'
};

// Mobile navigation utilities
export const mobileNav = {
  sidebar: 'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 transform transition-transform duration-300 ease-in-out',
  overlay: 'fixed inset-0 bg-[#E8EAE9] bg-opacity-50 z-40',
  content: 'transform transition-transform duration-300 ease-in-out'
};

// Touch-friendly input styles
export const mobileInputStyles = {
  default: 'min-h-[48px] px-4 py-3 text-base',
  large: 'min-h-[56px] px-6 py-4 text-lg'
};

// Mobile-optimized card styles
export const mobileCardStyles = {
  default: 'p-4 sm:p-6',
  compact: 'p-3 sm:p-4',
  spacious: 'p-6 sm:p-8'
};

// Mobile-friendly typography
export const mobileTypography = {
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
  h3: 'text-lg sm:text-xl lg:text-2xl font-medium',
  body: 'text-base sm:text-lg',
  small: 'text-sm sm:text-base'
};

// Mobile gesture utilities
export const mobileGestures = {
  swipeThreshold: 50, // Minimum distance for swipe detection
  swipeVelocity: 0.3, // Minimum velocity for swipe detection
  longPressDelay: 500 // Delay for long press detection (ms)
};

// Mobile-specific breakpoints
export const mobileBreakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Mobile-friendly z-index scale
export const mobileZIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
};

// Mobile optimization utilities
export const mobileUtils = {
  // Prevent zoom on input focus (iOS)
  preventZoom: `
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="number"],
    input[type="tel"],
    input[type="url"],
    textarea,
    select {
      font-size: 16px !important;
    }
  `,
  
  // Smooth scrolling for mobile
  smoothScroll: `
    html {
      scroll-behavior: smooth;
    }
  `,
  
  // Touch-friendly focus states
  touchFocus: `
    button:focus,
    input:focus,
    textarea:focus,
    select:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  `,
  
  // Prevent text selection on buttons
  noSelect: `
    button {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
  `
};

// Hook for detecting touch devices
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}

// Hook for detecting device orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
}

// Hook for detecting safe areas (notches, etc.)
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const style = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(style.getPropertyValue('--sat') || '0'),
        right: parseInt(style.getPropertyValue('--sar') || '0'),
        bottom: parseInt(style.getPropertyValue('--sab') || '0'),
        left: parseInt(style.getPropertyValue('--sal') || '0')
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}
