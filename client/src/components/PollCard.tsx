import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare, Triangle, Bookmark, Loader2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { PollWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SvgIcon } from "./SvgIcon";

interface PollCardProps {
  poll: PollWithDetails;
  onUpdate?: () => void; // Optional callback to refresh data after voting
}

export default function PollCard({
  poll: initialPoll,
  onUpdate,
}: PollCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [animatingVote, setAnimatingVote] = useState<"up" | "down" | null>(
    null
  );

  // Vote mutation for upvote/downvote
  const voteMutation = useMutation({
    mutationFn: async ({ voteType }: { voteType: "up" | "down" }) => {
      const token = await (window as any).__getDynamicToken?.();
      const response = await fetch(`/api/polls/${poll.id}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to vote");
      }

      return await response.json();
    },

    onError: (err: any) => {
      setAnimatingVote(null);

      if (
        err.message?.includes("401") ||
        err.message?.includes("Unauthorized")
      ) {
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
      console.error("Vote error:", err);
    },

    onSuccess: (data) => {
      // Update local state with new vote counts
      setPoll((prev) => ({
        ...prev,
        upvotes: data.upvotes,
        downvotes: data.downvotes,
        userVote: data.userVote,
      }));

      // Call parent refresh if provided
      if (onUpdate) {
        onUpdate();
      }
    },

    onSettled: () => {
      setTimeout(() => setAnimatingVote(null), 300);
    },
  });

  // Poll option vote mutation
  const pollVoteMutation = useMutation({
    mutationFn: async ({ optionIds }: { optionIds: number[] }) => {
      const token = await (window as any).__getDynamicToken?.();
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ optionIds }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to submit vote");
      }

      return await response.json();
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
      console.error("Poll vote error:", err);
    },

    onSuccess: (data) => {
      // Update local state with new poll data
      setPoll((prev) => ({
        ...prev,
        hasVoted: true,
        options: data.options || prev.options,
        totalVotes: data.totalVotes || prev.totalVotes,
      }));

      // Clear selected options
      setSelectedOptions([]);

      toast({
        title: "Vote submitted!",
        description: "Your vote has been recorded.",
      });

      // Call parent refresh if provided
      if (onUpdate) {
        onUpdate();
      }
    },
  });

  // Authentication handler - similar to PostCard
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
            const event = new CustomEvent("triggerWalletConnect");
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

  const handlePollVote = (voteType: "up" | "down") => {
    if (!handleAuthRequired("vote on polls")) return;
    if (voteMutation.isPending) return;

    setAnimatingVote(voteType);
    voteMutation.mutate({ voteType });
  };

  const handleVoteOption = (optionId: number, allowMultiple: boolean) => {
    if (!handleAuthRequired("select poll options")) return;
    if (poll.hasVoted) return;

    setSelectedOptions((prev) => {
      if (allowMultiple) {
        return prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId];
      } else {
        return [optionId];
      }
    });
  };

  const handleSubmitVote = () => {
    if (!handleAuthRequired("submit poll votes")) return;
    if (selectedOptions.length === 0 || pollVoteMutation.isPending) return;
    pollVoteMutation.mutate({ optionIds: selectedOptions });
  };

  const handlePollClick = () => {
    if (!handleAuthRequired("view poll details")) return;
    window.location.href = `/poll?id=${poll.id}`;
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!handleAuthRequired("view user profiles")) return;
    window.location.href = `/u/${poll.author.username}`;
  };

  const handleBookmark = () => {
    if (!handleAuthRequired("bookmark polls")) return;
    // Bookmark functionality can be implemented here
  };

  const showVoteButton = !poll.hasVoted && selectedOptions.length > 0;

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  return (
    <article className=" border-[0.5px] border-[#525252]/30 bg-[rgba(234,234,234,0.02)] max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="px-3 md:px-4 text-[#8E8E93] bg-[#525252] flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <span
            className="text-xs py-3 md:py-3 md:text-base font-medium underline hover:text-gray-300 cursor-pointer transition-colors truncate"
            onClick={handleAuthorClick}
          >
            {poll.author.username || "user1234"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className=" text-sm">{formatTimeAgo(poll.createdAt)}</span>
        </div>
      </div>

      {/* Content Section */}
      <div
        className="px-4 md:px-9 py-4 md:py-4 cursor-pointer flex flex-col gap-4"
        onClick={handlePollClick}
      >
        {/* Poll Title */}
        <h3 className="font-spacemono text-sm font-normal text-[#E8EAE9] leading-normal">
          {poll.title}
        </h3>
        {/* Poll Description */}
        {poll.description && (
          <div className="text-[#8E8E93] text-xs leading-relaxed flex flex-col gap-4">
            {truncateContent(poll.description, 100)}
          </div>
        )}
        {/* Poll Options - Bar Style */}
        <div
          className={`grid gap-3 ${
            poll.options.length <= 2 ? "grid-cols-1" : "grid-cols-2"
          } w-full`}
        >
          {poll.options.map((option) => {
            const showResults = poll.hasVoted || poll.totalVotes > 0;
            const percentage =
              poll.totalVotes > 0
                ? Math.round((option.voteCount / poll.totalVotes) * 100)
                : 0;

            const isSelected = selectedOptions.includes(option.id);

            return (
              <div
                key={option.id}
                className="relative cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoteOption(option.id, poll.allowMultipleChoices);
                }}
              >
                {/* Background bar */}
                <div
                  className={`relative h-10 md:h-12 flex items-center px-4 overflow-hidden border ${
                    isSelected ? "border-blue-500" : "border-[#525252]/30"
                  }`}
                >
                  {/* Progress fill */}
                  {showResults && (
                    <div
                      className="absolute inset-0 bg-[#5a5a5a] transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  {/* Option text */}
                  <div className="relative z-10 flex items-center justify-center w-full">
                    <span className="text-[#E8EAE9] text-xs font-normal">
                      {option.text}{" "}
                      {showResults && (
                        <span className="text-gray-400">[{percentage}%]</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote Button */}
        {showVoteButton && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              onClick={handleSubmitVote}
              disabled={pollVoteMutation.isPending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {pollVoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Voting...
                </>
              ) : (
                "Vote"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col md:flex-row items-stretch border-t border-[#525252]/30">
        {/* Left Side - Upvote/Downvote */}
        <div
          className="flex items-center justify-between px-4 md:px-0 md:items-stretch border-b border-[#525252]/30 md:border-b-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Upvote Button */}
          <button
            aria-label="Upvote"
            onClick={(e) => {
              e.stopPropagation();
              handlePollVote("up");
            }}
            disabled={voteMutation.isPending}
            className={`flex flex-1 justify-center md:justify-start text-center md:text-left md:flex-none items-center gap-2 md:px-6 py-3 border-r-[0.5px] border-[#525252]/30 transition-colors ${
              poll.userVote?.voteType === "up"
                ? "text-blue-500 bg-blue-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {voteMutation.isPending && animatingVote === "up" ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <SvgIcon
                src="/icons/up-vote.svg"
                color={
                  poll.userVote?.voteType === "up"
                    ? "text-blue-500"
                    : "text-white"
                }
                alt="upvote"
              />
            )}
            <span className="text-xs font-normal">{poll.upvotes}</span>
          </button>

          {/* Downvote Button */}
          <button
            aria-label="Downvote"
            onClick={(e) => {
              e.stopPropagation();
              handlePollVote("down");
            }}
            disabled={voteMutation.isPending}
            className={`flex flex-1 justify-center md:justify-start md:flex-none items-center gap-2 md:px-6 py-3 border-r-none md:border-r-[0.5px] border-[#525252]/30 transition-colors  ${
              poll.userVote?.voteType === "down"
                ? "text-orange-500 bg-orange-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {voteMutation.isPending && animatingVote === "down" ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <SvgIcon
                src="/icons/down-vote.svg"
                color={
                  poll.userVote?.voteType === "down"
                    ? "text-orange-500"
                    : "text-white"
                }
                alt="downvote"
              />
            )}
            <span className="text-xs font-normal sm:inline">
              {poll.downvotes}
            </span>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1 hidden md:block"></div>

        {/* Right Side - Comments & Bookmark */}
        <div
          className="flex justify-end md:justify-normal items-stretch"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Comments Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!handleAuthRequired("view comments")) return;
              window.location.href = `/poll?id=${poll.id}`;
            }}
            className="flex items-center gap-2 px-4 py-3 text-white hover:bg-gray-800/50 transition-colors"
          >
            <SvgIcon
              src="/icons/Post comment icon.svg"
              color="text-white"
              alt="comment"
            />
          </button>

          {/* Bookmark Button */}
          <button
            aria-label="Bookmark"
            onClick={(e) => {
              e.stopPropagation();
              handleBookmark();
            }}
            className="flex items-center justify-center px-4 py-3 transition-colors text-white hover:bg-gray-800/50"
          >
            <SvgIcon
              src="/icons/Post bookmark icon.svg"
              color={"text-white"}
              alt="bookmark"
            />
          </button>
        </div>
      </div>
    </article>
  );
}
