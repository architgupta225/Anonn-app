import { useCallback, useState, useEffect } from "react";
import { Users, MessageSquare, BarChart3, Menu, X, MinusCircle } from "lucide-react";
import PostCard from "../components/PostCard";
import { InfiniteScrollSkeleton } from "@/components/InfiniteScrollLoader";
import { PostWithDetails, Bowl, CommentWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type TabType = "whistle" | "posts" | "polls" | "community" | "comments";

interface ProfileProps {
  onCreatePost: () => void;
  onExploreCommunities: () => void;
  isAuthenticated: boolean;
}

export default function ProfilePage({
    onCreatePost, 
    onExploreCommunities, 
    isAuthenticated
}: ProfileProps) {
  const { user, isAuthenticated: authIsAuthenticated, getAccessToken, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states - replacing dummy data with real data
  const [userPosts, setUserPosts] = useState<PostWithDetails[]>([]);
  const [userPolls, setUserPolls] = useState<PostWithDetails[]>([]);
  const [userComments, setUserComments] = useState<CommentWithDetails[]>([]);
  const [userCommunities, setUserCommunities] = useState<Bowl[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Posts state
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
   
 const fetchUserPosts = useCallback(async () => {
  
  setIsLoadingData(true);
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('[fetchUserPosts] No access token available');
      setUserPosts([]);
      return;
    }

    // Use the posts/own endpoint for authenticated user's own posts
    const response = await fetch('/api/post/own', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    

    if (response.ok) {
      const posts = await response.json();
        const userPolls = posts.filter((poll:any) => poll.type === "poll");
      setUserPolls(userPolls)
      setUserPosts(posts);
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch user posts:', response.status, errorData);
      setUserPosts([]);
    }
  } catch (error) {
    console.error('Error fetching user posts:', error);
    setUserPosts([]);
  } finally {
    setIsLoadingData(false);
  }
}, [authIsAuthenticated, user?.id, getAccessToken]);

  // Fetch user's comments
  const fetchUserComments = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const token = await getAccessToken();
      if (!token) return;

      // Use the comments/own endpoint for authenticated user's own comments
      const response = await fetch('/api/comments/own', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const comments = await response.json();
        setUserComments(comments);
      } else {
        console.error('Failed to fetch user comments:', response.status);
        setUserComments([]);
      }
    } catch (error) {
      console.error('Error fetching user comments:', error);
      setUserComments([]);
    }finally{
      setIsLoadingData(false)
    }
  }, [authIsAuthenticated, user?.id, getAccessToken]);

  // Fetch user's followed communities
  const fetchUserCommunities = useCallback(async () => {
    setIsLoadingData(true)
    
    try {
      const token = await getAccessToken();
      if (!token) return;

      // Get user's followed bowls
      const response = await fetch('/api/user/bowls', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const follows = await response.json();
        // Extract bowl details from follows
        const communityPromises = follows.map(async (follow: any) => {
          const bowlResponse = await fetch(`/api/bowls/${follow.bowlId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (bowlResponse.ok) {
            return bowlResponse.json();
          }
          return null;
        });

        const communities = (await Promise.all(communityPromises)).filter(Boolean);
        setUserCommunities(communities);
      } else {
        setUserCommunities([]);
      }
    } catch (error) {
      console.error('Error fetching user communities:', error);
      setUserCommunities([]);
    }finally{
      setIsLoadingData(false)
    }
  }, [authIsAuthenticated, user?.id, getAccessToken]);


  // Fetch all data when component mounts or tab changes
  useEffect(() => {
    if (!authIsAuthenticated || !user?.id) return;

    const fetchData = async () => {
      switch (activeTab) {
        case 'posts':
          await fetchUserPosts();
          break;
        case 'polls':
          await fetchUserPosts();
          break;
        case 'comments':
          await fetchUserComments();
          break;
        case 'community':
          await fetchUserCommunities();
          break;
        default:
          break;
      }
    };

    fetchData();
  }, [
    activeTab, 
    authIsAuthenticated, 
    user?.id, 
    fetchUserPosts, 
    fetchUserComments, 
    fetchUserCommunities
  ]);


  // Render tab content with real data
  const renderTabContent = () => {
    if (activeTab === "whistle") {
      return (
        <div className="flex items-center justify-center py-20 px-4">
          <p className="text-gray-400 text-sm text-center">[ IN APP REWARD SYSTEM OF ANONN WHICH TRANSLATE TO THE AIRDROPS ]</p>
        </div>
      );
    }

    if (activeTab === "posts") {
       return (isLoadingData)?
         (
          <div className="space-y-4">
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
          </div>
        ):
       (
        <div className="space-y-2 lg:space-y-4">
          <div className="flex items-center justify-center py-4 border-b border-gray-600 px-4">
            <p className="text-gray-400 text-sm">[ {userPosts.length} TOTAL ]</p>
          </div>
          {userPosts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={fetchUserPosts}
              compact={false}
              showCommunity={true}
              index={index}
            />
          ))}
        </div>
      );
    }

    if (activeTab === "polls") {
      return (isLoadingData)?
         (
          <div className="space-y-4">
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
          </div>
        ):
       (
        <div className="space-y-2 lg:space-y-4">
          <div className="flex items-center justify-center py-4 border-b border-gray-600 px-4">
            <p className="text-gray-400 text-sm">[ {userPolls.length} TOTAL ]</p>
          </div>
          {userPolls.map((poll,index) => (
            
            <PostCard
              key={poll.id}
              post={poll}
              onUpdate={fetchUserPosts}
              compact={false}
              showCommunity={true}
              index={index}
            />         
          ))}
        </div>
      );
    }

    if (activeTab === "community") {
      return (isLoadingData)?
         (
          <div className="space-y-4">
            <InfiniteScrollSkeleton count={5} />
          </div>
        ):
       (
        <div className="space-y-0">
          <div className="flex items-center justify-center py-4 border-b border-gray-700 px-4">
            <p className="text-gray-400 text-sm">[ {userCommunities.length} TOTAL ]</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 py-6">
            {userCommunities.map((community) => (
              <div
                key={community.id}
                className="bg-[#0e0e0e] border border-gray-700 rounded-md flex flex-col overflow-hidden"
              >
                {/* Title + Description */}
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-white text-xl font-mono mb-3">{community.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                    {community.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-gray-400 text-sm border-b border-gray-700">
                  <div className="flex items-center justify-center w-1/3 gap-2 py-3 border-r border-gray-700">
                    <Users className="w-4 h-4" />
                    <span>{(community.memberCount / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center justify-center w-1/3 gap-2 py-3 border-r border-gray-700">
                    <MessageSquare className="w-4 h-4" />
                    <span>{Math.floor(community.memberCount * 1.33 / 1000)}K</span>
                  </div>
                  <div className="flex items-center justify-center w-1/3 gap-2 py-3">
                    <BarChart3 className="w-4 h-4" />
                    <span>{Math.floor(community.memberCount * 0.83 / 1000)}K</span>
                  </div>
                </div>

                {/* Leave Button */}
                <button className="bg-white text-black py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                  <MinusCircle className="w-4 h-4" />
                  <span>LEAVE</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === "comments") {
      return (isLoadingData)?
         (
          <div className="space-y-4">
            <InfiniteScrollSkeleton count={5} />
          </div>
        ):
       (
          <div className="space-y-0">
            <div className="flex items-center justify-center py-4 border-b border-gray-600 px-4">
              <p className="text-gray-400 text-sm">[ {userComments.length} TOTAL ]</p>
            </div>
            {userComments.length > 0 ? (
              <div className="space-y-4 p-4">
                {userComments.map((comment) => (
                  <div key={comment.id} className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-1">
                        <p className="text-white text-sm mb-2">{comment.content}</p>
                        <div className="flex items-center space-x-4 text-gray-400 text-xs">
                          <span>Posted {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Unknown'}</span>
                          {comment.postId && (
                            <button 
                              onClick={() => window.location.href = `/post?id=${comment.postId}`}
                              className="text-orange-400 hover:text-orange-300 transition-colors"
                            >
                              View Post
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No comments yet</p>
              </div>
            )}
          </div>
        );
    }

    return null;
  };

  const TabButton = ({ tab, children, icon: Icon }: { tab: TabType; children: React.ReactNode; icon: React.ComponentType<any> }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-all w-full sm:w-auto justify-center ${
        activeTab === tab
          ? "bg-white text-black"
          : "bg-transparent text-gray-400 hover:text-white"
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );

  // Keep all the existing UI code exactly as it was
  return (
    <div className="min-h-screen px-2 lg:px-4 bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto">
        {/* Mobile Menu Button */}
        <div className="sm:hidden px-4 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-white text-lg font-medium">Profile</h2>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-400 hover:text-white p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden scrollbar-hide  sm:flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab("whistle")}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
              activeTab === "whistle"
                ? "bg-blue-400 text-black"
                : "bg-transparent text-gray-400 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            WHISTLE
          </button>

          <TabButton tab="posts" icon={MessageSquare}>
            POSTS
          </TabButton>

          <TabButton tab="polls" icon={BarChart3}>
            POLLS
          </TabButton>

          <TabButton tab="community" icon={Users}>
            COMMUNITY
          </TabButton>

          <TabButton tab="comments" icon={MessageSquare}>
            COMMENTS
          </TabButton>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-[#1a1a1a] border-b border-gray-700 p-4 space-y-2">
            <button
              onClick={() => {
                setActiveTab("whistle");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all w-full ${
                activeTab === "whistle"
                  ? "bg-blue-400 text-black"
                  : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              WHISTLE
            </button>

            <button
              onClick={() => {
                setActiveTab("posts");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all w-full ${
                activeTab === "posts"
                  ? "bg-white text-black"
                  : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              POSTS
            </button>

            <button
              onClick={() => {
                setActiveTab("polls");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all w-full ${
                activeTab === "polls"
                  ? "bg-white text-black"
                  : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              POLLS
            </button>

            <button
              onClick={() => {
                setActiveTab("community");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all w-full ${
                activeTab === "community"
                  ? "bg-white text-black"
                  : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Users className="w-5 h-5" />
              COMMUNITY
            </button>

            <button
              onClick={() => {
                setActiveTab("comments");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all w-full ${
                activeTab === "comments"
                  ? "bg-white text-black"
                  : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              COMMENTS
            </button>
          </div>
        )}

        <div className="bg-[#0a0a0a]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}