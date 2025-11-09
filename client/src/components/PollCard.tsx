import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare, Triangle, Bookmark, Loader2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { PollWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PollCardProps {
  poll: PollWithDetails;
  onUpdate?: () => void; // Optional callback to refresh data after voting
}

export default function PollCard({ poll: initialPoll, onUpdate }: PollCardProps) {
  const { toast } = useToast();
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [animatingVote, setAnimatingVote] = useState<"up" | "down" | null>(null);

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

      if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
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

  const handlePollVote = (voteType: "up" | "down") => {
    if (voteMutation.isPending) return;

    setAnimatingVote(voteType);
    voteMutation.mutate({ voteType });
  };

  const handleVoteOption = (optionId: number, allowMultiple: boolean) => {
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
    if (selectedOptions.length === 0 || pollVoteMutation.isPending) return;
    pollVoteMutation.mutate({ optionIds: selectedOptions });
  };

  const showVoteButton = !poll.hasVoted && selectedOptions.length > 0;

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  return (
    <article className="bg-[1a1a1a] border border-gray-600 overflow-hidden">
      {/* Header Section */}
      <div className="px-4 py-3 bg-[#505050] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-base font-normal underline cursor-pointer hover:text-gray-200 transition-colors">
            {poll.author.username || "user1234"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-300 text-sm">
            {formatTimeAgo(poll.createdAt)}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div
        className="px-6 py-6 cursor-pointer bg-[#1a1a1a]"
        onClick={() => (window.location.href = `/poll?id=${poll.id}`)}
      >
        {/* Poll Title */}
        <h3 className="text-xl font-normal text-white mb-4 leading-normal">
          {poll.title}
        </h3>

        {/* Poll Description */}
        {poll.description && (
          <div className="text-gray-400 mb-4 text-sm">
            {truncateContent(poll.description, 100)}
          </div>
        )}

        {/* Poll Options - Bar Style */}
        <div className="space-y-3 mb-4">
          {poll.options && poll.options.map((option) => {
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
                  className={`relative bg-transparent rounded h-12 flex items-center px-4 overflow-hidden border ${
                    isSelected ? "border-blue-500" : "border-gray-600"
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
                    <span className="text-white text-base">
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
      <div className="flex items-stretch bg-black border-t border-gray-600">
        {/* Left Side - Upvote/Downvote */}
        <div
          className="flex items-stretch"
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
            className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 border-r border-gray-600 transition-colors ${
              poll.userVote?.voteType === "up"
                ? "text-blue-500 bg-blue-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {voteMutation.isPending && animatingVote === "up" ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Triangle
                fill="white"
                className="w-4 h-4 md:w-5 md:h-5"
                strokeWidth={2.5}
              />
            )}
            <span className="text-base md:text-lg font-normal">
              {poll.upvotes}
            </span>
          </button>

          {/* Downvote Button */}
          <button
            aria-label="Downvote"
            onClick={(e) => {
              e.stopPropagation();
              handlePollVote("down");
            }}
            disabled={voteMutation.isPending}
            className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 border-r border-gray-600 transition-colors ${
              poll.userVote?.voteType === "down"
                ? "text-orange-500 bg-orange-500/5"
                : "text-white hover:bg-gray-800/50"
            } ${voteMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {voteMutation.isPending && animatingVote === "down" ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <Triangle
                fill="white"
                className="rotate-180 h-4 w-4 md:h-5 md:w-5"
              />
            )}
            <span className="text-base md:text-lg font-normal hidden sm:inline">
              {poll.downvotes}
            </span>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right Side - Comments & Bookmark */}
        <div
          className="flex items-stretch"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Comments Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/poll?id=${poll.id}`;
            }}
            className="flex items-center gap-3 px-8 py-4 text-white hover:bg-gray-800/50 transition-colors"
          >
            <MessageSquare className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Bookmark Button */}
          <button
            aria-label="Bookmark"
            className="flex items-center justify-center px-8 py-4 text-white hover:bg-gray-800/50 transition-colors"
          >
            <Bookmark className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </article>
  );
}