import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Triangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Vote } from "@shared/schema";
import { useState, useEffect } from "react";
import { 
  calculateOptimisticVoteUpdate, 
  updatePostInAllCaches, 
  invalidateVoteQueries, 
  submitVote, 
  cancelVoteQueries,
  type VoteState 
} from "@/lib/voteUtils";

interface VoteButtonsProps {
  targetId: number;
  targetType: "post" | "comment" | "poll";
  upvotes: number;
  downvotes: number;
  userVote?: Vote;
  onUpdate: () => void;
  size?: "default" | "sm";
  layout?: "vertical" | "horizontal";
  showCount?: boolean;
}

export default function VoteButtons({ 
  targetId, 
  targetType, 
  upvotes, 
  downvotes, 
  userVote, 
  onUpdate,
  size = "default",
  layout = "vertical",
  showCount = true
}: VoteButtonsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [animatingVote, setAnimatingVote] = useState<"up" | "down" | null>(null);
  
  // Track optimistic state
  const [optimisticState, setOptimisticState] = useState<VoteState>({
    upvotes,
    downvotes,
    userVote,
  });

  // Sync optimistic state when props change
  useEffect(() => {
    setOptimisticState({
      upvotes,
      downvotes,
      userVote,
    });
  }, [upvotes, downvotes, userVote, targetId]);

  const voteMutation = useMutation({
    mutationFn: async (voteType: "up" | "down") => {
      return await submitVote({ targetId, targetType, voteType });
    },
    
    onMutate: async (voteType: "up" | "down") => {
      await cancelVoteQueries(queryClient, targetId, targetType);

      const previousState = { ...optimisticState };
      const newState = calculateOptimisticVoteUpdate(optimisticState, voteType, targetId, targetType);
      
      setOptimisticState(newState);
      
      updatePostInAllCaches(queryClient, targetId, targetType, (item: any) => ({
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
        
        updatePostInAllCaches(queryClient, targetId, targetType, (item: any) => ({
          ...item,
          upvotes: context.previousState.upvotes,
          downvotes: context.previousState.downvotes,
          userVote: context.previousState.userVote,
        }));
      }

      setAnimatingVote(null);

      if (isUnauthorizedError(err)) {
        toast({
          title: "Authentication Required",
          description: "Please connect your wallet to vote.",
          variant: "destructive",
        });
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
        
        updatePostInAllCaches(queryClient, targetId, targetType, (item: any) => ({
          ...item,
          upvotes: serverState.upvotes,
          downvotes: serverState.downvotes,
          userVote: serverState.userVote,
        }));
      }
    },
    
    onSettled: () => {
      invalidateVoteQueries(queryClient, targetId, targetType);
      setTimeout(() => setAnimatingVote(null), 300);
      onUpdate();
    },
  });

  const handleVote = (voteType: "up" | "down") => {
    if (voteMutation.isPending) return;
    
    setAnimatingVote(voteType);
    voteMutation.mutate(voteType);
  };

  // Use optimistic state for display
  const displayUpvotes = optimisticState.upvotes;
  const displayDownvotes = optimisticState.downvotes;
  const displayUserVote = optimisticState.userVote;

  const getVoteScore = () => {
    return displayUpvotes - displayDownvotes;
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const textSize = size === "sm" ? "text-sm" : "text-base";
  const buttonHeight = size === "sm" ? "h-8" : "h-10";
  const buttonWidth = size === "sm" ? "w-16" : "w-20";

  // Simple button styles matching the image design
  const baseButtonClasses = `
    ${buttonHeight} ${buttonWidth} flex items-center justify-center gap-2 
    border-r border-gray-600 transition-colors
     text-gray-400 hover:text-white
    ${voteMutation.isPending ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}
  `;

  const activeUpvoteClasses = displayUserVote?.voteType === "up" 
    ? "text-blue-500 bg-blue-500/10" 
    : "text-white";

  const activeDownvoteClasses = displayUserVote?.voteType === "down" 
    ? "text-orange-500 bg-orange-500/10" 
    : "text-white";

  if (layout === "horizontal") {
    return (
      <div className="flex items-center divide-x divide-gray-700">
        {/* Upvote Button */}
        <button
          disabled={voteMutation.isPending}
          onClick={() => handleVote("up")}
          className={`${baseButtonClasses} ${activeUpvoteClasses}`}
          title="Upvote"
        >
          {voteMutation.isPending && animatingVote === "up" ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : (
            <Triangle 
              fill={displayUserVote?.voteType === "up" ? "currentColor" : "currentColor"} 
              className={iconSize} 
              strokeWidth={2.5} 
            />
          )}
          {showCount && (
            <span className={`${textSize} font-normal`}>{displayUpvotes}</span>
          )}
        </button>

        {/* Downvote Button */}
        <button
          disabled={voteMutation.isPending}
          onClick={() => handleVote("down")}
          className={`${baseButtonClasses} ${activeDownvoteClasses}`}
          title="Downvote"
        >
          {voteMutation.isPending && animatingVote === "down" ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : (
            <Triangle 
              fill={displayUserVote?.voteType === "down" ? "currentColor" : "white"} 
              className={`${iconSize} rotate-180`} 
              strokeWidth={2.5}
            />
          )}
          {showCount && (
            <span className={`${textSize} font-normal`}>{displayDownvotes}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Upvote Button */}
      <button
        disabled={voteMutation.isPending}
        onClick={() => handleVote("up")}
        className={`${baseButtonClasses} ${activeUpvoteClasses} border-r-0`}
        title="Upvote"
      >
        {voteMutation.isPending && animatingVote === "up" ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Triangle 
            fill={displayUserVote?.voteType === "up" ? "currentColor" : "white"} 
            className={iconSize} 
            strokeWidth={2.5} 
          />
        )}
      </button>

      {/* Score */}
      {showCount && (
        <div className="flex flex-col items-center">
          <span className={`${textSize} font-bold text-white`}>
            {getVoteScore()}
          </span>
        </div>
      )}

      {/* Downvote Button */}
      <button
        disabled={voteMutation.isPending}
        onClick={() => handleVote("down")}
        className={`${baseButtonClasses} ${activeDownvoteClasses} border-r-0`}
        title="Downvote"
      >
        {voteMutation.isPending && animatingVote === "down" ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Triangle 
            fill={displayUserVote?.voteType === "down" ? "currentColor" : "white"} 
            className={`${iconSize} rotate-180`} 
            strokeWidth={2.5}
          />
        )}
      </button>
    </div>
  );
}