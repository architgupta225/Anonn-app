import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LoadingSpinner, 
  EnhancedLoadingSpinner, 
  ShimmerLoading, 
  WaveLoadingCard,
  PostSkeleton,
  OrganizationSkeleton,
  CommentSkeleton,
  ProfileSkeleton
} from "@/components/LoadingIndicator";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";

export default function AnimationDemo() {
  const [showAnimations, setShowAnimations] = useState(true);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const demos = [
    {
      id: "enhanced-spinner",
      title: "Enhanced Loading Spinner",
      description: "Multi-layered spinner with bouncing dots and text",
      component: <EnhancedLoadingSpinner size="large" text="Loading amazing content..." />
    },
    {
      id: "shimmer",
      title: "Shimmer Loading",
      description: "Smooth shimmer effect for text lines",
      component: <ShimmerLoading lines={5} className="max-w-md" />
    },
    {
      id: "wave-card",
      title: "Wave Loading Card",
      description: "Card skeleton with wave animation overlay",
      component: <WaveLoadingCard />
    },
    {
      id: "post-skeleton",
      title: "Post Skeleton",
      description: "Realistic post loading skeleton",
      component: <PostSkeleton />
    },
    {
      id: "org-skeleton",
      title: "Organization Skeleton",
      description: "Organization card loading skeleton",
      component: <OrganizationSkeleton />
    },
    {
      id: "comment-skeleton",
      title: "Comment Skeleton",
      description: "Comment thread loading skeleton",
      component: <CommentSkeleton />
    },
    {
      id: "profile-skeleton",
      title: "Profile Skeleton",
      description: "User profile loading skeleton",
      component: <ProfileSkeleton />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in"
          >
            🎨 Animation Demo
          </h1>
          <p 
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Explore all the enhanced loading animations and effects available in Anonn
          </p>
          
          {/* Controls */}
          <div 
            className="flex justify-center space-x-4 mt-6 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <Button
              onClick={() => setShowAnimations(!showAnimations)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {showAnimations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showAnimations ? 'Hide' : 'Show'} Animations</span>
            </Button>
            
            <Button
              onClick={() => setActiveDemo(null)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </Button>
          </motion.div>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demos.map((demo, index) => (
            <div
              key={demo.id}
              className="w-full animate-fade-in"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  activeDemo === demo.id 
                    ? 'ring-2 ring-orange-500 shadow-xl scale-105' 
                    : 'hover:scale-105'
                }`}
                onClick={() => setActiveDemo(activeDemo === demo.id ? null : demo.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-orange-500" />
                    <span>{demo.title}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {demo.description}
                  </p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {activeDemo === demo.id ? (
                    <div className="space-y-4">
                      {demo.component}
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDemo(null);
                          }}
                        >
                          Close Demo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <Eye className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Click to view demo</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Special Effects Section */}
        <div 
          className="mt-16 animate-fade-in"
          style={{ animationDelay: '0.8s' }}
        >
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                <Zap className="h-6 w-6 text-purple-500" />
                <span>Special Effects</span>
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced animations and micro-interactions
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Floating Elements */}
              <div className="relative h-32 bg-white/50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-float mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Floating Animation</p>
                  </div>
                </div>
                
                {/* Background floating elements */}
                <div className="absolute top-4 left-4 w-8 h-8 bg-blue-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-8 right-8 w-6 h-6 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-6 left-1/2 w-4 h-4 bg-green-400/30 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
              </div>

              {/* Wave Effect */}
              <div className="relative h-24 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '400ms' }}></div>
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '600ms' }}></div>
                      <div className="w-2 h-8 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '800ms' }}></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Wave Effect</p>
                  </div>
                </div>
              </div>

              {/* Rotate and Fade */}
              <div className="relative h-24 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg animate-rotate-fade mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Rotate & Fade</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Instructions */}
        <div 
          className="mt-16 animate-fade-in"
          style={{ animationDelay: '1s' }}
        >
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-0">
            <CardHeader>
              <CardTitle className="text-xl flex items-center space-x-2">
                <Loader2 className="h-5 w-5 text-green-500" />
                <span>How to Use</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Import Components</h4>
                  <code className="block bg-gray-100 dark:bg-slate-800 p-2 rounded text-sm">
                    {`import { EnhancedLoadingSpinner, ShimmerLoading } from "@/components/LoadingIndicator";`}
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Use in Your Components</h4>
                  <code className="block bg-gray-100 dark:bg-slate-800 p-2 rounded text-sm">
                    {`<EnhancedLoadingSpinner size="large" text="Loading..." />`}
                  </code>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All animations are optimized for performance and automatically support both light and dark themes.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
