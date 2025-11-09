// components/Home.tsx
import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import FeedControls from "@/components/FeedControls";
import PostFeed from "@/components/PostFeed";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { PostWithDetails } from "@shared/schema";

interface HomeProps {
  onCreatePost: () => void;
  onExploreCommunities: () => void;
  isAuthenticated: boolean;
}

export default function HomePageMain({ 
  onCreatePost, 
  onExploreCommunities, 
  isAuthenticated 
}: HomeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<string>("hot");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [cacheBuster, setCacheBuster] = useState(Date.now());

  // Posts state
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(
    async (page: number = 1, limit: number = 20) => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", limit.toString());

        if (sortBy === "trending") params.set("trending", "true");
        if (sortBy === "featured") params.set("featured", "true");

        // Add sortBy parameter for server-side sorting
        if (sortBy && sortBy !== "trending" && sortBy !== "featured") {
          params.set("sortBy", sortBy);
        }

        // Add time filter parameter
        if (timeFilter && timeFilter !== "all") {
          params.set("time", timeFilter);
        }

        // Add cache busting parameter
        params.set("_t", Date.now().toString());
        const url = `/api/posts?${params.toString()}`;

        const response = await fetch(url, {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("401: Unauthorized");
          }
          throw new Error(`${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

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
    if (isAuthenticated) {
      fetchPosts(1, 20);
    }
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
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [error, toast]);

  return (
    <div className="flex gap-6 max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      {/* Center Feed */}
      <div className="flex-1 min-w-[200px] max-w-[800px] mx-auto lg:mx-0">
        {/* Search Bar */}
        <SearchBar 
          placeholder="Blow the whistle ..."
          onSearch={(query) => console.log("Search:", query)}
        />

        {/* Feed Controls */}
        <FeedControls
          sortBy={sortBy}
          timeFilter={timeFilter}
          onSortChange={setSortBy}
          onTimeFilterChange={setTimeFilter}
        />

        {/* Posts Feed */}
        <PostFeed
          posts={posts}
          isLoading={isLoading}
          error={error}
          onRefetch={refetch}
          onCreatePost={onCreatePost}
          onExploreCommunities={onExploreCommunities}
        />
      </div>
    </div>
  );
}