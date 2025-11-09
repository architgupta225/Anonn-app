import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToHistory } from "@/lib/navigationUtils";
import Navigation from "@/components/Navigation";
import LeftSidebar from "@/components/LeftSidebar";
import PostCard from "@/components/PostCard";
import BackButton from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, MessageSquare, Plus, UserPlus, UserMinus, 
  TrendingUp, Calendar, Share2, 
  Star, Flame, Globe, Building2,
  Clock, BarChart3, Hash, Shield,
  Crown, Edit, Flag,
  Volume2, Bell, 
  Sparkles, Grid, List,
  Link, FileText, BarChart,
  Info, BookOpen, AlertTriangle, ChevronDown, ArrowLeft,
  RefreshCw
} from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bowl, PostWithDetails, BowlFollow, User } from "@shared/schema";

export default function BowlPage() {
  const params = useParams();
  const idParam = (params.id as string) || "";
  const isNumericParam = /^\d+$/.test(idParam);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'discussions' | 'polls'>('discussions');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');

  
  // Force cache invalidation by adding a timestamp that changes on mount
  const [cacheBuster, setCacheBuster] = useState(Date.now());


  // Add current page to navigation history
  useEffect(() => {
    addToHistory();
  }, []);

  // Force refresh when component mounts (e.g., when returning from create-post)
  useEffect(() => {
    console.log('[Bowl] Component mounted, checking for fresh data...');
    console.log('[Bowl] Current posts count:', posts?.length || 0);
    console.log('[Bowl] Latest post ID:', posts?.[0]?.id);
    
    // Update cache buster to force fresh data
    setCacheBuster(Date.now());
    
    // Clear all post-related caches completely
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && (
          key[0] === "posts" ||
          key[0] === "/api/posts"
        );
      }
    });
    
    // Force refetch
    refetch();
  }, []);

  // Also force refresh when the URL changes (e.g., when navigating back)
  useEffect(() => {
    console.log('[Bowl] URL changed, forcing refresh...');
    refetch();
  }, [location]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreatePost = () => {
    setLocation(`/create-post${bowl?.id ? `?bowlId=${bowl.id}` : ""}`);
  };

  const { data: bowl, isLoading: bowlLoading, error: bowlError } = useQuery<Bowl>({
    queryKey: ["/api/bowls", idParam],
    enabled: !!idParam,
    retry: false,
  });

  const { data: posts, isLoading: postsLoading, error: postsError, refetch } = useQuery<PostWithDetails[]>({
    queryKey: ["/api/posts", "bowl", bowl?.id ?? idParam, cacheBuster],
    queryFn: async () => {
      if (!bowl?.id) throw new Error("Bowl not loaded");
      const response = await fetch(`/api/posts?bowlId=${bowl.id}&type=discussion`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!bowl?.id,
    retry: false,
  });

  const { data: userBowls } = useQuery<(BowlFollow & { bowl: Bowl })[]>({
    queryKey: ["/api/user/bowls"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: isFollowing } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/bowls", bowl?.id ?? idParam, "following"],
    enabled: isAuthenticated && !!bowl?.id,
    retry: false,
  });

  // Sort posts based on current sortBy
  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    
    let sorted = [...posts];
    
    switch (sortBy) {
      case 'hot':
        // Sort by engagement (upvotes + comments + recency)
        sorted.sort((a, b) => {
          const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const aScore = (a.upvotes + a.commentCount * 2) + Math.max(0, 24 - Math.floor((Date.now() - aCreatedAt) / (1000 * 60 * 60)));
          const bScore = (b.upvotes + b.commentCount * 2) + Math.max(0, 24 - Math.floor((Date.now() - bCreatedAt) / (1000 * 60 * 60)));
          return bScore - aScore;
        });
        break;
      case 'new':
        // Sort by creation date (newest first)
        sorted.sort((a, b) => {
          const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bCreatedAt - aCreatedAt;
        });
        break;
    }
    
    return sorted;
  }, [posts, sortBy]);



  // Mock community rules and flairs (would be fetched from bowl data in real implementation)
  const communityRules = bowl?.rules as any[] || [
    { id: 1, title: "Be respectful", description: "Treat all members with respect and kindness." },
    { id: 2, title: "No spam", description: "Don't post repetitive or promotional content." },
    { id: 3, title: "Stay on topic", description: "Keep posts relevant to the community theme." },
    { id: 4, title: "No harassment", description: "Harassment of any kind is not tolerated." },
    { id: 5, title: "Use appropriate flairs", description: "Tag your posts with relevant flairs." }
  ];



  const followBowlMutation = useMutation({
    mutationFn: async () => {
      if (!bowl?.id) throw new Error("Bowl not loaded");
      await apiRequest("POST", `/api/bowls/${bowl.id}/follow`, {});
    },
    onSuccess: () => {
      toast({
        title: "Followed!",
        description: "You're now following this channel.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bowls", bowl?.id ?? idParam, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to follow channel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unfollowBowlMutation = useMutation({
    mutationFn: async () => {
      if (!bowl?.id) throw new Error("Bowl not loaded");
      await apiRequest("DELETE", `/api/bowls/${bowl.id}/follow`, {});
    },
    onSuccess: () => {
      toast({
        title: "Unfollowed",
        description: "You're no longer following this channel.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bowls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bowls", bowl?.id ?? idParam, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to unfollow channel. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (bowl) {
      document.title = `${bowl.name} - Anonn`;
    }
  }, [bowl]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  useEffect(() => {
    if ((bowlError && isUnauthorizedError(bowlError as Error)) || 
        (postsError && isUnauthorizedError(postsError as Error))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [bowlError, postsError, toast]);

  if (authLoading || bowlLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-64 w-full mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bowl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Channel not found
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              The channel you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isUserFollowing = isFollowing?.isFollowing || false;
  const getBowlIcon = (name: string) => name?.charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      {/* Main Layout */}
      <div className="flex w-full h-screen pt-14">
        {/* Left Sidebar - Fixed position like Blind */}
        <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] sticky top-14 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
          <LeftSidebar 
            onCreatePost={handleCreatePost} 
            onCreateReview={() => {}} 
         
          />
        </aside>

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-18 left-4 z-40 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 overflow-y-auto">
                  <div className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-8">
            {/* Back Navigation */}
            <div className="mb-6">
              <BackButton fallbackPath="/bowls" fallbackTitle="Bowls" />
            </div>
            
        {/* Hero Banner */}
        <div className="relative mb-8">
          {/* Cover Banner */}
          <div className="h-80 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-red-500 to-pink-500">
            {bowl?.bannerUrl && (
              <img 
                src={bowl.bannerUrl} 
                alt={`${bowl.name} banner`}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#E8EAE9]/40 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8EAE9]/20 to-transparent"></div>
            



          </div>
          
          {/* Channel Info Card */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl -mt-20 mx-4 relative z-10 p-8 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-6">
                <div className="relative">
                  <div className="w-28 h-28 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl border-4 border-white dark:border-slate-800 flex items-center justify-center shadow-lg overflow-hidden">
                    {bowl?.iconUrl ? (
                      <img 
                        src={bowl.iconUrl} 
                        alt={`${bowl.name} icon`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                  <span className="text-white text-3xl font-bold">{getBowlIcon(bowl.name)}</span>
                    )}
                  </div>
                  {/* Community Status Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex items-center space-x-3 mb-3">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {bowl.name}
                    </h1>
                    <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                      <Globe className="h-3 w-3 mr-1" />
                        {bowl?.isPrivate ? 'Private' : 'Public'}
                      </Badge>
                      {bowl?.isNSFW && (
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          NSFW
                        </Badge>
                      )}
                      {bowl?.isRestricted && (
                        <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Restricted
                        </Badge>
                      )}

                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>{sortedPosts?.length || 0} posts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Created {bowl.createdAt ? new Date(bowl.createdAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                  
                  {bowl.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-3xl">
                      {bowl.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-3 pt-2">
                {isAuthenticated && (
                  <>
                    <Button 
                      onClick={() => isUserFollowing ? unfollowBowlMutation.mutate() : followBowlMutation.mutate()}
                      disabled={followBowlMutation.isPending || unfollowBowlMutation.isPending}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isUserFollowing 
                          ? "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300" 
                          : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl"
                      }`}
                    >
                      {isUserFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Joined
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Join
                        </>
                      )}
                    </Button>
                    
                    {/* Notification Bell */}
                    <Button variant="outline" className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600 hover:border-orange-500 dark:hover:border-orange-400">
                      <Bell className="h-4 w-4" />
                    </Button>

                    {/* Share Community */}
                    <ShareButton 
                      url={window.location.href}
                      title={`${bowl.name} - Community`}
                      description={bowl.description || `Check out this community: ${bowl.name} on Anonn`}
                      variant="outline"
                      size="default"
                      className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600 hover:border-orange-500 dark:hover:border-orange-400"
                    />


                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Posts</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{sortedPosts?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Members</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{bowl?.memberCount || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Engagement Score</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {(() => {
                      if (!sortedPosts || sortedPosts.length === 0) return '0%';
                      const totalUpvotes = sortedPosts.reduce((sum, post) => sum + (post.upvotes || 0), 0);
                      const totalComments = sortedPosts.reduce((sum, post) => sum + (post.commentCount || 0), 0);
                      const avgUpvotes = totalUpvotes / sortedPosts.length;
                      const avgComments = totalComments / sortedPosts.length;
                      const engagementScore = Math.min(100, Math.round((avgUpvotes + avgComments * 2) * 10));
                      return `${engagementScore}%`;
                    })()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              {/* Tab Navigation */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-1.5 border border-gray-200 dark:border-slate-600 shadow-lg">
                    <TabsTrigger 
                      value="discussions" 
                      className="rounded-lg px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md transition-all duration-200"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Posts
                    </TabsTrigger>
                    <TabsTrigger 
                      value="polls" 
                      className="rounded-lg px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-md transition-all duration-200"
                    >
                      <BarChart className="h-4 w-4 mr-2" />
                      Polls
                    </TabsTrigger>
                  </TabsList>

                  {isAuthenticated && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setLocation(`/create-post?bowlId=${bowl.id}`)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </motion.div>
                  )}
          </div>

                {/* Feed Controls - Matching Home Page Design */}
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-600/60 p-6 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      {/* Sort Options */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy("hot")}
                            className={`h-10 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                              sortBy === "hot" 
                                ? "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white shadow-xl shadow-orange-500/30 border-2 border-orange-400" 
                                : "text-gray-700 dark:text-gray-300 hover:text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 dark:hover:from-orange-900/20 dark:hover:to-red-900/20 border-2 border-gray-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-500"
                            }`}
                          >
                            <Flame className={`h-4 w-4 mr-2 ${sortBy === "hot" ? "text-white" : "text-orange-500"}`} />
                            Hot
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSortBy("new")}
                            className={`h-10 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                              sortBy === "new"
                                ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-xl shadow-blue-500/30 border-2 border-blue-400"
                                : "text-gray-700 dark:text-gray-300 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border-2 border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500"
                            }`}
                          >
                            <Clock className={`h-4 w-4 mr-2 ${sortBy === "new" ? "text-white" : "text-blue-500"}`} />
                            New
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <TabsContent value="discussions" className="mt-0">
                  {/* Posts Feed - Matching Home Page Design */}
                  <div className="space-y-4">
                    {postsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 animate-pulse">
                          <div className="flex space-x-4">
                            <div className="w-10 h-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center space-x-2">
                                <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
                              </div>
                              <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                              <div className="h-16 w-full bg-gray-200 dark:bg-slate-700 rounded"></div>
                              <div className="flex space-x-4">
                                <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
                                <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : sortedPosts && sortedPosts.length > 0 ? (
                      sortedPosts.map((post, index) => (
                        <div 
                          key={post.id} 
                          className="animate-post-reveal" 
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <PostCard 
                            post={post} 
                            onUpdate={refetch}
                            compact={false}
                            showCommunity={false}
                            index={index}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-reddit-orange/20 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="h-8 w-8 text-reddit-orange" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            No posts yet
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            Be the first to start a discussion! Create a post to get the conversation going.
                          </p>
                          {isAuthenticated && (
                            <Button 
                              onClick={handleCreatePost}
                              className="bg-reddit-orange hover:bg-reddit-orange/90 text-white px-4 py-2 rounded-full font-medium text-sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Post
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="polls" className="mt-0">
                  {/* Polls Feed - Matching Home Page Design */}
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BarChart className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          No polls yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                          Polls will appear here when they're created in this community.
                        </p>
                        {isAuthenticated && (
                          <Button 
                            onClick={handleCreatePost}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full font-medium text-sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Poll
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>


              </Tabs>
            </div>
          </div>

          {/* Community Sidebar */}
          <div className="space-y-6">
            {/* About Community */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Info className="h-5 w-5 mr-2 text-orange-500" />
                  About Community
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bowl?.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {bowl.description}
                  </p>
                )}
                


                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Created {bowl?.createdAt ? new Date(bowl.createdAt).toLocaleDateString() : 'Recently'}
                </div>


              </CardContent>
            </Card>

            {/* Community Rules */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                  Community Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {communityRules.map((rule, index) => (
                      <div key={rule.id} className="border-b border-gray-200 dark:border-slate-600 pb-3 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                              {rule.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                              {rule.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>




          </div>
        </div>
          </div>
        </main>
      </div>
    </div>
  );
}
