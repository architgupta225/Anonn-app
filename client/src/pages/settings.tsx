import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Lock, 
  Calendar,
  Flame,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import CompanyVerificationCard from "@/components/CompanyVerificationCard";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, setDbProfile, getAccessToken, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "Settings - Anonn";
    if (!isAuthenticated && window.location.pathname !== '/auth') {
      window.location.href = "/auth";
    }
  }, [isAuthenticated]);

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      bio: "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
        bio: user.bio || "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileData) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication token not available. Please log in again.');
      }

      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update profile';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || `${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const updatedUser = await response.json();
      setDbProfile(updatedUser);
      
      // Refresh the profile to get latest data
      if (refreshProfile) {
        await refreshProfile();
      }
      
      toast({ 
        title: '✅ Profile updated!', 
        description: 'Your changes have been saved to your account.',
        duration: 3000,
      });
    } catch (error) {
      console.error('[settings] Profile update error:', error);
      const message = error instanceof Error ? error.message : 'Failed to save profile changes';
      toast({ 
        title: '❌ Failed to save', 
        description: message, 
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">
              Loading your settings...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="h-8 w-8 text-orange-500" />
                Settings
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage your account and preferences
              </p>
            </div>
            
            {/* User Info Card */}
            <div className="hidden lg:flex items-center space-x-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-gray-900">
                  {user?.username || 'User'}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Flame className="h-3 w-3" />
                  {user?.karma || 0} karma
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <User className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-gray-900">Profile Information</div>
                    <div className="text-sm font-normal text-gray-500">
                      Update your personal details
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-xl">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          Profile Picture
                        </div>
                        <div className="text-sm text-gray-500">
                          Connected via Dynamic
                        </div>
                      </div>
                    </div>

                    {/* Name Fields - Removed first and last name fields */}

                    {/* Email section removed per request */}

                    {/* Username */}
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a unique username"
                              className="h-12 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500 dark:text-gray-400">Used for @mentions and your profile URL</p>
                        </FormItem>
                      )}
                    />

                    {/* Bio section removed per request */}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-slate-600">
                       <Button 
                        type="submit"
                        disabled={isLoading}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 h-12 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Company Verification */}
            <CompanyVerificationCard />

            {/* Account Security */}
            
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Verification</span>
                  <Badge className={user?.allowlisted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {user?.allowlisted ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Karma</span>
                  <span className="font-semibold text-gray-900">{user?.karma || 0}</span>
                </div>
                
                {/* User ID removed per request */}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/'}>
                  <Globe className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}