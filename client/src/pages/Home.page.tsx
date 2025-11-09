// components/Home.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import FeedControls from "@/components/FeedControls";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { PostWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit3, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";

interface HomeProps {
  onCreatePost: () => void;
  onExploreCommunities: () => void;
  isAuthenticated: boolean;
}

export default function HomePage({
  onCreatePost,
  onExploreCommunities,
  isAuthenticated,
}: HomeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<"hot" | "new">("hot");
  const [timeFilter, setTimeFilter] = useState<
    "all" | "hour" | "day" | "week" | "month" | "year"
  >("all");
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const { user, getAccessToken } = useAuth();

  // Posts state
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPosts = useCallback(
    async (page: number = 1, limit: number = 20) => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", limit.toString());

        // Add sortBy parameter for server-side sorting
        params.set("sortBy", sortBy);

        // Add time filter parameter
        if (timeFilter && timeFilter !== "all") {
          params.set("time", timeFilter);
        }

        // Add cache busting parameter
        params.set("_t", Date.now().toString());
        const url = `/api/posts?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("401: Unauthorized");
          }
          throw new Error(`${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("post", data);
        if (page === 1) {
          setPosts(data);
        } else {
          setPosts((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === limit);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load posts";
        setError(errorMessage);
        console.error("Failed to fetch posts:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, sortBy, timeFilter]
  );

  const filteredPosts = useMemo(() => {
    // If no search query, return all posts
    if (!searchQuery) {
      return posts;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    // Filter the posts array
    return posts.filter((post) => {
      // You can make this as simple or complex as you need
      const titleMatch = post.title.toLowerCase().includes(lowerCaseQuery);
      const contentMatch =
        post.content?.toLowerCase().includes(lowerCaseQuery) || false;
      const authorMatch =
        post.author?.username?.toLowerCase().includes(lowerCaseQuery) || false;

      return titleMatch || contentMatch || authorMatch;
    });
  }, [posts, searchQuery]);

  const refetch = () => fetchPosts(1, 20);

  // Force refresh when component mounts
  useEffect(() => {
    setCacheBuster(Date.now());
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          (key[0] === "posts" ||
            key[0] === "/api/posts" ||
            key[0] === "bowl-posts" ||
            key[0] === "organization-posts")
        );
      },
    });
    refetch();
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    fetchPosts(1, 20);
  }, [isAuthenticated, sortBy, timeFilter, fetchPosts]);

  // Handle unauthorized access
  useEffect(() => {
    if (error && isUnauthorizedError(error as unknown as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [error, toast]);

  return (
    <div className="flex gap-6 max-w-[1400px] mx-auto px-4  py-6">
      {/* Center Feed */}
      <div className="flex-1 min-w-[200px] mx-auto lg:mx-0">
        {/* Search Bar */}
        <SearchBar
          placeholder="Blow the whistle ..."
          onSearch={(query) => setSearchQuery(query)}
        />

        {/* Feed Controls */}
        <FeedControls
          sortBy={sortBy}
          timeFilter={timeFilter}
          onSortChange={setSortBy}
          onTimeFilterChange={setTimeFilter}
        />

        <div className="space-y-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-black border border-gray-800 rounded-lg overflow-hidden"
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
          ) : filteredPosts.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  No posts yet
                </h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
                  Be the first to start a discussion! Create a post to get the
                  conversation going.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={onCreatePost}
                    className="bg-white hover:bg-gray-200 text-black px-5 py-2 rounded-full font-medium text-sm"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                  <Button
                    onClick={onExploreCommunities}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 px-5 py-2 rounded-full font-medium text-sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Explore Communities
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            filteredPosts
              .filter((post) => post.type !== "review")
              .map((post, index) => (
                <div
                  key={post.id}
                  className="animate-post-reveal"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PostCard
                    post={post}
                    onUpdate={refetch}
                    compact={false}
                    showCommunity={true}
                    index={index}
                  />
                </div>
              ))
          )}
        </div>

      </div>
    </div>
  );
}
