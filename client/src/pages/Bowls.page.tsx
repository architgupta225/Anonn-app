// components/BowlsMain.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, BarChart3, Plus, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SearchBar from "@/components/SearchBar";
import type { BowlWithStats, Bowl, BowlFollow } from "@shared/schema";

interface BowlsMainProps {
  onCreatePost?: () => void;
  bowls?: BowlWithStats[];
  organizations?: any[];
}

export default function BowlsPage({
  onCreatePost,
  bowls: propBowls,
  organizations,
}: BowlsMainProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [followingBowls, setFollowingBowls] = useState<Set<number>>(
    new Set()
  );
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [sortBy, setSortBy] = useState("popular");

  // Fetch bowls data with real-time updates
  const { data: bowls = [], isLoading: bowlsLoading } = useQuery<
    BowlWithStats[]
  >({
    queryKey: ["/api/bowls"],
    retry: false,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  // Get user's followed bowls with real-time updates
  const {
    data: userBowls = [],
    refetch: refetchUserBowls,
    isLoading: userBowlsLoading,
  } = useQuery<(BowlFollow & { bowl: Bowl })[]>({
    queryKey: ["/api/user/bowls"],
    retry: false,
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
  });

  // Update following bowls when userBowls changes
  useEffect(() => {
    setFollowingBowls(new Set(userBowls.map((ub) => ub.bowl.id)));
  }, [userBowls]);

  // Use prop bowls if provided, otherwise use fetched bowls
  const displayBowls = propBowls || bowls;

  // Filter bowls based on search term and category
  const filteredBowls = displayBowls.filter((bowl) => {
    const matchesSearch =
      bowl.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bowl.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      (bowl.category || "general").toLowerCase() ===
        selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Sort bowls
  const sortedBowls = [...filteredBowls].sort((a, b) => {
    if (sortBy === "popular") {
      return b.memberCount - a.memberCount;
    } else if (sortBy === "newest") {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    }
    return 0;
  });

  // Follow/unfollow mutations
  const followMutation = useMutation({
    mutationFn: async (bowlId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/bowls/${bowlId}/follow`,
        {}
      );
      return response.json();
    },
    onSuccess: (data, bowlId) => {
      setFollowingBowls((prev) => new Set([...Array.from(prev), bowlId]));
      queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
      refetchUserBowls();
      toast({
        title: "Success",
        description: "Channel followed successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to follow channel",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (bowlId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/bowls/${bowlId}/follow`,
        undefined
      );
      return response.json();
    },
    onSuccess: (data, bowlId) => {
      setFollowingBowls((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bowlId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
      refetchUserBowls();
      toast({
        title: "Success",
        description: "Channel unfollowed successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unfollow channel",
        variant: "destructive",
      });
    },
  });

  const handleFollow = (bowlId: number) => {
    followMutation.mutate(bowlId);
  };

  const handleUnfollow = (bowlId: number) => {
    unfollowMutation.mutate(bowlId);
  };

const BowlCard = ({ bowl }: { bowl: BowlWithStats }) => {
  const isFollowing = followingBowls.has(bowl.id);

  return (
    <div
      className="bg-[#0e0e0e] border border-gray-700 rounded-md overflow-hidden hover:border-gray-600 transition-colors"
      onClick={() => setLocation(`/bowls/${encodeURIComponent(bowl.name)}`)}
    >
      {/* Title & Description */}
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-white text-xl font-mono mb-3">
          {bowl.name || "Unknown Channel"}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
          {bowl.description ||
            "Welcome to this community. Join us to connect with others who share your interests."}
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex border-b border-gray-700 text-gray-400 text-sm">
        <div className="flex items-center justify-center w-1/3 gap-2 py-3 border-r border-gray-700">
          <Users className="w-4 h-4" />
          <span>{bowl.memberCount ? `${bowl.memberCount}K` : "0K"}</span>
        </div>
        <div className="flex items-center justify-center w-1/3 gap-2 py-3 border-r border-gray-700">
          <FileText className="w-4 h-4" />
          <span>{bowl.postCount ? `${bowl.postCount}K` : "0K"}</span>
        </div>
        <div className="flex items-center justify-center w-1/3 gap-2 py-3">
          <BarChart3 className="w-4 h-4" />
          <span>25K</span>
        </div>
      </div>

      {/* Join / Joined Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          isFollowing ? handleUnfollow(bowl.id) : handleFollow(bowl.id);
        }}
        disabled={followMutation.isPending || unfollowMutation.isPending}
        className={`w-full py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors
          ${isFollowing
            ? "bg-[#e5e5e5] text-black hover:bg-[#d4d4d4]"
            : "bg-white text-black hover:bg-gray-200"
          }`}
      >
        {isFollowing ? (
          <>
            <Minus className="w-4 h-4" />
            <span className="tracking-wide">LEAVE</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span className="tracking-wide">JOIN</span>
          </>
        )}
      </button>
    </div>
  );
};


  if (bowlsLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 bg-black min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-48 bg-gray-800" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-64 bg-gray-800" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Category Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedCategory("general")}
              className={`px-6 py-2 rounded-full font-medium text-sm uppercase tracking-wide transition-all ${
                selectedCategory === "general"
                  ? "bg-white text-black"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              GENERAL
            </button>
            <button
              onClick={() => setSelectedCategory("industries")}
              className={`px-6 py-2 rounded-full font-medium text-sm uppercase tracking-wide transition-all ${
                selectedCategory === "industries"
                  ? "bg-white text-black"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              INDUSTRIES
            </button>
            <button
              onClick={() => setSelectedCategory("job-groups")}
              className={`px-6 py-2 rounded-full font-medium text-sm uppercase tracking-wide transition-all ${
                selectedCategory === "job-groups"
                  ? "bg-white text-black"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              JOB GROUPS
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-transparent text-gray-500 text-sm font-medium uppercase tracking-wide border-none focus:outline-none appearance-none cursor-pointer"
          >
            <option value="popular" className="bg-[#1a1a1a]">
              MOST POPULAR
            </option>
            <option value="newest" className="bg-[#1a1a1a]">
              NEWEST
            </option>
            <option value="active" className="bg-[#1a1a1a]">
              MOST ACTIVE
            </option>
          </select>
        </div>

        {/* Search Bar */}
        <SearchBar
          placeholder="search different bowls."
          onSearch={(query) => setSearchTerm(query)}
        />

        {/* Bowls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {sortedBowls.map((bowl) => (
            <BowlCard key={bowl.id} bowl={bowl} />
          ))}
        </div>

        {sortedBowls.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              No channels found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// // components/BowlsMain.tsx
// import { useState, useEffect } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { useLocation } from "wouter";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Skeleton } from "@/components/ui/skeleton";
// import { 
//   Search, 
//   TrendingUp, 
//   Users, 
//   Globe,
//   Flame,
//   ArrowRight
// } from "lucide-react";
// import { useAuth } from "@/hooks/useAuth";
// import { useToast } from "@/hooks/use-toast";
// import { apiRequest } from "@/lib/queryClient";
// import type { BowlWithStats, Bowl, BowlFollow } from "@shared/schema";

// interface BowlsMainProps {
//   onCreatePost?: () => void;
//   bowls?: BowlWithStats[];
//   organizations?: any[];
// }

// export default function BowlsPage({ onCreatePost, bowls: propBowls, organizations }: BowlsMainProps) {
//   const [location, setLocation] = useLocation();
//   const queryClient = useQueryClient();
//   const { toast } = useToast();
//   const { isAuthenticated, isLoading: authLoading, user } = useAuth();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [followingBowls, setFollowingBowls] = useState<Set<number>>(new Set());

//   // Fetch bowls data with real-time updates
//   const { data: bowls = [], isLoading: bowlsLoading } = useQuery<BowlWithStats[]>({
//     queryKey: ["/api/bowls"],
//     retry: false,
//     refetchInterval: 15000, // Refetch every 15 seconds for real-time updates
//     refetchIntervalInBackground: true,
//   });

//   // Get user's followed bowls with real-time updates
//   const { data: userBowls = [], refetch: refetchUserBowls, isLoading: userBowlsLoading } = useQuery<(BowlFollow & { bowl: Bowl })[]>({
//     queryKey: ["/api/user/bowls"],
//     retry: false,
//     refetchInterval: 20000, // Refetch every 20 seconds for real-time updates
//     refetchIntervalInBackground: true,
//   });

//   // Update following bowls when userBowls changes
//   useEffect(() => {
//     setFollowingBowls(new Set(userBowls.map(ub => ub.bowl.id)));
//   }, [userBowls]);

//   // Use prop bowls if provided, otherwise use fetched bowls
//   const displayBowls = propBowls || bowls;

//   // Filter bowls based on search term
//   const filteredBowls = displayBowls.filter(bowl =>
//     bowl.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     bowl.description?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // Follow/unfollow mutations
//   const followMutation = useMutation({
//     mutationFn: async (bowlId: number) => {
//       const response = await apiRequest("POST", `/api/bowls/${bowlId}/follow`, {});
//       return response.json();
//     },
//     onSuccess: (data, bowlId) => {
//       setFollowingBowls(prev => new Set([...Array.from(prev), bowlId]));
//       queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
//       refetchUserBowls();
//       toast({
//         title: "Success",
//         description: "Channel followed successfully!",
//       });
//     },
//     onError: (error) => {
//       toast({
//         title: "Error",
//         description: "Failed to follow channel",
//         variant: "destructive",
//       });
//     },
//   });

//   const unfollowMutation = useMutation({
//     mutationFn: async (bowlId: number) => {
//       const response = await apiRequest("DELETE", `/api/bowls/${bowlId}/follow`, undefined);
//       return response.json();
//     },
//     onSuccess: (data, bowlId) => {
//       setFollowingBowls(prev => {
//         const newSet = new Set(prev);
//         newSet.delete(bowlId);
//         return newSet;
//       });
//       queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
//       refetchUserBowls();
//       toast({
//         title: "Success",
//         description: "Channel unfollowed successfully!",
//       });
//     },
//     onError: (error) => {
//       toast({
//         title: "Error",
//         description: "Failed to unfollow channel",
//         variant: "destructive",
//       });
//     },
//   });

//   const handleFollow = (bowlId: number) => {
//     console.log('[bowls] handleFollow called for bowlId:', bowlId);
//     followMutation.mutate(bowlId);
//   };

//   const handleUnfollow = (bowlId: number) => {
//     console.log('[bowls] handleUnfollow called for bowlId:', bowlId);
//     unfollowMutation.mutate(bowlId);
//   };

//   const getChannelIcon = (bowl: BowlWithStats) => {
//     return bowl.name?.charAt(0).toUpperCase() || '?';
//   };

//   const isCryptoChannel = (bowl: BowlWithStats) => {
//     const cryptoKeywords = ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'web3'];
//     return cryptoKeywords.some(keyword => 
//       (bowl.name?.toLowerCase() || '').includes(keyword) || 
//       (bowl.description?.toLowerCase() || '').includes(keyword)
//     );
//   };

//   const scrollToSection = (sectionId: string) => {
//     const element = document.getElementById(sectionId);
//     if (element) {
//       element.scrollIntoView({ behavior: 'smooth' });
//     }
//   };

//   // Group bowls by category
//   const bowlsByCategory = displayBowls.reduce((acc, bowl) => {
//     const category = bowl.category || 'general';
//     if (!acc[category]) acc[category] = [];
//     acc[category].push(bowl);
//     return acc;
//   }, {} as Record<string, BowlWithStats[]>);

//   // Get categories with counts
//   const categories = [
//     { id: 'all', name: 'All Channels', count: displayBowls.length },
//     { id: 'industries', name: 'Industries', count: bowlsByCategory.industries?.length || 0 },
//     { id: 'job-groups', name: 'Job Groups', count: bowlsByCategory['job-groups']?.length || 0 },
//     { id: 'general', name: 'General', count: bowlsByCategory.general?.length || 0 },
//     { id: 'communities', name: 'Communities', count: bowlsByCategory.communities?.length || 0 },
//   ];

//   // Get new, trending, and user's bowls
//   const newBowls = filteredBowls.slice(0, 5);
//   const trendingBowls = filteredBowls.slice(5, 10);
//   const myChannels = userBowls.map(ub => ({ ...ub.bowl, postCount: 0 }));

//   // Modern Channel Card Component
//   const ModernChannelCard = ({ bowl, isHorizontal = false }: { bowl: BowlWithStats; isHorizontal?: boolean }) => {
//     const isFollowing = followingBowls.has(bowl.id);
//     const isCrypto = isCryptoChannel(bowl);
    
//     const handleCardClick = () => {
//       setLocation(`/bowls/${encodeURIComponent(bowl.name)}`);
//     };
    
//     return (
//       <div 
//         className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-xl hover:border-orange-300 dark:hover:border-orange-500 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
//         onClick={handleCardClick}
//       >
//         {/* Gradient background overlay */}
//         <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-purple-50/30 dark:from-orange-900/10 dark:via-transparent dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
//         {/* Subtle pattern overlay */}
//         <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-orange-400 to-purple-600"></div>
        
//         <div className="relative z-10">
//           <div className="flex items-start justify-between mb-4">
//             <div className="flex items-center space-x-4 flex-1 min-w-0">
//               <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
//                 isCrypto 
//                   ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
//                   : 'bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-500 dark:to-slate-600'
//               }`}>
//                 {getChannelIcon(bowl)}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
//                   {bowl.name || 'Unknown Channel'}
//                 </h3>
//                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
//                   {bowl.memberCount.toLocaleString()} members
//                 </p>
//               </div>
//             </div>
            
//             <Button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 console.log('[ModernChannelCard] Follow button clicked for bowl:', bowl.id, 'isFollowing:', isFollowing);
//                 isFollowing ? handleUnfollow(bowl.id) : handleFollow(bowl.id);
//               }}
//               disabled={followMutation.isPending || unfollowMutation.isPending}
//               className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
//                 isFollowing
//                   ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600'
//                   : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md hover:shadow-lg'
//               }`}
//             >
//               {isFollowing ? 'Following' : 'Follow'}
//             </Button>
//           </div>

//           {bowl.description && (
//             <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
//               {bowl.description}
//             </p>
//           )}

//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-2">
//               <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
//                 {bowl.category || 'General'}
//               </span>
              
//               {isCrypto && (
//                 <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
//                   🚀 Crypto
//                 </span>
//               )}
//             </div>
            
//             <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors duration-200" />
//           </div>
//         </div>
//       </div>
//     );
//   };

//   if (bowlsLoading) {
//     return (
//       <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
//         <div className="space-y-8">
//           {/* Loading Skeletons */}
//           {[...Array(3)].map((_, i) => (
//             <div key={i} className="space-y-4">
//               <Skeleton className="h-8 w-48" />
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                 {[...Array(4)].map((_, j) => (
//                   <Skeleton key={j} className="h-48 rounded-2xl" />
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
//       {/* Header Section */}
//       <div className="mb-8">
//         <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium mb-4">
//           <Globe className="h-4 w-4 mr-2" />
//           Explore Communities
//         </div>
//         <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-orange-600 to-red-600 dark:from-white dark:via-orange-300 dark:to-red-300 bg-clip-text text-transparent mb-3">
//           Discover Amazing Channels
//         </h1>
//         <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
//           Connect with communities that share your interests and passions
//         </p>
//       </div>

//       {/* Search Bar */}
//       <div className="mb-8">
//         <div className="relative max-w-lg">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//           <Input
//             type="text"
//             placeholder="Search channels..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-transparent"
//           />
//         </div>
//       </div>

//       {/* Filter Buttons */}
//       <div className="flex flex-wrap gap-2 mb-8">
//         {categories.map((category) => (
//           <Button
//             key={category.id}
//             variant="outline"
//             size="sm"
//             onClick={() => scrollToSection(category.id === 'all' ? 'all-channels' : `${category.id}-channels`)}
//             className="border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
//           >
//             {category.name} {category.count > 0 && `(${category.count})`}
//           </Button>
//         ))}
//       </div>

//       {/* New Channels Section */}
//       <section id="new-channels" className="mb-16">
//         <div className="mb-8">
//           <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-3">
//             <TrendingUp className="h-3 w-3 mr-1.5" />
//             Fresh & New
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
//             New Channels
//           </h2>
//           <p className="text-gray-600 dark:text-gray-400 text-sm">
//             Fresh communities just getting started
//           </p>
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {newBowls.map((bowl) => (
//             <ModernChannelCard key={bowl.id} bowl={bowl} />
//           ))}
//         </div>
        
//         {newBowls.length === 0 && (
//           <div className="text-center py-8">
//             <p className="text-gray-500 dark:text-gray-400 text-sm">
//               No new channels found
//             </p>
//           </div>
//         )}
//       </section>

//       {/* Trending Channels Section */}
//       <section id="trending-channels" className="mb-16">
//         <div className="mb-8">
//           <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium mb-3">
//             <Flame className="h-3 w-3 mr-1.5" />
//             Hot & Trending
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
//             Trending Channels
//           </h2>
//           <p className="text-gray-600 dark:text-gray-400 text-sm">
//             Popular communities gaining momentum
//           </p>
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {trendingBowls.map((bowl) => (
//             <ModernChannelCard key={bowl.id} bowl={bowl} />
//           ))}
//         </div>
        
//         {trendingBowls.length === 0 && (
//           <div className="text-center py-8">
//             <p className="text-gray-500 dark:text-gray-400 text-sm">
//               No trending channels found
//             </p>
//           </div>
//         )}
//       </section>

//       {/* My Followed Channels Section */}
//       <section id="my-channels" className="mb-16">
//         <div className="mb-8">
//           <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium mb-3">
//             <Users className="h-3 w-3 mr-1.5" />
//             Your Communities
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
//             Channels I Follow
//           </h2>
//           <p className="text-gray-700 dark:text-gray-300 text-sm">
//             Communities you've joined
//           </p>
//         </div>
        
//         {myChannels.length > 0 ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {myChannels.map((bowl) => (
//               <ModernChannelCard key={bowl.id} bowl={bowl} />
//             ))}
//           </div>
//         ) : (
//           <div className="text-center py-8">
//             <p className="text-gray-500 dark:text-gray-400 text-sm">
//               No followed channels yet. Start exploring and follow some communities!
//             </p>
//           </div>
//         )}
//       </section>

//       {/* All Channels by Category */}
//       <section id="all-channels" className="mb-12">
//         <div className="mb-6">
//           <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
//             All Channels
//           </h2>
//           <p className="text-gray-600 dark:text-gray-400 text-sm">
//             Browse all available communities
//           </p>
//         </div>

//         {Object.entries(bowlsByCategory).map(([category, categoryBowls]) => (
//           <div key={category} id={`${category}-channels`} className="mb-8">
//             <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 capitalize">
//               {category} ({categoryBowls.length})
//             </h3>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {categoryBowls.map((bowl) => (
//                 <ModernChannelCard key={bowl.id} bowl={bowl} />
//               ))}
//             </div>
//           </div>
//         ))}
//       </section>
//     </div>
//   );
// }