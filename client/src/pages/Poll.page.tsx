// components/PollPageMain.tsx
import { InfiniteScrollSkeleton } from "@/components/InfiniteScrollLoader";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PollCommentReply from "@/components/PollCommentReply";
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
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Bookmark,
  Clock,
  Eye,
  MessageSquare,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

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

  console.log("pollabc pollid", pollId);

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
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "";

      if (
        errorMessage.includes("ALREADY_VOTED") ||
        errorMessage.toLowerCase().includes("already voted")
      ) {
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

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to view polls.</div>;
  }

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

  return (
    <div className="max-w-[1400px] mx-auto px-[4%]">
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
                    }}
                  >
                    {getAuthorDisplay()}
                  </span>

                  <span className="text-[#525252] text-[10px] tracking-[0.2px]">
                    {formatTimeAgo(poll.createdAt || "")}
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
                      poll.author?.id &&
                      (user.id === poll.author.id ||
                        user?.id === poll?.author.id.toString()) && (
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
                {/* Poll Title */}
                <div className="text-sm font-normal font-spacemono text-[#E8EAE9] leading-normal">
                  {poll.title}
                </div>

                {/* Poll Description */}
                {poll.description && (
                  <div className="text-[#8E8E93] text-base leading-relaxed">
                    <div className="prose prose-xs max-w-none">
                      <MarkdownRenderer
                        content={poll.description}
                        className="text-[#8E8E93]"
                      />
                    </div>
                  </div>
                )}

                {/* Poll Options - Matching Image Design */}
                <div
                  className={`grid gap-3 ${
                    poll.options.length <= 2 ? "grid-cols-1" : "grid-cols-2"
                  } w-full`}
                >
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
                          className={`border-[0.2px] border-[#525252]/30 py-3 px-6 transition-all duration-200 ${
                            poll?.hasVoted
                              ? "cursor-default"
                              : "cursor-pointer hover:border-gray-500"
                          } ${
                            isSelected || isVotedOption
                              ? "bg-[#E8EAE9] text-[#525252]"
                              : "bg-transparent text-white"
                          }`}
                          onClick={() => handleVote(option.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs ">
                              {option.text} [ {percentage}% ]
                            </span>
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
                  <div className="pt-6 border-t border-[#525252]/30">
                    <Button
                      onClick={submitVote}
                      disabled={voteMutation.isPending}
                      className="w-full rounded-none border border-[#525252]/30 hover:bg-[#E8EAE9] hover:text-[#525252] text-white py-2 font-normal text-xs transition-all duration-300"
                    >
                      {voteMutation.isPending
                        ? "Voting..."
                        : `Vote [ ${selectedOptions.length} selected ]`}
                    </Button>
                  </div>
                )}

                {/* Poll Stats */}
                <div className="flex items-center justify-between text-[#525252] text-[10px] uppercase">
                  <div>{formatPostTime(poll?.createdAt)}</div>
                  <div>{poll.viewCount} Views</div>
                  <div>{formatPostDate(poll?.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-x-[0.2px] border-b flex flex-col md:flex-row items-stretch border-[#525252]/30">
              {/* Left Side - Upvote/Downvote with border */}
              <div>
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
              <div className="flex-1 hidden md:block"></div>

              {/* Right Side - Comments & Bookmark */}
              <div
                className="flex items-stretch "
                onClick={(e) => e.stopPropagation()}
              >
                {/* Bookmark Button */}
                <button
                  aria-label="Bookmark"
                  className="flex items-center justify-center px-4 py-3 transition-colors hover:bg-gray-800/50 text-white"
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
                  title={poll.title}
                  description={poll.description}
                />
              </div>
            </div>
          </article>

          {/* Comments Section - Matching Post Content Design */}
          <div className="overflow-hidden ">
            {/* Abstract Row */}
            <div className="border-x-[0.2px] border-[#525252]/30 flex items-center justify-between px-9 py-6 ">
              <div className="text-[#525252] text-xs">
                Express your view about the poll
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

            {/* Comment Form */}
            <div className="border-[0.2px] border-[#525252]/30 bg-[#0c0c0c]">
              <div className="w-full">
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
                  <div className="flex items-center pl-9 py-6 flex-1 pr-4 gap-4">
                    {/* Yellow square */}
                    <div className="w-[30px] h-[30px] bg-[#FFB82A] flex-shrink-0"></div>

                    {/* Text input */}
                    <input
                      type="text"
                      name="content"
                      placeholder="post your reply"
                      className="w-full bg-transparent text-[#525252] text-sm font-spacemono focus:outline-none"
                    />
                  </div>

                  {/* Right: POST button */}
                  <Button
                    type="submit"
                    className="py-10 px-6 flex items-center justify-center text-[#17181C] font-normal bg-gradient-to-r from-[#A0D9FF] to-[#E8EAE9] hover:opacity-90 transition rounded-none"
                  >
                    <img src="/icons/post-button-icon.svg" />
                    POST
                  </Button>
                </form>
              </div>
            </div>

            {/* Comments Count */}
            <div className="h-[40px] text-center flex justify-center items-center">
              <div className="text-[#525252] text-[10px] font-medium">
                [ {comments?.length || 0} COMMENTS ]
              </div>
            </div>

            {/* Comments List */}
            <div>
              {commentsLoading ? (
                <InfiniteScrollSkeleton count={3} />
              ) : comments && comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="transition-colors mb-4 border border-[#525252]/30"
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
