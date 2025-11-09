// import { useEffect, useRef, useState } from "react";
// import { Link, useLocation } from "wouter";
// import { useAuth } from "@/hooks/useAuth";
// import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { 
//   Flame, 
//   Search, 
//   Bell, 
//   Settings, 
//   User, 
//   LogOut, 
//   TrendingUp, 
//   Home, 
//   DollarSign, 
//   Star, 
//   Briefcase, 
//   Building2, 
//   Edit3,
//   Plus,
//   ChevronDown,
//   History,
//   MessageSquare,
//   BarChart3,
//   Crown,
//   Shield,
//   Coins,
//   Hash,
//   Users,
//   MessageCircle,
//   Globe,
//   Compass,
//   CircleDot,
//   Layers,
//   Grid3X3,
//   FolderOpen,
//   BookOpen,
//   Target,
//   Zap,
//   Sparkles
// } from "lucide-react";
// import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
// import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// import {
//   CommandDialog,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
//   CommandSeparator,
//   CommandShortcut,
// } from "@/components/ui/command";
// import NotificationBell from "@/components/NotificationBell";
// import { Badge } from "@/components/ui/badge";
// // Removed RealTimeIndicator import

// export default function Navigation() {
//   const { user, isAuthenticated, login, logout } = useAuth();
//   const [location] = useLocation();
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchFocused, setSearchFocused] = useState(false);
//   const [hasShadow, setHasShadow] = useState(false);
//   const searchRef = useRef<HTMLInputElement | null>(null);
//   const [cmdOpen, setCmdOpen] = useState(false);
//   const [logoutOpen, setLogoutOpen] = useState(false);

//   useEffect(() => {
//     const onScroll = () => setHasShadow(window.scrollY > 2);
//     onScroll();
//     window.addEventListener('scroll', onScroll, { passive: true });
//     return () => window.removeEventListener('scroll', onScroll);
//   }, []);

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       // Only trigger search shortcut if user is not typing in an input field
//       const activeElement = document.activeElement;
//       const isTypingInInput = activeElement && (
//         activeElement.tagName === 'INPUT' ||
//         activeElement.tagName === 'TEXTAREA' ||
//         activeElement.getAttribute('contenteditable') === 'true' ||
//         activeElement.getAttribute('role') === 'textbox'
//       );

//       if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !isTypingInInput) {
//         e.preventDefault();
//         searchRef.current?.focus();
//       }
      
//       const key = (e.key || '').toString();
//       if ((key && key.toLowerCase() === 'k') && (e.metaKey || e.ctrlKey)) {
//         e.preventDefault();
//         setCmdOpen((o) => !o);
//       }
//     };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, []);

