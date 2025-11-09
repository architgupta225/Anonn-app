import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Share2,
  Clock,
  Building,
  Users,
  User,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Eye,
  Heart,
  Trash,
  MoreHorizontal,
  Bookmark,
  ThumbsUp,
  Triangle,
  ChevronDown,
  Share,
  ThumbsDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import VoteButtons from "@/components/VoteButtons";
import CommentForm from "@/components/CommentForm";
import CommentReply from "@/components/CommentReply";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ShareButton from "@/components/ShareButton";
import type { PostWithDetails, CommentWithDetails } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useInfiniteComments } from "@/hooks/useInfiniteScroll";
import {
  InfiniteScrollLoader,
  InfiniteScrollSkeleton,
} from "@/components/InfiniteScrollLoader";

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
    <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-6 w-full max-w-[1200px] mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Button>
      </div>

      {postLoading ? (
        <Card className=" border border-gray-600 shadow-lg rounded-lg">
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
          <article className="bg-[#EAEAEA05] border border-[#525252] overflow-hidden">
            {/* Header Section */}
            <div className=" px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span
                  className="text-white text-sm font-normal underline cursor-pointer hover:text-gray-200 transition-colors truncate"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!post.isAnonymous)
                      window.location.href = `/u/${post.author.username}`;
                  }}
                >
                  {getAuthorDisplay()}
                </span>

                <span className="text-[#525252] text-sm ">
                  {formatTimeAgo(post.createdAt || "")}
                </span>
              </div>

              <div className="flex items-center gap-2  flex-shrink-0">
                {/* Green Thumbs Up Badge */}
                <div className=" p-1 flex items-center justify-center flex-shrink-0 ">
                  <ThumbsUp className="w-7 h-7 fill-green-500 text-green-500" />
                </div>

                {/* Green Badge with custom icon */}
                <div className="bg-green-400 p-1.5 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-7 h-7 text-white"
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
            <div className="px-6 cursor-default">
              {/* Post Title */}
              <h1 className="text-2xl font-normal text-white my-6 leading-normal">
                {post.title}
              </h1>

              {/* Post Content */}
              <div className="text-[#8E8E93] text-base leading-relaxed mb-4">
                <div className="prose prose-base max-w-none">
                  <MarkdownRenderer
                    content={post.content}
                    className="text-gray-300"
                  />
                </div>
              </div>

              {/* Post Stats */}
              <div className="flex items-center justify-between my-8 text-gray-400 text-sm mb-4">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.viewCount} VIEWS</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatPostDate(post?.createdAt)}</span>
                </div>
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

            {/* Footer Actions */}
            <div className="flex items-stretch bg-[#EAEAEA05]  border-t border-gray-600">
              {/* Left Side - Upvote/Downvote with border */}
              <div className="flex items-stretch">
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
              <div className="flex-1"></div>

              {/* Right Side - Comments & Bookmark */}
              <div
                className="flex items-stretch "
                onClick={(e) => e.stopPropagation()}
              >
                {/* Bookmark Button */}
                <button
                  aria-label="Bookmark"
                  className="flex items-center justify-center border-r border-gray-400 px-6 py-3 text-white hover:bg-gray-800/50 transition-colors"
                >
                  <Bookmark className="w-4 h-4" strokeWidth={2} />
                </button>

                {/* Share Button */}
                <ShareButton
                  size="lg"
                  url={window.location.href}
                  title={post.title}
                  description={post.content}
                />
              </div>
            </div>
          </article>

          {/* Comments Section */}
          {showComments && (
            <div className="border bg-[#EAEAEA05] border-gray-700  overflow-hidden rounded-md">
              {/* Abstract Row (example of same layout as screenshot) */}
              <div className=" bg-[#EAEAEA05] flex items-center justify-between px-6 py-4 ">
                <div className="flex items-center space-x-8">
                  <h3 className="text-gray-300 text-lg">
                    Express your view about the company
                  </h3>
                  <div className="flex items-center justify-center w-10 h-10 bg-green-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-black"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 2a8 8 0 11-8 8 8 8 0 018-8m0 2a6 6 0 106 6 6 6 0 00-6-6z" />
                    </svg>
                  </div>
                  <span className="text-gray-300 underline cursor-pointer text-lg">
                    Abstract
                  </span>
                </div>

                <div className="flex">
                  <div className="flex items-center justify-center bg-green-400 hover:bg-green-300 transition w-12 h-10">
                    <ThumbsUp
                      className="h-5 w-5 text-green-700"
                      fill="currentColor"
                    />
                  </div>

                  <div className="flex items-center justify-center bg-red-400 hover:bg-red-300 transition w-12 h-10">
                    <ThumbsDown
                      className="h-5 w-5 text-red-800"
                      fill="currentColor"
                    />
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
              <div className=" border-t border-gray-700 bg-[#0c0c0c]">
                <CommentForm postId={post.id} onSuccess={refetchComments} />
              </div>

              {/* Comments Count */}
              <div className="py-6 border-t border-gray-700 bg-[#0c0c0c] text-center">
                <h3 className="text-gray-400 tracking-wide text-sm font-medium">
                  [ {comments?.length || 0} COMMENTS ]
                </h3>
              </div>

              {/* Comments List */}
              <div className="divide-y divide-gray-700 bg-[#EAEAEA05]">
                {commentsLoading && comments.length === 0 ? (
                  <InfiniteScrollSkeleton count={3} />
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                      <div key={comment.id} className="transition-colors mb-4 border-y border-gray-700">
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
        <Card className=" border border-gray-600">
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
