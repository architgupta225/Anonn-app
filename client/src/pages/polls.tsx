import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { addToHistory } from "@/lib/navigationUtils";
import LeftSidebar from "@/components/LeftSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, MessageSquare, Users, Plus, ChevronDown, Search, Building, Edit3, Triangle, Bookmark, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Bowl, Organization } from "@shared/schema";

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
  userVote?: { id: number; createdAt: Date | null; userId: string; targetId: number; targetType: string; voteType: string };
}

export default function Polls() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<{[pollId: number]: number[]}>({});
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [animatingVote, setAnimatingVote] = useState<{ pollId: number; type: "up" | "down" } | null>(null);

  // Fetch polls from API
  const { data: polls = [], isLoading: pollsLoading, refetch } = useQuery<Poll[]>({
    queryKey: ["polls"],
    queryFn: async () => {
      const response = await fetch("/api/polls", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch bowls
  const { data: bowls } = useQuery<Bowl[]>({
    queryKey: ["/api/bowls"],
    retry: false,
  });

  // Fetch organizations
  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  // Add current page to navigation history
  useEffect(() => {
    addToHistory();
  }, []);

  useEffect(() => {
    document.title = "Polls - Anonn";
  }, []);

  // Vote mutation for polls
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, voteType }: { pollId: number; voteType: "up" | "down" }) => {
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

    onSuccess: () => {
      // Refetch polls to get updated counts
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

  const handleVote = (pollId: number, optionId: number, allowMultiple: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[pollId] || [];

      if (allowMultiple) {
        // Toggle option for multiple choice
        const newSelection = current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId];
        return { ...prev, [pollId]: newSelection };
      } else {
        // Single choice
        return { ...prev, [pollId]: [optionId] };
      }
    });
  };

  const submitVote = async (pollId: number) => {
    const selectedOptionIds = selectedOptions[pollId];
    if (!selectedOptionIds || selectedOptionIds.length === 0) return;

    try {
      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}`,
        },
        body: JSON.stringify({ optionIds: selectedOptionIds }),
      });

      if (response.ok) {
        // Clear selection and refetch polls
        setSelectedOptions(prev => {
          const newState = { ...prev };
          delete newState[pollId];
          return newState;
        });
        refetch();
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreatePost = () => {
    window.location.href = '/create-post';
  };

  const handleCreatePoll = () => {
    window.location.href = '/create-post?type=poll';
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  // Sort polls based on selected criteria
  const sortedPolls = [...polls].sort((a, b) => {
    if (sortBy === 'new') {
      // Sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Sort by hot (total votes + recency factor)
      const aScore = a.totalVotes + (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const bScore = b.totalVotes + (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return bScore - aScore;
    }
  });

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />

      {/* Main Layout */}
      <div className="flex w-full h-screen pt-14">
        {/* Left Sidebar - Fixed position like Blind */}
        <aside
          className={`${
            sidebarOpen ? "w-[300px]" : "w-[60px]"
          } h-[calc(100vh-4rem)] fixed top-14 left-0 bg-black border-r border-gray-800 overflow-y-auto transition-all duration-300 z-10`}
        >
          <LeftSidebar
            onCreatePost={handleCreatePost}
            onCreateReview={handleCreatePost}
          />
        </aside>

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-18 left-4 z-40 p-2 bg-white border border-gray-200 rounded-md shadow-md hover:bg-gray-50"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Main Content Area with Right Sidebar */}
        <main
          className={`flex-1 min-w-0 bg-black overflow-y-auto custom-scrollbar transition-all duration-300 ${
            sidebarOpen ? "ml-[100px]" : "ml-[60px]"
          }`}
        >
          <div className="flex gap-6 max-w-[1600px] mx-auto px-4 py-6">
            {/* Center Feed */}
            <div className="flex-1 min-w-0">
              {/* === MODIFICATION START: Added Search Bar === */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Blow the whistle..."
                    className="h-[60px] bg-black border-l rounded-lg border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-0"
                  />
                  <Button className="h-[60px] bg-gray-600 rounded-lg hover:bg-gray-600 text-white font-semibold px-6 py-2">
                    <Search className="h-4 w-4 " />
                    SEARCH
                  </Button>
                </div>
              </div>
              {/* === MODIFICATION END === */}

              {/* Feed Controls - Figma Style */}
              <div className="mb-6">
                <div className="bg-black rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left Side - NEW and HOT tabs */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSortBy("new")}
                        className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${
                          sortBy === "new"
                            ? "bg-white text-gray-900 hover:bg-gray-700"
                            : "bg-transparent text-gray-500 hover:bg-gray-700"
                        }`}
                      >
                        NEW
                      </button>
                      <button
                        onClick={() => setSortBy("hot")}
                        className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${
                          sortBy === "hot"
                            ? "bg-white text-gray-900 shadow-md"
                            : "bg-transparent text-gray-500 hover:bg-gray-700"
                        }`}
                      >
                        HOT
                      </button>
                    </div>

                    {/* Right Side - Time Filter Dropdown */}
                    <div className="relative">
                      <select
                        className="px-4 py-2 pr-8 rounded-2xl bg-gray-900 text-gray-500 text-lg font-medium focus:border-gray-500 focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="all" className="bg-black hover:bg-gray-500 hover:text-white">
                          THIS WEEK
                        </option>
                        <option value="hour" className="bg-black hover:bg-gray-500 hover:text-white">
                          PAST HOUR
                        </option>
                        <option value="day" className="bg-black hover:bg-gray-500 hover:text-white">
                          PAST DAY
                        </option>
                        <option value="week" className="bg-black hover:bg-gray-500 hover:text-white">
                          PAST WEEK
                        </option>
                        <option value="month" className="bg-black hover:bg-gray-500 hover:text-white">
                          PAST MONTH
                        </option>
                        <option value="year" className="bg-black hover:bg-gray-500 hover:text-white">
                          PAST YEAR
                        </option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Polls List */}
              <div className="space-y-4">
                {pollsLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-black border border-gray-800 rounded-lg overflow-hidden">
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
                ) : sortedPolls.length === 0 ? (
                  <div className="bg-black border border-gray-800 rounded-lg overflow-hidden">
                    <div className="text-center py-16 px-4">
                      <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-gray-300 mb-3">No polls yet</h3>
                      <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
                        Be the first to create a poll and see what the community thinks!
                      </p>
                      <Button
                        onClick={handleCreatePoll}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Poll
                      </Button>
                    </div>
                  </div>
                ) : (
                  sortedPolls.map((poll: Poll) => {
                    const userSelection = selectedOptions[poll.id] || [];
                    const showVoteButton = !poll.hasVoted && userSelection.length > 0;

                  return (
                    <article
                      key={poll.id}
                      className="group relative bg-black border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-md cursor-pointer overflow-hidden rounded-lg"
                    >
                      {/* Header Section - matching PostCard */}
                      <div className="flex items-center justify-between p-4 bg-[#3a3a3a]">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {/* Author Info */}
                          <span className="font-medium underline text-lg text-gray-200 hover:text-white cursor-pointer">
                            {poll.author.username || 'user1234'}
                          </span>
                        </div>
                        {/* Timestamp on the right */}
                        <span className="text-gray-300 text-lg">{formatTimeAgo(poll.createdAt)}</span>
                      </div>

                      {/* Content Section - clickable for navigation */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => window.location.href = `/poll?id=${poll.id}`}
                      >
                        {/* Poll Title */}
                        <h2 className="font-normal text-white mb-2 text-lg">
                          {poll.title}
                        </h2>

                        {/* Poll Description/Date */}
                        {poll.description && (
                          <div className="text-gray-500 mb-4 text-sm">
                            {truncateContent(poll.description, 100)}
                          </div>
                        )}

                        {/* Poll Options - Bar Style */}
                        <div className="space-y-3 mb-4">
                          {poll.options.map((option) => {
                            const showResults = poll.hasVoted || poll.totalVotes > 0;
                            const percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;

                            return (
                              <div
                                key={option.id}
                                className="relative cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  !poll.hasVoted && handleVote(poll.id, option.id, poll.allowMultipleChoices);
                                }}
                              >
                                {/* Background bar */}
                                <div className="relative bg-[#3a3a3a] rounded h-12 flex items-center px-4 overflow-hidden">
                                  {/* Progress fill */}
                                  {showResults && (
                                    <div
                                      className="absolute inset-0 bg-[#5a5a5a] transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  )}

                                  {/* Option text */}
                                  <div className="relative z-10 flex items-center justify-center w-full">
                                    <span className="text-white text-sm">
                                      {option.text} {showResults && `[${percentage}%]`}
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
                              onClick={() => submitVote(poll.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Vote
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Footer/Actions Bar - matching PostCard */}
                      <div className="flex items-center justify-between px-4 border-t border-gray-700">

                        {/* Left-aligned items (Votes) */}
                        <div className="flex items-center space-x-4 border-r border-gray-700" onClick={(e) => e.stopPropagation()}>

                          {/* Upvote button */}
                          <button
                            aria-label="Upvote"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePollVote(poll.id, "up");
                            }}
                            disabled={voteMutation.isPending}
                            className={`flex items-center py-4 px-4 text-lg border-r border-gray-700 space-x-1.5 p-1 rounded-md transition-all duration-200 ${
                              poll.userVote?.voteType === "up"
                                ? "text-orange-500 bg-orange-500/10"
                                : "text-gray-400 hover:text-orange-500 hover:bg-gray-700"
                            } ${animatingVote?.pollId === poll.id && animatingVote?.type === "up" ? "scale-110" : ""} ${
                              voteMutation.isPending ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            {voteMutation.isPending && animatingVote?.pollId === poll.id && animatingVote?.type === "up" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Triangle fill="white" className="h-5 w-5" />
                            )}
                            <span className="font-medium text-white text-lg">
                              {poll.upvotes - poll.downvotes}
                            </span>
                          </button>

                          {/* Downvote button */}
                          <button
                            aria-label="Downvote"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePollVote(poll.id, "down");
                            }}
                            disabled={voteMutation.isPending}
                            className={`flex items-center space-x-1.5 py-4 px-4 text-lg rounded-md transition-all duration-200 ${
                              poll.userVote?.voteType === "down"
                                ? "text-blue-500 bg-blue-500/10"
                                : "text-gray-400 hover:text-blue-500 hover:bg-gray-700"
                            } ${animatingVote?.pollId === poll.id && animatingVote?.type === "down" ? "scale-110" : ""} ${
                              voteMutation.isPending ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            {voteMutation.isPending && animatingVote?.pollId === poll.id && animatingVote?.type === "down" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Triangle fill="white" className="rotate-180 h-5 w-5" />
                            )}
                          </button>
                        </div>

                        {/* Right-aligned items (Comments, Bookmark) */}
                        <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
                          {/* Comments Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/poll?id=${poll.id}`;
                            }}
                            className="flex items-center text-lg space-x-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 p-2 rounded-md transition-all duration-200"
                          >
                            <MessageSquare className="h-6 w-6" />
                            <span className="font-medium text-white">23</span>
                          </button>

                          {/* Bookmark Button */}
                          <button
                            aria-label="Bookmark"
                            className="p-2 rounded-md text-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                          >
                            <Bookmark className="h-6 w-6" />
                          </button>
                        </div>

                      </div>
                    </article>
                  );
                })
              )}
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="hidden mt-3r md:block w-80 flex-shrink-0">
              {/* CREATE Section */}
              <div className="mb-8 border border-gray-700">
                <div className="bg-gradient-to-br from-[#a8d5e2] to-[#b3d9e6] p-6 mb-4 h-32 flex items-center justify-center">
                  <button
                    onClick={handleCreatePost}
                    className="flex items-center gap-2 text-gray-900 font-medium"
                  >
                    <Edit3 className="w-5 h-5" />
                    CREATE
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCreatePoll}
                    className="border-r-2 border-gray-700 flex items-center text-white justify-center gap-2 py-3 bg-black hover:bg-gray-750 text-sm font-medium transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    POLL
                  </button>
                  <button
                    onClick={handleCreatePost}
                    className="flex items-center text-white justify-center gap-2 py-3 bg-black hover:bg-gray-750 rounded-lg text-sm font-medium transition-colors"
                  >
                    <div className="w-4 h-4 flex items-center justify-center text-xs">☰</div>
                    POST
                  </button>
                </div>
              </div>

              {/* COMMUNITIES Section */}
              <div className="bg-black rounded-lg border border-gray-700 p-4 mb-6 shadow-sm text-gray-300">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-200 uppercase text-sm">
                    COMMUNITIES
                  </h3>
                </div>
                <div className="space-y-3">
                  {bowls?.slice(0, 5).map((bowl) => (
                    <div
                      key={bowl.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <a
                        href={`/bowls/${encodeURIComponent(bowl.name)}`}
                        className="text-gray-300 hover:text-white transition-colors font-mono"
                      >
                        {bowl.name?.toLowerCase().replace(/\s+/g, "")}
                      </a>
                      {/* Removed stats div to match Figma */}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-700 p-4">
                        <h3 className="text-sm text-white font-medium mb-4 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          COMPANIES
                        </h3>
                        <div className="space-y-3">
                          {organizations?.slice(0, 5).map((org) => (
                            <div key={org.id} className="flex items-center gap-3">
                              <div className={`w-10 h-10 bg-slate-400 rounded flex items-center justify-center text-xl`}>
                                {org.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="flex-1 text-sm text-gray-300">{org.name}</span>
                              <div className="flex items-center gap-1">
                                <div className="px-2 py-1 bg-emerald-500 text-gray-900 rounded text-xs font-bold">
                                  80
                                </div>
                                <div className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">
                                  50
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
