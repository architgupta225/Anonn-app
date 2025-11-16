import OfflineIndicator from "@/components/OfflineIndicator";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import CreatePost from "@/pages/create-post";
import NotFound from "@/pages/not-found";
import RedirectHome from "@/pages/redirect-home";
import Search from "@/pages/search";
import type {
  Bowl as BowlType,
  Organization as OrganizationType,
} from "@shared/schema";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Import Solana wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";
import {
  BookmarksPage,
  BowlContent,
  BowlsPage,
  HomePage,
  NotificationsPage,
  OrganizationContent,
  OrganizationsPage,
  PollPage,
  PollsPage,
  PostContent,
  ProfilePage,
  SettingsPage,
} from "./pages/index";

import ScrollToTop from "@/components/ScrollToTop";
import { MainLayout } from "./Layout";

function App() {
  // Use Solana devnet - change to 'mainnet-beta' for production
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // Only include Phantom wallet
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <OfflineIndicator />
                <RouterWithLayout />
              </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function RouterWithLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();


  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  // Scroll to top on route changes
  ScrollToTop();

  // Get setLocation from wouter for navigation
  const [, setLocation] = useLocation();

  // Fetch data for Layout
  const { data: bowls } = useQuery<BowlType[]>({
    queryKey: ["/api/bowls"],
    retry: false,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const { data: organizations } = useQuery<OrganizationType[]>({
    queryKey: ["/api/organizations"],
    retry: false,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

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


  const handleCreatePost = () => {
    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      showAuthToast("create post")
      return;
    }
    setLocation("/create-post");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e0e0e] text-gray-300">
        {/* Spinner */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="h-14 w-14 border-2 border-gray-700 border-t-gray-200 rounded-full animate-spin"></div>
          <div className="absolute h-14 w-14 border-2 border-gray-700 rounded-full animate-ping opacity-10"></div>
        </div>

        {/* Loading Text */}
        <h2 className="text-lg font-mono tracking-wide text-gray-300 mb-3">
          Loading <span className="text-gray-100">Anonn</span>...
        </h2>

        {/* Subtle Dots */}
        <div className="flex justify-center space-x-2">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    );
  }

  // If not authenticated, show public routes with layout
  // if (!isAuthenticated) {
  //   return (
  //     <Switch>
  //       <Route path="/auth">
  //         <AuthPage />
  //       </Route>
  //       <Route path="/invite-required">
  //         <InviteRequired />
  //       </Route>

  //       <Route path="/">
  //       <MainLayout
  //         onCreatePost={handleCreatePost}
  //         bowls={bowls}
  //         organizations={organizations}
  //       >
  //         <HomePage
  //           onCreatePost={handleCreatePost}
  //           onExploreCommunities={() => setLocation("/bowls")}
  //           isAuthenticated={isAuthenticated}/>
  //       </MainLayout>
  //     </Route>

  //     <Route path="/polls">
  //       <MainLayout
  //         onCreatePost={handleCreatePost}
  //         bowls={bowls}
  //         organizations={organizations}
  //       >
  //         <PollsPage />
  //       </MainLayout>
  //     </Route>

  //       <Route path="/bowls">
  //         <MainLayout
  //           onCreatePost={handleCreatePost}
  //           bowls={bowls}
  //           organizations={organizations}
  //         >
  //           <BowlsPage />
  //         </MainLayout>
  //       </Route>

  //       <Route path="/organizations">
  //       <MainLayout
  //         onCreatePost={handleCreatePost}
  //         bowls={bowls}
  //         organizations={organizations}
  //       >
  //         <OrganizationsPage />
  //       </MainLayout>
  //     </Route>
  //       <Route path="/*">
  //         <MainLayout
  //           onCreatePost={handleCreatePost}
  //           bowls={bowls}
  //           organizations={organizations}
  //         >
  //           <div className="flex-1 flex items-center justify-center">
  //             <NotFound />
  //           </div>
  //         </MainLayout>
  //       </Route>
  //     </Switch>
  //   );
  // }

  // Authenticated routes
  return (
    <Switch>
      {/* Routes with Layout */}
      <Route path="/">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <HomePage
            onCreatePost={handleCreatePost}
            onExploreCommunities={() => setLocation("/bowls")}
            isAuthenticated={isAuthenticated}
          />
        </MainLayout>
      </Route>

      <Route path="/polls">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <PollsPage />
        </MainLayout>
      </Route>

      <Route path="/organizations">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <OrganizationsPage />
        </MainLayout>
      </Route>

      <Route path="/notifications">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <NotificationsPage />
        </MainLayout>
      </Route>

      <Route path="/bowls">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <BowlsPage />
        </MainLayout>
      </Route>
      <Route path="/bookmarks">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <BookmarksPage />
        </MainLayout>
      </Route>

      <Route path="/profile">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <ProfilePage
            onCreatePost={function (): void {
              throw new Error("Function not implemented.");
            }}
            onExploreCommunities={function (): void {
              throw new Error("Function not implemented.");
            }}
            isAuthenticated={false}
          />
        </MainLayout>
      </Route>

      <Route path="/organizations/:id">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <OrganizationContent />
        </MainLayout>
      </Route>

      <Route path="/poll">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <PollPage />
        </MainLayout>
      </Route>
      <Route path="/post">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <PostContent />
        </MainLayout>
      </Route>
      <Route path="/bowls/:id">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <BowlContent />
        </MainLayout>
      </Route>
      <Route path="/settings">
        <MainLayout
          onCreatePost={handleCreatePost}
          bowls={bowls}
          organizations={organizations}
        >
          <SettingsPage />
        </MainLayout>
      </Route>

      {/* Routes without Layout */}
      <Route path="/auth" component={RedirectHome} />
      <Route path="/create-post" component={CreatePost} />
      <Route path="/search" component={Search} />
      {/* <Route path="/settings" component={Settings} /> */}
      <Route path="/*" component={NotFound} />
    </Switch>
  );
}

export default App;
