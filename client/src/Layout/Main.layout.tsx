// Layout/MainLayout.tsx
import Navigation from "@/components/Navigation";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface MainLayoutProps {
  onCreatePost: () => void;
  bowls?: any[];
  organizations?: any[];
  children: React.ReactNode;
}

export default function MainLayout({
  onCreatePost,
  bowls,
  organizations,
  children,
}: MainLayoutProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center animate-pulse">
              <Skeleton className="h-12 w-48 mx-auto mb-4" />
              <Skeleton className="h-6 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="fixed top-0 left-0 right-0 z-50 -mx-4">
        <Navigation />
      </div>

      <div className="h-14" />

      <div className="flex w-full">
        {/* LEFT SIDEBAR */}
        <aside className="fixed left-0 top-14  h-[calc(100vh-3.5rem)] bg-[#0a0a0a] overflow-y-auto z-10 lg:w-[20%] lg:left-16">
          <LeftSidebar
            onCreatePost={onCreatePost}
            onCreateReview={onCreatePost}
          />
        </aside>

        {/* MAIN CONTENT */}
        <main className="w-full lg:w-[55%] lg:ml-auto ml-10 mr-0 lg:mx-auto px-[4%] bg-[#0a0a0a] overflow-y-auto transition-all duration-300 lg:px-16">
          {children}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="fixed hidden lg:block top-14 right-0 lg:right-16 h-[calc(100vh-3.5rem)] overflow-y-auto z-10 lg:w-[20%]">
          <RightSidebar
            bowls={bowls}
            organizations={organizations}
            onCreatePost={onCreatePost}
          />
        </aside>
      </div>
    </div>
  );
}
