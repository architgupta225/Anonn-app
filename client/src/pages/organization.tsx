import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery as useRQ } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import LeftSidebar from "@/components/LeftSidebar";
import PostCard from "@/components/PostCard";
import CreateReviewDialog from "@/components/CreateReviewDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Building, Users, Star, TrendingUp, Calendar, Filter, ExternalLink, PenSquare, 
  MessageSquare, BarChart3, Edit3, ArrowLeft, MapPin, DollarSign, Clock,
  Award, Shield, Heart, Share2, MoreHorizontal, Eye, ThumbsUp, ThumbsDown,
  CheckCircle, AlertTriangle, Target, Zap, Crown, Flame, Globe, Phone,
  Mail, Linkedin, Twitter, Facebook, Instagram, Youtube, Building2,
  Briefcase, GraduationCap, Coffee, Wifi, Car, Utensils, Dumbbell,
  Gamepad2, Music, BookOpen, Camera, Video, ImageIcon, Paperclip,
  Send, Plus, Search, SortAsc, Grid, List, ChevronRight, ChevronDown,
  TrendingUpIcon, TrendingDownIcon, Minus, Bookmark, Flag, Reply,
  MessageCircle, MoreVertical, X
} from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { OrganizationWithStats, PostWithDetails } from "@shared/schema";
import { getContractReadonly, getSignerAccount, toU256, addresses } from "@/lib/starknet";
import { parseU256 } from "@/lib/starknet";
import { parseFeltToString } from "@/lib/starknet";
import { getErc20 } from "@/lib/erc20";

// Mock company data for enhanced features
const mockCompanyData = {
  salaryRanges: [
    { role: "Software Engineer", range: "$120K - $180K", level: "Mid-Level" },
    { role: "Senior Engineer", range: "$160K - $220K", level: "Senior" },
    { role: "Engineering Manager", range: "$200K - $280K", level: "Management" },
    { role: "Product Manager", range: "$140K - $200K", level: "Mid-Level" },
  ],
  benefits: [
    { name: "Health Insurance", icon: Shield, coverage: "100%" },
    { name: "Flexible PTO", icon: Calendar, coverage: "Unlimited" },
    { name: "Remote Work", icon: Wifi, coverage: "Hybrid" },
    { name: "Free Lunch", icon: Utensils, coverage: "Daily" },
    { name: "Gym Membership", icon: Dumbbell, coverage: "Covered" },
    { name: "Parking", icon: Car, coverage: "Free" },
  ],
  officePhotos: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800",
    "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800",
  ],
  interviewProcess: [
    { step: "Application Review", duration: "1-2 days", description: "Initial screening of applications" },
    { step: "Phone Screen", duration: "30 mins", description: "Brief chat with recruiter" },
    { step: "Technical Interview", duration: "1 hour", description: "Coding challenge and technical discussion" },
    { step: "System Design", duration: "45 mins", description: "Architecture and design discussion" },
    { step: "Culture Fit", duration: "30 mins", description: "Team and culture assessment" },
    { step: "Final Decision", duration: "2-3 days", description: "Reference checks and offer" },
  ],
  diversityStats: {
    gender: { male: 60, female: 38, other: 2 },
    ethnicity: { white: 45, asian: 30, hispanic: 12, black: 8, other: 5 },
    leadership: { diverse: 42, total: 100 }
  }
};

const mockQuestions = [
  {
    id: 1,
    question: "What's the work-life balance like?",
    answers: 15,
    votes: 42,
    timeAgo: "2 hours ago",
    topAnswer: "Generally good, 40-45 hour weeks are standard. Most people don't work weekends unless there's an emergency."
  },
  {
    id: 2,
    question: "How is the career growth opportunity?",
    answers: 23,
    votes: 67,
    timeAgo: "5 hours ago",
    topAnswer: "Promotion cycles are clear and fair. Regular 1:1s with managers help track progress."
  },
  {
    id: 3,
    question: "What's the interview process like?",
    answers: 31,
    votes: 89,
    timeAgo: "1 day ago",
    topAnswer: "Standard tech interview process - phone screen, technical interview, system design, and culture fit."
  }
];

