// components/BowlsMain.tsx
import SearchBar from "@/components/SearchBar";
import { SvgIcon } from "@/components/SvgIcon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { Bowl, BowlFollow, BowlWithStats } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Minus,
  Plus
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

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
  const [followingBowls, setFollowingBowls] = useState<Set<number>>(new Set());
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
    const newSet = new Set(userBowls.map((ub) => ub.bowl.id));

    // Only update state if the set actually changed
    let isDifferent = false;
    if (newSet.size !== followingBowls.size) {
      isDifferent = true;
    } else {
      for (let id of newSet) {
        if (!followingBowls.has(id)) {
          isDifferent = true;
          break;
        }
      }
    }

    if (isDifferent) {
      setFollowingBowls(newSet);
    }
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

  // Authentication handler - similar to PostCard
  const showAuthToast = useCallback(
    (action: string) => {
      toast({
        title: "Authentication Required",
        description: `Please connect your wallet to ${action}.`,
        variant: "default",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const event = new CustomEvent("triggerWalletConnect");
              window.dispatchEvent(event);
            }}
          >
            Connect Wallet
          </Button>
        ),
      });
    },
    [toast]
  );

  const handleAuthRequired = useCallback(
    (action: string, callback?: () => void) => {
      if (!isAuthenticated) {
        showAuthToast(action);
        return false;
      }
      callback?.();
      return true;
    },
    [isAuthenticated, showAuthToast]
  );

  const handleFollow = useCallback(
    (bowlId: number) => {
      if (!handleAuthRequired("follow channels")) return;
      followMutation.mutate(bowlId);
    },
    [handleAuthRequired, followMutation]
  );

  const handleUnfollow = useCallback(
    (bowlId: number) => {
      if (!handleAuthRequired("unfollow channels")) return;
      unfollowMutation.mutate(bowlId);
    },
    [handleAuthRequired, unfollowMutation]
  );

  // BowlCard component - defined inside parent to access auth handlers
  const BowlCard = ({ bowl }: { bowl: BowlWithStats }) => {
    const isFollowing = followingBowls.has(bowl.id);

    const handleCardClick = () => {
      if (!handleAuthRequired("view channel details")) return;
      setLocation(`/bowls/${encodeURIComponent(bowl.name)}`);
    };

    return (
      <div
        className="h-[214px] border-[0.2px] border-[#525252]/30 bg-[rgba(234,234,234,0.02)] overflow-hidden hover:border-gray-600 transition-colors cursor-pointer flex flex-col"
        onClick={handleCardClick}
      >
        {/* Title & Description */}
        <div className="p-4 flex-1 flex flex-col gap-2">
          <h3 className="text-[#E8EAE9] text-sm font-spacemono">
            {bowl.name || "Unknown Channel"}
          </h3>
          <p className="text-[#8E8E93] text-xs leading-relaxed line-clamp-3">
            {bowl.description ||
              "Welcome to this community. Join us to connect with others who share your interests."}
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex border-t border-[0.2px] border-[#525252]/30 text-[#525252] ">
          <div className="flex items-center justify-center text-[10px] w-1/3 gap-2 py-3 border-r border-[0.2px] border-[#525252]/30">
            <SvgIcon src="/icons/Comments-user icon.svg" />
            <span>{bowl.memberCount ? `${bowl.memberCount}K` : "0K"}</span>
          </div>
          <div className="flex items-center justify-center text-[10px] w-1/3 gap-2 py-3 border-r border-[0.2px] border-[#525252]/30">
            <SvgIcon src="/icons/Comments-poll icon.svg" />
            <span>{bowl.postCount ? `${bowl.postCount}K` : "0K"}</span>
          </div>
          <div className="flex items-center justify-center text-[10px] w-1/3 gap-2 py-3">
            <SvgIcon src="/icons/Comments icon.svg" />
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
          className={`w-full py-3 flex items-center justify-center gap-2 text-xs font-normal transition-colors
      ${
        isFollowing
          ? "bg-[#e5e5e5] text-black hover:bg-[#d4d4d4]"
          : "bg-white text-black hover:bg-gray-200"
      }`}
        >
          {isFollowing ? (
            <>
              <Minus className="w-3 h-3" />
              <span className="tracking-wide">LEAVE</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span className="tracking-wide">JOIN</span>
            </>
          )}
        </button>
      </div>
    );
  };

  if (bowlsLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 min-h-screen">
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
    <div className="flex max-w-[1400px] mx-auto px-[4%]">
      <div className="flex-1 flex flex-col gap-6 mt-9 min-w-[200px] mx-auto lg:mx-0">
        {/* Category Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px] text-xs text-[#525252]">
            <button
              onClick={() => setSelectedCategory("general")}
              className={`px-4 py-4 rounded-full font-medium text-xs transition-all ${
                selectedCategory === "general"
                  ? "bg-[#E8EAE9]"
                  : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
              }`}
            >
              GENERAL
            </button>
            <button
              onClick={() => setSelectedCategory("industries")}
              className={`px-4 py-4 rounded-full font-medium text-xs transition-all ${
                selectedCategory === "industries"
                  ? "bg-[#E8EAE9]"
                  : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
              }`}
            >
              INDUSTRIES
            </button>
            <button
              onClick={() => setSelectedCategory("job-groups")}
              className={`px-4 py-4 rounded-[58px] font-medium text-xs transition-all ${
                selectedCategory === "job-groups"
                  ? "bg-[#E8EAE9]"
                  : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
              }`}
            >
              JOB GROUPS
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-[145px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-4 pr-8 rounded-[58px] bg-[#1B1C20] text-[#525252] text-xs font-medium uppercase tracking-wide border-none focus:outline-none appearance-none cursor-pointer hover:text-gray-300"
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
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search different bowls."
          onSearch={(query) => setSearchTerm(query)}
        />

        {/* Bowls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
