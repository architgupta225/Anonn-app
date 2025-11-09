// components/PollsMain.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Bowl, Organization, PollWithDetails } from "@shared/schema";
import SearchBar from "@/components/SearchBar";
import FeedControls from "@/components/FeedControls";
import PollCard from "@/components/PollCard";

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
  author: { email: string; username?: string };
  bowl?: { name: string };
  organization?: { name: string };
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
  commentCount?: number;
}

interface PollsMainProps {
  onCreatePost?: () => void;
  bowls?: Bowl[];
  organizations?: Organization[];
}

export default function PollsPage({
  onCreatePost,
  bowls,
  organizations,
}: PollsMainProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<{
    [pollId: number]: number[];
  }>({});
  const [timeFilter, setTimeFilter] = useState<
    "all" | "hour" | "day" | "week" | "month" | "year"
  >("all");
  const [sortBy, setSortBy] = useState<"hot" | "new">("hot");
  const [animatingVote, setAnimatingVote] = useState<{
    pollId: number;
    type: "up" | "down";
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Fetch polls from API
  const {
    data: polls = [],
    isLoading: pollsLoading,
    refetch,
  } = useQuery<PollWithDetails[]>({
    queryKey: ["polls", sortBy, timeFilter],
    queryFn: async () => {
      // --- 4. UPDATE QUERY FUNCTION ---
      const params = new URLSearchParams();
      params.set("sortBy", sortBy);
      if (timeFilter !== "all") {
        params.set("time", timeFilter);
      }

      const response = await fetch(`/api/polls?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Vote mutation for polls
  const voteMutation = useMutation({
    mutationFn: async ({
      pollId,
      voteType,
    }: {
      pollId: number;
      voteType: "up" | "down";
    }) => {
      const token = await (window as any).__getDynamicToken?.();
      const response = await fetch(`/api/polls/${pollId}/votes`, {
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

    onSuccess: () => {
      refetch();
    },

    onSettled: () => {
      setTimeout(() => setAnimatingVote(null), 300);
    },
  });

  const handlePollVote = (pollId: number, voteType: "up" | "down") => {
    if (voteMutation.isPending) return;

    setAnimatingVote({ pollId, type: voteType });
    voteMutation.mutate({ pollId, voteType });
  };

  const handleVote = (
    pollId: number,
    optionId: number,
    allowMultiple: boolean
  ) => {
    setSelectedOptions((prev) => {
      const current = prev[pollId] || [];

      if (allowMultiple) {
        const newSelection = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [pollId]: newSelection };
      } else {
        return { ...prev, [pollId]: [optionId] };
      }
    });
  };

  const submitVote = async (pollId: number) => {
    const selectedOptionIds = selectedOptions[pollId];
    if (!selectedOptionIds || selectedOptionIds.length === 0) return;

    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}`,
        },
        body: JSON.stringify({ optionIds: selectedOptionIds }),
      });

      if (response.ok) {
        setSelectedOptions((prev) => {
          const newState = { ...prev };
          delete newState[pollId];
          return newState;
        });
        refetch();
      }
    } catch (error) {
      console.error("Error voting on poll:", error);
    }
  };

  const handleCreatePoll = () => {
    window.location.href = "/create-post?type=poll";
  };
  

  // ADD useMemo for FRONTEND SEARCH FILTERING ---
  const filteredPolls = useMemo(() => {
    // Start with the (already sorted) data from the API
    if (!searchQuery) {
      return polls;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    return polls.filter(poll => {
      const titleMatch = poll.title.toLowerCase().includes(lowerCaseQuery);
      const descMatch = poll.description?.toLowerCase().includes(lowerCaseQuery) || false;
      const authorMatch = poll.author?.username?.toLowerCase().includes(lowerCaseQuery) || false;

      return titleMatch || descMatch || authorMatch;
    });
  }, [polls, searchQuery]); // Re-filters when API data or search query changes
  console.log("filter", filteredPolls)
  return (
    <div className="flex gap-6 max-w-[1600px] mx-auto px-4 py-6">
      {/* Center Feed */}
      <div className="flex-1 min-w-0">
        <SearchBar
          placeholder="Blow the whistle ....."
          onSearch={(query) => setSearchQuery(query)}
        />

        {/* Feed Controls */}
        <FeedControls
          sortBy={sortBy}
          timeFilter={timeFilter}
          onSortChange={setSortBy}
          onTimeFilterChange={setTimeFilter}
        />

        {/* Polls List */}
        <div className="space-y-4">
          {pollsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-black border border-gray-800 rounded-lg overflow-hidden"
                >
                  <div className="bg-[#3a3a3a] p-4">
                    <Skeleton className="h-6 w-1/4 bg-gray-700" />
                  </div>
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-4 bg-gray-700" />
                    <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-2/3 bg-gray-700" />
                  </div>
                  <div className="border-t border-gray-700 p-4">
                    <Skeleton className="h-8 w-32 bg-gray-700" />
                  </div>
                </div>
              ))}
            </>
          ) : filteredPolls.length === 0 ? (
            <div className="bg-black border border-gray-800 rounded-lg overflow-hidden">
              <div className="text-center py-16 px-4">
                <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                {searchQuery ?(
                  <>
                    <h3 className="text-2xl font-bold text-gray-300 mb-3">
                      No results found
                    </h3>
                    <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
                      Try adjusting your search terms.
                    </p>
                  </>
                ) : (
                  <>
                  <h3 className="text-2xl font-bold text-gray-300 mb-3">
                    No polls yet
                  </h3>
            
                <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
                  Be the first to create a poll and see what the community
                  thinks!
                </p>
                <Button
                  onClick={handleCreatePoll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Poll
                </Button>
                </>)}
              </div>
            </div>
          ) : (
            filteredPolls.map((poll: PollWithDetails) => {
              const userSelection = selectedOptions[poll.id] || [];

              return (
                <PollCard
                  key={poll.id}
                  poll={poll}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}