export default function Organization() {
  // Memoized empty function to prevent unnecessary re-renders
  const emptyUpdateCallback = useCallback(() => {}, []);
  const params = useParams();
  const [, setLocation] = useLocation();
  const idParam = (params.id as string) || "";
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFollowing, setIsFollowing] = useState(false);
  const [tradingMode, setTradingMode] = useState<"buy" | "sell">("buy");
  const [tradingAmount, setTradingAmount] = useState<string>("");
  const [isTrading, setIsTrading] = useState(false);

  // Check if user has a wallet address for trading
  const hasWalletAddress = !!user?.walletAddress;

  // Organization query - moved to top to avoid temporal dead zone
  const { data: organization, isLoading: orgLoading, error: orgError, refetch } = useRQ<OrganizationWithStats & { features?: any }>({
    queryKey: ["/api/organizations", idParam],
    queryFn: async () => {
      // Check if idParam is a number (numeric ID)
      if (!isNaN(parseInt(idParam))) {
        // Use the standard organization endpoint for numeric IDs
        const response = await fetch(`/api/organizations/${idParam}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        return response.json();
      } else {
        // For non-numeric IDs, treat as organization name and search for it
        const response = await fetch(`/api/organizations/search?q=${encodeURIComponent(idParam)}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        const organizations = await response.json();
        
        // Find the exact match by name
        const exactMatch = organizations.find((org: any) => 
          org.name.toLowerCase() === idParam.toLowerCase()
        );
        
        if (!exactMatch) {
          throw new Error("Organization not found");
        }
        
        return exactMatch;
      }
    },
    enabled: !!idParam,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
    // Real-time updates configuration
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });

  // Resolve onchain company id by name match (after organization is available)
  const { data: onchainCompanyId } = useRQ({
    queryKey: ['onchain-company-id', organization?.name],
    enabled: !!organization?.name,
    queryFn: async () => {
      const c = getContractReadonly();
      const list = await c.get_all_companies();
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
      const target = normalize(organization!.name);
      for (const id of list) {
        const meta = await c.get_company_metadata(id);
        const nameFelt = Array.isArray(meta) ? meta[0] : (meta.name || meta[0]);
        const name = normalize(parseFeltToString(nameFelt));
        if (name === target) return id;
      }
      throw new Error('Company not found on-chain for this organization');
    }
  });

  // Onchain: company stats and user position
  const { data: onchainStats } = useRQ({
    queryKey: ['onchain-company', organization?.id],
    enabled: !!onchainCompanyId,
    queryFn: async () => {
      const c = getContractReadonly();
      const company = await c.get_company(onchainCompanyId);
      const score = await c.calculate_reputation_score(onchainCompanyId);
      const vol24h = await c.get_24h_volume(onchainCompanyId);
      return { company, score, vol24h } as any;
    }
  });

  const { data: onchainPosition } = useRQ({
    queryKey: ['onchain-position', organization?.id],
    enabled: !!onchainCompanyId && !!hasWalletAddress,
    queryFn: async () => {
      const c = getContractReadonly();
      // Use stored wallet address from user profile
      if (!user?.walletAddress) return null;
      const [posVal, negVal] = await c.get_current_position_value(user.walletAddress, onchainCompanyId);
      return { posVal, negVal } as any;
    }
  });

  const { data: onchainUserUsdc } = useRQ({
    queryKey: ['onchain-usdc', organization?.id],
    enabled: !!organization?.id && !!hasWalletAddress,
    queryFn: async () => {
      // Use stored wallet address from user profile
      if (!user?.walletAddress) return null;
      const contract = getContractReadonly();
      const erc20 = getErc20(addresses.usdc, contract.provider);
      const bal = await erc20.balance_of(user.walletAddress);
      return bal as any;
    }
  });

  const usdcBalanceDisplay = useMemo(() => {
    try {
      if (!onchainUserUsdc) return '0.00';
      const wei = parseU256(onchainUserUsdc);
      const whole = wei / 1000000000000000000n;
      const frac = Number(wei % 1000000000000000000n) / 1e18;
      return (Number(whole) + frac).toFixed(2);
    } catch { return '0.00'; }
  }, [onchainUserUsdc]);

  const vol24hDisplay = useMemo(() => {
    try {
      if (!onchainStats?.vol24h) return '0.00';
      const wei = parseU256(onchainStats.vol24h);
      const whole = wei / 1000000000000000000n;
      const frac = Number(wei % 1000000000000000000n) / 1e18;
      return (Number(whole) + frac).toFixed(2);
    } catch { return '0.00'; }
  }, [onchainStats?.vol24h]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const handleCreatePost = useCallback(() => {
    setLocation("/create-post");
  }, [setLocation]);

  useEffect(() => {
    document.title = "Organization - Anonn";
  }, []);

  // Admin detection - admin is suhrad205@gmail.com
  const ADMIN_EMAIL = "suhrad205@gmail.com";
  
  // Get features from server response
  const features = organization?.features;
  
  // Determine if organization is admin-created or user-created
  // Admin-created: createdBy is null OR createdBy is admin user
  // User-created: createdBy is not null AND not admin user
  const isAdminCreated = organization?.createdBy === null || features?.isAdminCreated;
  const isUserCreated = organization?.createdBy !== null && organization?.createdBy !== undefined && !features?.isAdminCreated;
  
  // Get the first letter of organization name for user-created organization logos
  const getOrganizationLogo = useCallback(() => {
    if (isUserCreated && organization?.name) {
      const firstLetter = organization.name.charAt(0).toUpperCase();
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-indigo-500', 'bg-orange-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500'];
      const colorIndex = organization.name.charCodeAt(0) % colors.length;
      return (
        <div className={`w-16 h-16 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-2xl font-bold`}>
          {firstLetter}
        </div>
      );
    }
    return null; // Admin-created organizations will use their existing logo system
  }, [isUserCreated, organization?.name]);

  // Fetch all posts for the organization (reviews, discussions, etc.)
  const { data: allPosts = [], isLoading: postsLoading, error: postsError } = useRQ<PostWithDetails[]>({
    queryKey: ["/api/posts", "organization", organization?.id ?? idParam],
    queryFn: async () => {
      if (!organization?.id) throw new Error("Organization not loaded");
      const response = await fetch(`/api/posts?organizationId=${organization.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!organization?.id,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch polls for the organization  
  const { data: polls = [], isLoading: pollsLoading, error: pollsError } = useRQ<any[]>({
    queryKey: ["/api/polls", "organization", organization?.id ?? idParam],
    queryFn: async () => {
      if (!organization?.id) throw new Error("Organization not loaded");
      const response = await fetch(`/api/polls?organizationId=${organization.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!organization?.id,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/auth";
        return false;
      }
      return failureCount < 3;
    },
  });

  // Filter posts by type (excluding polls)
  const posts = allPosts.filter(post => post.type !== 'poll');

  useEffect(() => {
    if (!authLoading && !isAuthenticated && window.location.pathname !== '/auth') {
      window.location.href = "/auth";
      return;
    }
  }, [isAuthenticated, authLoading]);

  // Handle errors with useEffect to prevent infinite re-renders
  useEffect(() => {
    if (orgError || postsError || pollsError) {
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    }
  }, [orgError, postsError, pollsError, toast]);



  // Memoized handlers to prevent infinite re-renders
  const handleBackToOrganizations = useCallback(() => {
    setLocation("/organizations");
  }, [setLocation]);

  const handleToggleFollowing = useCallback(() => {
    setIsFollowing(!isFollowing);
  }, [isFollowing]);

  const handleOpenWebsite = useCallback(() => {
    window.open(organization?.website || '', '_blank');
  }, [organization?.website]);

  const handleTradingMode = useCallback((mode: "buy" | "sell") => {
    setTradingMode(mode);
  }, []);

  const handleTradingAmount = useCallback((amount: string) => {
    setTradingAmount(amount);
  }, []);

  const handleTrade = useCallback((side: 'positive' | 'negative') => {
    const executeTrade = async () => {
      try {
        if (!onchainCompanyId) return;
        const amountFloat = parseFloat(tradingAmount || '0');
        if (!amountFloat || amountFloat <= 0) {
          toast({ title: 'Enter amount', description: 'Please enter a valid amount in USDC', variant: 'destructive' });
          return;
        }
        setIsTrading(true);

        // Check if user has a wallet address stored
        if (!user?.walletAddress) {
          toast({ title: 'Wallet Required', description: 'Please connect a wallet to trade', variant: 'destructive' });
          setIsTrading(false);
          return;
        }

        // Get signer from Dynamic for transaction signing
        const dyn = (window as any)?.dynamic || (window as any)?.__dynamic;
        const account = await getSignerAccount(dyn);
        if (!account) {
          toast({ title: 'Wallet Connection', description: 'Please connect your wallet to sign transactions', variant: 'destructive' });
          setIsTrading(false);
          return;
        }

        const contractAddr = addresses.contract;
        if (!contractAddr) throw new Error('Contract address missing');

        // Approve USDC if buying (invest)
        if (tradingMode === 'buy') {
          const usdc = getErc20(addresses.usdc, account);
          const wei = BigInt(Math.round(amountFloat * 1e18));
          const amountU256 = toU256(wei);
          // Optional: check allowance and approve if needed
          await usdc.approve(contractAddr, amountU256).then((tx: any) => account.waitForTransaction(tx.hash));
        }

        // Call contract
        const anonn = getContractReadonly().connect(account);

        if (tradingMode === 'buy') {
          const wei = BigInt(Math.round(amountFloat * 1e18));
          const amountU256 = toU256(wei);
          if (side === 'positive') {
            const tx = await anonn.invest_positive(onchainCompanyId, amountU256);
            await account.waitForTransaction(tx.hash);
          } else {
            const tx = await anonn.invest_negative(onchainCompanyId, amountU256);
            await account.waitForTransaction(tx.hash);
          }
          toast({ title: 'Success', description: `Invested $${amountFloat.toFixed(2)} on ${side === 'positive' ? 'Trust' : 'Distrust'}` });
        } else {
          // Sell path = withdraw entire position on the chosen side
          const sideEnum = side === 'positive' ? { Positive: {} } : { Negative: {} } as any;
          const tx = await anonn.withdraw_position(onchainCompanyId, sideEnum);
          await account.waitForTransaction(tx.hash);
          toast({ title: 'Withdrawn', description: `Closed your ${side === 'positive' ? 'Trust' : 'Distrust'} position` });
        }

        // Refresh page data
        window.location.reload();
      } catch (err: any) {
        console.error(err);
        toast({ 
          title: 'Transaction Failed', 
          description: err.message || 'Failed to execute trade', 
          variant: 'destructive' 
        });
      } finally {
        setIsTrading(false);
      }
    };

    executeTrade();
  }, [onchainCompanyId, tradingAmount, user?.walletAddress, tradingMode, toast]);

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navigation />
        <div className="flex w-full h-screen">
          <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] sticky top-16 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
            <div className="p-4 space-y-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          </aside>
          <main className="flex-1 min-w-0 bg-white dark:bg-slate-900 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 w-full">
              {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full mb-4" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navigation />
        <div className="flex w-full h-screen">
          <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] sticky top-16 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
            <LeftSidebar 
              onCreatePost={handleCreatePost}
              onCreateReview={handleCreatePost}
            />
          </aside>
          <main className="flex-1 min-w-0 bg-white dark:bg-slate-900 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 w-full">
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Organization not found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
                  The organization you're looking for doesn't exist or has been removed.
                </p>
                <Button 
                  onClick={() => setLocation("/organizations")}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ArrowLeft className="h-5 w-5 mr-3" />
                  Back to Organizations
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      
      {/* Main Layout */}
      <div className="flex w-full min-h-screen">
        {/* Left Sidebar */}
        <aside className={`${sidebarOpen ? 'w-[240px]' : 'w-[60px]'} h-[calc(100vh-4rem)] sticky top-16 bg-white/80 backdrop-blur-sm border-r border-gray-200 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
          <LeftSidebar 
            onCreatePost={handleCreatePost}
            onCreateReview={handleCreatePost}
            
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-6">
            {/* Back Button */}
            <div className="mb-6">
              <Button 
                onClick={() => setLocation("/organizations")}
                variant="ghost"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Organizations</span>
              </Button>
            </div>

            {/* Company Header */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 mb-8 overflow-hidden">
              {/* Cover Photo */}
              <div className="h-48 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 relative">
                <div className="absolute inset-0 bg-[#E8EAE9]/20"></div>

              </div>

              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-6">
                    <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-700 -mt-12 relative z-10">
                      {isUserCreated ? (
                        // User-created: Simple letter logo
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                          {organization.name.charAt(0)}
                        </AvatarFallback>
                      ) : (
                        // Admin-created: Full logo
                        <>
                          <AvatarImage src={`https://logo.clearbit.com/${organization.name.toLowerCase().replace(/\s+/g, '')}.com`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                            {organization.name.charAt(0)}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                          {organization.name}
                        </h1>
                        {!isUserCreated && (
                          <>
                            <CheckCircle className="h-6 w-6 text-blue-500" />
                            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                              <Crown className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </>
                        )}
                      </div>
                      <p className="text-xl text-gray-600 dark:text-gray-300 mb-3 max-w-2xl">
                        {organization.description}
                      </p>
                      {/* Removed hardcoded company info - will be dynamic based on actual data */}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CreateReviewDialog 
                      organizationId={organization.id} 
                      organizationName={organization.name}
                      trigger={
                        <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg">
                          <PenSquare className="h-4 w-4 mr-2" />
                          Write Review
                        </Button>
                      }
                    />
                    <ShareButton 
                      url={window.location.href}
                      title={`${organization.name} - Organization`}
                      description={organization.description || `Check out ${organization.name} on Anonn`}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{(organization.averageRating || 0).toFixed(1)}</div>
                    <div className="flex items-center justify-center mb-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                      Overall Rating ({organization.reviewCount || 0} reviews)
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Real-time updates active"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{polls.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Polls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{(posts.length + polls.length)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Content</div>
                  </div>
                </div>

                {/* Social Links - Only for Admin-Created Organizations */}
                {!isUserCreated && (
                  <div className="flex items-center space-x-4">
                    {organization.website && (
                      <Button variant="outline" size="sm" onClick={() => window.open(organization.website || '', '_blank')}>
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Trust Market Section - Only for Admin-Created Organizations */}
            {!isUserCreated && (
              <div className="space-y-6">
                {/* Main Trust Market Card */}
                <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-50 border border-gray-200 shadow-2xl">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Left: Trust Stats */}
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-3xl font-bold text-[#E8EAE9] mb-3">Trust Market</h2>
                        <p className="text-gray-700 text-lg font-medium">Bet on {organization.name}'s trustworthiness</p>
                      </div>
                      
                                              <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/90 rounded-xl p-6 text-center border border-gray-200 shadow-lg">
                            <div className="text-4xl font-bold text-green-600 mb-2">{Math.max(0, Number(onchainStats?.score ?? 0))}%</div>
                            <div className="text-gray-700 font-semibold">Trust Score</div>
                          </div>
                          <div className="bg-white/90 rounded-xl p-6 text-center border border-gray-200 shadow-lg">
                            <div className="text-4xl font-bold text-red-600 mb-2">{Math.max(0, 0 - Number(onchainStats?.score ?? 0))}%</div>
                            <div className="text-gray-700 font-semibold">Distrust Score</div>
                          </div>
                        </div>

                      <div className="space-y-4 bg-white/90 rounded-xl p-4 border border-gray-200 shadow-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Market Volume</span>
                          <span className="text-[#E8EAE9] font-bold text-lg">${vol24hDisplay}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">24h Volume</span>
                          <span className="text-[#E8EAE9] font-bold text-lg">${vol24hDisplay}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Total Votes</span>
                          <span className="text-[#E8EAE9] font-bold text-lg">{organization.reviewCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Dual Trust/Distrust Chart */}
                    <div className="space-y-4 xl:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-[#E8EAE9]">Trust vs Distrust History</h3>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#E8EAE9] hover:bg-gray-100">1H</Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#E8EAE9] hover:bg-gray-100">1D</Button>
                          <Button variant="ghost" size="sm" className="bg-blue-600 text-white font-semibold">7D</Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#E8EAE9] hover:bg-gray-100">1M</Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#E8EAE9] hover:bg-gray-100">1Y</Button>
                        </div>
                      </div>
                      
                      <div className="h-64 bg-white/90 rounded-xl p-8 relative shadow-lg">
                        {/* Chart Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between text-sm text-gray-500 pt-2 pb-6">
                          <div className="border-b border-gray-300 w-full"></div>
                          <div className="border-b border-gray-300 w-full"></div>
                          <div className="border-b border-gray-300 w-full"></div>
                          <div className="border-b border-gray-300 w-full"></div>
                          <div className="border-b border-gray-300 w-full"></div>
                        </div>
                        
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-sm text-gray-700 font-medium pt-2 pb-6">
                          <span>100%</span>
                          <span>75%</span>
                          <span>50%</span>
                          <span>25%</span>
                          <span>0%</span>
                        </div>

                        {/* Chart Lines */}
                        <div className="relative h-full ml-12">
                          {/* Trust Line (Green) */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              points="0,35 8,32 16,28 24,30 32,25 40,28 48,30 56,28 64,32 72,30 80,28 88,32 96,28"
                            />
                          </svg>
                          
                          {/* Distrust Line (Red) */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="3"
                              points="0,65 8,68 16,72 24,70 32,75 40,72 48,70 56,72 64,68 72,70 80,72 88,68 96,72"
                            />
                          </svg>

                          {/* Current time indicator */}
                          <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-gray-600"></div>
                          
                          {/* Tooltip */}
                          <div className="absolute top-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-sm border border-gray-200 shadow-lg">
                            <div className="font-semibold">Time: 11:46 AM</div>
                            <div className="text-green-400 font-medium">Trust: 72.3%</div>
                            <div className="text-red-400 font-medium">Distrust: 27.7%</div>
                          </div>
                        </div>

                        {/* X-axis labels */}
                        <div className="flex justify-between text-sm text-gray-700 font-medium mt-6 px-12">
                          <span>Mon</span>
                          <span>Tue</span>
                          <span>Wed</span>
                          <span>Thu</span>
                          <span>Fri</span>
                          <span>Sat</span>
                          <span>Sun</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Trading Interface */}
                    <div className="space-y-6">
                      {/* Buy/Sell Toggle */}
                      <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
                        <Button 
                          onClick={() => setTradingMode("buy")}
                          className={`flex-1 font-semibold transition-all ${
                            tradingMode === "buy" 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "text-gray-600 hover:text-[#E8EAE9] hover:bg-gray-200"
                          }`}
                        >
                          Buy
                        </Button>
                        <Button 
                          onClick={() => setTradingMode("sell")}
                          className={`flex-1 font-semibold transition-all ${
                            tradingMode === "sell" 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "text-gray-600 hover:text-[#E8EAE9] hover:bg-gray-200"
                          }`}
                        >
                          Sell
                        </Button>
                      </div>

                      {/* Token Prices */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/90 rounded-xl p-4 text-center border border-gray-200 shadow-lg">
                          <div className="text-2xl font-bold text-green-600 mb-1">$1.00</div>
                          <div className="text-gray-700 font-medium">Trust Token</div>
                        </div>
                        <div className="bg-white/90 rounded-xl p-4 text-center border border-gray-200 shadow-lg">
                          <div className="text-2xl font-bold text-red-600 mb-1">$1.00</div>
                          <div className="text-gray-700 font-medium">Distrust Token</div>
                        </div>
                      </div>

                      {/* Trading Buttons */}
                      <div className="grid grid-cols-2 gap-4">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-semibold" disabled={isTrading} onClick={() => handleTrade('positive')}>
                          <ThumbsUp className="h-6 w-6 mr-2" />
                          {tradingMode === "buy" ? (isTrading ? "Processing..." : "Buy") : (isTrading ? "Processing..." : "Sell")} Trust
                        </Button>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-14 text-lg font-semibold" disabled={isTrading} onClick={() => handleTrade('negative')}>
                          <ThumbsDown className="h-6 w-6 mr-2" />
                          {tradingMode === "buy" ? (isTrading ? "Processing..." : "Buy") : (isTrading ? "Processing..." : "Sell")} Distrust
                        </Button>
                      </div>
                      {onchainPosition && (
                        <div className="text-center text-sm text-gray-600 font-medium">
                          Current Position Value: ${(() => {
                            try {
                              const pos = parseU256((onchainPosition as any).posVal);
                              const neg = parseU256((onchainPosition as any).negVal);
                              const total = pos + neg;
                              const whole = total / 1000000000000000000n;
                              const frac = Number(total % 1000000000000000000n) / 1e18;
                              return (Number(whole) + frac).toFixed(2);
                            } catch { return '0.00'; }
                          })()}
                        </div>
                      )}

                      {/* Amount Input */}
                      <div className="space-y-3">
                        <label className="text-gray-700 font-semibold">Amount</label>
                        <Input 
                          placeholder="0.00" 
                          value={tradingAmount}
                          onChange={(e) => setTradingAmount(e.target.value)}
                          className="bg-white border-gray-300 text-[#E8EAE9] placeholder:text-gray-500 text-lg h-12"
                          type="number"
                        />
                        <div className="flex justify-between text-gray-600 font-medium">
                          <span>Balance: ${usdcBalanceDisplay}</span>
                          <span>Fee: 2%</span>
                        </div>
                      </div>

                      {/* Quick Amount Buttons */}
                      <div className="flex space-x-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setTradingAmount("10")}
                          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          $10
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setTradingAmount("50")}
                          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          $50
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setTradingAmount("100")}
                          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          $100
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setTradingAmount("1000")}
                          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          Max
                        </Button>
                      </div>

                      {/* Outcome Tokens */}
                      <div className="bg-white/90 rounded-xl p-4 border border-gray-200 shadow-lg">
                        <div className="text-gray-700 font-semibold mb-3">Outcome Tokens</div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                            <span className="text-gray-700 font-medium">Trust</span>
                          </div>
                          <span className="text-[#E8EAE9] font-bold">0</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                            <span className="text-gray-700 font-medium">Distrust</span>
                          </div>
                          <span className="text-[#E8EAE9] font-bold">0</span>
                        </div>
                      </div>

                      {/* Place Order Button */}
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-semibold" 
                        disabled={!hasWalletAddress || isTrading}
                        onClick={() => {
                          if (!hasWalletAddress) {
                            toast({ 
                              title: 'Wallet Required', 
                              description: 'Please connect a wallet to trade', 
                              variant: 'destructive' 
                            });
                            return;
                          }
                          // Call the trading function based on current mode
                          handleTrade(tradingMode === 'buy' ? 'positive' : 'negative');
                        }}
                      >
                        {!hasWalletAddress ? 'Connect Wallet to Trade' : isTrading ? 'Processing...' : `Buy ${tradingMode === 'buy' ? 'Trust' : 'Distrust'}`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trust Distribution Bar */}
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trust Distribution</h3>
                      <span className="text-lg text-gray-600 dark:text-gray-400 font-medium">1,247 total votes</span>
                    </div>
                    <div className="relative w-full h-16 bg-gray-200 dark:bg-slate-600 rounded-xl overflow-hidden border border-gray-300 dark:border-slate-500">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300 flex items-center justify-center"
                        style={{ width: '72%' }}
                      >
                        <span className="text-white font-bold text-lg">72% Trust</span>
                      </div>
                      <div 
                        className="absolute right-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-300 flex items-center justify-center"
                        style={{ width: '28%' }}
                      >
                        <span className="text-white font-bold text-lg">28% Distrust</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 p-1 m-1 rounded-xl border-0">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-md transition-all duration-300"
                  >
                    <Building className="h-4 w-4" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="posts"
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 data-[state=active]:shadow-md transition-all duration-300"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Posts</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="polls"
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-md transition-all duration-300"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Polls</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Overview Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Company Overview</h2>
                      <p className="text-blue-700 dark:text-blue-300">Complete company profile and insights</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* About Company - Only show if there's a description */}
                    {organization.description && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Building className="h-5 w-5" />
                            <span>About {organization.name}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            {organization.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Community</Badge>
                            <Badge variant="secondary">Discussion</Badge>
                            <Badge variant="secondary">Reviews</Badge>
                            <Badge variant="secondary">Polls</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Rating Breakdown */}
                    <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                      <CardHeader>
                                              <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5" />
                          <span>Rating Breakdown</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => refetch()}
                          className="text-xs"
                          title="Refresh ratings"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </Button>
                      </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { label: "Work/Life Balance", rating: organization?.avgWorkLifeBalance, color: "bg-blue-500" },
                          { label: "Culture & Values", rating: organization?.avgCultureValues, color: "bg-green-500" },
                          { label: "Career Opportunities", rating: organization?.avgCareerOpportunities, color: "bg-indigo-500" },
                          { label: "Compensation", rating: organization?.avgCompensation, color: "bg-yellow-500" },
                          { label: "Management", rating: organization?.avgManagement, color: "bg-red-500" },
                        ].map((item) => (
                          <div key={item.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className="text-sm font-bold">
                                {item.rating !== null && item.rating !== undefined ? item.rating.toFixed(1) : 'N/A'}
                              </span>
                            </div>
                            <Progress value={item.rating ? item.rating * 20 : 0} className="h-2" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>



                    {/* Community Discussions - Only for User-Created Organizations */}
                    {isUserCreated && posts.length > 0 && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Recent Discussions</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {posts.slice(0, 3).map((post) => (
                            <div key={post.id} className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                              <div className="flex items-start space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={post.author?.profileImageUrl || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {post.author?.username?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-sm text-reddit-orange">{post.author?.username || 'User'}</span>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                    {post.type === 'review' ? (
                                      <span className="flex items-center space-x-2">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        <span>Review with ratings</span>
                                        {post.workLifeBalance && (
                                          <span className="text-xs text-gray-500">
                                            (WLB: {post.workLifeBalance}/5, Culture: {post.cultureValues}/5, etc.)
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      post.content
                                    )}
                                  </p>
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span>{post.commentCount || 0} comments</span>
                                    <span>{post.upvotes || 0} upvotes</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {posts.length > 3 && (
                            <Button variant="outline" className="w-full">
                              View All Discussions ({posts.length})
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Detailed Charts Section - Only for Admin-Created Organizations */}
                    {!isUserCreated && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5" />
                            <span>Market Analytics</span>
                          </CardTitle>
                        </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Price Chart */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold">Token Price History</h4>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm">1H</Button>
                                <Button variant="ghost" size="sm">1D</Button>
                                <Button variant="ghost" size="sm" className="bg-blue-100 text-blue-700">7D</Button>
                                <Button variant="ghost" size="sm">1M</Button>
                                <Button variant="ghost" size="sm">1Y</Button>
                              </div>
                            </div>
                            <div className="h-48 bg-gray-50 dark:bg-slate-700 rounded-lg p-4 relative">
                              {/* Chart Grid */}
                              <div className="absolute inset-0 flex flex-col justify-between">
                                <div className="border-b border-gray-200 dark:border-slate-600 w-full"></div>
                                <div className="border-b border-gray-200 dark:border-slate-600 w-full"></div>
                                <div className="border-b border-gray-200 dark:border-slate-600 w-full"></div>
                                <div className="border-b border-gray-200 dark:border-slate-600 w-full"></div>
                                <div className="border-b border-gray-200 dark:border-slate-600 w-full"></div>
                              </div>
                              
                              {/* Y-axis labels */}
                              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                                <span>$1.00</span>
                                <span>$0.75</span>
                                <span>$0.50</span>
                                <span>$0.25</span>
                                <span>$0.00</span>
                              </div>

                              {/* Chart Lines */}
                              <div className="relative h-full ml-8">
                                {/* Trust Price Line (Green) */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <polyline
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    points="0,28 8,32 16,30 24,25 32,28 40,30 48,28 56,30 64,32 72,30 80,28 88,32 96,28"
                                  />
                                </svg>
                                
                                {/* Distrust Price Line (Red) */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <polyline
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="2"
                                    points="0,72 8,68 16,70 24,75 32,72 40,70 48,72 56,70 64,68 72,70 80,72 88,68 96,72"
                                  />
                                </svg>
                              </div>

                              {/* X-axis labels */}
                              <div className="flex justify-between text-xs text-gray-500 mt-2 ml-8">
                                <span>Mon</span>
                                <span>Tue</span>
                                <span>Wed</span>
                                <span>Thu</span>
                                <span>Fri</span>
                                <span>Sat</span>
                                <span>Sun</span>
                              </div>
                            </div>
                          </div>

                          {/* Volume Chart */}
                          <div>
                            <h4 className="font-semibold mb-4">Trading Volume</h4>
                            <div className="h-32 bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                              <div className="h-full flex items-end space-x-1">
                                {[45, 52, 38, 67, 89, 76, 92, 85, 78, 65, 88, 95].map((value, index) => (
                                  <div key={index} className="flex-1 bg-gradient-to-t from-blue-400 to-blue-600 rounded-t" 
                                       style={{ height: `${value}%` }}></div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Market Stats */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                              <div className="text-lg font-bold text-green-600">$0.72</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Current Price</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">+5.2%</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">24h Change</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">1,247</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Total Votes</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )}

                    {/* Benefits - Only for Admin-Created Organizations */}
                    {!isUserCreated && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Award className="h-5 w-5" />
                            <span>Benefits & Perks</span>
                          </CardTitle>
                        </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {mockCompanyData.benefits.map((benefit) => {
                            const IconComponent = benefit.icon;
                            return (
                              <div key={benefit.name} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{benefit.name}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{benefit.coverage}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Recent Activity - Only for Admin-Created Organizations */}
                    {!isUserCreated && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-lg">Recent Activity</CardTitle>
                        </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">Alex bought 75 trust tokens for $54</span>
                          <span className="text-xs text-gray-500">1m ago</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">Sarah bought 120 distrust tokens for $33.6</span>
                          <span className="text-xs text-gray-500">3m ago</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">Mike sold 50 trust tokens for $36</span>
                          <span className="text-xs text-gray-500">5m ago</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">Emma sold 80 distrust tokens for $22.4</span>
                          <span className="text-xs text-gray-500">8m ago</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">David bought 200 trust tokens for $144</span>
                          <span className="text-xs text-gray-500">12m ago</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">Lisa bought 95 distrust tokens for $26.6</span>
                          <span className="text-xs text-gray-500">15m ago</span>
                        </div>
                      </CardContent>
                    </Card>
                    )}

                    {/* Quick Actions */}
                    <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                      <CardContent className="p-6 space-y-3">
                        <CreateReviewDialog 
                          organizationId={organization.id} 
                          organizationName={organization.name}
                          trigger={
                            <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                              <PenSquare className="h-4 w-4 mr-2" />
                              Write Review
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setLocation("/create-post")}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Ask Question
                        </Button>
                        {isUserCreated && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setLocation("/create-post?type=poll")}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Create Poll
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Community Stats - Only for User-Created Organizations */}
                    {isUserCreated && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-lg">Community Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Posts</span>
                            <span className="font-medium">{posts.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Polls</span>
                            <span className="font-medium">{polls.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Reviews</span>
                            <span className="font-medium">{organization.reviewCount || 0}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Company Stats - Only for Admin-Created Organizations */}
                    {!isUserCreated && (
                      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-lg">Company Stats</CardTitle>
                        </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Reviews</span>
                          <span className="font-medium">{organization.reviewCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Posts</span>
                          <span className="font-medium">{posts.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Polls</span>
                          <span className="font-medium">{polls.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Average Rating</span>
                          <span className="font-medium">{(organization.averageRating || 0).toFixed(1)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    )}

                    {/* Removed hardcoded Diversity Stats section */}
                  </div>
                </div>
              </TabsContent>

              {/* Posts Tab */}
              <TabsContent value="posts" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Company Posts</h2>
                  <Button
                    onClick={() => setLocation(`/create-post?organizationId=${organization.id}`)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <PenSquare className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </div>

                {postsLoading ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700 animate-pulse">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-12 h-12 rounded-full bg-green-200 dark:bg-green-700" />
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-48 bg-green-200 dark:bg-green-700" />
                          <Skeleton className="h-4 w-64 bg-green-200 dark:bg-green-700" />
                        </div>
                      </div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Skeleton className="w-10 h-10 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex space-x-4">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-6">
                    {posts.map((post: PostWithDetails) => (
                      <Card key={post.id} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <PostCard post={post} onUpdate={emptyUpdateCallback} />
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl border border-green-200 dark:border-green-700 p-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-3">No discussions yet</h3>
                      <p className="text-green-700 dark:text-green-300 mb-8 text-lg">Start the conversation about {organization.name}!</p>
                      <Button
                        onClick={() => setLocation(`/create-post?organizationId=${organization.id}`)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3"
                      >
                        <PenSquare className="h-5 w-5 mr-2" />
                        Create First Discussion
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Polls Tab */}
              <TabsContent value="polls" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Company Polls</h2>
                  <Button 
                    onClick={() => setLocation(`/create-post?organizationId=${organization.id}&type=poll`)}
                    className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Poll
                  </Button>
                </div>

                {pollsLoading ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700 animate-pulse">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-700" />
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-48 bg-purple-200 dark:bg-purple-700" />
                          <Skeleton className="h-4 w-64 bg-purple-200 dark:bg-purple-700" />
                        </div>
                      </div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Skeleton className="w-10 h-10 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-4/5" />
                              <Skeleton className="h-8 w-3/4" />
                            </div>
                            <div className="flex space-x-4">
                              <Skeleton className="h-6 w-16" />
                              <Skeleton className="h-6 w-16" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : polls.length > 0 ? (
                  <div className="space-y-6">
                    {polls.map((poll: any) => (
                      <Card key={poll.id} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {poll.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {poll.description}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{poll.author?.username || 'Anonymous'}</span>
                                <span>•</span>
                                <span>{poll.createdAt ? formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true }) : 'Unknown date'}</span>
                                <span>•</span>
                                <span>{poll.upvotes || 0} votes</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {poll.options?.map((option: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                <span className="text-sm font-medium">{option.text}</span>
                                <span className="text-sm text-gray-500">{option.votes || 0} votes</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl border border-purple-200 dark:border-purple-700 p-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-3">No polls yet</h3>
                      <p className="text-purple-700 dark:text-purple-300 mb-8 text-lg">Create interactive surveys about {organization.name}!</p>
                      <Button
                        onClick={() => setLocation(`/create-post?organizationId=${organization.id}&type=poll`)}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3"
                      >
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Create First Poll
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>


            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}