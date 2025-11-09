import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, AlertTriangle, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import KarmaBadge from "./KarmaBadge";
import type { PostWithDetails } from "@shared/schema";

interface TopReviewsProps {
  topReviews: {
    mostHelpful?: PostWithDetails;
    mostControversial?: PostWithDetails;
  };
}

function ReviewCard({ 
  review, 
  type, 
  icon: Icon 
}: { 
  review: PostWithDetails; 
  type: string; 
  icon: any;
}) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "neutral": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "negative": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-professional-blue" />
          <span className="text-sm font-medium text-professional-blue">{type}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <ThumbsUp className="h-3 w-3" />
            <span>{review.upvotes}</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <ThumbsDown className="h-3 w-3" />
            <span>{review.downvotes}</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <MessageCircle className="h-3 w-3" />
            <span>{review.commentCount}</span>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
          {review.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {review.content}
        </p>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">
            By {review.isAnonymous ? "Anonymous" : <span className="text-reddit-orange font-medium">{review.author.username || "Unknown"}</span>}
          </span>
          {!review.isAnonymous && review.author.karmaLevel && (
            <KarmaBadge karma={review.author.karma} />
          )}
        </div>
        <div className="flex items-center space-x-2">
          {review.sentiment && (
            <Badge className={getSentimentColor(review.sentiment)}>
              {review.sentiment}
            </Badge>
          )}
          <span className="text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(review.createdAt!))} ago
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TopReviews({ topReviews }: TopReviewsProps) {
  if (!topReviews.mostHelpful && !topReviews.mostControversial) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Top Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            No reviews available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Award className="h-5 w-5" />
          <span>Top Reviews</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topReviews.mostHelpful && (
          <ReviewCard
            review={topReviews.mostHelpful}
            type="Most Helpful"
            icon={Award}
          />
        )}
        
        {topReviews.mostControversial && (
          <ReviewCard
            review={topReviews.mostControversial}
            type="Most Controversial"
            icon={AlertTriangle}
          />
        )}
      </CardContent>
    </Card>
  );
}