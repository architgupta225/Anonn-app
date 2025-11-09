import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Post Skeleton Component
export function PostSkeleton() {
  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 mb-4">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex items-center space-x-4 mt-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Organization Skeleton Component
export function OrganizationSkeleton() {
  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 mb-4">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// Comment Skeleton Component
export function CommentSkeleton() {
  return (
    <div className="border-l-2 border-gray-200 dark:border-slate-700 pl-4 mb-4">
      <div className="flex items-start space-x-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center space-x-4 mt-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Skeleton Component
export function ProfileSkeleton() {
  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
      <CardHeader className="text-center">
        <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  );
}

// Generic Loading Spinner
export function LoadingSpinner({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "h-4 w-4",
    default: "h-8 w-8",
    large: "h-12 w-12"
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative">
        {/* Main spinning ring */}
        <div className={`${sizeClasses[size]} animate-spin border-4 border-gray-200 border-t-blue-600 rounded-full`}></div>
        {/* Pulsing outer ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} animate-ping border-4 border-blue-300 rounded-full opacity-20`}></div>
        {/* Bouncing dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Page Loading Skeleton
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
            <div className="space-y-4">
              <ProfileSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Loading Spinner with Multiple Effects
export function EnhancedLoadingSpinner({ size = "default", text = "Loading..." }: { size?: "small" | "default" | "large", text?: string }) {
  const sizeClasses = {
    small: "h-6 w-6",
    default: "h-12 w-12",
    large: "h-16 w-16"
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        {/* Main spinning ring */}
        <div className={`${sizeClasses[size]} animate-spin border-4 border-gray-200 border-t-blue-600 rounded-full`}></div>
        {/* Pulsing outer ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} animate-ping border-4 border-blue-300 rounded-full opacity-20`}></div>
        {/* Rotating inner dots */}
        <div className={`absolute inset-2 ${sizeClasses[size === 'large' ? 'default' : 'small']} animate-spin border-2 border-orange-400 rounded-full`} style={{ animationDirection: 'reverse' }}></div>
      </div>
      
      {text && (
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">{text}</div>
          <div className="flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pulse Loading with Shimmer Effect
export function ShimmerLoading({ className = "", lines = 3 }: { className?: string, lines?: number }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="mb-3">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded animate-shimmer"></div>
        </div>
      ))}
    </div>
  );
}

// Card Loading with Wave Effect
export function WaveLoadingCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 overflow-hidden relative">
      {/* Wave animation overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-x"></div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-4/5 animate-pulse"></div>
        </div>
        
        <div className="flex space-x-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
