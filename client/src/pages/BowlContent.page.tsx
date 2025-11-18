import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MessageSquare,
  Plus,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Building,
  BarChart3,
  Minus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Bowl, PostWithDetails } from "@shared/schema";
import PostCard from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SvgIcon } from "@/components/SvgIcon";

export default function BowlContent() {
  const params = useParams();
  const idParam = (params.id as string) || "";
  const { toast } = useToast();
  const { isAuthenticated, user, getAccessToken } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"about" | "posts" | "polls">(
    "about"
  );

  const [bowlPolls, setBowlPolls] = useState<PostWithDetails[]>([]);
  const [bowlPosts, setBowlPosts] = useState<PostWithDetails[]>([]);

  // Fetch bowl data
  const {
    data: bowl,
    isLoading: bowlLoading,
    error: bowlError,
  } = useQuery<Bowl>({
    queryKey: ["/api/bowls", idParam],
    queryFn: async () => {
      const token = await getAccessToken();

      const response = await fetch(`/api/bowls/${idParam}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch bowl: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!idParam,
    retry: false,
  });

  // Fetch posts for this bowl
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithDetails[]>({
    queryKey: ["/api/posts", { bowlId: bowl?.id, type: "discussion" }],
    queryFn: async () => {
      if (!bowl?.id) throw new Error("Bowl not loaded");
      const token = await getAccessToken();

      const response = await fetch(`/api/posts?bowlId=${bowl.id}&sortBy=hot`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!bowl?.id,
  });

  useEffect(() => {
    if (posts) {
      const polls = posts.filter((p: any) => p.type === "poll");
      const normalPosts = posts.filter((p: any) => p.type !== "poll");
      setBowlPolls(polls);
      setBowlPosts(normalPosts);
    }
  }, [posts]);

  // Check if user is following this bowl
  const { data: followData, isLoading: followLoading } = useQuery<{
    isFollowing: boolean;
  }>({
    queryKey: ["/api/bowls", bowl?.id, "following"],
    queryFn: async () => {
      const token = await getAccessToken();

      if (!bowl?.id || !isAuthenticated)
        throw new Error("Not authenticated or bowl not found");
      const response = await fetch(`/api/bowls/${bowl.id}/following`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { isFollowing: false };
        }
        throw new Error(`Failed to check follow status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!bowl?.id && isAuthenticated,
  });

  const isUserFollowing = followData?.isFollowing || false;

  // Follow/Unfollow mutation
  const followBowlMutation = useMutation({
    mutationFn: async () => {
      if (!bowl?.id) throw new Error("Bowl not loaded");

      if (isUserFollowing) {
        // Unfollow
        await apiRequest("DELETE", `/api/bowls/${bowl.id}/follow`, {});
      } else {
        // Follow
        await apiRequest("POST", `/api/bowls/${bowl.id}/follow`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/bowls", bowl?.id, "following"],
      });
      toast({
        title: isUserFollowing ? "Left channel" : "Joined!",
        description: isUserFollowing
          ? "You've left this channel."
          : "You're now following this channel.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  // Format numbers (30000 -> 30k)
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k`;
    return num.toString();
  };

  // Mock data for demonstration
  const stats = {
    members: bowl?.memberCount || 30000,
    posts: posts?.length || 40000,
    online: 25000,
  };

  // Handle bowl not found
  if (bowlError && !bowlLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Bowl Not Found</h1>
          <p className="text-gray-400 mb-6">
            The channel you're looking for doesn't exist.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (bowlLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-10 w-32 bg-gray-800 rounded-full" />
            <Skeleton className="h-10 w-32 bg-gray-800 rounded-full" />
            <Skeleton className="h-10 w-32 bg-gray-800 rounded-full" />
          </div>
        </div>
        <div className="px-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48 bg-gray-800" />
              <Skeleton className="h-10 w-24 bg-gray-800" />
            </div>
            <div className="flex gap-16">
              <Skeleton className="h-6 w-16 bg-gray-800" />
              <Skeleton className="h-6 w-16 bg-gray-800" />
              <Skeleton className="h-6 w-16 bg-gray-800" />
            </div>
            <Skeleton className="h-20 w-full bg-gray-800" />
            <Skeleton className="h-40 w-full bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-[4%]">
      <div className="flex-1 flex flex-col gap-6 mt-9 min-w-[200px] mx-auto lg:mx-0">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px] text-xs text-[#525252]">
            <button
              onClick={() => setActiveTab("about")}
              className={`px-4 py-4 rounded-full font-medium text-xs transition-all ${
                activeTab === "about"
                  ? "bg-[#E8EAE9]"
                  : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
              }`}
            >
              ABOUT
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-4 rounded-full font-medium text-xs transition-all ${
                activeTab === "posts"
                  ? "bg-[#E8EAE9]"
                  : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
              }`}
            >
              POSTS
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              className={`px-4 py-4 rounded-full font-medium text-xs transition-all ${
                activeTab === "polls"
                  ? "bg-[#E8EAE9]"
                  : "bg-[#1B1C20] hover:bg-[#E8EAE9]"
              }`}
            >
              POLLS
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === "about" && (
            <div className="space-y-6">
              {/* Bowl Header */}
              <div className="flex items-center justify-between">
                <div className="text-xl font-normal font-spacemono text-[#E8EAE9]">
                  /{bowl?.name || "PRIVACY"}
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => followBowlMutation.mutate()}
                    disabled={followBowlMutation.isPending || followLoading}
                    className="px-6 py-3 bg-[#E8EAE9] text-[#525252] text-xs font-normal flex items-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isUserFollowing ? (
                      <>
                        <Minus className="h-4 w-4" />
                        LEAVE
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        JOIN
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex text-[#525252] border-[0.2px] border-[#525252]/30">
                <div className="flex items-center px-6 py-3 gap-2">
                  <SvgIcon src="/icons/Profile-sidebar icon.svg" />
                  <span className="text-sm">{formatCount(stats.members)}</span>
                </div>
                <div className="flex flex-1 justify-center items-center px-12 py-4 gap-2 border-y-0 border-[0.2px] border-[#525252]/30">
                  <SvgIcon src="/icons/Post option icon.svg" />
                  <span className="text-sm">{formatCount(stats.posts)}</span>
                </div>
                <div className="flex flex-1 justify-center items-center px-8 py-4 gap-2">
                  <SvgIcon src="/icons/Polls icon.svg" />
                  <span className="text-sm">{formatCount(stats.online)}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[#8E8E93] text-xs leading-relaxed">
                {bowl?.description ||
                  "Welcome to the Web3 Privacy Collective, a community focused on privacy in the decentralized web. We unite enthusiasts and developers who believe privacy is a fundamental right. Join us for discussions, workshops, and events that empower individuals to secure their online presence."}
              </p>

              {/* Admin Section */}
              <div>
                <div className="text-[#E8EAE9] text-xs font-medium mb-6 uppercase">
                  ADMIN
                </div>
                <div className="flex flex-col items-start gap-2 border border-[#525252]/30 w-fit py-5 px-6">
                  <div className="w-16 h-16 bg-[#fb923c]"></div>
                  <span className="text-[#8E8E93] text-xs">
                    {bowl?.createdBy ? bowl.createdBy : "tery_jang"}
                  </span>
                </div>
              </div>

              {/* TOP CONTENT Section */}
              <div>
                <div className="text-[#E8EAE9] text-xs font-medium mb-4 uppercase">
                  TOP CONTENT
                </div>
                {postsLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-black border border-gray-800 rounded-lg overflow-hidden mb-4"
                      >
                        <div className="bg-[#3a3a3a] p-4">
                          <Skeleton className="h-6 w-1/4 bg-gray-700" />
                        </div>
                        <div className="p-4">
                          <Skeleton className="h-6 w-3/4 mb-4 bg-gray-700" />
                          <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                          <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                          <Skeleton className="h-4 w-2/3 bg-gray-700" />
                        </div>
                        <div className="border-t border-gray-700 p-4">
                          <Skeleton className="h-8 w-32 bg-gray-700" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : posts && posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.slice(0, 3).map((post) => (
                      <PostCard key={post.id} post={post} onUpdate={() => {}} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#3a3a3a] p-12 text-center rounded">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">
                      No posts yet in this channel
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "posts" && (
            <div className="space-y-6">
              <div className="text-[#E8EAE9] text-xs font-medium uppercase">
                POSTS
              </div>
              {postsLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-black border border-gray-800 rounded-lg overflow-hidden mb-4"
                    >
                      <div className="bg-[#3a3a3a] p-4">
                        <Skeleton className="h-6 w-1/4 bg-gray-700" />
                      </div>
                      <div className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-4 bg-gray-700" />
                        <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                        <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                        <Skeleton className="h-4 w-2/3 bg-gray-700" />
                      </div>
                      <div className="border-t border-gray-700 p-4">
                        <Skeleton className="h-8 w-32 bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </>
              ) : posts && posts.length > 0 ? (
                <div className="space-y-4">
                  {bowlPosts.map((post) => (
                    <PostCard key={post.id} post={post} onUpdate={() => {}} />
                  ))}
                </div>
              ) : (
                <div className="bg-[#3a3a3a] p-12 text-center rounded">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No posts yet in this channel</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "polls" && (
            <div className="space-y-6">
              <div className="text-[#E8EAE9] text-xs font-semibold uppercase">
                POLLS
              </div>

              {postsLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-black border border-gray-800 rounded-lg overflow-hidden mb-4"
                    >
                      <div className="bg-[#3a3a3a] p-4">
                        <Skeleton className="h-6 w-1/4 bg-gray-700" />
                      </div>
                      <div className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-4 bg-gray-700" />
                        <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                        <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                        <Skeleton className="h-4 w-2/3 bg-gray-700" />
                      </div>
                      <div className="border-t border-gray-700 p-4">
                        <Skeleton className="h-8 w-32 bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </>
              ) : bowlPolls && bowlPolls.length > 0 ? (
                <div className="space-y-4">
                  {bowlPolls.map((post) => (
                    <PostCard key={post.id} post={post} onUpdate={() => {}} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#3a3a3a] rounded">
                  <p className="text-gray-400">No polls available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getAccessToken() {
  throw new Error("Function not implemented.");
}
