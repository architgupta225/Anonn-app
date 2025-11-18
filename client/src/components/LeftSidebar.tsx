import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGroup, motion } from "framer-motion";
import {
  BarChart,
  Bell,
  Bookmark,
  ChevronDown,
  Circle,
  Edit3,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  TrendingUp,
  Triangle,
  Twitter,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react"; // Added useRef
import { Link, useLocation } from "wouter";

// Component to load and render SVG icons with color control
const SvgIcon = ({
  src,
  isActive,
  alt,
  noFill,
  color,
}: {
  src: string;
  isActive?: boolean;
  alt?: string;
  noFill?: boolean;
  color?: string;
}) => {
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then((svg) => {
        let coloredSvg = svg;

        if (noFill) {
          // For icons that should not be filled, set fill to none and keep stroke
          coloredSvg = svg
            .replace(/fill="(?!none)[^"]*"/g, 'fill="none"')
            .replace(/fill='(?!none)[^']*'/g, "fill='none'")
            .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
            .replace(/stroke='[^']*'/g, "stroke='currentColor'");
        } else {
          // Replace fill and stroke attributes with currentColor for color control
          coloredSvg = svg
            .replace(/fill="[^"]*"/g, 'fill="currentColor"')
            .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
            .replace(/fill='[^']*'/g, "fill='currentColor'")
            .replace(/stroke='[^']*'/g, "stroke='currentColor'");
        }
        setSvgContent(coloredSvg);
      })
      .catch((err) => console.error(`Failed to load SVG: ${src}`, err));
  }, [src, noFill]);

  if (!svgContent) return null;

  const colorClass = color || (isActive ? "text-white" : "text-[#525252]");

  return (
    <div
      className={`flex-shrink-0 transition-all duration-200 ${colorClass}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

interface SidebarProps {
  onCreatePost: () => void;
  onCreateReview: () => void;
}

export default function LeftSidebar({
  onCreatePost,
  onCreateReview,
}: SidebarProps) {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const profileRef = useRef<HTMLDivElement>(null); // Added ref for profile dropdown

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
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []); // Empty dependency array is now correct

  // Load favorites from server on component mount
  const { data: serverFavorites } = useQuery<{ bowlId: number }[]>({
    queryKey: ["/api/user/favorites"],
    retry: false,
    enabled: true,
  });

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem("bowl-favorites");
    if (savedFavorites) {
      try {
        const favoritesArray = JSON.parse(savedFavorites);
        setFavorites(new Set(favoritesArray));
      } catch (error) {
        console.error("Error loading favorites from localStorage:", error);
      }
    }
  }, []);

  // Sync with server favorites when available
  useEffect(() => {
    if (serverFavorites) {
      const serverFavoritesSet = new Set(serverFavorites.map((f) => f.bowlId));
      setFavorites(serverFavoritesSet);
      localStorage.setItem(
        "bowl-favorites",
        JSON.stringify(Array.from(serverFavoritesSet))
      );
    }
  }, [serverFavorites]);

  // Get notifications for unseen count
  const { data: notifications } = useQuery<
    Array<{ id: number; read: boolean }>
  >({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  // Calculate unseen notification count
  const unseenNotificationCount =
    notifications?.filter((n) => !n.read).length || 0;

  // Main navigation items
  const sidebarItems: Array<{
    href: string;
    label: string;
    iconPath?: string; // SVG path from public folder
    icon?: any; // Lucide icon component (fallback)
    isActive: boolean;
    badge?: number;
  }> = [
    {
      href: "/",
      label: "HOME",
      iconPath: "/icons/Home icon.svg",
      isActive: location === "/",
    },
    {
      href: "/polls",
      label: "POLLS",
      iconPath: "/icons/Polls icon.svg",
      isActive: location === "/polls",
    },
    {
      href: "/notifications",
      label: "NOTIFICATIONS",
      iconPath: "/icons/Notifications icon.svg",
      isActive: location === "/notifications",
      badge: unseenNotificationCount > 0 ? unseenNotificationCount : 0,
    },
    {
      href: "/organizations",
      label: "COMPANIES",
      iconPath: "/icons/Companies icon.svg",
      isActive: location.startsWith("/organizations"),
    },
    {
      href: "/bowls",
      label: "BOWLS",
      iconPath: "/icons/Bowls icon.svg",
      isActive: location.startsWith("/bowls") && !isProfileOpen,
    },
  ];

  const [showHot, setShowHot] = useState(!isMobile); // Auto-collapse hot section on mobile

  const hotTopics = [
    "When will the Government shutdown end?",
    "MegaETH public sale total commitments?",
    "Will Sam Altman get OpenAI equity in 2025?",
    "Active Web3 Contributor",
    "Consistently Supportive and Dedicated",
  ];

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setIsProfileOpen(!isProfileOpen);
    if (!isProfileOpen) {
      setLocation("/profile");
    }
  };

  const handleSubmenuClick = (e: React.MouseEvent, href: string) => {
    e.stopPropagation(); // Prevent event from bubbling to parent
    setLocation(href);
    // Don't close the dropdown - keep it open
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling to parent
    try {
      // Call server logout endpoint
      await apiRequest("POST", "/api/auth/logout", {});

      // Clear localStorage items
      localStorage.removeItem("phantom_auth_token");
      localStorage.removeItem("bowl-favorites");
      localStorage.removeItem("dynamic_store");
      localStorage.removeItem("dynamic_device_fingerprint");
      localStorage.removeItem("walletName");
      localStorage.removeItem("wallet-uicluster");
      // Clear any other auth-related items

      // Clear sessionStorage
      sessionStorage.clear();

      // Redirect to auth page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if server logout fails, still clear local data and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
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
    if (
      location === "/profile" ||
      location === "/settings" ||
      location === "/bookmarks"
    ) {
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

  return (
    <div
      className={`pt-4 flex flex-col h-full transition-all duration-300 ${
        isMobile ? (isOpen ? "w-64" : "w-20") : ""
      } relative z-10`}
    >
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
              !isOpen ? "mx-auto" : ""
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
      <div className="flex-1 flex flex-col scrollbar-hide overflow-y-auto relative z-10 ">
        {/* Main Navigation */}
        <LayoutGroup id="side-nav">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex gap-[10px] items-center py-[10px] px-4 text-sm font-normal rounded-lg transition-all duration-200 group ${
                    item.isActive
                      ? "text-white bg-[#2a2a2a]"
                      : "text-gray-200 hover:text-gray-300 hover:bg-[#252525]"
                  } ${!isOpen ? "justify-center" : ""}`}
                  title={!isOpen ? item.label : undefined}
                >
                  <motion.div
                    className={`relative z-10`}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    {item.iconPath ? (
                      <SvgIcon
                        src={item.iconPath}
                        isActive={item.isActive}
                        alt={item.label}
                      />
                    ) : (
                      <Icon
                        fill={item.isActive ? "currentColor" : "none"}
                        className={`flex-shrink-0 transition-all duration-200 ${
                          item.isActive ? "text-white" : "text-[#525252]"
                        }`}
                      />
                    )}
                  </motion.div>

                  {isOpen && (
                    <div className="flex justify-between flex-1 items-center">
                      <div
                        className={`relative z-10 truncate font-medium text-xs uppercase
                      ${item.isActive ? "text-white" : "text-[#525252]"}`}
                      >
                        {item.label}
                      </div>
                      {/* This badge only appears when sidebar is OPEN */}
                      {item.badge && (
                        <div
                          className={`
                          flex items-center justify-center
                          h-5 min-w-5 px-1
                          rounded-full 
                          text-[10px] font-semibold
                          ${
                            item.isActive
                              ? "bg-white text-black"
                              : "bg-[#525252] text-white"
                          }
                        `}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}

            {/* Profile Dropdown */}
            {isAuthenticated && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={handleProfileClick}
                  className={`relative flex items-center w-full px-4 py-[10px] text-sm font-normal rounded-lg transition-all duration-200 group ${
                    location === "/profile" ||
                    location === "/settings" ||
                    location === "/bookmarks" ||
                    isProfileOpen
                      ? "text-white bg-[#2a2a2a]"
                      : "text-[#525252] hover:bg-[#252525]"
                  } ${!isOpen ? "justify-center" : ""}`}
                >
                  <motion.div
                    className={`relative z-10 ${isOpen ? "mr-3" : ""}`}
                    animate={
                      location === "/profile" || location === "/settings"
                        ? { scale: 1, y: 0 }
                        : { scale: 1, y: 0 }
                    }
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <SvgIcon
                      src="/icons/Profile-sidebar icon.svg"
                      isActive={
                        location === "/profile" ||
                        location === "/settings" ||
                        location === "/bookmarks"
                      }
                      alt={"profile"}
                    />
                  </motion.div>

                  {isOpen && (
                    <>
                      <span className="relative z-10 truncate font-semibold text-xs uppercase flex-1 text-left">
                        PROFILE
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isProfileOpen ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>

                {/* Profile Submenu - Only show when sidebar is open */}
                {isAuthenticated && isProfileOpen && isOpen && (
                  <div className="mt-1 ml-3 space-y-1  pl-3">
                    {isMobile && (
                      <button
                        onClick={(e) => handleSubmenuClick(e, "/create-post")}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-[#252525] rounded-lg transition-all duration-200"
                      >
                        <Edit3 className="h-4 w-4 mr-3" />
                        <span className="text-sm">CREATE</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleSubmenuClick(e, "/bookmarks")}
                      className={`flex gap-[10px] items-center w-full px-4 py-[10px] text-xs rounded-lg transition-all duration-200 ${
                        location === "/bookmarks"
                          ? "text-white bg-[#2a2a2a]"
                          : "text-[#525252] hover:text-gray-300 hover:bg-[#252525]"
                      }`}
                    >
                      <SvgIcon
                        src="/icons/Bookmark-sidebar.svg"
                        isActive={location === "/bookmarks"}
                        noFill={location === "/bookmarks" ? false : true}
                      />
                      <span
                        className={`text-xs font-medium ${
                          location === "/bookmarks"
                            ? "text-white"
                            : "text-[#525252]"
                        }`}
                      >
                        BOOKMARKS
                      </span>
                    </button>
                    <button
                      onClick={(e) => handleSubmenuClick(e, "/settings")}
                      className={`flex gap-[10px] items-center w-full px-4 py-[10px] text-xs rounded-lg transition-all duration-200 ${
                        location === "/settings"
                          ? "text-white bg-[#2a2a2a]"
                          : "text-[#525252] hover:text-gray-300 hover:bg-[#252525]"
                      }`}
                    >
                      <SvgIcon
                        src="/icons/Settings-sidebar.svg"
                        isActive={location === "/settings"}
                        noFill={location === "/settings" ? false : true}
                      />
                      <span
                        className={`text-xs font-medium ${
                          location === "/settings"
                            ? "text-white"
                            : "text-[#525252]"
                        }`}
                      >
                        SETTINGS
                      </span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex gap-[10px] items-center w-full px-4 py-[10px] text-xs rounded-lg  hover:bg-[#252525] transition-all duration-200 text-red-400 hover:text-red-300"
                    >
                      <SvgIcon
                        src="/icons/Logout.svg"
                        noFill={true}
                        color="text-[#7A271A]"
                      />
                      <span className="text-xs font-medium text-[#7A271A]">
                        LOGOUT
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </LayoutGroup>

        {/* Divider - Only show when sidebar is open */}
        {isOpen && <div className="my-2 mx-4 h-px bg-gray-700"></div>}

        {/* HOT Section */}
        <div className="px-3 mb-6">
          {isOpen && (
            <button
              onClick={() => setShowHot((s) => !s)}
              className="group w-full px-4 py-[10px] text-xs font-medium text-white uppercase tracking-wider mb-2 flex items-center justify-between  rounded-md"
            >
              <div className="flex items-center gap-2">
                <SvgIcon src="/icons/Hot icon.svg" isActive={true} />
                {/* <TrendingUp className="w-4 h-4" /> */}
                <span>HOT</span>
              </div>
            </button>
          )}
          <div
            className={`space-y-1 overflow-hidden transition-[max-height,opacity] duration-300 ${
              showHot && isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            {hotTopics.map((topic, index) => (
              <div
                key={index}
                className="font-spacemono px-4 py-3 text-[10px] underline text-[#8E8E93] hover:text-gray-300 hover:bg-[#252525] rounded transition-all duration-200 cursor-pointer"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Media Links - Bottom */}
      <div className="mt-auto px-3 pb-4">
        <div
          className={`flex ${
            isOpen
              ? "justify-center space-x-3"
              : "flex-col justify-center space-y-3"
          }`}
        >
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
