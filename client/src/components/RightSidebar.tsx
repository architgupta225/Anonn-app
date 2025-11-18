import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Bowl, Organization } from "@shared/schema";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  ArrowRight,
  Camera,
  Circle,
  Edit3,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { navigate } from "wouter/use-browser-location";

import { z } from "zod";
import { SvgIcon } from "./SvgIcon";

interface RightSidebarProps {
  bowls?: Bowl[];
  organizations?: Organization[];
  onCreatePost: (type?: string) => void;
}

// Add the profile schema (same as backend)
const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

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
    isLoading: authLoading,
  } = useAuth();
  const { setVisible } = useWalletModal();
  const { connected, publicKey, connecting } = useWallet();
  const { toast } = useToast();
  const [location] = useLocation();

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editUsernameDialogOpen, setEditUsernameDialogOpen] = useState(false);

  const [editImageDialogOpen, setEditImageDialogOpen] = useState(false); // Add image edit dialog
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // For image URL input

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [showHot, setShowHot] = useState(!isMobile); // Auto-collapse hot section on mobile

  // Check if we're on the profile page
  const isProfilePage = location === "/profile" || location === "/settings" || location === "/bookmarks";
  const isBowlsPage = location === "/bowls";
  const isOrganizationsPage = location === "/organizations";

  // React Hook Form for profile editing
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      bio: user?.bio || "",
    },
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint is 1024px
      setIsMobile(mobile);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username || "",
        bio: user.bio || "",
      });
    }
  }, [user, profileForm]);

  // Function to update profile
  const updateProfile = async (data: ProfileData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error(
          "Authentication token not available. Please log in again."
        );
      }

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `Failed to update profile: ${response.status}`
        );
      }

      const updatedUser = await response.json();
      setDbProfile(updatedUser);

      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
      });

      setEditUsernameDialogOpen(false);
      setEditImageDialogOpen(false);
    } catch (error) {
      console.error("[profile] Profile update error:", error);
      toast({
        title: "Profile update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle username edit specifically
  const handleUsernameEdit = () => {
    setNewUsername(user?.username || "");
    setEditUsernameDialogOpen(true);
  };

  const submitUsernameEdit = async () => {
    if (!newUsername.trim()) return;

    await updateProfile({ username: newUsername.trim() });
  };

  // Handle profile image edit
  const handleImageEdit = () => {
    setImageUrl(user?.profileImageUrl || "");
    setEditImageDialogOpen(true);
  };

  const submitImageEdit = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Image URL required",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
      return;
    }

    await updateProfile({
      // Note: You'll need to add profileImageUrl to your backend schema
      // For now, this will only work if your backend supports profileImageUrl
      ...profileForm.getValues(),
      // profileImageUrl: imageUrl.trim()
    });
  };

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
        description:
          "Failed to authenticate with the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConnectWallet = () => {
    if (isAuthenticated) {
      onCreatePost();
      return;
    }
    setVisible(true);
  };

  const handleEditProfile = () => {
    navigate("/settings");
  };

  async function submitProfile() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error(
          "Authentication token not available. Please try logging in again."
        );
      }

      const payload = {
        bio: bio.trim() || undefined,
      };

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `Failed to update profile: ${response.status}`
        );
      }

      const updatedUser = await response.json();
      setDbProfile(updatedUser);

      toast({
        title: "Profile completed!",
        description: "Your profile has been set up successfully.",
      });

      setProfileDialogOpen(false);
    } catch (error) {
      console.error("[auth] Profile submission error:", error);
      toast({
        title: "Profile update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to complete your profile. Please try again.",
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
      { bg: "bg-purple-600", text: "text-white" }, // Memed - purple
      { bg: "bg-blue-600", text: "text-white" }, // FantasyLog - blue
      {
        bg: "bg-gradient-to-br from-purple-500 to-pink-500",
        text: "text-white",
      }, // Somnia - gradient
      { bg: "bg-yellow-400", text: "text-gray-900" }, // Bigcoin - yellow
    ];
    return styles[index % styles.length];
  };

  return (
    <div className="pt-4 overflow-auto scrollbar-hide flex flex-col h-full transition-all duration-300 relative z-10 bg-[#0a0a0a]">
      {/* Content */}
      {/* Conditional Section based on Authentication */}
      <div>
        <div className="relative h-[180px] w-full bg-[linear-gradient(117deg,_#A0D9FF_-0.07%,_#E8EAE9_99.93%)] overflow-hidden">
          <div className="h-5 w-5 bg-[#0A0A0A] absolute top-0 left-0"></div>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 uppercase text-gray-700 text-xl hover:text-gray-900 hover:scale-105 font-normal px-4 py-2 rounded-md transition-colors disabled:opacity-50 outline-none shadow-none"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : isAuthenticated ? (
                  <>
                    <SvgIcon src="/icons/Create pencil.svg" />
                    CREATE
                  </>
                ) : (
                  <>
                    <SvgIcon src="/icons/Wallet.svg" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex mb-4 items-center border-l-[0.2px] border-r-[0.2px] border-b-[0.2px] border-[#525252]/30">
        <button
          onClick={() => onCreatePost("poll")}
          className="flex flex-1 items-center text-[#E8EAE9] justify-center gap-4 py-4 hover:bg-gray-900 text-xs font-medium transition-colors border-r border-[#525252]/30"
        >
          {/* <BarChart3 className="w-3 h-3" /> */}
          <SvgIcon src="/icons/Polls icon.svg" />
          POLL
        </button>
        <button
          onClick={() => onCreatePost("text")}
          className="flex flex-1 items-center text-[#E8EAE9] justify-center gap-4 py-4 hover:bg-gray-900 text-xs font-medium transition-colors"
        >
          {/* <FileText className="w-3 h-3" /> */}
          <SvgIcon src="/icons/Post option icon.svg" />
          POST
        </button>
      </div>

      {/* COMMUNITIES Section */}
      {!isProfilePage && !isBowlsPage && (
        <>
          <div className="mb-2 h-px bg-gray-700"></div>
          <div className="px-4 mb-2">
            <div className="flex items-center gap-[10px] py-[10px] mb-4">
              <Circle className="h-3 w-3 text-white fill-white" />
              <div className="font-medium text-[#E8EAE9] uppercase text-xs">
                COMMUNITIES
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {bowls?.slice(0, 4).map((bowl) => (
                <div key={bowl.id}>
                  <a
                    href={`/bowls/${encodeURIComponent(bowl.name)}`}
                    className="font-spacemono text-[#8E8E93] hover:text-white transition-colors text-[10px] underline block"
                  >
                    {bowl.name?.toLowerCase().replace(/\s+/g, "")}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* COMPANIES Section */}
      {!isProfilePage && !isOrganizationsPage && (
        <>
          <div className="my-2 h-px bg-gray-700 w-full"></div>
          <div className="px-4">
            <div className="text-xs py-[10px] text-[#E8EAE9] font-medium mb-4 flex items-center gap-2 uppercase tracking-wide">
              <SvgIcon src="/icons/Companies-right icon.svg" />
              COMPANIES
            </div>
            <div className="space-y-4">
              {organizations?.slice(0, 5).map((org, index) => {
                const logoStyle = getCompanyLogoStyle(index);
                return (
                  <div
                    key={org.id}
                    className="flex items-center justify-between"
                  >
                    <div
                      className={`w-[30px] h-[30px] ${logoStyle.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className={`text-lg font-bold ${logoStyle.text}`}>
                        {org.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-[#8E8E93] truncate">
                      {org.name}
                    </span>

                    <div className="flex items-center">
                      <div className="bg-[#ABEFC6] flex justify-center py-2 w-[30px] text-[#079455] font-semibold text-xs disabled:opacity-50  text-center">
                        {Math.floor(Math.random() * 40) + 60}
                      </div>
                      <div className="bg-[#FDA29B] flex justify-center py-2 w-[30px] text-[#D92D20] font-semibold text-xs disabled:opacity-50 text-center">
                        {Math.floor(Math.random() * 40) + 30}
                      </div>
                    </div>

                    {/* <div className="flex items-center flex-shrink-0">
                    <div className="px-[7.5px] py-[11px] bg-[#ABEFC6] text-[#079455] text-xs font-bold w-[30px] text-center">
                      {Math.floor(Math.random() * 40) + 60}
                    </div>
                    <div className="px-2 py-2 bg-red-300 text-red-900  text-xs font-bold min-w-[32px] text-center">
                      {Math.floor(Math.random() * 40) + 30}
                    </div>
                  </div> */}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Profile Edit Section - Only show on profile page when authenticated */}
      {isAuthenticated && isProfilePage && (
        <>
          {/* Profile Image Section */}
          <div className="my-2 h-px bg-[#525252]/30 w-full"></div>
          <div className="border mt-4 border-[#525252]/30">
            <div className="relative px-2 py-4">
              <div className="relative h-[218px] mx-auto">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage
                    src={
                      user?.profileImageUrl ||
                      "https://res.cloudinary.com/backend969/image/upload/v1762989309/c3c53349d65202c7653c4f4e2bdfae8ef9a43aa0_bzwk87.png"
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-800 text-white font-bold text-4xl rounded-none">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {/* Edit Icon on Image - Fixed to open image edit dialog */}
                <button
                  onClick={handleImageEdit}
                  className="absolute bottom-4 text-[#E8EAE9] right-4 w-[30px] h-[30px] bg-[#17181C] hover:bg-black flex items-center justify-center transition-colors"
                >
                  <SvgIcon src="/icons/Pencil.svg" />
                </button>
              </div>
            </div>

            {/* Username Section */}
            <div className="px-2 py-4">
              <div className="relative border px-6 border-[#525252]/30 ">
                <div className="absolute -top-3 px-2 py-1 bg-[#17181C] text-[10px] inline-block text-[#525252] border border-[#525252]/30 uppercase tracking-wider">
                  USERNAME
                </div>
                <div className="flex items-center justify-between py-5">
                  <span className="text-[#8E8E93] underline text-xs font-medium">
                    {user?.username || "user1234"}
                  </span>
                  <button
                    onClick={handleUsernameEdit}
                    className="w-3.5 h-3.5 text-[#E8EAE9] flex items-center justify-center hover:bg-gray-800 transition-colors"
                  >
                    <SvgIcon src="/icons/Pencil.svg" />
                  </button>
                </div>
              </div>

              {/* Stats Section */}
              <div className="flex border w-full border-[#525252]/30 ">
                <div className="px-6 py-3 flex items-center bg-gray-100 justify-center">
                  <SvgIcon src="/icons/profile-share.svg" />
                </div>
                <div className="px-6 py-3 flex flex-1 items-center justify-center text-[#525252] gap-2 border-[#525252]/30 border-r">
                  <SvgIcon src="/icons/Post option icon.svg" />
                  <div className="text-xs">{user?.karma || 40}</div>
                </div>
                <div className="px-6 py-3 flex flex-1 items-center justify-center text-[#525252] gap-2">
                  <SvgIcon src="/icons/Polls icon.svg" />
                  <div className="text-xs">25</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Username Edit Dialog */}
      <Dialog
        open={editUsernameDialogOpen}
        onOpenChange={setEditUsernameDialogOpen}
      >
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-black border-gray-700">
          <DialogHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#a8d5e2] to-[#b3d9e6] rounded-2xl mb-4">
              <Edit3 className="h-8 w-8 text-gray-900" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Edit Username
            </DialogTitle>
            <p className="text-sm text-gray-400 mt-2">
              Choose a new username for your profile
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Username
              </label>
              <Input
                placeholder="Enter new username..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="rounded-xl border-gray-600 bg-gray-900 text-white focus:border-[#a8d5e2] focus:ring-[#a8d5e2]/20 h-12"
              />
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button
              disabled={isSubmitting || !newUsername.trim()}
              onClick={submitUsernameEdit}
              className="w-full h-12 bg-gradient-to-r from-[#a8d5e2] to-[#b3d9e6] text-gray-900 font-bold rounded-xl disabled:opacity-50 shadow-lg hover:from-[#9bc8d5] hover:to-[#a6ccd9]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></div>
                  Updating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Update Username
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Image Edit Dialog */}
      <Dialog open={editImageDialogOpen} onOpenChange={setEditImageDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-black border-gray-700">
          <DialogHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#a8d5e2] to-[#b3d9e6] rounded-2xl mb-4">
              <Camera className="h-8 w-8 text-gray-900" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Update Profile Image
            </DialogTitle>
            <p className="text-sm text-gray-400 mt-2">
              Enter a URL for your new profile image
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Image URL
              </label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="rounded-xl border-gray-600 bg-gray-900 text-white focus:border-[#a8d5e2] focus:ring-[#a8d5e2]/20 h-12"
              />
              <p className="text-xs text-gray-500">
                Enter a direct link to your profile image
              </p>
            </div>
            {imageUrl && (
              <div className="flex justify-center">
                <div className="w-20 h-20 border border-gray-600 rounded overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-6">
            <Button
              disabled={isSubmitting || !imageUrl.trim()}
              onClick={submitImageEdit}
              className="w-full h-12 bg-gradient-to-r from-[#a8d5e2] to-[#b3d9e6] text-gray-900 font-bold rounded-xl disabled:opacity-50 shadow-lg hover:from-[#9bc8d5] hover:to-[#a6ccd9]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></div>
                  Updating Image...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Update Image
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Completion Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-black border-gray-700">
          <DialogHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#a8d5e2] to-[#b3d9e6] rounded-2xl mb-4">
              <Edit3 className="h-8 w-8 text-gray-900" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Complete your profile
            </DialogTitle>
            <p className="text-sm text-gray-400 mt-2">
              Help us personalize your experience
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Bio (Optional)
              </label>
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
    </div>
  );
}
