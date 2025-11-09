// Navigation history utility for dynamic back navigation
interface NavigationEntry {
  path: string;
  title: string;
  timestamp: number;
}

class NavigationHistory {
  private static instance: NavigationHistory;
  private history: NavigationEntry[] = [];
  private maxEntries = 50; // Keep last 50 entries

  private constructor() {
    // Initialize with current page if available
    if (typeof window !== 'undefined') {
      this.addEntry(window.location.pathname + window.location.search, this.getPageTitle());
    }
  }

  static getInstance(): NavigationHistory {
    if (!NavigationHistory.instance) {
      NavigationHistory.instance = new NavigationHistory();
    }
    return NavigationHistory.instance;
  }

  addEntry(path: string, title?: string): void {
    const entry: NavigationEntry = {
      path,
      title: title || this.getPageTitle(),
      timestamp: Date.now()
    };

    // Remove duplicate consecutive entries
    if (this.history.length > 0 && this.history[this.history.length - 1].path === path) {
      return;
    }

    this.history.push(entry);

    // Keep only the last maxEntries
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(-this.maxEntries);
    }

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('navigationHistory', JSON.stringify(this.history));
    }
  }

  getPreviousEntry(): NavigationEntry | null {
    if (this.history.length < 2) {
      return null;
    }
    return this.history[this.history.length - 2];
  }

  getPreviousEntryForCurrentPath(): NavigationEntry | null {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
    
    // Find the last entry that's different from current path
    for (let i = this.history.length - 2; i >= 0; i--) {
      if (this.history[i].path !== currentPath) {
        return this.history[i];
      }
    }
    
    return null;
  }

  getBackPath(): string {
    const previous = this.getPreviousEntryForCurrentPath();
    return previous ? previous.path : '/';
  }

  getBackTitle(): string {
    const previous = this.getPreviousEntryForCurrentPath();
    return previous ? previous.title : 'Home';
  }

  private getPageTitle(): string {
    if (typeof window === 'undefined') return 'Unknown';
    
    // Extract meaningful title from current page
    const path = window.location.pathname;
    const search = window.location.search;
    
    // Handle specific routes
    if (path.startsWith('/bowls/')) {
      const bowlName = path.split('/').pop();
      return bowlName ? `${bowlName} Bowl` : 'Bowl';
    }
    
    if (path.startsWith('/organizations/')) {
      const orgId = path.split('/').pop();
      return orgId ? `Organization ${orgId}` : 'Organization';
    }
    
    if (path === '/create-post') {
      return 'Create Post';
    }
    
    if (path === '/polls') {
      return 'Polls';
    }
    
    if (path === '/organizations') {
      return 'Organizations';
    }
    
    if (path === '/bowls') {
      return 'Bowls';
    }
    
    if (path === '/') {
      return 'Home';
    }
    
    // Default to path-based title
    return path.charAt(1).toUpperCase() + path.slice(2) || 'Home';
  }

  // Load history from localStorage on app start
  loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('navigationHistory');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load navigation history:', error);
      this.history = [];
    }
  }

  // Clear history
  clear(): void {
    this.history = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('navigationHistory');
    }
  }
}

// Export singleton instance
export const navigationHistory = NavigationHistory.getInstance();

// Helper function to get back navigation info
export const getBackNavigation = () => {
  return {
    path: navigationHistory.getBackPath(),
    title: navigationHistory.getBackTitle()
  };
};

// Helper function to add current page to history
export const addToHistory = (path?: string, title?: string) => {
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '');
  navigationHistory.addEntry(currentPath, title);
};

// Initialize history on app start
if (typeof window !== 'undefined') {
  navigationHistory.loadFromStorage();
}
