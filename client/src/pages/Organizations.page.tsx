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

  const { data: organizations = [], isLoading } = useQuery<OrganizationWithStats[]>({
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
    mutationFn: async ({ organizationId, trustVote }: { organizationId: number; trustVote: boolean }) => {
      return apiRequest('POST', `/api/organizations/${organizationId}/trust-vote`, { trustVote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
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

  const handleTrustVote = useCallback((organizationId: number, trustVote: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to vote.",
        variant: "destructive",
      });
      return;
    }

    trustVoteMutation.mutate({ organizationId, trustVote });
  }, [isAuthenticated, trustVoteMutation]);

  const handleSearch = () => {
    // Search functionality
    console.log("Searching for:", searchQuery);
  };

  // Calculate trust percentage
  const getTrustPercentage = (org: OrganizationWithStats) => {
    if (org.trustData?.trustPercentage !== undefined) {
      return {
        trust: org.trustData.trustPercentage,
        distrust: 100 - org.trustData.trustPercentage
      };
    }
    return { trust: 80, distrust: 20 };
  };

  // Get member count
  const getMemberCount = (org: OrganizationWithStats) => {
    return org.reviewCount ? `${(org.reviewCount * 24).toLocaleString()}` : "30K";
  };

  // Get engagement count
  const getEngagementCount = (org: OrganizationWithStats) => {
    return org.reviewCount ? `${(org.reviewCount * 32).toLocaleString()}` : "40K";
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
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    switch (activeTab) {
      case "verified":
        return filtered.filter(org => org.isFeatured);
      case "recent":
        return filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case "popular":
        return filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      default:
        return filtered;
    }
  }, [organizations, searchQuery, activeTab]);

  const renderOrganizationCard = (org: OrganizationWithStats) => {
    const trustScores = getTrustPercentage(org);
    const memberCount = getMemberCount(org);
    const engagementCount = getEngagementCount(org);
    const activityPercentage = getActivityPercentage(org);

    return (
      <Link key={org.id} href={`/organizations/${encodeURIComponent(org.name)}`}>
        <div className="bg-[#1a1a1a] hover:bg-[#222222] transition-all duration-200 p-6 mb-4 cursor-pointer border-b border-gray-800">
          <div className="flex items-start justify-between">
            {/* Left: Logo and Info */}
            <div className="flex items-start gap-6 flex-1">
              {/* Company Logo */}
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded flex items-center justify-center flex-shrink-0">
                <Building className="w-8 h-8 text-white" />
              </div>

              {/* Company Info */}
              <div className="flex-1">
                <h3 className="text-white text-lg font-normal mb-2">{org.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                  {org.description || "Welcome to the Web3 Privacy Collective, a community focused on privacy in the decentralized web. We unite enthusiasts and developers who believe privacy is a funda..."}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-6 mt-4 text-gray-600 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{memberCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{engagementCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>{activityPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Avatars and Trust Scores */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Member Avatars */}
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-[#1a1a1a] flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-semibold">{i}</span>
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#1a1a1a] flex items-center justify-center">
                  <span className="text-gray-400 text-xs">+5</span>
                </div>
              </div>

              {/* Trust/Distrust Badges */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleTrustVote(org.id, true, e)}
                  disabled={trustVoteMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 transition-colors px-4 py-1 rounded text-white font-semibold text-sm disabled:opacity-50"
                >
                  {trustScores.trust}
                </button>
                <button
                  onClick={(e) => handleTrustVote(org.id, false, e)}
                  disabled={trustVoteMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 transition-colors px-4 py-1 rounded text-white font-semibold text-sm disabled:opacity-50"
                >
                  {trustScores.distrust}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
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
              <div key={i} className="h-32 bg-gray-800 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white px-4 pt-6 pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab("verified")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "verified"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            VERIFIED
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "recent"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            RECENTLY ADDED
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "popular"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            POPULAR
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="search for companies..."
            className="flex-1 bg-transparent border-b border-gray-700 text-gray-400 placeholder-gray-600 py-2 px-2 outline-none focus:border-gray-500 transition-colors"
          />
          <button
            onClick={handleSearch}
            className="bg-[#2a2a2a] hover:bg-[#333333] transition-colors px-6 py-2 rounded text-gray-400 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            SEARCH
          </button>
        </div>

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