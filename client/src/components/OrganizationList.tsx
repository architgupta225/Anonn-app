import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Star, Users, ExternalLink } from "lucide-react";
import type { OrganizationWithStats } from "@shared/schema";

export default function OrganizationList() {
  const { data: organizations, isLoading } = useQuery<OrganizationWithStats[]>({
    queryKey: ["/api/organizations"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
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

  if (!organizations || organizations.length === 0) {
    return (
      <div className="text-center py-8">
        <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          No organizations available yet.
        </div>
      </div>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "bg-positive";
    if (rating >= 3) return "bg-neutral";
    return "bg-negative";
  };

  return (
    <div className="space-y-4">
      {organizations.map((org) => (
        <Card key={org.id} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-professional-blue/10 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-professional-blue" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Link href={`/organizations/${encodeURIComponent(org.name)}`} className="group">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-professional-blue transition-colors">
                        {org.name}
                      </h3>
                    </Link>
                    {org.averageRating > 0 && (
                      <Badge className={`text-white ${getRatingColor(org.averageRating)}`}>
                        <Star className="h-3 w-3 mr-1" />
                        {org.averageRating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  
                  {org.description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {org.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{org.reviewCount} reviews</span>
                    </div>
                    {org.website && (
                      <a 
                        href={org.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-professional-blue hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Website</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              <Link href={`/organizations/${encodeURIComponent(org.name)}`}>
                <Button className="bg-reddit-orange hover:bg-reddit-orange/90 text-white">
                  View Reviews
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}