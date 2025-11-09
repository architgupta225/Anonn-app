import { Edit3, BarChart3, Circle, Triangle, FileText, LogIn, Loader2, ArrowRight } from "lucide-react";
import type { Bowl, Organization } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface RightSidebarProps {
  bowls?: Bowl[];
  organizations?: Organization[];
  onCreatePost: () => void;
}

export default function RightSidebar({
  bowls,
  organizations,
  onCreatePost,
}: RightSidebarProps) {
  const { 
    isAuthenticated, 
    user, 
    login, 
    getAccessToken, 
    setDbProfile,
    isLoading: authLoading 
  } = useAuth();
  const { setVisible } = useWalletModal();
  const { connected, publicKey, connecting } = useWallet();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle wallet connection and authentication flow
  useEffect(() => {
    // If wallet is connected but not authenticated, try to login
    if (connected && publicKey && !isAuthenticated && !authLoading) {
      console.log("Wallet connected, attempting authentication...");
      handleAuthentication();
    }

    // If authenticated and user data is loaded, check profile completion
    if (isAuthenticated && user) {
      console.log("User authenticated, checking profile...");
      // Check if profile needs completion (only bio required)
      const hasBio = Boolean(user.bio?.trim());
      
      if (!hasBio) {
        // Show profile completion dialog
        setBio(user.bio || "");
        setProfileDialogOpen(true);
      }
    }
  }, [connected, publicKey, isAuthenticated, user, authLoading]);

  // Handle connecting state
  useEffect(() => {
    setIsConnecting(connecting);
  }, [connecting]);

  const handleAuthentication = async () => {
    try {
      console.log("Authenticating with backend...");
      if (!publicKey) {
        throw new Error("No public key available");
      }

      // Call login to authenticate with the backend
      await login();
      
      toast({
        title: "Wallet connected!",
        description: "Successfully authenticated with Anonn.",
      });
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication failed",
        description: "Failed to authenticate with the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConnectWallet = () => {
    console.log("Opening wallet modal...");
    setVisible(true);
  };

  async function submitProfile() {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication token not available. Please try logging in again.');
      }

      const payload = {
        bio: bio.trim() || undefined,
      };

      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to update profile: ${response.status}`);
      }

      const updatedUser = await response.json();
      setDbProfile(updatedUser);
      
      toast({
        title: "Profile completed!",
        description: "Your profile has been set up successfully.",
      });

      setProfileDialogOpen(false);
    } catch (error) {
      console.error('[auth] Profile submission error:', error);
      toast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Unable to complete your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Company logo colors - matching the image
  const getCompanyLogoStyle = (index: number) => {
    const styles = [
      { bg: "bg-emerald-400", text: "text-white" }, // Abstract - green
      { bg: "bg-purple-600", text: "text-white" },  // Memed - purple
      { bg: "bg-blue-600", text: "text-white" },    // FantasyLog - blue
      { bg: "bg-gradient-to-br from-purple-500 to-pink-500", text: "text-white" }, // Somnia - gradient
      { bg: "bg-yellow-400", text: "text-gray-900" }, // Bigcoin - yellow
    ];
    return styles[index % styles.length];
  };

  return (
    <aside className="hidden md:block w-80 flex-shrink-0">
      {/* Conditional Section based on Authentication */}
      {isAuthenticated ? (
        /* CREATE Section - Show when authenticated */
        <div className="mb-6 border border-gray-700 bg-black overflow-hidden">
          <div onClick={onCreatePost} className="bg-gradient-to-br cursor-pointer from-[#a8d5e2] to-[#b3d9e6] p-8 h-32 flex items-center justify-center">
            <button
              onClick={onCreatePost}
              className="flex items-center gap-2 text-gray-900 hover:text-gray-700 hover:scale-105 font-medium text-base"
            >
              <Edit3 className="w-5 h-5" />
              CREATE
            </button>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-700">
            <button
              onClick={onCreatePost}
              className="flex items-center text-white justify-center gap-2 py-3 bg-black hover:bg-gray-900 text-sm font-medium transition-colors border-r border-gray-700"
            >
              <BarChart3 className="w-4 h-4" />
              POLL
            </button>
            <button
              onClick={onCreatePost}
              className="flex items-center text-white justify-center gap-2 py-3 bg-black hover:bg-gray-900 text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              POST
            </button>
          </div>
        </div>
      ) : (
        /* CONNECT WALLET Section - Show when not authenticated */
        <div className="mb-6 border border-gray-700 bg-black overflow-hidden">
          <div className="bg-gradient-to-br from-[#a8d5e2] to-[#b3d9e6] p-8 h-32 flex items-center justify-center">
            <div className="text-center">
              
              <Button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 text-gray-700 text-xl hover:text-gray-900 hover:scale-105 font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITIES Section */}
      <div className="bg-black border border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Circle className="h-3 w-3 text-white fill-white" />
          <h3 className="font-semibold text-white uppercase text-xs tracking-wide">
            COMMUNITIES
          </h3>
        </div>
        <div className="space-y-2">
          {bowls?.slice(0, 4).map((bowl) => (
            <div key={bowl.id}>
              <a
                href={`/bowls/${encodeURIComponent(bowl.name)}`}
                className="text-gray-400 hover:text-white transition-colors text-sm block"
              >
                {bowl.name?.toLowerCase().replace(/\s+/g, "")}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* COMPANIES Section */}
      <div className="bg-black border border-gray-700 p-4">
        <h3 className="text-xs text-white font-semibold mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Triangle className="w-3 h-3 fill-white text-white" />
          COMPANIES
        </h3>
        <div className="space-y-3">
          {organizations?.slice(0, 5).map((org, index) => {
            const logoStyle = getCompanyLogoStyle(index);
            return (
              <div key={org.id} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 ${logoStyle.bg} rounded flex items-center justify-center flex-shrink-0`}
                >
                  <span className={`text-lg font-bold ${logoStyle.text}`}>
                    {org.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-sm text-gray-300 truncate">
                  {org.name}
                </span>
                <div className="flex items-center flex-shrink-0">
                  <div className="px-2 py-2 bg-emerald-300 text-gray-900  text-xs font-bold min-w-[32px] text-center">
                    {Math.floor(Math.random() * 40) + 60}
                  </div>
                  <div className="px-2 py-2 bg-red-300 text-red-900  text-xs font-bold min-w-[32px] text-center">
                    {Math.floor(Math.random() * 40) + 30}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile Completion Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-black border-gray-700">
          <DialogHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#a8d5e2] to-[#b3d9e6] rounded-2xl mb-4">
              <Edit3 className="h-8 w-8 text-gray-900" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">Complete your profile</DialogTitle>
            <p className="text-sm text-gray-400 mt-2">
              Help us personalize your experience
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Bio (Optional)</label>
              <Input 
                placeholder="Tell us about yourself..." 
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                className="rounded-xl border-gray-600 bg-gray-900 text-white focus:border-[#a8d5e2] focus:ring-[#a8d5e2]/20 h-12"
              />
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button 
              disabled={isSubmitting} 
              onClick={submitProfile} 
              className="w-full h-12 bg-gradient-to-r from-[#a8d5e2] to-[#b3d9e6] text-gray-900 font-bold rounded-xl disabled:opacity-50 shadow-lg hover:from-[#9bc8d5] hover:to-[#a6ccd9]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></div>
                  Completing Profile...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Profile
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}