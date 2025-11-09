// components/PollPageMain.tsx
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  Clock, 
  Users, 
  Building, 
  ArrowLeft,
  MessageSquare,
  Trash,
  MoreHorizontal
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PollCommentReply from "@/components/PollCommentReply";
import VoteButtons from "@/components/VoteButtons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
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

interface PollOption {
  id: number;
  text: string;
  voteCount: number;
  isVotedBy?: boolean;
}

interface Poll {
  id: number;
  title: string;
  description?: string;
  author: { 
    id: string; 
    email: string; 
    username?: string;
    isCompanyVerified?: boolean;
    companyName?: string;
  };
  bowl?: { id: number; name: string };
  organization?: { id: number; name: string };
  options: PollOption[];
  totalVotes: number;
  allowMultipleChoices: boolean;
  createdAt: string;
  hasVoted?: boolean;
  selectedOptions?: number[];
  upvotes: number;
  downvotes: number;
  userVote?: { id: number; createdAt: Date | null; userId: string; targetId: number; targetType: string; voteType: string };
}

interface PollPageMainProps {
  onCreatePost?: () => void;
}

export default function PollPageMain({ onCreatePost }: PollPageMainProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get poll ID from URL
  const pollId = new URLSearchParams(window.location.search).get('id');
  console.log('Current URL:', window.location.href);
  console.log('Extracted poll ID:', pollId);
  
  const queryClient = useQueryClient();

  // Fetch poll data
  const { data: poll, isLoading: pollLoading, error: pollError, refetch } = useQuery<Poll>({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      if (!pollId) throw new Error("No poll ID provided");
      console.log('Fetching poll with ID:', pollId);
      
      // First try to fetch as a poll ID
      let response = await fetch(`/api/polls/${pollId}`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Poll data received (direct poll fetch):', data);
        return data;
      }
      
      // If that fails, try to fetch as a post ID to see if it's a poll post
      console.log('Poll not found, trying as post ID:', pollId);
      response = await fetch(`/api/posts/${pollId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        console.error('Post fetch error:', response.status, response.statusText);
        throw new Error(`Poll not found: ${response.status}: ${response.statusText}`);
      }
      
      const postData = await response.json();
      console.log('Post data received:', postData);
      
      // If the post is a poll type, find the poll by postId
      if (postData.type === 'poll') {
        console.log('Post is a poll type, searching for matching poll with postId:', pollId);
        
        // Get all polls and find the one with matching postId
        const pollsResponse = await fetch('/api/polls', {
          credentials: "include",
        });
        
        if (pollsResponse.ok) {
          const allPolls = await pollsResponse.json();
          console.log('All polls:', allPolls.map((p: any) => ({ id: p.id, postId: p.postId, title: p.title })));
          
          const matchingPoll = allPolls.find((p: any) => p.postId === parseInt(pollId));
          
          if (matchingPoll) {
            console.log('Found matching poll by postId:', matchingPoll);
            // Update the URL to show the actual poll ID instead of post ID
            const newUrl = `/poll?id=${matchingPoll.id}`;
            if (window.location.pathname + window.location.search !== newUrl) {
              console.log('Updating URL from', window.location.pathname + window.location.search, 'to', newUrl);
              window.history.replaceState({}, '', newUrl);
            }
            return matchingPoll;
          } else {
            console.error('No poll found with postId:', pollId);
            console.log('Available polls with postIds:', allPolls.map((p: any) => ({ id: p.id, postId: p.postId })));
          }
        }
        
        // If no matching poll found, throw an error that will be handled by the UI
        throw new Error("POLL_POST_NOT_FOUND");
      }
      
      throw new Error("This is not a poll");
    },
    enabled: !!pollId && isAuthenticated,
  });

  // Fetch comments for the poll
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useQuery({
    queryKey: ["poll-comments", poll?.id || pollId],
    queryFn: async () => {
      const actualPollId = poll?.id || pollId;
      if (!actualPollId) throw new Error("No poll ID provided");
      
      console.log('Fetching comments for poll ID:', actualPollId);
      const response = await fetch(`/api/polls/${actualPollId}/comments`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(poll?.id || pollId) && isAuthenticated,
  });

  const deletePoll = async () => {
    if (!poll) return;
    if (poll.author.id !== user?.id) return;
    try {
      const res = await fetch(`/api/polls/${poll.id}`, { 
        method: 'DELETE', 
        credentials: 'include', 
        headers: { Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}` } 
      });
      
      if (!res.ok) {
        toast({
          title: "Error",
          description: "Failed to delete poll. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Comprehensive cache invalidation
      console.log('[PollPage] Invalidating queries after poll deletion...');
      
      // Invalidate all post-related queries
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          
          return (
            key[0] === "polls" ||
            key[0] === "/api/polls" ||
            // Post queries (since polls are also posts)
            key[0] === "posts" ||
            key[0] === "/api/posts" ||
            // Organization posts
            (key[0] === "/api/posts" && key[1] === "organization") ||
            // Bowl posts
            (key[0] === "/api/posts" && key[1] === "bowl") ||
            // User posts
            (key[0] === "/api/posts" && key[1] === "user") ||
            // Specific poll detail
            (key[0] === "poll" && key[1] === poll.id.toString())
          );
        }
      });

      // Also remove queries to force fresh data
      await queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          
          return (
            key[0] === "polls" ||
            key[0] === "/api/polls" ||
            key[0] === "posts" ||
            key[0] === "/api/posts"
          );
        }
      });

      console.log('[PollPage] Queries invalidated successfully');

      // Show success message
      toast({
        title: "Poll deleted",
        description: "Your poll has been permanently deleted.",
      });

      if (window.history.length > 1) {
        window.history.back();
      } else {
        setLocation('/polls');
      }
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast({
        title: "Error",
        description: "Failed to delete poll. Please try again.",
        variant: "destructive",
      });
      setLocation('/polls');
    }
  };

  const voteMutation = useMutation({
    mutationFn: async (optionIds: number[]) => {
      const actualPollId = poll?.id || pollId;
      if (!actualPollId) throw new Error('No poll ID available');
      
      const response = await fetch(`/api/polls/${actualPollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}`,
        },
        credentials: "include",
        body: JSON.stringify({ optionIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });

  const handleVote = (optionId: number) => {
    // Don't allow voting if user has already voted
    if (poll?.hasVoted) return;
    
    if (!poll?.allowMultipleChoices) {
      // Single choice - replace previous selection
      setSelectedOptions([optionId]);
    } else {
      // Multiple choice - toggle selection
      setSelectedOptions(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const submitVote = async () => {
    if (selectedOptions.length === 0) return;
    
    try {
      await voteMutation.mutateAsync(selectedOptions);
      setSelectedOptions([]);
    } catch (error: any) {
      console.error('Failed to vote:', error);
      // Handle the case where user has already voted
      if (error?.response?.data?.error === 'ALREADY_VOTED') {
        // Refetch the poll to update the hasVoted status
        refetch();
      }
    }
  };

  const getAuthorDisplay = () => {
    if (!poll) return 'User';
    const author = poll.author;
    const username = author.username || 'User';
    
    // Show company affiliation if user is company verified
    if (author.isCompanyVerified && author.companyName) {
      return `${username} from ${author.companyName}`;
    }
    
    return username;
  };

  const getVotePercentage = (voteCount: number) => {
    if (!poll || poll.totalVotes === 0) return 0;
    return Math.round((voteCount / poll.totalVotes) * 100);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/auth";
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to view polls.</div>;
  }

  return (
    <div className="w-full px-2 sm:px-4 lg:px-8 pt-6 pb-6">
      <div className="w-full">
        <div className="mb-6">
          <Button 
            onClick={() => setLocation("/polls")}
            variant="ghost"
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Polls</span>
          </Button>
        </div>

        {pollLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : pollError ? (
          <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-xl">
            <CardContent className="p-8">
              <div className="text-center py-8">
                {pollError.message === "POLL_POST_NOT_FOUND" ? (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Poll Not Found
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      This poll post exists but the poll details couldn't be found. 
                      You can view all polls to find this one.
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/polls'}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      View All Polls
                    </Button>
                  </div>
                ) : (
                  <div className="text-red-500 mb-4">
                    <h3 className="text-lg font-semibold">Error loading poll</h3>
                    <p className="text-sm">{pollError.message}</p>
                    <Button 
                      onClick={() => refetch()}
                      className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                    >
                      Try Again
                    </Button>
                </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : poll ? (
          <div>
            <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-xl">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="flex items-start space-x-4 mb-4">
                    {/* Vote Buttons */}
                    <div className="transform hover:scale-105 transition-transform duration-300">
                      <VoteButtons 
                        targetId={poll.id}
                        targetType="poll"
                        upvotes={poll.upvotes}
                        downvotes={poll.downvotes}
                        userVote={poll.userVote}
                        onUpdate={refetch}
                      />
                    </div>
                    
                    <div className="flex-1">
                      {/* Poll metadata moved above title */}
                      <div className="flex items-center space-x-2 mb-4 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          Poll • Posted by
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-reddit-orange hover:text-reddit-orange/80">
                            {getAuthorDisplay()}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(poll.createdAt)}
                        </span>
                        {poll.organization && (
                          <>
                            <span className="text-sm text-muted-foreground">in</span>
                            <button
                              onClick={() => window.open(`/organization?id=${poll.organization!.id}`, '_blank')}
                              className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-full hover:bg-muted/80 cursor-pointer"
                            >
                              <Building className="h-3 w-3 text-professional-blue" />
                              <span className="text-sm font-medium text-professional-blue hover:underline">
                                {poll.organization.name}
                              </span>
                            </button>
                          </>
                        )}
                        {poll.bowl && (
                          <>
                            <span className="text-sm text-muted-foreground">in</span>
                            <button
                              onClick={() => window.open(`/bowl?id=${poll.bowl!.id}`, '_blank')}
                              className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-full hover:bg-muted/80 cursor-pointer"
                            >
                              <Users className="h-3 w-3 text-reddit-orange" />
                              <span className="text-sm font-medium text-reddit-orange hover:underline">
                                {poll.bowl.name}
                              </span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {poll.title}
                        </h1>
                        {user?.id && poll.author.id && (user.id === poll.author.id || user.id === poll.author.id.toString()) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                                <Trash className="w-4 h-4 mr-2" /> Delete poll
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      {poll.description && (
                        <div className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                          <MarkdownRenderer 
                            content={poll.description}
                            className="text-gray-600 dark:text-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {poll.options && poll.options.length > 0 ? poll.options.map((option, index) => {
                    const percentage = getVotePercentage(option.voteCount);
                    const isSelected = selectedOptions.includes(option.id);
                    const isVotedOption = poll.hasVoted && poll.selectedOptions?.includes(option.id);
                    
                    return (
                      <div
                        key={option.id}
                        className={`group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 transition-all duration-200 ${
                          poll?.hasVoted 
                            ? 'cursor-default' 
                            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
                        } ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : isVotedOption
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : ''
                        }`}
                        onClick={() => handleVote(option.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            poll?.hasVoted
                              ? isVotedOption
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 dark:border-slate-500'
                              : isSelected
                              ? 'border-blue-500 bg-blue-500'
                                  : isVotedOption
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300 dark:border-slate-500 group-hover:border-blue-400'
                          }`}>
                            {(isSelected || isVotedOption) && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                          
                          <span className="text-base text-gray-900 dark:text-white flex-1">
                            {option.text}
                          </span>
                          
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {option.voteCount} ({percentage}%)
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isSelected
                                  ? 'bg-blue-500'
                                  : isVotedOption
                                  ? 'bg-green-500'
                                  : 'bg-gray-400 dark:bg-gray-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        
                        {(isSelected || isVotedOption) && (
                          <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium mt-2 ${
                            isSelected
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {isSelected ? 'Selected' : 'Voted'}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500 dark:text-gray-400 mb-2">
                        No poll options available
                      </div>
                      <div className="text-sm text-gray-400 dark:text-gray-500">
                        This poll doesn't have any options to vote on.
                      </div>
                    </div>
                  )}
                </div>

                {!poll?.hasVoted && selectedOptions.length > 0 && (
                  <div className="pt-6 border-t border-gray-200 dark:border-slate-700 mt-8">
                    <Button 
                      onClick={submitVote}
                      disabled={voteMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {voteMutation.isPending ? 'Voting...' : `Vote (${selectedOptions.length} selected)`}
                    </Button>
                  </div>
                )}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this poll?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your poll and remove its data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deletePoll} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm mt-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Comments
                  </h3>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {comments?.length || 0} comments
                    </span>
                  </div>
                </div>

                <div className="mt-4 animate-fade-in">
                  {/* Comment Form - Clean Design */}
                  <div className="mb-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-all duration-300">
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
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const content = formData.get('content') as string;
                        if (content.trim()) {
                          try {
                            // Use the same apiRequest function as post comments for consistency
                            await apiRequest("POST", `/api/polls/${poll.id}/comments`, { content });

                            console.log('Comment posted successfully');
                            refetchComments();
                            e.currentTarget.reset();
                          } catch (error) {
                            console.error('Error posting comment:', error);
                            toast({
                              title: "Error",
                              description: "Failed to post comment. Please try again.",
                              variant: "destructive"
                            });
                          }
                        }
                      }} className="space-y-3">
                        <textarea
                          name="content"
                          placeholder="Share your thoughts with the community..."
                          rows={3}
                          className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg resize-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <div className="flex justify-end">
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Post Comment
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {commentsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="flex space-x-3">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-1"></div>
                              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments && comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment: any, index: number) => (
                        <div 
                          key={comment.id} 
                          className="animate-fade-in-up bg-muted rounded-lg p-4"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <PollCommentReply
                            comment={comment}
                            pollId={poll.id}
                            onSuccess={refetchComments}
                            depth={0}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500 dark:text-gray-400 mb-2">
                        No comments yet
                      </div>
                      <div className="text-sm text-gray-400 dark:text-gray-500">
                        Be the first to share your thoughts on this poll!
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Poll not found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 max-w-md mx-auto">
              The poll you're looking for doesn't exist or has been removed.
            </p>
            <Button 
              onClick={() => setLocation("/polls")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl"
            >
              Back to Polls
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}