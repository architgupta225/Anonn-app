import { QueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { getAllPostsQueryKeys, getPostQueryKeys, getPollQueryKeys, queryKeys } from "./queryKeys";
import type { Vote } from "@shared/schema";

/**
 * Centralized vote handling utility
 * Manages optimistic updates, server communication, and cache invalidation
 */

export interface VoteState {
  upvotes: number;
  downvotes: number;
  userVote?: Vote;
}

export interface VoteParams {
  targetId: number;
  targetType: "post" | "comment" | "poll";
  voteType: "up" | "down";
}

/**
 * Calculate optimistic vote changes
 */
export function calculateOptimisticVoteUpdate(
  currentState: VoteState,
  voteType: "up" | "down",
  targetId: number,
  targetType: "post" | "poll" | "comment"
): VoteState {
  let newUpvotes = currentState.upvotes;
  let newDownvotes = currentState.downvotes;
  let newUserVote = currentState.userVote;

  if (currentState.userVote) {
    if (currentState.userVote.voteType === voteType) {
      // Remove vote (clicking same button twice)
      if (voteType === "up") newUpvotes--;
      else newDownvotes--;
      newUserVote = undefined;
    } else {
      // Change vote type
      if (currentState.userVote.voteType === "up") {
        newUpvotes--;
        if (voteType === "down") newDownvotes++;
      } else {
        newDownvotes--;
        if (voteType === "up") newUpvotes++;
      }
      newUserVote = { 
        ...currentState.userVote, 
        voteType 
      };
    }
  } else {
    // New vote
    if (voteType === "up") newUpvotes++;
    else newDownvotes++;
            newUserVote = { 
          id: 0, 
          userId: "", 
          targetId: currentState.userVote?.targetId || targetId, 
          targetType: currentState.userVote?.targetType || targetType, 
          voteType, 
          createdAt: null 
        };
  }

  return {
    upvotes: newUpvotes,
    downvotes: newDownvotes,
    userVote: newUserVote,
  };
}

/**
 * Update a post/poll in all relevant query caches
 */
export function updatePostInAllCaches(
  queryClient: QueryClient,
  targetId: number,
  targetType: "post" | "poll" | "comment",
  updateFn: (item: any) => any
) {
  // Update all possible query caches that might contain this post/poll
  const queries = queryClient.getQueryCache().getAll();
  
  queries.forEach(query => {
    const key = query.queryKey;
    if (!Array.isArray(key)) return;
    
    // Check if this query might contain posts
    const mightContainPosts = (
      key[0] === "posts" ||
      key[0] === "/api/posts" ||
      key[0] === "featured-posts" ||
      key[0] === "trending-posts" ||
      key[0] === "polls"
    );
    
    if (!mightContainPosts) return;
    
    // Update the query data
    queryClient.setQueryData(key, (oldData: any) => {
      if (!oldData) return oldData;
      
      // Handle arrays of posts/polls
      if (Array.isArray(oldData)) {
        return oldData.map((item: any) => {
          if (item.id === targetId) {
            return updateFn(item);
          }
          return item;
        });
      }
      
      // Handle single post/poll
      if (oldData.id === targetId) {
        return updateFn(oldData);
      }
      
      return oldData;
    });
  });
}

/**
 * Invalidate all relevant queries after a vote
 */
export function invalidateVoteQueries(
  queryClient: QueryClient,
  targetId: number,
  targetType: "post" | "poll" | "comment"
) {
  // Invalidate all post-related queries
  const invalidationTargets = getAllPostsQueryKeys();
  
  invalidationTargets.forEach(target => {
    queryClient.invalidateQueries(target);
  });
  
  // Invalidate specific target queries
  if (targetType === "post") {
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.api.comments(targetId) });
  } else if (targetType === "poll") {
    queryClient.invalidateQueries({ queryKey: queryKeys.polls.detail(targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.polls.comments(targetId) });
  }
  
  // Invalidate user data to update karma
  queryClient.invalidateQueries({ queryKey: queryKeys.user.current() });
}

/**
 * Submit a vote to the server
 */
export async function submitVote(params: VoteParams): Promise<any> {
  const { targetId, targetType, voteType } = params;
  
  if (targetType === "poll") {
    return await apiRequest("POST", `/api/polls/${targetId}/votes`, {
      voteType,
    });
  } else {
    return await apiRequest("POST", "/api/vote", {
      targetId,
      targetType,
      voteType,
    });
  }
}

/**
 * Cancel all outgoing queries that might be affected by a vote
 */
export async function cancelVoteQueries(
  queryClient: QueryClient,
  targetId: number,
  targetType: "post" | "poll" | "comment"
) {
  // Cancel all post-related queries
  await queryClient.cancelQueries({ queryKey: queryKeys.posts.all() });
  await queryClient.cancelQueries({ queryKey: queryKeys.posts.api.all() });
  await queryClient.cancelQueries({ queryKey: queryKeys.posts.featured() });
  await queryClient.cancelQueries({ predicate: (query) => {
    const key = query.queryKey;
    if (!Array.isArray(key)) return false;
    return key[0] === "trending-posts" || (key[0] === "posts" && key.length >= 2);
  }});
  
  // Cancel specific target queries
  if (targetType === "post") {
    await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(targetId) });
  } else if (targetType === "poll") {
    await queryClient.cancelQueries({ queryKey: queryKeys.polls.detail(targetId) });
  }
}
