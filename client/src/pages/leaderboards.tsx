import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Medal, Crown, Star, Flame, TrendingUp, Users,
  MessageSquare, Zap, Target, Calendar, Eye,
  ThumbsUp, Gift, Coins, Shield, Heart, Sparkles,
  BarChart3, Clock, Globe, Hash, Rocket, Diamond, Award
} from "lucide-react";

interface LeaderboardUser {
  id: string;
  rank: number;
  username: string;
  karma: number;
  postKarma: number;
  commentKarma: number;
  postsCount: number;
  commentsCount: number;
  streak: number;
  isVerified: boolean;
  isPremium: boolean;
  profileImageUrl: string | null;
  followerCount: number;
  followingCount: number;
  createdAt: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: string;
  progress?: number;
  maxProgress?: number;
  earnedAt?: string;
  unlockedBy?: number; // Number of users who have this achievement
}

export default function LeaderboardsPage() {
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');
  const [category, setCategory] = useState<'karma' | 'posts' | 'comments'>('karma');

  // Mock leaderboard data
  const mockLeaderboard: LeaderboardUser[] = [
    {
      id: "1", rank: 1, username: "reddit_legend", karma: 125000, postKarma: 85000, commentKarma: 40000,
      postsCount: 1250, commentsCount: 8500, streak: 365,
      isVerified: true, isPremium: true, profileImageUrl: null, followerCount: 25000, followingCount: 1500,
      createdAt: new Date('2019-01-15')
    },
    {
      id: "2", rank: 2, username: "karma_master", karma: 98000, postKarma: 60000, commentKarma: 38000,
      postsCount: 980, commentsCount: 6200, streak: 180,
      isVerified: true, isPremium: false, profileImageUrl: null, followerCount: 18000, followingCount: 800,
      createdAt: new Date('2020-03-20')
    },
    {
      id: "3", rank: 3, username: "top_contributor", karma: 76500, postKarma: 45000, commentKarma: 31500,
      postsCount: 750, commentsCount: 5200, streak: 90,
      isVerified: false, isPremium: true, profileImageUrl: null, followerCount: 12000, followingCount: 600,
      createdAt: new Date('2020-08-10')
    },
    // Add more mock users...
    ...Array.from({ length: 47 }, (_, i) => ({
      id: (i + 4).toString(),
      rank: i + 4,
      username: `anon_${i + 4}`,
      karma: Math.floor(Math.random() * 50000) + 5000,
      postKarma: Math.floor(Math.random() * 30000) + 2000,
      commentKarma: Math.floor(Math.random() * 20000) + 1000,
      postsCount: Math.floor(Math.random() * 500) + 50,
      commentsCount: Math.floor(Math.random() * 2000) + 200,

      streak: Math.floor(Math.random() * 100) + 1,
      isVerified: Math.random() > 0.8,
      isPremium: Math.random() > 0.7,
      profileImageUrl: null,
      followerCount: Math.floor(Math.random() * 5000) + 100,
      followingCount: Math.floor(Math.random() * 1000) + 50,
      createdAt: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28))
    }))
  ];

  // Mock achievements data
  const achievements: Achievement[] = [
    {
      id: "first_post", name: "First Steps", description: "Make your first post",
      icon: "🎉", rarity: 'common', requirement: "Create 1 post", progress: 1, maxProgress: 1,
      unlockedBy: 950000
    },
    {
      id: "hundred_karma", name: "Rising Star", description: "Reach 100 karma",
      icon: "⭐", rarity: 'common', requirement: "Earn 100 karma", progress: 100, maxProgress: 100,
      unlockedBy: 750000
    },
    {
      id: "thousand_karma", name: "Karma Collector", description: "Reach 1,000 karma",
      icon: "🔥", rarity: 'rare', requirement: "Earn 1,000 karma", progress: 1000, maxProgress: 1000,
      unlockedBy: 250000
    },
    {
      id: "ten_thousand_karma", name: "Karma Elite", description: "Reach 10,000 karma",
      icon: "💎", rarity: 'epic', requirement: "Earn 10,000 karma", progress: 10000, maxProgress: 10000,
      unlockedBy: 50000
    },
    {
      id: "hundred_thousand_karma", name: "Karma Legend", description: "Reach 100,000 karma",
      icon: "👑", rarity: 'legendary', requirement: "Earn 100,000 karma", progress: 100000, maxProgress: 100000,
      unlockedBy: 1000
    },
    {
      id: "popular_post", name: "Viral Content", description: "Get 1000+ upvotes on a single post",
      icon: "🚀", rarity: 'rare', requirement: "1000+ upvotes on one post", unlockedBy: 85000
    },
    {
      id: "community_builder", name: "Community Builder", description: "Join 20+ communities",
      icon: "🏗️", rarity: 'rare', requirement: "Join 20 communities", unlockedBy: 120000
    },
    {
      id: "award_giver", name: "Generous Spirit", description: "Give 50 awards to others",
      icon: "🎁", rarity: 'epic', requirement: "Give 50 awards", unlockedBy: 25000
    },
    {
      id: "consecutive_days", name: "Daily Visitor", description: "Visit Reddit for 30 consecutive days",
      icon: "📅", rarity: 'rare', requirement: "30 day streak", unlockedBy: 180000
    },
    {
      id: "year_member", name: "Veteran", description: "Be a member for 1+ years",
      icon: "🏆", rarity: 'epic', requirement: "1 year membership", unlockedBy: 400000
    }
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-gray-500 font-bold text-lg">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (rank <= 10) return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white';
    if (rank <= 50) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
    if (rank <= 100) return 'bg-gradient-to-r from-green-400 to-green-600 text-white';
    return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50 dark:bg-gray-900/50';
      case 'rare': return 'border-blue-300 bg-blue-50 dark:bg-blue-900/20';
      case 'epic': return 'border-purple-300 bg-purple-50 dark:bg-purple-900/20';
      case 'legendary': return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-900/50';
    }
  };

  const getSortedUsers = () => {
    return [...mockLeaderboard].sort((a, b) => {
      switch (category) {
        case 'posts': return (b.postsCount || 0) - (a.postsCount || 0);
        case 'comments': return (b.commentsCount || 0) - (a.commentsCount || 0);
        default: return b.karma - a.karma;
      }
    }).map((user, index) => ({ ...user, rank: index + 1 }));
  };

  return (
    <div className="min-h-screen bg-reddit-light dark:bg-slate-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Leaderboards
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            See who's leading the community in karma, contributions, and achievements
          </p>
        </div>

        <Tabs defaultValue="rankings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="rankings" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Rankings</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Community Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Rankings Tab */}
          <TabsContent value="rankings">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Top 3 Podium */}
              <div className="lg:col-span-4 mb-8">
                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
                      🏆 Top Contributors 🏆
                    </h2>
                    <div className="flex items-end justify-center space-x-8">
                      {/* 2nd Place */}
                      <div className="text-center">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 h-32 flex flex-col items-center justify-center mb-4">
                          <Medal className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="font-bold text-2xl text-gray-600 dark:text-gray-300">#2</span>
                        </div>
                        <Avatar className="h-16 w-16 mx-auto mb-3 border-4 border-gray-300">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                            {mockLeaderboard[1].username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-gray-900 dark:text-white">{mockLeaderboard[1].username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{mockLeaderboard[1].karma.toLocaleString()} karma</p>
                      </div>

                      {/* 1st Place */}
                      <div className="text-center">
                        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-lg p-6 h-40 flex flex-col items-center justify-center mb-4">
                          <Crown className="h-10 w-10 text-yellow-500 mb-2" />
                          <span className="font-bold text-3xl text-yellow-600">#1</span>
                        </div>
                        <Avatar className="h-20 w-20 mx-auto mb-3 border-4 border-yellow-400">
                          <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                            {mockLeaderboard[0].username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{mockLeaderboard[0].username}</p>
                        <p className="text-gray-600 dark:text-gray-300">{mockLeaderboard[0].karma.toLocaleString()} karma</p>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          {mockLeaderboard[0].isVerified && <Shield className="h-4 w-4 text-blue-500" />}
                          {mockLeaderboard[0].isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div className="text-center">
                        <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-6 h-28 flex flex-col items-center justify-center mb-4">
                          <Award className="h-7 w-7 text-amber-600 mb-2" />
                          <span className="font-bold text-xl text-amber-600">#3</span>
                        </div>
                        <Avatar className="h-14 w-14 mx-auto mb-3 border-4 border-amber-400">
                          <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                            {mockLeaderboard[2].username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-gray-900 dark:text-white">{mockLeaderboard[2].username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{mockLeaderboard[2].karma.toLocaleString()} karma</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="lg:col-span-1">
                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 sticky top-8">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>Filters</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Category
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'karma', label: 'Total Karma', icon: Flame },
                          { value: 'posts', label: 'Posts', icon: MessageSquare },
                          { value: 'comments', label: 'Comments', icon: MessageSquare },
                          { value: 'awards', label: 'Awards Received', icon: Gift }
                        ].map(({ value, label, icon: Icon }) => (
                          <Button
                            key={value}
                            variant={category === value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCategory(value as any)}
                            className="w-full justify-start"
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Time Period
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'all', label: 'All Time', icon: Globe },
                          { value: 'month', label: 'This Month', icon: Calendar },
                          { value: 'week', label: 'This Week', icon: Clock }
                        ].map(({ value, label, icon: Icon }) => (
                          <Button
                            key={value}
                            variant={timeframe === value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTimeframe(value as any)}
                            className="w-full justify-start"
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leaderboard List */}
              <div className="lg:col-span-3">
                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Top 50 Users</span>
                      <Badge variant="secondary">
                        {category === 'karma' ? 'By Total Karma' : 
                         category === 'posts' ? 'By Posts Count' : 'By Comments Count'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getSortedUsers().slice(0, 50).map((user) => (
                        <div 
                          key={user.id} 
                          className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center justify-center w-12">
                            {getRankIcon(user.rank)}
                          </div>
                          
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {user.username || 'user'}
                                </p>
                              {user.isVerified && <Shield className="h-4 w-4 text-blue-500" />}
                              {user.isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
                              {user.rank <= 100 && (
                                <Badge className={`text-xs ${getRankBadge(user.rank)}`}>
                                  Top {user.rank <= 10 ? '10' : user.rank <= 50 ? '50' : '100'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center space-x-1">
                                <Flame className="h-3 w-3" />
                                <span>{user.karma.toLocaleString()} karma</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{user.postsCount} posts</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                              {category === 'karma' ? user.karma.toLocaleString() :
                               category === 'posts' ? user.postsCount :
                               user.commentsCount}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {category === 'karma' ? 'karma' :
                               category === 'posts' ? 'posts' : 'comments'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Community Achievements
                </h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Unlock achievements by participating in the community. Each achievement comes with karma rewards and bragging rights!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement) => (
                  <Card 
                    key={achievement.id} 
                    className={`${getRarityColor(achievement.rarity)} border-2 hover:scale-105 transition-transform duration-200`}
                  >
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-4xl mb-3">{achievement.icon}</div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                          {achievement.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                          {achievement.description}
                        </p>
                        
                        <div className="space-y-3">
                          <Badge variant="outline" className={`
                            ${achievement.rarity === 'common' ? 'text-gray-600' :
                              achievement.rarity === 'rare' ? 'text-blue-600' :
                              achievement.rarity === 'epic' ? 'text-purple-600' : 'text-yellow-600'}
                          `}>
                            {achievement.rarity.toUpperCase()}
                          </Badge>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <p className="mb-1">{achievement.requirement}</p>
                            <p>🏆 {achievement.unlockedBy?.toLocaleString()} users earned this</p>
                          </div>
                          
                          {achievement.progress !== undefined && achievement.maxProgress && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>Progress</span>
                                <span>{achievement.progress}/{achievement.maxProgress}</span>
                              </div>
                              <Progress 
                                value={(achievement.progress / achievement.maxProgress) * 100} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Community Stats Tab */}
          <TabsContent value="stats">
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Community Statistics
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  See how our community is growing and thriving
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: Users, label: "Total Users", value: "2.5M", change: "+12.3%", color: "text-blue-500" },
                  { icon: MessageSquare, label: "Posts Today", value: "45.2K", change: "+8.7%", color: "text-green-500" },
                  { icon: Award, label: "Awards Given", value: "1.8M", change: "+15.2%", color: "text-yellow-500" },
                  { icon: TrendingUp, label: "Active Users", value: "850K", change: "+5.4%", color: "text-purple-500" }
                ].map((stat, index) => (
                  <Card key={index} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <CardContent className="p-6 text-center">
                      <stat.icon className={`h-12 w-12 mx-auto mb-4 ${stat.color}`} />
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {stat.value}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        {stat.label}
                      </p>
                      <Badge variant="secondary" className="text-green-600">
                        {stat.change}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* More detailed stats could go here */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Growth Trends</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">New Users (30 days)</span>
                        <span className="font-semibold text-green-600">+125K</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Daily Active Users</span>
                        <span className="font-semibold text-blue-600">850K</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Posts per Day</span>
                        <span className="font-semibold text-purple-600">45.2K</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Comments per Day</span>
                        <span className="font-semibold text-orange-600">180K</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Hash className="h-5 w-5" />
                      <span>Top Communities</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "r/technology", members: "2.1M", growth: "+5.2%" },
                        { name: "r/askreddit", members: "1.8M", growth: "+3.1%" },
                        { name: "r/programming", members: "950K", growth: "+8.7%" },
                        { name: "r/science", members: "780K", growth: "+4.3%" },
                        { name: "r/gaming", members: "720K", growth: "+6.9%" }
                      ].map((community, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{community.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{community.members} members</p>
                          </div>
                          <Badge variant="secondary" className="text-green-600">
                            {community.growth}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}