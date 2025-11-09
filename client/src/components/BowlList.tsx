import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, MessageSquare } from "lucide-react";
import type { Bowl } from "@shared/schema";

export default function BowlList() {
  const { data: bowls, isLoading } = useQuery<Bowl[]>({
    queryKey: ["/api/bowls"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!bowls || bowls.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          No bowls available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bowls.map((bowl) => (
        <Card key={bowl.id} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-professional-blue/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-professional-blue" />
                </div>
                
                <div className="flex-1">
                  <Link href={`/bowls/${encodeURIComponent(bowl.name)}`} className="group">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-professional-blue transition-colors">
                      {bowl.name}
                    </h3>
                  </Link>
                  
                  {bowl.description && (
                    <p className="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                      {bowl.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{bowl.memberCount.toLocaleString()} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Active discussions</span>
                    </div>
                  </div>
                </div>
              </div>
              
            <Link href={`/bowls/${encodeURIComponent(bowl.name)}`}>
                <Button className="bg-professional-blue hover:bg-professional-blue/90 text-white">
                  View Bowl
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}