import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import UserAvatar from "@/components/UserAvatar";

import {
  MessageSquare,
  Clock,
  Building,
  Users,
  User,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Pin,
  Lock,
  Eye,
  MoreHorizontal,
  Trash,
  Flame,
  TrendingUp,
  Star,
  Mail,
  Twitter,
  ChevronUp,
  Triangle,
  ChevronDown,
  Bookmark,
  Check,
  Loader2,
  ThumbsUp
} from "lucide-react";
import type { PostWithDetails } from "@shared/schema";
import { formatTimeAgo } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import {
  calculateOptimisticVoteUpdate,
  updatePostInAllCaches,
  invalidateVoteQueries,
  submitVote,
  cancelVoteQueries,
  type VoteState
} from "@/lib/voteUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
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

interface PostCardProps {
  post: PostWithDetails;
  onUpdate: () => void;
  compact?: boolean;
  showCommunity?: boolean;
  index?: number;
}

export default function PostCard({
  post,
  onUpdate,
  compact = false,
  showCommunity = true,
  index = 0
}: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { user, isAuthenticated, getAccessToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // === BOOKMARK STATE ===
  const [isSaved, setIsSaved] = useState(false);
  const [isCheckingSaved, setIsCheckingSaved] = useState(false);
  console.log("post", post)
  // Check if post is saved on mount and when user changes
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsSaved(false);
        return;
      }

      try {
        setIsCheckingSaved(true);
        const token = await getAccessToken();
        const response = await fetch(`/api/posts/${post.id}/saved`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setIsSaved(data.isSaved);
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
      } finally {
        setIsCheckingSaved(false);
      }
    };

    checkSavedStatus();
  }, [isAuthenticated, user, post.id, getAccessToken]);

  // === BOOKMARK MUTATION ===
  const bookmarkMutation = useMutation({
    mutationFn: async (shouldSave: boolean) => {
      const token = await getAccessToken();
      const method = shouldSave ? 'POST' : 'DELETE';
      
      const response = await fetch(`/api/posts/${post.id}/save`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update bookmark');
      }

      return response.json();
    },

    onMutate: async (shouldSave: boolean) => {
      // Optimistic update
      setIsSaved(shouldSave);
    },

    onError: (err, shouldSave) => {
      // Revert on error
      setIsSaved(!shouldSave);

      if (isUnauthorizedError(err)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: `Failed to ${shouldSave ? 'save' : 'unsave'} post. Please try again.`,
        variant: "destructive",
      });
    },

    onSuccess: (data, shouldSave) => {
      toast({
        title: shouldSave ? "Post saved!" : "Post unsaved",
        description: shouldSave 
          ? "You can find this post in your saved items." 
          : "Post removed from your saved items.",
      });

      // Invalidate saved posts query
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-saved'] });
    },
  });

  const handleBookmark = () => {
    if (!handleAuthRequired("save posts")) return;
    if (bookmarkMutation.isPending) return;

    bookmarkMutation.mutate(!isSaved);
  };

  // === AUTHENTICATION HANDLER ===
  const showAuthToast = (action: string) => {
    toast({
      title: "Authentication Required",
      description: `Please connect your wallet to ${action}.`,
      variant: "default",
      action: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            const event = new CustomEvent('triggerWalletConnect');
            window.dispatchEvent(event);
          }}
        >
          Connect Wallet
        </Button>
      ),
    });
  };

  const handleAuthRequired = (action: string, callback?: () => void) => {
    if (!isAuthenticated) {
      showAuthToast(action);
      return false;
    }
    callback?.();
    return true;
  };

  // === VOTING FUNCTIONALITY START ===
  const [animatingVote, setAnimatingVote] = useState<"up" | "down" | null>(null);

  const [optimisticState, setOptimisticState] = useState<VoteState>({
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    userVote: post.userVote,
  });

  useEffect(() => {
    setOptimisticState({
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      userVote: post.userVote,
    });
  }, [post.upvotes, post.downvotes, post.userVote, post.id]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      return await submitVote({ targetId: post.id, targetType: "post", voteType });
    },

    onMutate: async (voteType: "up" | "down") => {
      await cancelVoteQueries(queryClient, post.id, "post");

      const previousState = { ...optimisticState };
      const newState = calculateOptimisticVoteUpdate(optimisticState, voteType, post.id, "post");

      setOptimisticState(newState);

      updatePostInAllCaches(queryClient, post.id, "post", (item: any) => ({
        ...item,
        upvotes: newState.upvotes,
        downvotes: newState.downvotes,
        userVote: newState.userVote,
      }));

      return { previousState };
    },

    onError: (err, voteType, context) => {
      if (context?.previousState) {
        setOptimisticState(context.previousState);

        updatePostInAllCaches(queryClient, post.id, "post", (item: any) => ({
          ...item,
          upvotes: context.previousState.upvotes,
          downvotes: context.previousState.downvotes,
          userVote: context.previousState.userVote,
        }));
      }

      setAnimatingVote(null);

      if (isUnauthorizedError(err)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }

      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      });
    },

    onSuccess: (data) => {
      if (data?.updatedCounts) {
        const serverState: VoteState = {
          upvotes: data.updatedCounts.upvotes,
          downvotes: data.updatedCounts.downvotes,
          userVote: data.userVote || undefined,
        };

        setOptimisticState(serverState);

        updatePostInAllCaches(queryClient, post.id, "post", (item: any) => ({
          ...item,
          upvotes: serverState.upvotes,
          downvotes: serverState.downvotes,
          userVote: serverState.userVote,
        }));
      }
    },

    onSettled: () => {
      invalidateVoteQueries(queryClient, post.id, "post");
      setTimeout(() => setAnimatingVote(null), 300);
      onUpdate();
    },
  });

  const handleVote = (voteType: "up" | "down") => {
    if (!handleAuthRequired("vote")) return;
    if (voteMutation.isPending) return;

    setAnimatingVote(voteType);
    voteMutation.mutate(voteType);
  };

  const displayUpvotes = optimisticState.upvotes;
  const displayDownvotes = optimisticState.downvotes;
  const displayUserVote = optimisticState.userVote;
  const voteScore = displayUpvotes - displayDownvotes;
  // === VOTING FUNCTIONALITY END ===

  const getPostTypeLabel = () => {
    if (post.type === 'review') return 'Discussion';
    if (post.type === 'poll') return 'Poll';
    return 'Discussion';
  };

  const handlePollClick = () => {
    if (post.type === 'poll') {
      if (!handleAuthRequired("participate in polls")) return;
      console.log('Poll clicked! Navigating to:', `/poll?id=${post.id}`);
      window.location.href = `/poll?id=${post.id}`;
    }
  };

  const handlePostClick = () => {
    if (post.type === 'poll') {
      if (!handleAuthRequired("participate in polls")) return;
      window.location.href = `/poll?id=${post.id}`;
    } else {
      if (!handleAuthRequired("participate in post")) return;
      window.location.href = `/post?id=${post.id}`;
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.isAnonymous) {
      if (!handleAuthRequired("view user profiles")) return;
      window.location.href = `/u/${post.author.username}`;
    }
  };

  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    let lastSpace = content.lastIndexOf(' ', maxLength);
    if (lastSpace === -1) lastSpace = maxLength;
    return content.substring(0, lastSpace).trim() + '...';
  };

  const shouldTruncate = post.content.length > 300;
  const displayContent = shouldTruncate ? truncateContent(post.content) : post.content;

  const getAuthorDisplay = () => {
    if (post.isAnonymous) {
      return "anonymous";
    }
    const author = post.author;
    return author.username || 'user1234'; 
  };

  return (
    <article
      className={`
        bg-black border border-gray-600 max-w-full overflow-hidden
        ${index % 5 === 0 && index > 0 ? 'animate-post-reveal' : ''}
      `}
    > 

      {/* Header Section - Responsive */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-[#505050] flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 mr-2">
          <span 
            className="text-white text-sm md:text-base font-normal underline cursor-pointer hover:text-gray-200 transition-colors truncate"
            onClick={handleAuthorClick}
          >
            {getAuthorDisplay()}
          </span>
          
          <div className="bg-green-500 rounded-sm p-0.5 md:p-1 flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="w-2.5 h-2.5 md:w-3 md:h-3 fill-white text-white" />
          </div>
          
          <div className="bg-green-400 rounded-sm p-1 md:p-1.5 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/>
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <span className="text-gray-300 text-xs md:text-sm">{formatTimeAgo(post.createdAt)}</span>
          
          {(() => {
              return user?.id && post.author?.id && (user.id === post.author.id || user.id === post.author.id.toString()) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 md:h-6 md:w-6 text-gray-300 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                      <Trash className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}
        </div>
      </div>

      {/* Main Content Area - Responsive */}
      <div 
        className="px-4 md:px-6 py-4 md:py-6 cursor-pointer bg-black"
        onClick={handlePostClick}
      >
        <h3 className="text-lg md:text-xl font-normal text-white mb-3 md:mb-4 leading-normal">
          {post.title}
        </h3>

        {post.type === 'poll' ? (
            <div className="mb-3">
              <div
                className="bg-[#4a4a4a] border border-gray-600 rounded-lg p-3 md:p-4 hover:shadow-md transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePollClick();
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-sm md:text-base">Interactive Poll</h3>
                      <div className="text-xs md:text-sm text-gray-400 line-clamp-2">
                        <MarkdownRenderer
                          content={post.content.length > 120 ? post.content.substring(0, 120) + '...' : post.content}
                          className="text-xs md:text-sm text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2 text-blue-400 flex-shrink-0 ml-2">
                    <span className="text-xs md:text-sm font-medium hidden sm:inline">Vote Now</span>
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-300 text-sm md:text-base leading-relaxed mb-3">
              <div className="prose prose-sm md:prose-base max-w-none">
                <MarkdownRenderer
                  content={displayContent}
                  className="text-gray-300"
                />
              </div>
              {shouldTruncate && !isExpanded && (
                <button className="text-gray-500 text-xs md:text-sm hover:text-gray-400 transition-colors mt-2 md:mt-3 block">
                  Read more ....
                </button>
              )}
            </div>
          )}

        {post.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img 
              src={post.imageUrl} 
              alt="Post attachment" 
              className="w-full max-h-64 md:max-h-96 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </div>

      {/* Footer Actions - Responsive */}
      <div className="flex items-stretch bg-black border-t border-gray-600">
        
        {/* Left Side - Upvote/Downvote */}
        <div className="flex items-stretch" onClick={(e) => e.stopPropagation()}>
          <button
            aria-label="Upvote"
            onClick={(e) => {
              e.stopPropagation();
              handleVote("up");
            }}
            disabled={voteMutation.isPending}
            className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 border-r border-gray-600 transition-colors ${
              displayUserVote?.voteType === "up"
                ? "text-blue-500 bg-blue-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${voteMutation.isPending ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            {voteMutation.isPending && animatingVote === "up" ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Triangle
                fill={displayUserVote?.voteType === "up" ? "currentColor" : "white"}
                className="w-4 h-4 md:w-5 md:h-5"
                strokeWidth={2.5}
              />
            )}
            <span className="text-base md:text-lg font-normal">{displayUpvotes}</span>
          </button>

          <button
            aria-label="Downvote"
            onClick={(e) => {
              e.stopPropagation();
              handleVote("down");
            }}
            disabled={voteMutation.isPending}
            className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 border-r border-gray-600 transition-colors ${
              displayUserVote?.voteType === "down"
                ? "text-orange-500 bg-orange-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${voteMutation.isPending ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            {voteMutation.isPending && animatingVote === "down" ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Triangle
                fill={displayUserVote?.voteType === "down" ? "currentColor" : "white"}
                className="rotate-180 h-4 w-4 md:h-5 md:w-5"
              />
            )}
            <span className="text-base md:text-lg font-normal hidden sm:inline">{displayDownvotes}</span>
          </button>
        </div>
        
        <div className="flex-1"></div>

        {/* Right Side - Comments & Bookmark */}
        <div className="flex items-stretch" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!handleAuthRequired("view comments")) return;
              window.location.href = `/post?id=${post.id}`
            }}
            className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 text-white hover:bg-gray-800/50 transition-colors"
          >
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />
            <span className="text-base md:text-lg font-normal">{post.commentCount}</span>
          </button>

          {/* Bookmark Button with Fill State */}
          <button
            aria-label={isSaved ? "Unsave post" : "Save post"}
            onClick={(e) => {
              e.stopPropagation();
              handleBookmark();
            }}
            disabled={bookmarkMutation.isPending || isCheckingSaved}
            className={`flex items-center justify-center px-4 md:px-8 py-3 md:py-4 transition-colors ${
              isSaved
                ? "text-blue-500 bg-blue-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${(bookmarkMutation.isPending || isCheckingSaved) ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            {bookmarkMutation.isPending ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Bookmark 
                className="w-4 h-4 md:w-5 md:h-5" 
                strokeWidth={2}
                fill={isSaved ? "currentColor" : "none"}
              />
            )}
          </button>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post and remove its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.stopPropagation();
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

                  console.log('[PostCard] Invalidating queries after post deletion...');
                  
                  queryClient.invalidateQueries({
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

                  console.log('[PostCard] Queries invalidated successfully');

                  toast({
                    title: "Post deleted",
                    description: "Your post has been permanently deleted.",
                  });

                  if (typeof onUpdate === 'function') {
                    onUpdate();
                  }

                  if (window.location.pathname === '/post') {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      window.location.href = '/';
                    }
                  }
                } catch (error) {
                  console.error('Error deleting post:', error);
                  toast({
                    title: "Error",
                    description: "Failed to delete post. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}