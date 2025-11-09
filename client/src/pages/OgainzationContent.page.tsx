// components/OrganizationContent.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery as useRQ } from "@tanstack/react-query";
import PostCard from "@/components/PostCard";
import CreateReviewDialog from "@/components/CreateReviewDialog";
import { Button } from "@/components/ui/button";
import { Building, Users, TrendingUp, Award, MessageSquare, BarChart3, PenSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { OrganizationWithStats, PostWithDetails } from "@shared/schema";

type TabType = "about" | "posts" | "polls" | "comments";

export default function OrganizationContent() {
  const emptyUpdateCallback = useCallback(() => {}, []);
  const params = useParams();
  const [, setLocation] = useLocation();
  const idParam = (params.id as string) || "";
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("about");

  useEffect(() => {
    document.title = "Organization - Anonn";
  }, []);

  // Fetch organization
  const { data: organization, isLoading: orgLoading, refetch } = useRQ<OrganizationWithStats>({
    queryKey: ["/api/organizations", idParam],
    queryFn: async () => {
      if (!isNaN(parseInt(idParam))) {
        const response = await fetch(`/api/organizations/${idParam}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        return response.json();
      } else {
        const response = await fetch(`/api/organizations/search?q=${encodeURIComponent(idParam)}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        const organizations = await response.json();
        const exactMatch = organizations.find((org: any) => 
          org.name.toLowerCase() === idParam.toLowerCase()
        );
        if (!exactMatch) {
          throw new Error("Organization not found");
        }
        return exactMatch;
      }
    },
    enabled: !!idParam,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch posts
  const { data: allPosts = [], isLoading: postsLoading } = useRQ<PostWithDetails[]>({
    queryKey: ["/api/posts", "organization", organization?.id ?? idParam],
    queryFn: async () => {
      if (!organization?.id) throw new Error("Organization not loaded");
      const response = await fetch(`/api/posts?organizationId=${organization.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!organization?.id,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch polls
  const { data: polls = [], isLoading: pollsLoading } = useRQ<any[]>({
    queryKey: ["/api/polls", "organization", organization?.id ?? idParam],
    queryFn: async () => {
      if (!organization?.id) throw new Error("Organization not loaded");
      const response = await fetch(`/api/polls?organizationId=${organization.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!organization?.id,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
  });

  const posts = allPosts.filter(post => post.type !== 'poll');

  // Get trust percentages
  const getTrustPercentage = () => {
    if (organization?.trustData?.trustPercentage !== undefined) {
      return {
        trust: organization.trustData.trustPercentage,
        distrust: 100 - organization.trustData.trustPercentage
      };
    }
    return { trust: 80, distrust: 20 };
  };

  // Get member count
  const getMemberCount = () => {
    return organization?.reviewCount ? `${(organization.reviewCount * 24).toLocaleString()}` : "30K";
  };

  // Get engagement count
  const getEngagementCount = () => {
    return organization?.reviewCount ? `${(organization.reviewCount * 32).toLocaleString()}` : "40K";
  };

  // Get activity percentage
  const getActivityPercentage = () => {
    return organization?.averageRating ? Math.round(organization.averageRating * 5) : 25;
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated && window.location.pathname !== '/auth') {
      window.location.href = "/auth";
      return;
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading || orgLoading) {
    return (
      <div className="w-full min-h-screen bg-black text-white px-4 pt-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-10 w-32 bg-gray-800 rounded animate-pulse mb-6"></div>
          <div className="h-64 bg-gray-800 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="w-full min-h-screen bg-black text-white px-4 pt-6 pb-6 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-3">Organization not found</h3>
          <Button onClick={() => setLocation("/organizations")} className="bg-green-500 hover:bg-green-600">
            Back to Organizations
          </Button>
        </div>
      </div>
    );
  }

  const trustScores = getTrustPercentage();

  return (
    <div className="w-full min-h-screen bg-black text-white px-4 pt-6 pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab("about")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "about"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            ABOUT
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "posts"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            POSTS
          </button>
          <button
            onClick={() => setActiveTab("polls")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "polls"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            POLLS
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "comments"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            COMMENTS
          </button>
        </div>

        {/* Content */}
        {activeTab === "about" && (
          <div className="space-y-6">
            {/* Organization Card */}
            <div className="bg-[#1a1a1a] p-6">
              <div className="flex items-start justify-between mb-6">
                {/* Left: Logo and Info */}
                <div className="flex items-start gap-6 flex-1">
                  {/* Company Logo */}
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded flex items-center justify-center flex-shrink-0">
                    <Building className="w-8 h-8 text-white" />
                  </div>

                  {/* Company Info */}
                  <div className="flex-1">
                    <h2 className="text-white text-xl font-normal mb-3">{organization.name}</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {organization.description || "Welcome to the Web3 Privacy Collective, a community focused on privacy in the decentralized web. We unite enthusiasts and developers who believe privacy is a funda..."}
                    </p>
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
                    <div className="bg-green-500 px-4 py-1 rounded text-white font-semibold text-sm">
                      {trustScores.trust}
                    </div>
                    <div className="bg-red-500 px-4 py-1 rounded text-white font-semibold text-sm">
                      {trustScores.distrust}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{getMemberCount()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{getEngagementCount()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>{getActivityPercentage()}%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <CreateReviewDialog 
                organizationId={organization.id} 
                organizationName={organization.name}
                trigger={
                  <Button className="bg-green-500 hover:bg-green-600 text-white">
                    <PenSquare className="h-4 w-4 mr-2" />
                    Write Review
                  </Button>
                }
              />
              <Button
                variant="outline"
                onClick={() => setLocation(`/create-post?organizationId=${organization.id}`)}
                className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Post
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/create-post?organizationId=${organization.id}&type=poll`)}
                className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Create Poll
              </Button>
            </div>
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Posts</h3>
              <Button
                onClick={() => setLocation(`/create-post?organizationId=${organization.id}`)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <PenSquare className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </div>

            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post: PostWithDetails) => (
                  <div key={post.id} className="bg-[#1a1a1a] border border-gray-800">
                    <PostCard post={post} onUpdate={emptyUpdateCallback} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#1a1a1a]">
                <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                <p className="text-gray-500 mb-6">Be the first to create a post!</p>
                <Button
                  onClick={() => setLocation(`/create-post?organizationId=${organization.id}`)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "polls" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Polls</h3>
              <Button
                onClick={() => setLocation(`/create-post?organizationId=${organization.id}&type=poll`)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Create Poll
              </Button>
            </div>

            {pollsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-gray-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : polls.length > 0 ? (
              <div className="space-y-6">
                {polls.map((poll: any) => (
                  <div key={poll.id} className="bg-[#1a1a1a] p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{poll.title}</h3>
                    <p className="text-gray-400 mb-4 text-sm">{poll.description}</p>
                    <div className="space-y-2">
                      {poll.options?.map((option: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded"
                        >
                          <span className="text-sm text-gray-400">{option.text}</span>
                          <span className="text-sm text-gray-500">{option.votes || 0} votes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#1a1a1a]">
                <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No polls yet</h3>
                <p className="text-gray-500 mb-6">Be the first to create a poll!</p>
                <Button
                  onClick={() => setLocation(`/create-post?organizationId=${organization.id}&type=poll`)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Create First Poll
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Comments</h3>
            <div className="text-center py-12 bg-[#1a1a1a]">
              <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">Comments feature coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}