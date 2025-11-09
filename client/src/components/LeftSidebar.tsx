import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Users, TrendingUp, Star, Home,
  BarChart3, Sparkles, Hash, MessageCircle, Twitter, Building, User, Bell, Flame, ChevronDown, ChevronUp,
  HelpCircle,
  Briefcase,
  Settings,
  Bookmark,
  LogOut,
  Edit2,
  Edit3,
  Menu,
  X,
  Triangle,
  Circle,
  BarChart
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, LayoutGroup } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import type { Bowl, Organization, BowlFollow } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  onCreatePost: () => void;
  onCreateReview: () => void;
}

export default function LeftSidebar({ onCreatePost, onCreateReview }: SidebarProps) {
   const { isAuthenticated, user} = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // Check screen size and set initial state
 // Check screen size and set initial state - FIXED VERSION
useEffect(() => {
  const checkScreenSize = () => {
    const mobile = window.innerWidth < 1024; // lg breakpoint is 1024px
    setIsMobile(mobile);

    // Use a functional update to get the *current* state
    // This avoids stale state and dependency loops
    setIsOpen((currentIsOpen) => {
      if (mobile && currentIsOpen) {
        return false; // Collapse if mobile and currently open
      } else if (!mobile && !currentIsOpen) {
        return true; // Expand if desktop and currently closed
      }
      return currentIsOpen; // Otherwise, no change
    });
  };

  // Initial check
  checkScreenSize();

  // Add event listener
  window.addEventListener('resize', checkScreenSize);

  // Cleanup
  return () => window.removeEventListener('resize', checkScreenSize);
}, []); // Empty dependency array is now correct

  // Load favorites from server on component mount
  const { data: serverFavorites } = useQuery<{ bowlId: number }[]>({
    queryKey: ["/api/user/favorites"],
    retry: false,
    enabled: true,
  });


  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('bowl-favorites');
    if (savedFavorites) {
      try {
        const favoritesArray = JSON.parse(savedFavorites);
        setFavorites(new Set(favoritesArray));
      } catch (error) {
        console.error('Error loading favorites from localStorage:', error);
      }
    }
  }, []);

  // Sync with server favorites when available
  useEffect(() => {
    if (serverFavorites) {
      const serverFavoritesSet = new Set(serverFavorites.map(f => f.bowlId));
      setFavorites(serverFavoritesSet);
      localStorage.setItem('bowl-favorites', JSON.stringify(Array.from(serverFavoritesSet)));
    }
  }, [serverFavorites]);
  
  const { data: bowls, isLoading: bowlsLoading } = useQuery<Bowl[]>({
    queryKey: ["/api/bowls"],
    retry: false,
  });

  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  // Get user's followed bowls
  const { data: userBowls } = useQuery<(BowlFollow & { bowl: Bowl })[]>({
    queryKey: ["/api/user/bowls"],
    retry: false,
  });

  // Get notifications for unseen count
  const { data: notifications } = useQuery<Array<{ id: number; read: boolean }>>({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  // Calculate unseen notification count
  const unseenNotificationCount = notifications?.filter(n => !n.read).length || 0;

  // Mutation for updating favorites
  const updateFavoriteMutation = useMutation({
    mutationFn: async ({ bowlId, isFavorite }: { bowlId: number; isFavorite: boolean }) => {
      console.log('[Sidebar] Updating favorite:', { bowlId, isFavorite });
      await apiRequest('POST', '/api/user/favorites', { bowlId, isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
    },
    onError: (error) => {
      console.error('[Sidebar] Error updating favorite:', error);
    },
  });

  const handleFavorite = (bowlId: number) => {
    console.log('[Sidebar] handleFavorite called for bowlId:', bowlId);
    const isCurrentlyFavorite = favorites.has(bowlId);
    console.log('[Sidebar] Current favorite state:', isCurrentlyFavorite);
    
    const newFavorites = new Set(favorites);
    
    if (isCurrentlyFavorite) {
      newFavorites.delete(bowlId);
    } else {
      newFavorites.add(bowlId);
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('bowl-favorites', JSON.stringify(Array.from(newFavorites)));
    updateFavoriteMutation.mutate({ bowlId, isFavorite: !isCurrentlyFavorite });
  };

  // Sort user bowls to show favorites first, then by most recently followed
  const sortedUserBowls = userBowls ? [...userBowls].sort((a, b) => {
    const aIsFavorite = favorites.has(a.bowl.id);
    const bIsFavorite = favorites.has(b.bowl.id);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    
    if (a.followedAt && b.followedAt) {
      return new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime();
    }
    
    return 0;
  }) : [];

  // Main navigation items
  const sidebarItems: Array<{
    href: string;
    label: string;
    icon: any;
    isActive: boolean;
    badge?: number;
  }> = [
    { href: "/", label: "HOME", icon: Home, isActive: location === "/" },
    { href: "/polls", label: "POLLS", icon: BarChart, isActive: location === "/polls" },
    { href: "/notifications", label: "NOTIFICATIONS", icon: Bell, isActive: location === "/notifications", badge: unseenNotificationCount > 0 ? unseenNotificationCount : 0 },
    { href: "/organizations", label: "COMPANIES", icon: Triangle, isActive: location.startsWith("/organizations") },
    { href: "/bowls", label: "BOWLS", icon: Circle, isActive: location.startsWith("/bowls") && !isProfileOpen },
  ];

  const [showHot, setShowHot] = useState(!isMobile); // Auto-collapse hot section on mobile
  const [showRecent, setShowRecent] = useState(!isMobile);
  const [showCommunities, setShowCommunities] = useState(!isMobile);

  const hotTopics = [
    "When will the Government shutdown end?",
    "MegaETH public sale total commitments?",
    "Will Sam Altman get OpenAI equity in 2025?",
    "Active Web3 Contributor",
    "Consistently Supportive and Dedicated"
  ];

  const handleProfileClick = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    // Handle profile click
    const newProfileState = !isProfileOpen;
    setIsProfileOpen(newProfileState);
    if (newProfileState) {
      setLocation("/profile");
    }
  };

const handleLogout = async () => {
  try {
    // Call server logout endpoint
    await apiRequest('POST', '/api/auth/logout', {});
    
    // Clear localStorage items
    localStorage.removeItem('phantom_auth_token');
    localStorage.removeItem('bowl-favorites');
    localStorage.removeItem('dynamic_store');
    localStorage.removeItem('dynamic_device_fingerprint');
    localStorage.removeItem('walletName');
    localStorage.removeItem('wallet-uicluster');
    // Clear any other auth-related items
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Redirect to auth page
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    // Even if server logout fails, still clear local data and redirect
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
};

  // Toggle sidebar function
  const handleToggleSidebar = () => {
    setIsOpen(!isOpen);
    
    // When expanding sidebar on mobile, also expand the hot section
    if (!isOpen && isMobile) {
      setShowHot(true);
    }
  };

  useEffect(() => {
    if(location === "/profile" || location === "/settings") {
      setIsProfileOpen(true);
    } else {
      setIsProfileOpen(false);
    }
  }, [location]);
  // Auto-expand hot section when sidebar expands
  useEffect(() => {
    if (isOpen && isMobile) {
      setShowHot(true);
    }
  }, [isOpen, isMobile]);
  
  console.log("isMobile:", isMobile, "isOpen:", isOpen, "window width:", window.innerWidth);

  return (
    <div className={` bg-black border-r border-gray-800 pt-4 flex flex-col h-full transition-all duration-300 ${
      isOpen ? 'w-64' : 'w-20'
    } relative z-10` }>
      
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-5"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Header with Toggle Button - Hidden on lg screens and above */}
      {isMobile && (
        <div className="flex justify-between items-center px-4 mb-4">
          {isOpen && (
            <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Navigation
            </h2>
          )}
          <button
            onClick={handleToggleSidebar}
            className={`p-2 rounded-md hover:bg-[#252525] transition-colors duration-200 ${
              !isOpen ? 'mx-auto' : ''
            }`}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400 transform rotate-90" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 transform -rotate-90" />
            )}
          </button>
        </div>
      )}

      {/* Content Container */}
      <div className="flex-1 flex flex-col scrollbar-hide  overflow-y-auto relative z-10">
        {/* Main Navigation */}
        <LayoutGroup id="side-nav">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center px-3 py-3 text-sm font-normal rounded-lg transition-all duration-200 group ${
                    item.isActive
                      ? "text-white bg-[#2a2a2a]"
                      : "text-gray-200 hover:text-gray-300 hover:bg-[#252525]"
                  } ${!isOpen ? 'justify-center' : ''}`}
                  title={!isOpen ? item.label : undefined}
                >
                  <motion.div
                    className={`relative z-10 ${isOpen ? 'mr-3' : ''}`}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Icon fill={item.isActive ? "currentColor" : "none"} className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                      item.isActive ? 'text-white' : 'text-gray-400'
                    }`} />
                  </motion.div>

                  {isOpen && (
                    <div className="flex justify-between flex-1 items-center">

                      <span className="relative z-10 truncate font-normal text-sm uppercase">
                        {item.label}
                      </span>
                       {/* This badge only appears when sidebar is OPEN */}
                      {isOpen && item.badge && (
                        <span className=" text-xs text-center font-bold p-1 bg-gray-700 text-white rounded-full">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                        )}
                    </div>
                  )}

                 
                </Link>
              );
            })}

            {/* Profile Dropdown */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={handleProfileClick}
                  className={`relative flex items-center w-full px-3 py-3 text-sm font-normal rounded-lg transition-all duration-200 group ${
                    (location === "/profile" || location === "/settings" || isProfileOpen)
                      ? "text-white bg-[#2a2a2a]"
                      : "text-gray-400 hover:text-gray-300 hover:bg-[#252525]"
                  } ${!isOpen ? 'justify-center' : ''}`}
                >
                  <motion.div
                    className={`relative z-10 ${isOpen ? 'mr-3' : ''}`}
                    animate={(location === "/profile" || location === "/settings") ? { scale: 1, y: 0 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <User className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                      (location === "/profile" || location === "/settings" || isProfileOpen) ? 'text-white' : 'text-gray-400'
                    }`} />
                  </motion.div>

                  {isOpen && (
                    <>
                      <span className="relative z-10 truncate font-normal text-sm uppercase flex-1 text-left">
                        PROFILE
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Profile Submenu - Only show when sidebar is open */}
                {isAuthenticated && isProfileOpen && isOpen && (
                  <div className="mt-1 ml-3 space-y-1 border-l border-gray-700 pl-3">
                    {(isMobile) && <Link
                      href="/create-post"
                      className="flex items-center px-3 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-[#252525] rounded-lg transition-all duration-200"
                    >
                      <Edit3 className="h-4 w-4 mr-3" />
                      <span className="text-sm">CREATE</span>
                    </Link>}
                    <Link
                      href="/bookmarks"
                      className="flex items-center px-3 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-[#252525] rounded-lg transition-all duration-200"
                    >
                      <Bookmark className="h-4 w-4 mr-3" />
                      <span className="text-sm">BOOKMARKS</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center px-3 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-[#252525] rounded-lg transition-all duration-200"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      <span className="text-sm">SETTINGS</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[#252525] rounded-lg transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      <span className="text-sm">LOGOUT</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </LayoutGroup>

        {/* Divider - Only show when sidebar is open */}
        {isOpen && <div className="my-6 mx-4 h-px bg-gray-700"></div>}

        {/* HOT Section */}
        <div className="px-3 mb-6">
          {isOpen && (
            <button 
              onClick={() => setShowHot((s) => !s)} 
              className="group w-full px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center justify-between hover:text-gray-300 transition-all duration-200 hover:bg-[#252525] rounded-md"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>HOT</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showHot ? '' : 'rotate-180'}`} />
            </button>
          )}
          <div className={`space-y-1 overflow-hidden transition-[max-height,opacity] duration-300 ${
            showHot && isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            {hotTopics.map((topic, index) => (
              <div 
                key={index} 
                className="px-3 py-2 text-xs underline text-gray-400 hover:text-gray-300 hover:bg-[#252525] rounded transition-all duration-200 cursor-pointer"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>

       
      </div>

      {/* Social Media Links - Bottom */}
      <div className="mt-auto px-3 pb-4">
        <div className={`flex ${isOpen ? 'justify-center space-x-3' : 'flex-col justify-center space-y-3'}`}>
          <a
            href="https://discord.gg/2M4DxRUkXR"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center p-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-[#252525] hover:text-gray-300 transition-all duration-200"
            title="Discord"
          >
            <MessageCircle className="w-5 h-5 flex-shrink-0" />
          </a>

          <a
            href="https://x.com/Anonn_xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center p-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-[#252525] hover:text-gray-300 transition-all duration-200"
            title="X (Twitter)"
          >
            <Twitter className="w-5 h-5 flex-shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}