//   const isActive = (href: string) => {
//     if (href === "/") return location === "/";
//     return location === href || location.startsWith(`${href}/`);
//   };

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (searchQuery.trim()) {
//       // Navigate to search results page
//       window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
//     }
//   };

//   const getKarmaColor = (karma: number) => {
//     if (karma >= 1000) return "text-positive";
//     if (karma >= 500) return "text-reddit-blue";
//     if (karma >= 100) return "text-reddit-orange";
//     if (karma >= 0) return "text-neutral";
//     return "text-negative";
//   };

//   const getKarmaBadge = (karma: number) => {
//     if (karma >= 10000) return { label: "Elite", color: "bg-purple-500" };
//     if (karma >= 5000) return { label: "Expert", color: "bg-red-500" };
//     if (karma >= 1000) return { label: "Veteran", color: "bg-blue-500" };
//     if (karma >= 500) return { label: "Active", color: "bg-green-500" };
//     if (karma >= 100) return { label: "Regular", color: "bg-orange-500" };
//     return { label: "New", color: "bg-gray-500" };
//   };

//   return (
//     <>
//     <nav className={`bg-[#E8EAE9] border-b border-gray-800 fixed top-0 left-0 right-0 z-50 transition-shadow ${hasShadow ? 'shadow-sm' : 'shadow-none'}`}>
//       <div className="w-full relative z-50">
//         <div className="flex justify-center items-center h-14 relative">
//           {/* Centered Logo Only */}
//           <Link href="/" className="z-30 relative">
//             <img src="/anonn.png" alt="Anonn Logo" className="w-30 h-10" />
//           </Link>

//           {/* User Menu - positioned absolutely on the right */}
//           {isAuthenticated ? (
//             <div className="absolute right-4 flex items-center space-x-3">
//               {/* Real-time Indicator - Removed */}
//               {/* Popular/Trending Quick Access */}
//               <div className="hidden lg:flex items-center space-x-1">
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button variant="ghost" size="sm" asChild aria-label="Companies">
//                       <Link href="/organizations">
//                         <Building2 className="h-4 w-4" />
//                       </Link>
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent>Companies</TooltipContent>
//                 </Tooltip>
//               </div>

//               {/* Create Post */}
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button variant="ghost" size="sm" className="hidden md:flex items-center space-x-1">
//                     <Plus className="h-4 w-4" />
//                   </Button>
//                 </DropdownMenuTrigger>
//                   <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg">
//                     <DropdownMenuItem asChild>
//                       <Link href="/create-post" className="flex items-center space-x-2">
//                         <Edit3 className="h-4 w-4" />
//                         <span>Create Post</span>
//                       </Link>
//                     </DropdownMenuItem>
//                     <DropdownMenuItem asChild>
//                       <Link href="/create-post?type=poll" className="flex items-center space-x-2">
//                         <BarChart3 className="h-4 w-4" />
//                         <span>Create Poll</span>
//                       </Link>
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//               </DropdownMenu>

//               {/* Notifications */}
//               <NotificationBell />

//               {/* User Profile Menu */}
//               <DropdownMenu>
//                 <DropdownMenuTrigger className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
//                   <Avatar className="h-7 w-7">
//                     <AvatarImage src={(user as any)?.profileImageUrl || undefined} alt="Profile" />
//                     <AvatarFallback className="text-xs">
//                       <User className="h-3 w-3" />
//                     </AvatarFallback>
//                   </Avatar>
//                   <div className="hidden md:block text-left">
//                     <div className="text-xs font-medium text-gray-900">
//                       {(user as any)?.username || (user as any)?.email?.split('@')[0] || 'user'}
//                     </div>
//                     <div className="flex items-center space-x-1">
//                       <Badge 
//                         className={`text-xs px-1 py-0 ${getKarmaBadge((user as any)?.karma || 0).color} text-white`}
//                       >
//                         {getKarmaBadge((user as any)?.karma || 0).label}
//                       </Badge>
//                       <span className={`text-xs ${getKarmaColor((user as any)?.karma || 0)}`}>
//                         {(user as any)?.karma || 0}
//                       </span>
//                     </div>
//                   </div>
//                   <ChevronDown className="h-3 w-3 text-gray-500" />
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-200 shadow-lg">
//                   {/* Profile Header */}
//                   <div className="px-3 py-2 border-b">
//                     <div className="flex items-center space-x-3">
//                       <Avatar className="h-10 w-10">
//                         <AvatarImage src={(user as any)?.profileImageUrl || undefined} />
//                         <AvatarFallback>
//                           <User className="h-5 w-5" />
//                         </AvatarFallback>
//                       </Avatar>
//                       <div>
//                         <div className="font-medium text-sm">
//                           {(user as any)?.username || (user as any)?.email?.split('@')[0] || 'User'}
//                         </div>
//                         <div className="flex items-center space-x-2 text-xs text-gray-500">
//                           <Coins className="h-3 w-3" />
//                           <span>{(user as any)?.karma || 0} karma</span>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <DropdownMenuItem asChild>

//                   </DropdownMenuItem>
//                   <DropdownMenuItem asChild>
//                     <Link href="/settings" className="flex items-center space-x-2 w-full">
//                       <Settings className="h-4 w-4" />
//                       <span>User Settings</span>
//                     </Link>
//                   </DropdownMenuItem>
                  
//                   <DropdownMenuItem 
//                     onClick={() => setLogoutOpen(true)}
//                     className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
//                   >
//                     <LogOut className="h-4 w-4" />
//                     <span>Log Out</span>
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           ) : (
//             <div className="absolute right-4 flex items-center space-x-3">
//               <WalletMultiButton />
//             </div>
//           )}
//         </div>
//       </div>
//     </nav>
//     <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
//       <AlertDialogContent>
//         <AlertDialogHeader>
//           <AlertDialogTitle>Log out?</AlertDialogTitle>
//           <AlertDialogDescription>
//             You will be signed out of your account and redirected to the login screen.
//           </AlertDialogDescription>
//         </AlertDialogHeader>
//         <AlertDialogFooter>
//           <AlertDialogCancel>Cancel</AlertDialogCancel>
//           <AlertDialogAction onClick={() => logout()}>Log Out</AlertDialogAction>
//         </AlertDialogFooter>
//       </AlertDialogContent>
//     </AlertDialog>
//     <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
//       <CommandInput placeholder="Type a command or search…" />
//       <CommandList>
//         <CommandEmpty>No results found.</CommandEmpty>
//         <CommandGroup heading="Search">
//           <CommandItem onSelect={() => searchRef.current?.focus()}>
//             <Search className="h-4 w-4" />
//             Focus Search
//             <CommandShortcut>/</CommandShortcut>
//           </CommandItem>
//         </CommandGroup>
//         <CommandSeparator />
//         <CommandGroup heading="Actions">
//           <CommandItem onSelect={() => (window.location.href = '/create-post')}>
//             <Edit3 className="h-4 w-4" />
//             Create Post
//           </CommandItem>
//           <CommandItem onSelect={() => (window.location.href = '/create-post?type=poll')}>
//             <BarChart3 className="h-4 w-4" />
//             Create Poll
//           </CommandItem>
//         </CommandGroup>
//         <CommandGroup heading="Navigate">

//         </CommandGroup>
//       </CommandList>
//     </CommandDialog>
//     </>
//   );
// }


import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function Navigation() {
  const [hasShadow, setHasShadow] = useState(false);

  useEffect(() => {
    const onScroll = () => setHasShadow(window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* <nav
        className={`bg-black border-b border-gray-800 py-2 fixed top-0 left-0 right-0 z-50 transition-shadow ${
          hasShadow ? 'shadow-sm' : 'shadow-none'
        }`}
      >
        <div className="w-full relative z-50">
          <div className="flex justify-center items-center h-14 relative"> */}
            {/* Centered Logo Only */}
            {/* <Link href="/" className="z-30 relative">
              <img src="/anonn.png" alt="Anonn Logo" className="w-30 h-10" />
            </Link> */}

            {/* All other elements (profile, notifications, etc.) have been removed to match the Figma design */}
      {/* </div>
        </div>

      </nav> */}

      <nav
      className={`bg-[#0a0a0a] border-b border-gray-800 fixed top-0 left-0 right-0 z-50 transition-shadow ${
        hasShadow ? 'shadow-md' : ''
      }`}
    >
      <div className="flex justify-center items-center h-14 px-4">
        {/* Centered Logo */}
        <Link href="/">    
              <img src="/anonn.png" alt="Anonn Logo" className="w-30 h-10" />

        </Link>
      </div>
    </nav>
    </>
  );
}