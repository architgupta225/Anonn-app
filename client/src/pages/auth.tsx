import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { MessageSquare, Shield, ArrowRight, Star } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, login, getAccessToken, setDbProfile, refreshProfile } = useAuth();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Sign In - Anonn";
    if (isAuthenticated && user) {
      // Check if profile is complete - removed first/last name requirement
      const hasBio = Boolean(user.bio?.trim());
      
      if (!hasBio) {
        // Pre-fill form with existing data
        setBio(user.bio || "");
        setOpen(true);
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, user, navigate]);

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
        description: "Welcome to Anonn. Your profile has been set up successfully.",
      });

      setOpen(false);
      navigate('/');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and branding */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-reddit-orange to-professional-blue rounded-2xl shadow-lg">
            <img 
              src="/men.png" 
              alt="Anonn" 
              className="w-12 h-12 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-reddit-orange font-bold text-xl">
              M
            </div>
          </div>
                      <div>
              <p className="text-lg text-gray-600 font-medium leading-relaxed">
                Where Opinion Becomes Asset,<br />
                Trust Becomes Currency.
              </p>
            </div>
        </div>

        {!isAuthenticated && (
          <Card className="border-0 shadow-xl rounded-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-reddit-orange to-professional-blue rounded-xl mb-4">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Welcome to Anonn
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  Your professional community awaits
                </p>
              </div>
              
              <Button
                onClick={() => {
                  // Show the wallet selection modal
                  setVisible(true);
                }}
                className="w-full h-14 bg-gradient-to-r from-reddit-orange via-orange-500 to-reddit-orange/90 hover:from-reddit-orange/90 hover:via-orange-600 hover:to-reddit-orange text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <span className="flex items-center gap-3 text-lg">
                  Get Started
                  <ArrowRight className="h-5 w-5 animate-pulse" />
                </span>
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 py-1 bg-gradient-to-r from-green-100 to-blue-100 text-gray-700 rounded-full font-medium flex items-center gap-2">
                    <Shield className="h-3 w-3 text-green-600" />
                    Secure & Private
                  </span>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-center text-gray-600 leading-relaxed font-medium">
                  Join our exclusive community of professionals. Invite codes required for new members.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isAuthenticated && !user && (
          <Card className="border-0 shadow-xl rounded-2xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="relative">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-reddit-orange via-orange-500 to-professional-blue rounded-full animate-spin">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-reddit-orange to-professional-blue rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Setting up your workspace
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  Preparing your professional dashboard...
                </p>
                <div className="mt-4 flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-reddit-orange rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-professional-blue rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile completion dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl">
            <DialogHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-reddit-orange to-professional-blue rounded-2xl mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900">Complete your profile</DialogTitle>
              <p className="text-sm text-gray-600 mt-2">
                Help us personalize your experience
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bio (Optional)</label>
                <Input 
                  placeholder="Tell us about yourself..." 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-xl border-gray-200 focus:border-reddit-orange focus:ring-reddit-orange/20 h-12"
                />
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button 
                disabled={isSubmitting} 
                onClick={submitProfile} 
                className="w-full h-12 bg-gradient-to-r from-reddit-orange via-orange-500 to-reddit-orange/90 hover:from-reddit-orange/90 hover:via-orange-600 hover:to-reddit-orange text-white font-bold rounded-xl disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
    </div>
  );
}