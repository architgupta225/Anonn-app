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
  MoreHorizontal
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import LeftSidebar from "@/components/LeftSidebar";
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
import { InfiniteScrollLoader, InfiniteScrollSkeleton } from "@/components/InfiniteScrollLoader";

export default function PostPage() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get post ID from URL
  const postId = new URLSearchParams(window.location.search).get('id');
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreatePost = () => {
    window.location.href = '/create-post';
  };

  // Fetch post data with real-time updates
  const { data: post, isLoading: postLoading, refetch } = useQuery<PostWithDetails>({
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

  // Fetch comments with infinite scroll
  const {
    items: comments,
    isLoading: commentsLoading,
    hasMore: hasMoreComments,
    error: commentsError,
    loadMore: loadMoreComments,
    refresh: refetchComments,
    setItems: setComments
  } = useInfiniteComments(
    async (page: number, limit: number) => {
      if (!postId) throw new Error("No post ID provided");
      const response = await fetch(`/api/posts/${postId}/comments?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // For infinite scroll, we need to return items and hasMore
      return {
        items: data,
        hasMore: data.length === limit, // If we got less than limit, we've reached the end
        total: data.length
      };
    },
    20, // 20 comments per page
    {
      enabled: !!postId && isAuthenticated,
      threshold: 0.1,
      rootMargin: '100px'
    }
  );

  const queryClient = useQueryClient();

  const deletePost = async () => {
    if (!post) return;
    if (post.authorId !== user?.id) return;
    try {
      const res = await fetch(`/api/posts/${post.id}`, { 
        method: 'DELETE', 
        credentials: 'include', 
        headers: { Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}` } 
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
      console.log('[PostPage] Invalidating queries after post deletion...');
      
      // Invalidate all post-related queries
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key[0] === "posts" ||
            key[0] === "/api/posts" ||
            key[0] === "bowl-posts" ||
            key[0] === "organization-posts"
          );
        },
      });

      // Remove all post-related queries from cache
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key[0] === "posts" ||
            key[0] === "/api/posts" ||
            key[0] === "bowl-posts" ||
            key[0] === "organization-posts"
          );
        },
      });

      console.log('[PostPage] Queries invalidated successfully');

      // Show success message
      toast({
        title: "Post deleted",
        description: "Your post has been permanently deleted.",
      });

      // Redirect back to where the user came from, fallback to home
      if (window.history.length > 1) {
        window.history.back();
      } else {
        setLocation('/');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
      // Fallback in case of unexpected error
      setLocation('/');
    }
  };

  const deleteComment = async (commentId: number) => {
    await fetch(`/api/comments/${commentId}`, { method: 'DELETE', credentials: 'include', headers: { Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}` } });
    refetchComments();
  };



  const getPostTypeLabel = () => {
    if (!post) return '';
    if (post.type === 'review') return 'Discussion';
    if (post.type === 'poll') return 'Poll';
    return 'Discussion';
  };

  const getAuthorDisplay = () => {
    if (!post) return '';
    if (post.isAnonymous) {
      return "anonymous";
    }
    
    const author = post.author;
    const username = author.username || 'User';
    
    // Show company affiliation if user is company verified
    if (author.isCompanyVerified && author.companyName) {
      return `${username} from ${author.companyName}`;
    }
    
    return username;
  };



  const handlePollClick = () => {
    if (post?.type === 'poll') {
      // Navigate to polls page for now
      // In the future, we could add a pollId field to posts to link to specific polls
      window.location.href = '/polls';
    }
  };

  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };



  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navigation />
        <div className="flex w-full h-screen">
          <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] sticky top-16 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
            <div className="p-4 space-y-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          </aside>
          <main className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 w-full">
              {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full mb-4" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation />
      <div className="flex w-full h-screen">
        {/* Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] sticky top-16 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
          <LeftSidebar 
            onCreatePost={handleCreatePost} 
            onCreateReview={handleCreatePost}
          />
        </aside>    

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="fixed top-20 left-4 z-50 lg:hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md p-2 shadow-md"
        >
          <MessageSquare className="h-4 w-4" />
        </button>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 pt-20 pb-6 w-full">
            {/* Back Button */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Feed</span>
              </Button>
            </div>

            {postLoading ? (
              <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-xl">
                <CardContent className="p-8">
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
              <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-xl">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    {/* Vote Buttons */}
                    <div className="transform hover:scale-105 transition-transform duration-300">
                      <VoteButtons 
                        targetId={post.id}
                        targetType="post"
                        upvotes={post.upvotes}
                        downvotes={post.downvotes}
                        userVote={post.userVote}
                        onUpdate={refetch}
                      />
                    </div>

                    {/* Post Content */}
                    <div className="flex-1">
                      {/* Post Meta */}
                      <div className="flex items-center space-x-2 mb-3 flex-wrap">
                        {post.type === 'poll' && (
                          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-3 py-1 font-medium">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Poll
                          </Badge>
                        )}
                        
                        <span className="text-sm text-muted-foreground">
                          {getPostTypeLabel()} • Posted by
                        </span>
                        
                        <div className="flex items-center space-x-1">
                          {!post.isAnonymous && post.author.profileImageUrl ? (
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={post.author.profileImageUrl} />
                              <AvatarFallback>
                                <User className="h-2 w-2" />
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          
                          <span className="text-sm font-medium text-reddit-orange hover:text-reddit-orange/80">
                            {getAuthorDisplay()}
                          </span>
                        </div>
                        
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(post.createdAt || '')}
                        </span>
                        
                        {post.organization && (
                          <>
                            <span className="text-sm text-muted-foreground">in</span>
                            <button
                              onClick={() => window.open(`/organization?id=${post.organization!.id}`, '_blank')}
                              className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-full hover:bg-muted/80 cursor-pointer"
                            >
                              <Building className="h-3 w-3 text-professional-blue" />
                              <span className="text-sm font-medium text-professional-blue hover:underline">
                                {post.organization.name}
                              </span>
                            </button>
                          </>
                        )}
                        
                        {post.bowl && (
                          <>
                            <span className="text-sm text-muted-foreground">in</span>
                            <button
                              onClick={() => window.open(`/bowl?id=${post.bowl!.id}`, '_blank')}
                              className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-full hover:bg-muted/80 cursor-pointer"
                            >
                              <Users className="h-3 w-3 text-reddit-orange" />
                              <span className="text-sm font-medium text-reddit-orange hover:underline">
                                {post.bowl.name}
                              </span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Post Title + Actions */}
                      <div className="flex items-start justify-between mb-3">
                        <h1 className="text-2xl font-bold text-foreground leading-tight">
                          {post.title}
                        </h1>
                        {(() => {
                          console.log('[PostPage] Delete check:', {
                            userId: user?.id,
                            userType: typeof user?.id,
                            authorId: post.authorId,
                            authorType: typeof post.authorId,
                            userExists: !!user?.id,
                            authorExists: !!post.authorId,
                            idMatch: user?.id === post.authorId,
                            idMatchString: user?.id === post.authorId?.toString(),
                            showDelete: user?.id && post.authorId && (user.id === post.authorId || user.id === post.authorId.toString())
                          });
                          return user?.id && post.authorId && (user.id === post.authorId || user.id === post.authorId.toString()) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                                  <Trash className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })()}
                      </div>
                      
                      {/* Post Content */}
                      {post.type === 'poll' ? (
                        <div 
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 cursor-pointer hover:shadow-md transition-all duration-300"
                          onClick={handlePollClick}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground mb-1">Poll</h3>
                                <div className="text-sm text-muted-foreground">
                                  <MarkdownRenderer 
                                    content={post.content}
                                    className="text-sm text-muted-foreground"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                              <span className="text-sm font-medium">View Poll</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground mb-4 leading-relaxed">
                          <div className="prose prose-sm max-w-none">
                            <MarkdownRenderer 
                              content={post.content}
                              className="text-gray-700 dark:text-gray-300"
                            />
                          </div>
                        </div>
                      )}

                      {/* Attached Image */}
                      {post.imageUrl && (
                        <img 
                          src={post.imageUrl} 
                          alt="Post attachment" 
                          className="rounded-lg mb-4 w-full max-h-96 object-cover shadow-lg"
                        />
                      )}

                      {/* Post Actions */}
                      <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex items-center space-x-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                              showComments 
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                                : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium">{comments?.length || 0} comments</span>
                          </Button>
                          
                          <ShareButton 
                            url={window.location.href}
                            title={post?.title || 'Check out this post'}
                            description={post?.content || 'Interesting post on Anonn'}
                          />
                        </div>
                        

                      </div>

                      {/* Comments Section */}
                      {showComments && (
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-700">
                          {/* Comment Form - Clean Design */}
                          <div className="mb-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-all duration-300">
                            {/* Header with clean styling */}
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                <MessageSquare className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                  Add your thoughts
                                </h3>
                              </div>
                            </div>
                            
                            {/* Clean comment form */}
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-white/50 dark:border-slate-700/50 shadow-sm">
                              <CommentForm postId={post.id} onSuccess={refetchComments} />
                            </div>
                          </div>

                          {commentsLoading && comments.length === 0 ? (
                            <InfiniteScrollSkeleton count={3} />
                          ) : comments && comments.length > 0 ? (
                            <div className="space-y-6">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                <MessageSquare className="h-5 w-5 mr-2 text-gray-600" />
                                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                              </h3>
                              {comments.map((comment, index) => (
                                <div 
                                  key={comment.id} 
                                  className="animate-fade-in-up bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300"
                                  style={{ animationDelay: `${index * 100}ms` }}
                                >
                                  {(() => {
                                    console.log('[PostPage Comment] Delete check:', {
                                      userId: user?.id,
                                      userType: typeof user?.id,
                                      authorId: comment.authorId,
                                      authorType: typeof comment.authorId,
                                      userExists: !!user?.id,
                                      authorExists: !!comment.authorId,
                                      idMatch: user?.id === comment.authorId,
                                      idMatchString: user?.id === comment.authorId?.toString(),
                                      showDelete: user?.id && comment.authorId && (user.id === comment.authorId || user.id === comment.authorId.toString())
                                    });
                                    return user?.id && comment.authorId && (user.id === comment.authorId || user.id === comment.authorId.toString()) && (
                                      <div className="flex justify-end mb-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deleteComment(comment.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash className="h-4 w-4 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    );
                                  })()}
                                  <CommentReply
                                    comment={comment}
                                    postId={post.id}
                                    onSuccess={refetchComments}
                                    depth={0}
                                  />
                                </div>
                              ))}
                              
                              {/* Infinite Scroll Loader for Comments */}
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
                          ) : (
                            <div className="text-center py-16">
                              <div className="mb-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <MessageSquare className="h-10 w-10 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                  Be the first to comment
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
                                  Nobody's responded to this post yet. Add your thoughts and get the conversation going.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your post and remove its data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deletePost} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </>
            ) : (
              <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Post not found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    The post you're looking for doesn't exist or has been removed.
                  </p>
                  <Button 
                    onClick={() => setLocation("/")}
                    className="bg-reddit-orange hover:bg-reddit-orange/90 text-white"
                  >
                    Back to Feed
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 