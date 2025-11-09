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
  Eye,
  ArrowLeft,
  MessageSquare,
  Trash,
  MoreHorizontal,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PollCommentReply from "@/components/PollCommentReply";
import VoteButtons from "@/components/VoteButtons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ShareButton from "@/components/ShareButton";
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
  userVote?: {
    id: number;
    createdAt: Date | null;
    userId: string;
    targetId: number;
    targetType: string;
    voteType: string;
  };
  viewCount?: number;
}

interface PollPageMainProps {
  onCreatePost?: () => void;
}

export default function PollPage({ onCreatePost }: PollPageMainProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Get poll ID from URL
  const pollId = new URLSearchParams(window.location.search).get("id");

  const queryClient = useQueryClient();

  // Fetch poll data
  const {
    data: poll,
    isLoading: pollLoading,
    error: pollError,
    refetch,
  } = useQuery<Poll>({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      if (!pollId) throw new Error("No poll ID provided");

      // First try to fetch as a poll ID
      let response = await fetch(`/api/polls/${pollId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      // If that fails, try to fetch as a post ID to see if it's a poll post
      response = await fetch(`/api/posts/${pollId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Poll not found: ${response.status}: ${response.statusText}`
        );
      }

      const postData = await response.json();

      // If the post is a poll type, find the poll by postId
      if (postData.type === "poll") {
        // Get all polls and find the one with matching postId
        const pollsResponse = await fetch("/api/polls", {
          credentials: "include",
        });

        if (pollsResponse.ok) {
          const allPolls = await pollsResponse.json();
          const matchingPoll = allPolls.find(
            (p: any) => p.postId === parseInt(pollId)
          );

          if (matchingPoll) {
            // Update the URL to show the actual poll ID instead of post ID
            const newUrl = `/poll?id=${matchingPoll.id}`;
            if (window.location.pathname + window.location.search !== newUrl) {
              window.history.replaceState({}, "", newUrl);
            }
            return matchingPoll;
          }
        }

        throw new Error("POLL_POST_NOT_FOUND");
      }

      throw new Error("This is not a poll");
    },
    enabled: !!pollId && isAuthenticated,
  });

  console.log("poll", poll);
  // Fetch comments for the poll
  const {
    data: comments,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ["poll-comments", poll?.id || pollId],
    queryFn: async () => {
      const actualPollId = poll?.id || pollId;
      if (!actualPollId) throw new Error("No poll ID provided");

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
          description: "Failed to delete poll. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Comprehensive cache invalidation
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;

          return (
            key[0] === "polls" ||
            key[0] === "/api/polls" ||
            key[0] === "posts" ||
            key[0] === "/api/posts" ||
            (key[0] === "poll" && key[1] === poll.id.toString())
          );
        },
      });

      toast({
        title: "Poll deleted",
        description: "Your poll has been permanently deleted.",
      });

      if (window.history.length > 1) {
        window.history.back();
      } else {
        setLocation("/polls");
      }
    } catch (error) {
      console.error("Error deleting poll:", error);
      toast({
        title: "Error",
        description: "Failed to delete poll. Please try again.",
        variant: "destructive",
      });
      setLocation("/polls");
    }
  };

  const voteMutation = useMutation({
    mutationFn: async (optionIds: number[]) => {
      const actualPollId = poll?.id || pollId;
      if (!actualPollId) throw new Error("No poll ID available");

      const response = await fetch(`/api/polls/${actualPollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await (
            window as any
          ).__getDynamicToken?.()}`,
        },
        credentials: "include",
        body: JSON.stringify({ optionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error("Failed to vote");
        error.response = { data: errorData };
        throw error;
      }

      return response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully.",
      });
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
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
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
      console.error("Failed to vote:", error);
      
      // Check if the error is because user already voted
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "";
      
      if (errorMessage.includes("ALREADY_VOTED") || errorMessage.toLowerCase().includes("already voted")) {
        toast({
          title: "Already voted",
          description: "You have already voted on this poll.",
          variant: "destructive",
        });
        refetch(); // Refresh to show the current vote state
        setSelectedOptions([]); // Clear selections
      } else {
        toast({
          title: "Error",
          description: "Failed to submit vote. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const getAuthorDisplay = () => {
    if (!poll) return "User";
    const author = poll.author;
    const username = author.username || "User";

    if (author.isCompanyVerified && author.companyName) {
      return `${username} from ${author.companyName}`;
    }

    return username;
  };

  const getVotePercentage = (voteCount: number) => {
    if (!poll || poll.totalVotes === 0) return 0;
    return Math.round((voteCount / poll.totalVotes) * 100);
  };

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
    <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-6 w-full max-w-[1200px] mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/polls")}
          className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Polls</span>
        </Button>
      </div>

      {pollLoading ? (
        <Card className="border border-gray-600 shadow-lg rounded-lg">
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
      ) : pollError ? (
        <Card className="border border-gray-600">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Poll not found
            </h3>
            <p className="text-gray-400 mb-6">
              The poll you're looking for doesn't exist or has been removed.
            </p>
            <Button
              onClick={() => setLocation("/polls")}
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              Back to Polls
            </Button>
          </CardContent>
        </Card>
      ) : poll ? (
        <>
          {/* Poll Card - Matching Post Content Design */}
          <article className="bg-[#EAEAEA05] border border-[#525252] overflow-hidden">
            {/* Header Section */}
            <div className="px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span
                  className="text-white text-sm font-normal underline cursor-pointer hover:text-gray-200 transition-colors truncate"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/u/${poll.author.username}`;
                  }}
                >
                  {getAuthorDisplay()}
                </span>

                <span className="text-[#525252] text-sm">
                  {formatTimeAgo(poll.createdAt || "")}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Green Thumbs Up Badge */}
                <div className="p-1 flex items-center justify-center flex-shrink-0">
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

                {/* Poll Actions Menu (Delete) */}
                {user?.id &&
                  poll.author.id &&
                  (user.id === poll.author.id ||
                    user.id === poll.author.id.toString()) && (
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
                  )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="px-6 cursor-default">
              {/* Poll Title */}
              <h1 className="text-2xl font-normal text-white my-6 leading-normal">
                {poll.title}
              </h1>

              {/* Poll Description */}
              {poll.description && (
                <div className="text-[#8E8E93] text-base leading-relaxed mb-4">
                  <div className="prose prose-base max-w-none">
                    <MarkdownRenderer
                      content={poll.description}
                      className="text-gray-300"
                    />
                  </div>
                </div>
              )}

              

              {/* Poll Options - Matching Image Design */}
              <div className="space-y-4 mb-6">
                {poll.options && poll.options.length > 0 ? (
                  poll.options.map((option, index) => {
                    const percentage = getVotePercentage(option.voteCount);
                    const isSelected = selectedOptions.includes(option.id);
                    const isVotedOption =
                      poll.hasVoted &&
                      poll.selectedOptions?.includes(option.id);

                    return (
                      <div
                        key={option.id}
                        className={`bg-[#1a1a1a] border border-gray-600 rounded-lg p-4 transition-all duration-200 ${
                          poll?.hasVoted
                            ? "cursor-default"
                            : "cursor-pointer hover:border-gray-500"
                        } ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/10"
                            : isVotedOption
                            ? "border-green-500 bg-green-500/10"
                            : ""
                        }`}
                        onClick={() => handleVote(option.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                                poll?.hasVoted
                                  ? isVotedOption
                                    ? "border-green-500 bg-green-500"
                                    : "border-gray-400"
                                  : isSelected
                                  ? "border-blue-500 bg-blue-500"
                                  : isVotedOption
                                  ? "border-green-500 bg-green-500"
                                  : "border-gray-400"
                              }`}
                            >
                              {(isSelected || isVotedOption) && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>

                            <span className="text-base text-white">
                              {option.text}
                            </span>
                          </div>

                          <div className="text-sm text-gray-400 flex-shrink-0">
                            {percentage}%
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isSelected
                                  ? "bg-blue-500"
                                  : isVotedOption
                                  ? "bg-green-500"
                                  : "bg-gray-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Vote Count */}
                        <div className="text-xs text-gray-500 mt-2">
                          {option.voteCount} votes
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No poll options available
                  </div>
                )}
              </div>

              {/* Vote Button */}
              {!poll?.hasVoted && selectedOptions.length > 0 && (
                <div className="pt-6 border-t border-gray-600 mt-8">
                  <Button
                    onClick={submitVote}
                    disabled={voteMutation.isPending}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 font-normal text-base transition-all duration-300"
                  >
                    {voteMutation.isPending
                      ? "Voting..."
                      : `Vote (${selectedOptions.length} selected)`}
                  </Button>
                </div>
              )}

              {/* Poll Stats */}
              <div className="flex items-center justify-between my-8 text-gray-400 text-sm mb-4">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{poll.viewCount || 0} VIEWS</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatPostDate(poll.createdAt)}</span>
                </div>
              </div>

              
            </div>

            {/* Footer Actions */}
            <div className="flex items-stretch bg-[#EAEAEA05]  border-t border-gray-600">
              {/* Left Side - Upvote/Downvote with border */}
              <div className="flex items-stretch">
                <VoteButtons
                  targetId={poll.id}
                  targetType="poll"
                  upvotes={poll.upvotes}
                  downvotes={poll.downvotes}
                  userVote={poll.userVote}
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
                  title={poll.title}
                  description={poll.description}
                />
              </div>
            </div>
          </article>

          {/* Comments Section - Matching Post Content Design */}
          <div className="border border-gray-700 overflow-hidden ">
            {/* Abstract Row */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#525252]">
              <div className="flex items-center space-x-8">
                <h3 className="text-gray-300 text-lg">
                  Express your view about the poll
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

            {/* Comment Form */}
            <div className="border-t border-gray-700 bg-[#0c0c0c]">
              <div className="w-full bg-[#EAEAEA05] border-t border-gray-700">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget; // Store reference before async
                    const formData = new FormData(form);
                    const content = formData.get("content") as string;

                    if (!content.trim()) {
                      toast({
                        title: "Empty comment",
                        description: "Please enter a comment before posting.",
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      await apiRequest(
                        "POST",
                        `/api/polls/${poll.id}/comments`,
                        { content }
                      );

                      // Clear the form using stored reference
                      form.reset();

                      // Show success toast
                      toast({
                        title: "Comment posted",
                        description:
                          "Your comment has been successfully added.",
                      });

                      // Refetch comments to show the new one
                      refetchComments();
                    } catch (error) {
                      console.error("Error posting comment:", error);
                      toast({
                        title: "Error",
                        description:
                          "Failed to post comment. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex items-center justify-between"
                >
                  {/* Left: Yellow box + input */}
                  <div className="flex items-center px-6 py-6 space-x-4 flex-1">
                    {/* Yellow square */}
                    <div className="w-12 h-12 bg-yellow-500 flex-shrink-0"></div>

                    {/* Text input */}
                    <input
                      type="text"
                      name="content"
                      placeholder="post your reply"
                      className="w-full bg-transparent text-gray-300 text-xl font-mono placeholder-gray-500 focus:outline-none"
                    />
                  </div>

                  {/* Right: POST button */}
                  <Button
                    type="submit"
                    className="flex items-center justify-center px-8 py-12 text-black font-semibold bg-gradient-to-r from-[#bfe2ff] to-[#e0f0ff] hover:opacity-90 transition border-l border-gray-700 rounded-none"
                  >
                    <ArrowLeft className="h-6 w-6 mr-2 rotate-180" />
                    POST
                  </Button>
                </form>
              </div>
            </div>

            {/* Comments Count */}
            <div className="py-6 border-t border-gray-700 bg-[#0c0c0c] text-center">
              <h3 className="text-gray-400 tracking-wide text-sm font-medium">
                [ {comments?.length || 0} COMMENTS ]
              </h3>
            </div>

            {/* Comments List */}
            <div className="divide-y divide-gray-700 bg-[#EAEAEA05]">
              {commentsLoading ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Loading comments...</p>
                </div>
              ) : comments && comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="transition-colors mb-4 border-y border-gray-700"
                  >
                    <PollCommentReply
                      comment={comment}
                      pollId={poll.id}
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
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this poll?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your poll and remove its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={deletePoll}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}