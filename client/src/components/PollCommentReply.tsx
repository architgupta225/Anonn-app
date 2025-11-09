import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, MessageSquare, Trash, Bookmark } from "lucide-react";
import VoteButtons from "./VoteButtons";
import MarkdownRenderer from "./MarkdownRenderer";
import type { CommentWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatTimeAgo } from "@/lib/utils";

const replySchema = z.object({
  content: z.string().min(1, "Reply cannot be empty").max(1000, "Reply must be less than 1000 characters"),
});

type ReplyData = z.infer<typeof replySchema>;

interface PollCommentReplyProps {
  comment: CommentWithDetails;
  pollId: number;
  onSuccess?: () => void;
  depth?: number;
}

export default function PollCommentReply({ comment, pollId, onSuccess, depth = 0 }: PollCommentReplyProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const maxDepth = 3;

  // Debug: Log what we're receiving
  console.log(`🔍 PollCommentReply render:`, {
    commentId: comment.id,
    content: comment.content.substring(0, 20) + '...',
    hasReplies: !!comment.replies,
    repliesCount: comment.replies?.length || 0,
    depth,
    parentId: comment.parentId
  });

  const form = useForm<ReplyData>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      content: "",
    }
  });

  const createReplyMutation = useMutation({
    mutationFn: async (data: ReplyData) => {
      const requestData = {
        content: data.content,
        parentId: comment.id,
      };
      console.log('🔥 CREATING POLL REPLY:', {
        parentCommentId: comment.id,
        content: data.content,
        pollId,
        requestData
      });
      const response = await apiRequest("POST", `/api/polls/${pollId}/comments`, requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply posted!",
        description: "Your reply has been added successfully",
      });
      form.reset();
      setShowReplyForm(false);
      queryClient.invalidateQueries({ queryKey: ["poll-comments", pollId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post reply",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(`/api/comments/${commentId}`, { 
        method: 'DELETE', 
        credentials: 'include', 
        headers: { Authorization: `Bearer ${await (window as any).__getDynamicToken?.()}` } 
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["poll-comments", pollId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReplyData) => {
    createReplyMutation.mutate(data);
  };

  const handleDeleteComment = () => {
    deleteCommentMutation.mutate(comment.id);
    setShowDelete(false);
  };

  const canReply = depth < maxDepth;

  const handleVoteUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["poll-comments", pollId] });
    onSuccess?.();
  };

  const getAuthorDisplay = () => {
    const author = comment.author;
    const username = author.username || 'User';
    
    if (author.isCompanyVerified && author.companyName) {
      return `${username} from ${author.companyName}`;
    }
    
    return username;
  };

  return (
    <div className="border border-[#3d3d3d] bg-[#EAEAEA05] transition-colors">
    
      {/* Comment Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-row gap-4 items-center">
            <span className="text-gray-300 font-semibold underline cursor-pointer hover:text-white text-base">
              {getAuthorDisplay()}
            </span>
            <span className="text-gray-500 text-sm">
              {formatTimeAgo(comment.createdAt || '')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete Button for Author */}
          {user?.id && comment.authorId && (user?.id === comment.authorId || user?.id === comment.authorId.toString()) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
              >
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Comment Content */}
      <div className="px-6 pb-4">
        <div className="text-gray-300 text-lg leading-relaxed">
          <MarkdownRenderer 
            content={comment.content}
            className="text-gray-300 text-lg"
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-stretch border-t border-gray-700">
        {/* Left Side - Voting */}
        <div className="flex items-stretch">
          <VoteButtons 
            targetId={comment.id}
            targetType="comment"
            upvotes={comment.upvotes}
            downvotes={comment.downvotes}
            userVote={comment.userVote}
            onUpdate={handleVoteUpdate}
            layout="horizontal"
            showCount={true}
          />
        </div>
        
        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right Side - Actions */}
        <div className="flex items-stretch">
          <div className="flex items-center">
            {/* Bookmark Button */}
            <button className="flex items-center justify-center border-r border-gray-600 px-6 text-gray-400 hover:text-white transition-colors">
              <Bookmark className="h-5 w-5" />
            </button>
            {/* Reply Button */}
            {canReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-2 px-6 text-gray-400 hover:text-white transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm">Reply</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && canReply && (
        <div className="border-t border-gray-700 p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Write your reply..."
                        rows={3}
                        className="resize-none text-base border border-gray-600 bg-[#1a1a1a] text-white placeholder-gray-400 focus:border-gray-300 rounded-sm transition-all duration-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            
              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    form.reset();
                  }}
                  className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={createReplyMutation.isPending || !form.watch("content").trim()}
                  className="px-6 py-2 bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300"
                >
                  {createReplyMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Posting...</span>
                    </div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post Reply
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-t border-gray-700">
          <div className="ml-8 pl-4 border-l-2 border-gray-600">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="first:pt-4 last:pb-0">
                <PollCommentReply
                  comment={reply}
                  pollId={pollId}
                  onSuccess={onSuccess}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-[#1a1a1a] border border-gray-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteComment}
              disabled={deleteCommentMutation.isPending}
            >
              {deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}