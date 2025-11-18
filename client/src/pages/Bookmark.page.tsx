import PostCard from "@/components/PostCard";
import { SvgIcon } from "@/components/SvgIcon";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { PostWithDetails } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
          <p className="text-gray-400">
            Please sign in to see your saved posts and polls.
          </p>
        </div>
      </div>
    );
  }

  const isLoading =
    (activeTab === "posts" && postsLoading) ||
    (activeTab === "polls" && postsLoading);

  return (
    <div className="max-w-[1400px] mx-auto px-[4%]">
      <div>
        {/* Tabs */}
        <div className="flex  gap-3 mb-6">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex text-[#525252] items-center gap-2 px-4 h-[40px] sm:px-6  rounded-[56px] text-xs font-medium transition-all w-full sm:w-auto justify-center ${
              activeTab === "posts"
                ? "bg-[#E8EAE9]"
                : "bg-[#1B1C20] hover:text-[#E8EAE9]"
            }`}
          >
            <SvgIcon
              src="/icons/Post option icon.svg"
              color={activeTab === "posts" ? "text-[#525252]" : ""}
              forceFill={activeTab === "posts"}
            />
            POSTS
          </button>
          <button
            onClick={() => setActiveTab("polls")}
            className={`flex text-[#525252] items-center gap-2 px-4 h-[40px] sm:px-6  rounded-[56px] text-xs font-medium transition-all w-full sm:w-auto justify-center ${
              activeTab === "polls"
                ? "bg-[#E8EAE9]"
                : "bg-[#1B1C20] hover:text-[#E8EAE9]"
            }`}
          >
            <SvgIcon
              src="/icons/Polls icon.svg"
              color={activeTab === "polls" ? "text-[#525252]" : ""}
              forceFill={activeTab === "polls"}
            />
            POLLS
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex text-[#525252] items-center gap-2 px-4 h-[40px] sm:px-6  rounded-[56px] text-xs font-medium transition-all w-full sm:w-auto justify-center ${
              activeTab === "users"
                ? "bg-[#E8EAE9]"
                : "bg-[#1B1C20] hover:text-[#E8EAE9]"
            }`}
          >
            <SvgIcon
              src="/icons/Profile icon.svg"
              color={activeTab === "users" ? "text-[#525252]" : ""}
              forceFill={activeTab === "users"}
            />
            USERS
          </button>
        </div>

        {/* Total Count */}
        <div className="flex items-center justify-center mb-6 h-[40px]">
          <p className="text-[#525252] text-sm font-medium">
            [ {getTotalCount()} TOTAL ]
          </p>
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
                  savedPosts.map((post: PostWithDetails) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onUpdate={emptyUpdateCallback}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No bookmarked posts
                    </h3>
                    <p className="text-gray-500">
                      Posts you bookmark will appear here
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "polls" && (
              <>
                {savedPolls.length > 0 ? (
                  savedPolls.map((poll) => (
                    <PostCard key={poll.id} post={poll} onUpdate={() => {}} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No bookmarked polls
                    </h3>
                    <p className="text-gray-500">
                      Polls you bookmark will appear here
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "users" && (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  User bookmarks coming soon
                </h3>
                <p className="text-gray-500">
                  This feature is under development
                </p>
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
