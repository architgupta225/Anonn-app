import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PostCard from "@/components/PostCard";
import PollCard from "@/components/PollCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2, Bookmark } from "lucide-react";
import type { PostWithDetails, PollWithDetails } from "@shared/schema";

type TabType = "posts" | "polls" | "users";

export default function BookmarksPage() {
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const { toast } = useToast();
  const { user, isAuthenticated, getAccessToken } = useAuth();
  // Empty callback for PostCard updates
  const [savedPolls, setSavedPolls] = useState<PostWithDetails[]>([]);
  const [savedPosts, setSavedPost] = useState<PostWithDetails[]>([]);
  const emptyUpdateCallback = useCallback(() => {}, []);

const { data: savedData = [], isLoading: postsLoading } = useQuery({
  queryKey: ["/api/user/saved-posts"],
  queryFn: async () => {
    const token = await getAccessToken();
    const response = await fetch("/api/user/saved-posts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Return array of posts (each with .post)
    return data.map((saved: any) => saved.post);
  },
  enabled: isAuthenticated,
  retry: (failureCount, error) => {
    if (isUnauthorizedError(error)) {
      window.location.href = "/";
      return false;
    }
    return failureCount < 3;
  },
});

console.log("sa", savedData)
  // Separate posts by type when data arrives
  useEffect(() => {
    if (savedData) {
      const polls = savedData.filter((p: any) => p.type === "poll");
      const normalPosts = savedData.filter((p: any) => p.type !== "poll");
      setSavedPolls(polls);
      setSavedPost(normalPosts);
    }
  }, [savedData]);


  const getTotalCount = () => {
    switch (activeTab) {
      case "posts":
        return savedPosts.length;
      case "polls":
        return savedPolls.length;
      case "users":
        return 0; // Placeholder
      default:
        return 0;
    }
  };

  

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view bookmarks</h2>
          <p className="text-gray-400">Please sign in to see your saved posts and polls.</p>
        </div>
      </div>
    );
  }

  const isLoading = (activeTab === "posts" && postsLoading) || (activeTab === "polls" && postsLoading);

  return (
    <div className="w-full min-h-screen bg-black text-white px-4 pt-6 pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-8 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "posts"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            POSTS
          </button>
          <button
            onClick={() => setActiveTab("polls")}
            className={`px-8 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "polls"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            POLLS
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-8 py-2 rounded-full font-medium text-sm transition-all ${
              activeTab === "users"
                ? "bg-white text-black"
                : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            USERS
          </button>
        </div>

        {/* Total Count */}
        <div className="text-center text-gray-600 text-sm mb-8">
          [ {getTotalCount()} TOTAL ]
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === "posts" && (
              <>
                {savedPosts.length > 0 ? (
                  savedPosts.map((post:PostWithDetails) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onUpdate={emptyUpdateCallback}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-white mb-2">No bookmarked posts</h3>
                    <p className="text-gray-500">Posts you bookmark will appear here</p>
                  </div>
                )}
              </>
            )}

            {activeTab === "polls" && (
              <>
                {savedPolls.length > 0 ? (
                  savedPolls.map((poll) => (
                    <PostCard
                      key={poll.id}
                      post={poll}
                      onUpdate={()=>{}}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-white mb-2">No bookmarked polls</h3>
                    <p className="text-gray-500">Polls you bookmark will appear here</p>
                  </div>
                )}
              </>
            )}

            {activeTab === "users" && (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">User bookmarks coming soon</h3>
                <p className="text-gray-500">This feature is under development</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getAccessToken() {
  throw new Error("Function not implemented.");
}
