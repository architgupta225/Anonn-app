import Navigation from "@/components/Navigation";
import LeftSidebar from "@/components/LeftSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentLayoutProps {
  onCreatePost: () => void;
  bowls?: any[];
  organizations?: any[];
  children: React.ReactNode;
}

function ContentLayout({ onCreatePost, bowls, organizations, children }: ContentLayoutProps) {
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
    <div className="min-h-screen bg-[#0a0a0a]">
  <Navigation />

  <div className="flex w-full pt-14">
    {/* LEFT SIDEBAR */}
    <aside
      className="fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0a0a0a] border-r border-gray-800 overflow-y-auto z-10"
    >
      <LeftSidebar onCreatePost={onCreatePost} onCreateReview={onCreatePost} />
    </aside>

    {/* MAIN CONTENT */}
    <main className="flex-1 min-w-0 bg-[#0a0a0a] overflow-y-auto transition-all duration-300 ml-20 lg:ml-64">
      {children}
    </main>
  </div>
</div>

  );
}

export default ContentLayout