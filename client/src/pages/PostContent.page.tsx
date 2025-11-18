import CommentForm from "@/components/CommentForm";
import CommentReply from "@/components/CommentReply";
import {
  InfiniteScrollLoader,
  InfiniteScrollSkeleton,
} from "@/components/InfiniteScrollLoader";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ShareButton from "@/components/ShareButton";
import { SvgIcon } from "@/components/SvgIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import VoteButtons from "@/components/VoteButtons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useInfiniteComments } from "@/hooks/useInfiniteScroll";
import { formatTimeAgo } from "@/lib/utils";
import type { PostWithDetails } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  MoreHorizontal,
  Trash
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function PostContent() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get post ID from URL
  const postId = new URLSearchParams(window.location.search).get("id");

  // Fetch post data with real-time updates
  const {
    data: post,
    isLoading: postLoading,
    refetch,
  } = useQuery<PostWithDetails>({
    queryKey: ["post", postId],
    queryFn: async () => {
      if (!postId) throw new Error("No post ID provided");
      const response = await fetch(`/api/posts/${postId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!postId && isAuthenticated,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true,
  });
  console.log("Post", post);

  function formatPostTime(dateValue: string | Date | null) {
    if (!dateValue) return "";

    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatPostDate(dateValue: string | Date | null) {
    if (!dateValue) return "";

    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    return date
      .toLocaleDateString("en-US", options)
      .toUpperCase()
      .replace(",", "");
  }

  // Fetch comments with infinite scroll
  const {
    items: comments,
    isLoading: commentsLoading,
    hasMore: hasMoreComments,
    error: commentsError,
    loadMore: loadMoreComments,
    refresh: refetchComments,
    setItems: setComments,
  } = useInfiniteComments(
    async (page: number, limit: number) => {
      if (!postId) throw new Error("No post ID provided");
      const response = await fetch(
        `/api/posts/${postId}/comments?page=${page}&limit=${limit}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // For infinite scroll, we need to return items and hasMore
      return {
        items: data,
        hasMore: data.length === limit, // If we got less than limit, we've reached the end
        total: data.length,
      };
    },
    20, // 20 comments per page
    {
      enabled: !!postId && isAuthenticated,
      threshold: 0.1,
      rootMargin: "100px",
    }
  );

  console.log("comments", comments);
  const queryClient = useQueryClient();

  const deletePost = async () => {
    if (!post) return;
    if (post.authorId !== user?.id) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${await (
            window as any
          ).__getDynamicToken?.()}`,
        },
      });

      if (!res.ok) {
        toast({
          title: "Error",
          description: "Failed to delete post. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Comprehensive cache invalidation
      console.log("[PostPage] Invalidating queries after post deletion...");

      // Invalidate all post-related queries
      await queryClient.invalidateQueries({
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

      // Remove all post-related queries from cache
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

      console.log("[PostPage] Queries invalidated successfully");

      // Show success message
      toast({
        title: "Post deleted",
        description: "Your post has been permanently deleted.",
      });

      // Redirect back to where the user came from, fallback to home
      if (window.history.length > 1) {
        window.history.back();
      } else {
        setLocation("/");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
      // Fallback in case of unexpected error
      setLocation("/");
    }
  };

  const deleteComment = async (commentId: number) => {
    await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}`,
      },
    });
    refetchComments();
  };

  const getAuthorDisplay = () => {
    if (!post) return "";
    if (post.isAnonymous) {
      return "anonymous";
    }

    const author = post.author;
    const username = author.username || "User";

    // Show company affiliation if user is company verified
    if (author.isCompanyVerified && author.companyName) {
      return `${username} from ${author.companyName}`;
    }

    return username;
  };

  if (authLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 w-full">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full mb-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-[4%]">
      {postLoading ? (
        <Card className="border border-[#525252]/30 shadow-lg rounded-lg">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-full mb-3" />
              <Skeleton className="h-20 w-full mb-4" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : post ? (
        <>
          {/* Post Card */}
          <article className=" bg-[rgba(234,234,234,0.02)] overflow-hidden">
            <div className="border-[0.2px] border-[#525252]/30 px-9 py-6 flex flex-col gap-6">
              {/* Header Section */}
              <div className=" flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <img src="/icons/dummyAvatar.png" />
                  <span
                    className="text-[#8E8E93] text-xs tracking-[.24px] font-normal underline cursor-pointer hover:text-gray-200 transition-colors truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!post.isAnonymous)
                        window.location.href = `/u/${post.author.username}`;
                    }}
                  >
                    {getAuthorDisplay()}
                  </span>

                  <span className="text-[#525252] text-[10px] tracking-[0.2px]">
                    {formatTimeAgo(post.createdAt || "")}
                  </span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Green Thumbs Up Badge */}
                  <div className=" p-1 flex items-center justify-center flex-shrink-0 ">
                    <img src="/icons/Post like icon.svg" alt="like" />
                    {/* <ThumbsUp className="w-7 h-7 fill-green-500 text-green-500" /> */}
                  </div>

                  {/* Green Badge with custom icon */}
                  <div className="bg-green-400 w-[30px] h-[30px] p-1.5 flex items-center justify-center flex-shrink-0">
                    <svg
                      className=" text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
                    </svg>
                  </div>
                  {/* Post Actions Menu (Delete) */}

                  {(() => {
                    return (
                      user?.id &&
                      post.author?.id &&
                      (user.id === post.author.id ||
                        user?.id === post?.author.id.toString()) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-300 hover:text-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3 rotate-90" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              onClick={() => setIsDeleteDialogOpen(true)}
                              className="text-red-600"
                            >
                              <Trash className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    );
                  })()}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="cursor-default flex flex-col gap-6">
                {/* Post Title */}
                <div className="text-sm font-normal font-spacemono text-[#E8EAE9] leading-normal">
                  {post.title}
                </div>

                {/* Post Content */}
                <div className="text-[#8E8E93] text-base leading-relaxed">
                  <div className="prose prose-xs max-w-none">
                    <MarkdownRenderer
                      content={post.content}
                      className="text-[#8E8E93]"
                    />
                  </div>
                </div>

                {/* Post Stats */}
                <div className="flex items-center justify-between text-[#525252] text-[10px] uppercase">
                  <div>{formatPostTime(post?.createdAt)}</div>
                  <div>{post.viewCount} Views</div>
                  <div>{formatPostDate(post?.createdAt)}</div>
                </div>

                {/* Company Badge */}
                {post.organization && (
                  <div className="mb-4">
                    <Badge className="bg-gray-700 text-gray-300 border-none px-3 py-1 text-sm">
                      {post.organization.name}
                    </Badge>
                  </div>
                )}

                {/* Attached Image */}
                {post.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt="Post attachment"
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-x-[0.2px] border-b flex flex-col md:flex-row items-stretch border-[#525252]/30">
              {/* Left Side - Upvote/Downvote with border */}
              <div>
                <VoteButtons
                  targetId={post.id}
                  targetType="post"
                  upvotes={post.upvotes}
                  downvotes={post.downvotes}
                  userVote={post.userVote}
                  onUpdate={refetch}
                  layout="horizontal"
                  showCount={true}
                />
              </div>

              {/* Spacer to push right items to the end */}
              <div className="flex-1 hidden md:block"></div>

              {/* Right Side - Comments & Bookmark */}
              <div
                className="flex items-stretch "
                onClick={(e) => e.stopPropagation()}
              >
                {/* Bookmark Button */}
                <button
                  aria-label="Bookmark"
                  className={`flex items-center justify-center px-4 py-3 transition-colors hover:bg-gray-800/50 text-white
                `}
                >
                  <SvgIcon
                    src="/icons/Post bookmark icon.svg"
                    color={"text-white"}
                    alt="bookmark"
                  />
                </button>

                {/* Share Button */}
                <ShareButton
                  size="sm"
                  url={window.location.href}
                  title={post.title}
                  description={post.content}
                />
              </div>
            </div>
          </article>

          {/* Comments Section */}
          {showComments && (
            <div className="overflow-hidden">
              {/* Abstract Row (example of same layout as screenshot) */}
              <div className="border-x-[0.2px] border-[#525252]/30 flex items-center justify-between px-9 py-6 ">
                <div className="text-[#525252] text-xs">
                  Express your view about the company
                </div>

                <div className="flex gap-4 md:gap-6 lg:gap-9 items-center">
                  <img src="/icons/Company icon.png" />
                  <span className="text-[#E8EAE9] underline cursor-pointer text-xs">
                    Abstract
                  </span>
                  <div className="flex">
                    <div className="flex cursor-pointer items-center justify-center bg-[#ABEFC6] hover:bg-green-300 transition w-[30px] h-[30px]">
                      <img src="/icons/Post like icon-1.svg" alt="thumbs-up" />
                    </div>

                    <div className="flex cursor-pointer items-center justify-center bg-[#FDA29B] hover:bg-red-300 transition w-[30px] h-[30px]">
                      <img src="/icons/thumbs-down.svg" alt="thumbs-down" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden Comment Form (functional form handler) */}
              <div className="hidden">
                <form className="comment-form">
                  <CommentForm postId={post.id} onSuccess={refetchComments} />
                </form>
              </div>

              {/* Comment Form */}
              <div className="border-[0.2px] border-[#525252]/30 bg-[#0c0c0c]">
                <CommentForm postId={post.id} onSuccess={refetchComments} />
              </div>

              {/* Comments Count */}
              <div className="h-[40px] text-center flex justify-center items-center">
                <div className="text-[#525252] text-[10px] font-medium">
                  [ {comments?.length || 0} COMMENTS ]
                </div>
              </div>

              {/* Comments List */}
              <div>
                {commentsLoading && comments.length === 0 ? (
                  <InfiniteScrollSkeleton count={3} />
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="transition-colors mb-4 border border-[#525252]/30"
                    >
                      {user?.id &&
                        comment.authorId &&
                        (user.id === comment.authorId ||
                          user.id === comment.authorId.toString()) && (
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteComment(comment.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        )}
                      <CommentReply
                        key={comment.id}
                        comment={comment}
                        postId={post.id}
                        onSuccess={refetchComments}
                        depth={0}
                      />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No comments yet. Be the first to comment!
                    </p>
                  </div>
                )}

                {/* Infinite Scroll Loader */}
                <InfiniteScrollLoader
                  isLoading={commentsLoading}
                  hasMore={hasMoreComments}
                  error={commentsError}
                  onRetry={refetchComments}
                  onLoadMore={loadMoreComments}
                  loadingText="Loading more comments..."
                  endText="You've reached the end of the comments! 🎉"
                  errorText="Failed to load more comments"
                />
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your post and remove its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={deletePost}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <Card className=" border border-[#525252]/30">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Post not found
            </h3>
            <p className="text-gray-400 mb-6">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
