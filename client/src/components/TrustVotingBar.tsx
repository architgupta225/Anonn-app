import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrustVotingBarProps {
  organizationId: number;
  trustData: {
    trustVotes: number;
    distrustVotes: number;
    trustPercentage: number;
  };
}

export default function TrustVotingBar({ organizationId, trustData }: TrustVotingBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: userVote } = useQuery<{ trustVote: boolean } | null>({
    queryKey: ['/api/organizations', organizationId, 'trust-vote'],
    retry: false,
  });

  const trustVoteMutation = useMutation({
    mutationFn: async (trustVote: boolean) => {
      return apiRequest('POST', `/api/organizations/${organizationId}/trust-vote`, { trustVote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId, 'trust-vote'] });
      toast({
        title: "Vote recorded",
        description: "Your trust vote has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/organizations/${organizationId}/trust-vote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId, 'trust-vote'] });
      toast({
        title: "Vote removed",
        description: "Your trust vote has been removed.",
      });
    },
  });

  const handleVote = (trustVote: boolean) => {
    if (userVote && userVote.trustVote === trustVote) {
      deleteVoteMutation.mutate();
    } else {
      trustVoteMutation.mutate(trustVote);
    }
  };

  const totalVotes = trustData.trustVotes + trustData.distrustVotes;
  const trustWidth = totalVotes > 0 ? (trustData.trustVotes / totalVotes) * 100 : 0;
  const distrustWidth = totalVotes > 0 ? (trustData.distrustVotes / totalVotes) * 100 : 0;

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Trust Bar Visualization */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {trustData.trustPercentage}% Trust
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {100 - trustData.trustPercentage}% Distrust
                  </span>
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative w-full h-8 bg-gray-200 dark:bg-slate-600 rounded-lg overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${trustWidth}%` }}
                />
                <div 
                  className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${distrustWidth}%` }}
                />
                {totalVotes === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">No votes yet</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voting Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={userVote?.trustVote === true ? "default" : "outline"}
              size="sm"
              onClick={() => handleVote(true)}
              disabled={trustVoteMutation.isPending || deleteVoteMutation.isPending}
              className={`flex items-center space-x-2 ${
                userVote?.trustVote === true 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20"
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Agree w/ Trust</span>
            </Button>
            
            <Button
              variant={userVote?.trustVote === false ? "default" : "outline"}
              size="sm"
              onClick={() => handleVote(false)}
              disabled={trustVoteMutation.isPending || deleteVoteMutation.isPending}
              className={`flex items-center space-x-2 ${
                userVote?.trustVote === false 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20"
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>Mark as Untrustworthy</span>
            </Button>
          </div>

          {/* Vote Count */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} cast
          </div>
        </div>
      </CardContent>
    </Card>
  );
}