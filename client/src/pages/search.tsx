import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Filter, X, Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PostWithDetails } from "@shared/schema";
import { useInfinitePosts } from "@/hooks/useInfiniteScroll";
import { InfiniteScrollLoader, InfiniteScrollSkeleton } from "@/components/InfiniteScrollLoader";

// Memoized empty function to prevent unnecessary re-renders
const emptyUpdateCallback = () => {};

interface SearchFilters {
  query: string;
  type: 'all' | 'posts' | 'comments' | 'communities' | 'users';
  postType: 'all' | 'text' | 'link' | 'image' | 'video' | 'poll';
  timeRange: 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';
  sortBy: 'relevance' | 'hot' | 'new' | 'top' | 'comments';
  includedFlairs: string[];
  excludedFlairs: string[];
}

export default function SearchPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  const getQueryFromUrl = () => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  };

  const [filters, setFilters] = useState<SearchFilters>({
    query: getQueryFromUrl(),
    type: 'all',
    postType: 'all',
    timeRange: 'all',
    sortBy: 'relevance',
    includedFlairs: [],
    excludedFlairs: [],
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Redirect to home if no search query
  useEffect(() => {
    const query = getQueryFromUrl();
    if (!query) {
      window.location.href = '/';
      return;
    }
  }, []);

  // Sync query when URL changes (e.g., from navbar search)
  useEffect(() => {
    const q = getQueryFromUrl();
    setFilters(prev => ({ ...prev, query: q }));
  }, [location]);

  // Search query with infinite scroll
  const {
    items: searchResults,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh: refetchSearch,
    setItems: setSearchResults
  } = useInfinitePosts(
    async (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (filters.query) params.append('q', filters.query);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.postType !== 'all') params.append('postType', filters.postType);
      if (filters.timeRange !== 'all') params.append('time', filters.timeRange);
      if (filters.sortBy !== 'relevance') params.append('sort', filters.sortBy);
      
      const response = await fetch(`/api/search?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        let posts = [];
        if (Array.isArray(parsed)) posts = parsed;
        else if (parsed && typeof parsed === 'object' && parsed.posts) posts = parsed.posts;
        
        return {
          items: posts,
          hasMore: posts.length === limit,
          total: posts.length
        };
      } catch {
        return {
          items: [],
          hasMore: false,
          total: 0
        };
      }
    },
    10, // 10 results per page
    {
      enabled: !!filters.query,
      threshold: 0.1,
      rootMargin: '100px'
    }
  );

  // Handle search input
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  // Handle filter changes
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getResultCount = () => {
    if (!searchResults) return 0;
    return searchResults.length;
  };

  return (
    <div className="min-h-screen bg-reddit-light dark:bg-slate-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="relative">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={filters.query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search Anonn"
                  className="pl-10 pr-10 py-3 text-lg border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                />
                {filters.query && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {filters.query && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Search Results for "{filters.query}"
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {isLoading ? 'Searching...' : `${getResultCount().toLocaleString()} results`}
                </p>
              </div>
            </div>

            <Separator />

            {/* Results Content */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white dark:bg-slate-800">
                    <CardContent className="p-6">
                      <div className="flex space-x-4">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-6" />
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-6 w-full" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-8 text-center">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Search Error
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Something went wrong while searching. Please try again.
                  </p>
                </CardContent>
              </Card>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((post: PostWithDetails, index: number) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onUpdate={emptyUpdateCallback}
                    showCommunity={true}
                    index={index}
                  />
                ))}
                
                {/* Infinite Scroll Loader for Search Results */}
                <InfiniteScrollLoader
                  isLoading={isLoading}
                  hasMore={hasMore}
                  error={error}
                  onRetry={refetchSearch}
                  onLoadMore={loadMore}
                  loadingText="Loading more results..."
                  endText="You've reached the end of the search results! 🎉"
                  errorText="Failed to load more results"
                />
              </div>
            ) : (
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-8 text-center">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Try adjusting your search terms to find what you're looking for.
                  </p>
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium">
                      <Home className="h-4 w-4 mr-2" />
                      Go Home
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}