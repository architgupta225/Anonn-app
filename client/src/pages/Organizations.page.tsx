// components/OrganizationsContent.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import CreateOrganizationDialog from "@/components/CreateOrganizationDialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building, Users, TrendingUp, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { OrganizationWithStats } from "@shared/schema";
import SearchBar from "@/components/SearchBar"; // Import the SearchBar component
import { SvgIcon } from "@/components/SvgIcon";

type TabType = "verified" | "recent" | "popular";

export default function OrganizationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("verified");

  useEffect(() => {
    document.title = "Companies & Organizations";
  }, []);

  const { data: organizations = [], isLoading } = useQuery<
    OrganizationWithStats[]
  >({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
  });

  // Trust voting mutations
  const trustVoteMutation = useMutation({
    mutationFn: async ({
      organizationId,
      trustVote,
    }: {
      organizationId: number;
      trustVote: boolean;
    }) => {
      return apiRequest(
        "POST",
        `/api/organizations/${organizationId}/trust-vote`,
        { trustVote }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Vote recorded",
        description: "Your trust vote has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record your vote.",
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

  const handleTrustVote = useCallback(
    (organizationId: number, trustVote: boolean, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!handleAuthRequired("vote on organizations")) return;

      trustVoteMutation.mutate({ organizationId, trustVote });
    },
    [handleAuthRequired, trustVoteMutation]
  );

  // Handle search from SearchBar component
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Calculate trust percentage
  const getTrustPercentage = (org: OrganizationWithStats) => {
    if (org.trustData?.trustPercentage !== undefined) {
      return {
        trust: org.trustData.trustPercentage,
        distrust: 100 - org.trustData.trustPercentage,
      };
    }
    return { trust: 80, distrust: 20 };
  };

  // Get member count
  const getMemberCount = (org: OrganizationWithStats) => {
    return org.reviewCount
      ? `${(org.reviewCount * 24).toLocaleString()}`
      : "30K";
  };

  // Get engagement count
  const getEngagementCount = (org: OrganizationWithStats) => {
    return org.reviewCount
      ? `${(org.reviewCount * 32).toLocaleString()}`
      : "40K";
  };

  // Get activity percentage
  const getActivityPercentage = (org: OrganizationWithStats) => {
    return org.averageRating ? Math.round(org.averageRating * 5) : 25;
  };

  // Filter organizations based on active tab
  const filteredOrganizations = useMemo(() => {
    let filtered = organizations;

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    switch (activeTab) {
      case "verified":
        return filtered.filter((org) => org.isFeatured);
      case "recent":
        return filtered.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      case "popular":
        return filtered.sort(
          (a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)
        );
      default:
        return filtered;
    }
  }, [organizations, searchQuery, activeTab]);

  const renderOrganizationCard = (org: OrganizationWithStats) => {
    const trustScores = getTrustPercentage(org);
    const memberCount = getMemberCount(org);
    const engagementCount = getEngagementCount(org);
    const activityPercentage = getActivityPercentage(org);

    // Calculate total members for the avatar counter
    const totalMembers = org.reviewCount ? org.reviewCount * 3 : 25;

    const handleCardClick = (e: React.MouseEvent) => {
      if (!handleAuthRequired("view organization details")) return;
      window.location.href = `/organizations/${encodeURIComponent(org.name)}`;
    };

    return (
      <div
        key={org.id}
        onClick={handleCardClick}
        className="flex flex-col mb-6 pt-4 border-[0.2px] border-[#525252]/30 bg-[rgba(234,234,234,0.02)] hover:bg-[#222222] transition-all duration-200  cursor-pointer"
      >
        <div className="flex mb-4 px-4 items-center justify-between">
          {/* Left: Logo and Info */}
          <div className="flex items-start flex-1">
            {/* Company Logo */}
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Right: Avatars and Trust Scores */}
          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
            {/* Member Avatars */}
            <div className="flex items-center -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="md:w-6 md:h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-[#1a1a1a] flex items-center justify-center overflow-hidden"
                >
                  <Users className="md:w-3 md:h-3  text-gray-300" />
                </div>
              ))}
              <div className="w-6 h-6 rounded-full bg-white border-2 border-[#1a1a1a] flex items-center justify-center">
                <span className="text-xs text-[#475467] font-semibold">
                  +{totalMembers}
                </span>
              </div>
            </div>

            {/* Trust/Distrust Badges */}
            <div className="flex items-center">
              <button
                onClick={(e) => handleTrustVote(org.id, true, e)}
                disabled={trustVoteMutation.isPending}
                className="bg-[#ABEFC6] flex justify-center py-2 w-[30px] text-[#079455] font-semibold text-xs disabled:opacity-50  text-center"
              >
                {trustScores.trust}
              </button>
              <button
                onClick={(e) => handleTrustVote(org.id, false, e)}
                disabled={trustVoteMutation.isPending}
                className="bg-[#FDA29B] flex justify-center py-2 w-[30px] text-[#D92D20] font-semibold text-xs disabled:opacity-50 text-center"
              >
                {trustScores.distrust}
              </button>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="flex-1 min-w-0 gap-4 mb-4 px-4">
          <h3 className="text-[#E8EAE9] text-sm mb-4 font-normal font-spacemono">
            {org.name}
          </h3>
          <p className="text-[#8E8E93] text-xs leading-relaxed line-clamp-2 ">
            {org.description ||
              "Welcome to the Web3 Privacy Collective, a community focused on privacy in the decentralized web. We unite enthusiasts and developers who believe privacy is a funda..."}
          </p>
        </div>

        {/* Stats Row at Bottom */}
        <div className="flex items-center gap-8 text-[#525252] text-base border-t-[0.2px] border-[#525252]/30">
          <div className="flex justify-center flex-1 items-center gap-2 py-3 border-r-[0.2px] border-[#525252]/30">
            <SvgIcon src="/icons/Comments-user icon.svg" />
            <span className="font-medium text-xs">{memberCount}</span>
          </div>

          <div className="flex justify-center flex-[2] items-center gap-2 py-3 border-r-[0.2px] border-[#525252]/30">
            <SvgIcon src="/icons/Comments-poll icon.svg" />
            <span className="font-medium text-xs">{engagementCount}</span>
          </div>

          <div className="flex justify-center flex-[2] items-center gap-2 py-3">
            <SvgIcon src="/icons/Comments icon.svg" />
            <span className="font-medium text-xs">{activityPercentage}K</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-black text-white px-4 pt-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-800 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[1400px] mx-auto px-[4%]">
      <div className="flex-1 flex flex-col gap-6 mt-9 min-w-[200px] mx-auto lg:mx-0">
        {/* Tabs */}
        <div className="flex items-center gap-[10px] text-xs text-[#525252]">
          <button
            onClick={() => setActiveTab("verified")}
            className={`px-4 py-4 rounded-full font-medium text-xs transition-all ${
              activeTab === "verified"
                ? "bg-[#E8EAE9]"
                : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
            }`}
          >
            VERIFIED
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-4 py-4 rounded-full font-medium text-xs transition-all  ${
              activeTab === "recent"
                ? "bg-[#E8EAE9]"
                : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
            }`}
          >
            RECENTLY ADDED
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`px-4 py-4 rounded-full font-medium text-xs transition-all  ${
              activeTab === "popular"
                ? "bg-[#E8EAE9] "
                : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
            }`}
          >
            POPULAR
          </button>
        </div>

        {/* Search Bar Component */}
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search for companies..."
        />

        {/* Organizations List */}
        <div className="space-y-0">
          {filteredOrganizations.length > 0 ? (
            filteredOrganizations.map(renderOrganizationCard)
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No organizations found
              </h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search or filters
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Clear Search
                </Button>
                <CreateOrganizationDialog
                  trigger={
                    <Button className="bg-green-500 hover:bg-green-600 text-white">
                      Add Organization
                    </Button>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
