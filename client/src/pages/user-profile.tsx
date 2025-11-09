import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/LeftSidebar";
import PostCard from "@/components/PostCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  MessageSquare,
  ThumbsUp,
  Calendar,
  Building,
  Users,
  ArrowLeft,
  Edit3,
  BarChart3,
  Flame,
  Clock,
  Star,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { PostWithDetails } from "@shared/schema";
import { useInfinitePosts } from "@/hooks/useInfiniteScroll";
import { InfiniteScrollLoader, InfiniteScrollSkeleton } from "@/components/InfiniteScrollLoader";

export default function UserProfilePage() {
  const [location, setLocation] = useLocation();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  // Get user ID from URL
  const userId = new URLSearchParams(window.location.search).get('id');
  
  console.log("User", userId)
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreatePost = () => {
    window.location.href = '/create-post';
  };

  // Mock user data - in production, fetch from API
  const [profileUser, setProfileUser] = useState({
    id: userId || '1',
    username: 'DemoUser',
    avatar: 'D',
    joinDate: new Date('2024-01-01'),
    karma: 1250,
    postCount: 47,
    commentCount: 156,
    bio: 'Passionate about Web3, blockchain, and building the future of decentralized applications.',
    isVerified: true,
    badges: ['Early Adopter', 'Community Pillar', 'Content Creator']
  });

  // Fetch user posts with infinite scroll
  const {
    items: userPosts,
    isLoading: postsLoading,
    hasMore: hasMorePosts,
    error: postsError,
    loadMore: loadMorePosts,
    refresh: refetchPosts,
    setItems: setUserPosts
  } = useInfinitePosts(
    async (page: number, limit: number) => {
      if (!userId) throw new Error("No user ID provided");
      const response = await fetch(`/api/users/${userId}/posts?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        items: data,
        hasMore: data.length === limit,
        total: data.length
      };
    },
    10, // 10 posts per page
    {
      enabled: !!userId && isAuthenticated,
      threshold: 0.1,
      rootMargin: '100px'
    }
  );

  // Fetch user comments with infinite scroll
  const {
    items: userComments,
    isLoading: commentsLoading,
    hasMore: hasMoreComments,
    error: commentsError,
    loadMore: loadMoreComments,
    refresh: refetchComments,
    setItems: setUserComments
  } = useInfinitePosts(
    async (page: number, limit: number) => {
      if (!userId) throw new Error("No user ID provided");
      const response = await fetch(`/api/users/${userId}/comments?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        items: data,
        hasMore: data.length === limit,
        total: data.length
      };
    },
    20, // 20 comments per page
    {
      enabled: !!userId && isAuthenticated,
      threshold: 0.1,
      rootMargin: '100px'
    }
  );

  // Mock data for demo - in production, remove this
  useEffect(() => {
    if (!userId) return;
    
    // Simulate user data
    setProfileUser(prev => ({
      ...prev,
      id: userId,
      username: `User${userId}`,
      avatar: userId.charAt(0).toUpperCase(),
      karma: Math.floor(Math.random() * 2000) + 100,
      postCount: Math.floor(Math.random() * 100) + 10,
      commentCount: Math.floor(Math.random() * 300) + 50
    }));
  }, [userId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center animate-pulse">
              <div className="h-12 w-48 bg-gray-200 dark:bg-slate-700 rounded mx-auto mb-4"></div>
              <div className="h-6 w-64 bg-gray-200 dark:bg-slate-700 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/auth';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      <Navigation />
      
      {/* Main Layout */}
      <div className="flex w-full h-screen pt-14">
        {/* Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] fixed top-14 left-0 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-r border-gray-200 overflow-y-auto transition-all duration-300 z-10`}>
          <Sidebar 
            onCreatePost={handleCreatePost} 
            onCreateReview={handleCreatePost}
            
          />
        </aside>

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-18 left-4 z-40 p-2 bg-white border border-gray-200 rounded-md shadow-md hover:bg-gray-50"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Main Content Area */}
        <main className={`flex-1 min-w-0 bg-reddit-light overflow-y-auto custom-scrollbar transition-all duration-300 ${sidebarOpen ? 'ml-[240px]' : 'ml-[60px]'}`}>
          <div className="w-full px-4 py-6">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>

            {/* User Profile Header */}
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-lg mb-6">
              <CardContent className="p-8">
                <div className="flex items-start space-x-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={`/api/avatars/${profileUser.id}`} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {profileUser.avatar}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-4">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {profileUser.username}
                      </h1>
                      {profileUser.isVerified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          <Star className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg">
                      {profileUser.bio}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {profileUser.karma.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Karma</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {profileUser.postCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {profileUser.commentCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Comments</div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {profileUser.badges.map((badge, index) => (
                        <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Join Date */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Member since</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profileUser.joinDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-lg">
               <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="posts" className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Posts</span>
                      <Badge variant="secondary" className="ml-2">
                        {profileUser.postCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="flex items-center space-x-2">
                      <ThumbsUp className="h-4 w-4" />
                      <span>Comments</span>
                      <Badge variant="secondary" className="ml-2">
                        {profileUser.commentCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="about" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>About</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="p-6">
                <TabsContent value="posts" className="space-y-4">
                  {postsLoading && userPosts.length === 0 ? (
                    <InfiniteScrollSkeleton count={3} />
                  ) : userPosts && userPosts.length > 0 ? (
                    <>
                      {userPosts.map((post: PostWithDetails, index: number) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onUpdate={refetchPosts}
                          showCommunity={true}
                          index={index}
                        />
                      ))}
                      
                      {/* Infinite Scroll Loader for User Posts */}
                      <InfiniteScrollLoader
                        isLoading={postsLoading}
                        hasMore={hasMorePosts}
                        error={postsError}
                        onRetry={refetchPosts}
                        onLoadMore={loadMorePosts}
                        loadingText="Loading more posts..."
                        endText="You've reached the end of the user's posts! 🎉"
                        errorText="Failed to load more posts"
                      />
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="h-10 w-10 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        No posts yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
                        This user hasn't created any posts yet. Check back later!
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  {commentsLoading && userComments.length === 0 ? (
                    <InfiniteScrollSkeleton count={5} />
                  ) : userComments && userComments.length > 0 ? (
                    <>
                      {userComments.map((comment: any, index: number) => (
                        <Card key={comment.id} className="bg-gray-50 dark:bg-slate-700 border-0">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {profileUser.avatar}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {profileUser.username}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTimeAgo(new Date(comment.createdAt || Date.now()))}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {comment.content}
                                </p>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  on post: <Link href={`/post?id=${comment.postId}`} className="text-blue-600 hover:underline">View Post</Link>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Infinite Scroll Loader for User Comments */}
                      <InfiniteScrollLoader
                        isLoading={commentsLoading}
                        hasMore={hasMoreComments}
                        error={commentsError}
                        onRetry={refetchComments}
                        onLoadMore={loadMoreComments}
                        loadingText="Loading more comments..."
                        endText="You've reached the end of the user's comments! 🎉"
                        errorText="Failed to load more comments"
                      />
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ThumbsUp className="h-10 w-10 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        No comments yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
                        This user hasn't made any comments yet. Check back later!
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="about" className="space-y-6">
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      About {profileUser.username}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {profileUser.bio}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Member since</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {profileUser.joinDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total karma</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {profileUser.karma.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
              </Tabs>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
