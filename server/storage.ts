import {
  users,
  organizations,
  bowls,
  posts,
  comments,
  votes,
  bowlFollows,
  bowlFavorites,
  orgTrustVotes,
  polls,
  pollOptions,
  pollVotes,

  getKarmaLevel,
  type User,
  type UpsertUser,
  type InsertOrganization,
  type Organization,
  type InsertBowl,
  type Bowl,
  type InsertPost,
  type Post,
  type InsertComment,
  type Comment,
  type InsertVote,
  type Vote,
  type InsertBowlFollow,
  type BowlFollow,
  type InsertBowlFavorite,
  type BowlFavorite,
  type PostWithDetails,
  type CommentWithDetails,
  type OrganizationWithStats,
  type OrgTrustVote,
  type InsertOrgTrustVote,
  type InsertPoll,
  type Poll,
  type InsertPollOption,
  type PollOption,
  type PollWithDetails,
  type InsertPollVote,
  type PollVote,

  notifications,
  type Notification,
  SavedContent,
  savedContent,
} from "@shared/schema";
import { generateAnonymousProfile } from "./anonymousNameGenerator";
import { createAnonymousUserResponse, createAnonymousPostResponse, createAnonymousCommentResponse } from './lib/anonymity';
import { db } from "./db";
import { eq, desc, sql, and, or, isNull, inArray, gte, lte, count, ne, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    getUserByWalletAddress(address: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserKarma(userId: string, karmaChange: number): Promise<void>;
  
  // Database utilities
  isDatabaseEmpty(): Promise<boolean>;

  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByName(name: string): Promise<Organization | undefined>;
  getOrganizations(): Promise<OrganizationWithStats[]>;
  getFeaturedOrganizations(): Promise<OrganizationWithStats[]>;
  getAllOrganizations(): Promise<OrganizationWithStats[]>;
  searchOrganizations(query: string): Promise<Organization[]>;
  searchOrganizationsWithStats(query: string): Promise<OrganizationWithStats[]>;
  getOrganizationWithStats(id: number): Promise<OrganizationWithStats | undefined>;

  // Bowl operations
  getBowl(id: number): Promise<Bowl | undefined>;
  getBowls(): Promise<Bowl[]>;
  getBowlsByCategory(category: string): Promise<Bowl[]>;
  getBowlsCategories(): Promise<{ category: string; count: number }[]>;
  followBowl(follow: InsertBowlFollow): Promise<BowlFollow>;
  unfollowBowl(userId: string, bowlId: number): Promise<void>;
  getUserBowlFollows(userId: string): Promise<(BowlFollow & { bowl: Bowl })[]>;
  isUserFollowingBowl(userId: string, bowlId: number): Promise<boolean>;
  updateBowlFavorite(userId: string, bowlId: number, isFavorite: boolean): Promise<void>;
  getUserBowlFavorites(userId: string): Promise<BowlFavorite[]>;
  isUserFavoritingBowl(userId: string, bowlId: number): Promise<boolean>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: number): Promise<PostWithDetails | undefined>;
  getPosts(filters?: { organizationId?: number; bowlId?: number; type?: string; featured?: boolean; trending?: boolean; time?: string; sortBy?: string; userId?: string }): Promise<PostWithDetails[]>;
  updatePostVoteCounts(postId: number): Promise<void>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<CommentWithDetails[]>;
  getCommentsByPoll(pollId: number): Promise<CommentWithDetails[]>;
  getCommentsByUser(userId: string): Promise<CommentWithDetails[]>;
  updateCommentVoteCounts(commentId: number): Promise<void>;
  recalculateAllCommentCounts(): Promise<{ updated: number; total: number }>;

  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVote(userId: string, targetId: number, targetType: string): Promise<Vote | undefined>;
  deleteVote(userId: string, targetId: number, targetType: string): Promise<void>;
  getUserVotes(userId: string, targetIds: number[], targetType: string): Promise<Vote[]>;

  // Trust vote operations
  createOrganizationTrustVote(vote: InsertOrgTrustVote): Promise<OrgTrustVote>;
  getOrganizationTrustVote(userId: string, organizationId: number): Promise<OrgTrustVote | undefined>;
  deleteOrganizationTrustVote(userId: string, organizationId: number): Promise<void>;

  // Poll operations
  getAllPolls(filters?: { featured?: boolean; trending?: boolean; time?: string; organizationId?: number }): Promise<PollWithDetails[]>;
  createPollVote(vote: InsertPollVote): Promise<PollVote>;
  updatePollOptionVoteCounts(optionIds: number[]): Promise<void>;
  hasUserVotedOnPoll(userId: string, pollId: number): Promise<boolean>;
  updatePollVoteCounts(pollId: number): Promise<void>;

  // Notification operations
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(userId: string, notifId: number): Promise<void>;

   // Bookmark/Save operations
  savePost(userId: string, postId: number): Promise<SavedContent>;
  unsavePost(userId: string, postId: number): Promise<void>;
  getUserSavedPosts(userId: string): Promise<(SavedContent & { post: PostWithDetails })[]>;
  isPostSavedByUser(userId: string, postId: number): Promise<boolean>;
  
  saveComment(userId: string, commentId: number): Promise<SavedContent>;
  unsaveComment(userId: string, commentId: number): Promise<void>;
  getUserSavedComments(userId: string): Promise<(SavedContent & { comment: CommentWithDetails })[]>;
  isCommentSavedByUser(userId: string, commentId: number): Promise<boolean>;

}

export class DatabaseStorage implements IStorage {
  private postCache = new Map<string, { posts: PostWithDetails[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private generateCacheKey(filters: any): string {
    return JSON.stringify({
      organizationId: filters?.organizationId,
      bowlId: filters?.bowlId,
      type: filters?.type,
      featured: filters?.featured,
      trending: filters?.trending,
      time: filters?.time,
      sortBy: filters?.sortBy,
      userId: filters?.userId,
    });
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    this.postCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.postCache.delete(key);
      }
    });
  }

  
  // ==================== BOOKMARK/SAVE OPERATIONS ====================

  // Save a post
  async savePost(userId: string, postId: number): Promise<SavedContent> {
    try {
      console.log('[storage] savePost called with:', { userId, postId });

      const [saved] = await db
        .insert(savedContent)
        .values({
          userId,
          postId,
        })
        .onConflictDoNothing()
        .returning();

      console.log('[storage] Post save result:', saved ? 'new save created' : 'already saved');

      // If already saved, return existing record
      if (!saved) {
        console.log('[storage] Fetching existing saved post...');
        const [existing] = await db
          .select()
          .from(savedContent)
          .where(
            and(
              eq(savedContent.userId, userId),
              eq(savedContent.postId, postId)
            )
          );
        console.log('[storage] Existing save found:', existing ? existing.id : 'none');
        return existing;
      }

      console.log('[storage] Post saved successfully:', saved.id);
      return saved;
    } catch (error) {
      console.error("Error saving post:", error);
      throw error;
    }
  }

  // Unsave a post
  async unsavePost(userId: string, postId: number): Promise<void> {
    try {
      console.log('[storage] unsavePost called with:', { userId, postId });
      
      await db
        .delete(savedContent)
        .where(
          and(
            eq(savedContent.userId, userId),
            eq(savedContent.postId, postId)
          )
        );

      console.log('[storage] Post unsaved successfully');
    } catch (error) {
      console.error("Error unsaving post:", error);
      throw error;
    }
  }

  // Get user's saved posts
  async getUserSavedPosts(userId: string): Promise<(SavedContent & { post: PostWithDetails })[]> {
    try {
      console.log('[storage] getUserSavedPosts called for:', userId);
      
      const results = await db
        .select({
          savedContent: savedContent,
          post: posts,
          author: users,
          organization: organizations,
          bowl: bowls,
        })
        .from(savedContent)
        .innerJoin(posts, eq(savedContent.postId, posts.id))
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(organizations, eq(posts.organizationId, organizations.id))
        .leftJoin(bowls, eq(posts.bowlId, bowls.id))
        .where(
          and(
            eq(savedContent.userId, userId),
            isNotNull(savedContent.postId)
          )
        )
        .orderBy(desc(savedContent.savedAt));

      console.log('[storage] Found', results.length, 'saved posts');

      return results.map(row => ({
        ...row.savedContent,
        post: {
          ...row.post!,
          author: row.author!,
          organization: row.organization || undefined,
          bowl: row.bowl || undefined,
        },
      }));
    } catch (error) {
      console.error("Error fetching user saved posts:", error);
      return [];
    }
  }

  // Check if post is saved by user
  async isPostSavedByUser(userId: string, postId: number): Promise<boolean> {
    try {
      const [saved] = await db
        .select()
        .from(savedContent)
        .where(
          and(
            eq(savedContent.userId, userId),
            eq(savedContent.postId, postId)
          )
        )
        .limit(1);
      
      return !!saved;
    } catch (error) {
      console.error("Error checking if post is saved:", error);
      return false;
    }
  }

  // Save a comment
  async saveComment(userId: string, commentId: number): Promise<SavedContent> {
    try {
      console.log('[storage] saveComment called with:', { userId, commentId });

      const [saved] = await db
        .insert(savedContent)
        .values({
          userId,
          commentId,
        })
        .onConflictDoNothing()
        .returning();

      console.log('[storage] Comment save result:', saved ? 'new save created' : 'already saved');

      // If already saved, return existing record
      if (!saved) {
        console.log('[storage] Fetching existing saved comment...');
        const [existing] = await db
          .select()
          .from(savedContent)
          .where(
            and(
              eq(savedContent.userId, userId),
              eq(savedContent.commentId, commentId)
            )
          );
        console.log('[storage] Existing save found:', existing ? existing.id : 'none');
        return existing;
      }

      console.log('[storage] Comment saved successfully:', saved.id);
      return saved;
    } catch (error) {
      console.error("Error saving comment:", error);
      throw error;
    }
  }

  // Unsave a comment
  async unsaveComment(userId: string, commentId: number): Promise<void> {
    try {
      console.log('[storage] unsaveComment called with:', { userId, commentId });
      
      await db
        .delete(savedContent)
        .where(
          and(
            eq(savedContent.userId, userId),
            eq(savedContent.commentId, commentId)
          )
        );

      console.log('[storage] Comment unsaved successfully');
    } catch (error) {
      console.error("Error unsaving comment:", error);
      throw error;
    }
  }

  // Get user's saved comments
  async getUserSavedComments(userId: string): Promise<(SavedContent & { comment: CommentWithDetails })[]> {
    try {
      console.log('[storage] getUserSavedComments called for:', userId);
      
      const results = await db
        .select({
          savedContent: savedContent,
          comment: comments,
          author: users,
        })
        .from(savedContent)
        .innerJoin(comments, eq(savedContent.commentId, comments.id))
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(
          and(
            eq(savedContent.userId, userId),
            isNotNull(savedContent.commentId)
          )
        )
        .orderBy(desc(savedContent.savedAt));

      console.log('[storage] Found', results.length, 'saved comments');

      return results.map(row => ({
        ...row.savedContent,
        comment: {
          ...row.comment!,
          author: row.author!,
          userVote: undefined,
          replies: [],
        },
      }));
    } catch (error) {
      console.error("Error fetching user saved comments:", error);
      return [];
    }
  }

  // Check if comment is saved by user
  async isCommentSavedByUser(userId: string, commentId: number): Promise<boolean> {
    try {
      const [saved] = await db
        .select()
        .from(savedContent)
        .where(
          and(
            eq(savedContent.userId, userId),
            eq(savedContent.commentId, commentId)
          )
        )
        .limit(1);
      
      return !!saved;
    } catch (error) {
      console.error("Error checking if comment is saved:", error);
      return false;
    }
  }
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined as any;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    if (!address) return undefined as any;
    const [user] = await db.select().from(users).where(eq(users.walletAddress, address));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Generate anonymous profile data if email is provided and username is missing
    if (userData.email && !userData.username) {
      const anonymousProfile = generateAnonymousProfile(userData.email);
      userData.username = anonymousProfile.username;
    }

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserKarma(userId: string, karmaChange: number): Promise<void> {
    await db
      .update(users)
      .set({
        karma: sql`${users.karma} + ${karmaChange}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Organization operations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(org).returning();
    return organization;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization;
  }

  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(sql`lower(${organizations.name}) = lower(${name})`)
      .limit(1);
    return organization;
  }

  async getOrganizations(): Promise<OrganizationWithStats[]> {
    const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
    
    const results = await Promise.all(orgs.map(async (org) => {
      // Get review statistics
      const reviewStats = await db
        .select({
          reviewCount: sql<number>`count(*)`,
          positive: sql<number>`count(*) filter (where ${posts.sentiment} = 'positive')`,
          neutral: sql<number>`count(*) filter (where ${posts.sentiment} = 'neutral')`,
          negative: sql<number>`count(*) filter (where ${posts.sentiment} = 'negative')`,
        })
        .from(posts)
        .where(and(eq(posts.organizationId, org.id), eq(posts.type, 'review')));

      const stats = reviewStats[0];
      const totalReviews = stats.reviewCount || 0;

      return {
        ...org,
        reviewCount: totalReviews,
        averageRating: totalReviews > 0 ? 
          (stats.positive * 5 + stats.neutral * 3 + stats.negative * 1) / totalReviews : 0,
        sentimentBreakdown: {
          positive: stats.positive || 0,
          neutral: stats.neutral || 0,
          negative: stats.negative || 0,
        },
      };
    }));

    return results;
  }

  async getFeaturedOrganizations(): Promise<OrganizationWithStats[]> {
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.isFeatured, true))
      .orderBy(desc(organizations.createdAt));
    
    const results = await Promise.all(orgs.map(async (org) => {
      // Get review statistics
      const reviewStats = await db
        .select({
          reviewCount: sql<number>`count(*)`,
          positive: sql<number>`count(*) filter (where ${posts.sentiment} = 'positive')`,
          neutral: sql<number>`count(*) filter (where ${posts.sentiment} = 'neutral')`,
          negative: sql<number>`count(*) filter (where ${posts.sentiment} = 'negative')`,
        })
        .from(posts)
        .where(and(eq(posts.organizationId, org.id), eq(posts.type, 'review')));

      const stats = reviewStats[0];
      const totalReviews = stats.reviewCount || 0;

      return {
        ...org,
        reviewCount: totalReviews,
        averageRating: totalReviews > 0 ? 
          (stats.positive * 5 + stats.neutral * 3 + stats.negative * 1) / totalReviews : 0,
        sentimentBreakdown: {
          positive: stats.positive || 0,
          neutral: stats.neutral || 0,
          negative: stats.negative || 0,
        },
      };
    }));

    return results;
  }

  async getAllOrganizations(): Promise<OrganizationWithStats[]> {
    const orgs = await db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.isFeatured), desc(organizations.createdAt));

    const results = await Promise.all(orgs.map(async (org) => {
      // Get review statistics
      const reviewStats = await db
        .select({
          reviewCount: sql<number>`count(*)`,
          positive: sql<number>`count(*) filter (where ${posts.sentiment} = 'positive')`,
          neutral: sql<number>`count(*) filter (where ${posts.sentiment} = 'neutral')`,
          negative: sql<number>`count(*) filter (where ${posts.sentiment} = 'negative')`,
        })
        .from(posts)
        .where(and(eq(posts.organizationId, org.id), eq(posts.type, 'review')));

      // Get trust vote statistics
      const trustStats = await db
        .select({
          trustVotes: sql<number>`count(*) filter (where ${orgTrustVotes.trustVote} = true)`,
          distrustVotes: sql<number>`count(*) filter (where ${orgTrustVotes.trustVote} = false)`,
        })
        .from(orgTrustVotes)
        .where(eq(orgTrustVotes.organizationId, org.id));

      const stats = reviewStats[0];
      const totalReviews = stats.reviewCount || 0;

      // Calculate trust percentage from votes
      const trustData = trustStats[0];
      const totalTrustVotes = (trustData.trustVotes || 0) + (trustData.distrustVotes || 0);
      const trustPercentage = totalTrustVotes > 0
        ? Math.round((trustData.trustVotes || 0) / totalTrustVotes * 100)
        : 50; // Default to 50% if no votes

      return {
        ...org,
        reviewCount: totalReviews,
        averageRating: totalReviews > 0 ?
          (stats.positive * 5 + stats.neutral * 3 + stats.negative * 1) / totalReviews : 0,
        sentimentBreakdown: {
          positive: stats.positive || 0,
          neutral: stats.neutral || 0,
          negative: stats.negative || 0,
        },
        trustData: {
          trustVotes: trustData.trustVotes || 0,
          distrustVotes: trustData.distrustVotes || 0,
          trustPercentage: trustPercentage,
        },
      };
    }));

    return results;
  }

  async searchOrganizations(query: string): Promise<Organization[]> {
    return await db
      .select()
      .from(organizations)
      .where(sql`${organizations.name} ILIKE ${'%' + query + '%'}`)
      .orderBy(organizations.name);
  }

  async searchOrganizationsWithStats(query: string): Promise<OrganizationWithStats[]> {
    const basicOrgs = await this.searchOrganizations(query);
    
    // Get stats for each organization
    const results = await Promise.all(basicOrgs.map(async (org) => {
      return await this.getOrganizationWithStats(org.id);
    }));
    
    // Filter out undefined results and return
    return results.filter((org): org is OrganizationWithStats => org !== undefined);
  }

  async searchPosts(query: string): Promise<PostWithDetails[]> {
    const q = query.trim();
    if (!q) return [];

    // Build case-insensitive condition
    // - If single word: match whole word using regex boundaries (avoid matching inside words like "fragmentation")
    // - If phrase (contains whitespace): do a simple ILIKE contains
    const isPhrase = /\s/.test(q);
    const whereCondition = isPhrase
      ? sql`${posts.title} ILIKE ${'%' + q + '%'} OR ${posts.content} ILIKE ${'%' + q + '%'}`
      : (() => {
          const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex chars
          const pattern = `(^|\\\W)${escaped}(\\\W|$)`; // word boundary-like, case-insensitive (~*)
          return sql`${posts.title} ~* ${pattern} OR ${posts.content} ~* ${pattern}`;
        })();

    const postsResult = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        type: posts.type,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
        organizationId: posts.organizationId,
        bowlId: posts.bowlId,
      })
      .from(posts)
      .where(whereCondition)
      .orderBy(desc(posts.createdAt))
      .limit(50);

    // Hydrate org/bowl minimal info
    const detailed = await Promise.all(postsResult.map(async (p) => {
      const result: any = { ...p };
      // attach minimal author (needed by PostCard)
      try {
        const author = await this.getUser(p.authorId);
        if (author) result.author = author as any;
      } catch {}
      if (p.organizationId) {
        result.organization = await this.getOrganization(p.organizationId);
      }
      if (p.bowlId) {
        result.bowl = await this.getBowl(p.bowlId);
      }
      return result;
    }));

    return detailed as any;
  }

  async getOrganizationWithStats(id: number): Promise<OrganizationWithStats | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));

    if (!organization) return undefined;

    // Get review statistics
    const reviewStats = await db
      .select({
        reviewCount: sql<number>`count(*)`,
        positive: sql<number>`count(*) filter (where ${posts.sentiment} = 'positive')`,
        neutral: sql<number>`count(*) filter (where ${posts.sentiment} = 'neutral')`,
        negative: sql<number>`count(*) filter (where ${posts.sentiment} = 'negative')`,
        lastReviewDate: sql<string>`max(${posts.createdAt})`,
      })
      .from(posts)
      .where(and(eq(posts.organizationId, id), eq(posts.type, 'review')));

    // Get rating averages
    const ratingAverages = await db
      .select({
        avgWorkLifeBalance: sql<number>`avg(${posts.workLifeBalance})`,
        avgCultureValues: sql<number>`avg(${posts.cultureValues})`,
        avgCareerOpportunities: sql<number>`avg(${posts.careerOpportunities})`,
        avgCompensation: sql<number>`avg(${posts.compensation})`,
        avgManagement: sql<number>`avg(${posts.management})`,
      })
      .from(posts)
      .where(and(eq(posts.organizationId, id), eq(posts.type, 'review')));

    const stats = reviewStats[0];
    const totalReviews = stats.reviewCount || 0;
    const ratings = ratingAverages[0];

    // Calculate overall average rating from the 5 categories
    let averageRating = 0;
    if (totalReviews > 0) {
      const validRatings = [
        ratings.avgWorkLifeBalance,
        ratings.avgCultureValues,
        ratings.avgCareerOpportunities,
        ratings.avgCompensation,
        ratings.avgManagement
      ].filter(rating => rating !== null && rating !== undefined);
      
      if (validRatings.length > 0) {
        averageRating = validRatings.reduce((sum, rating) => sum + Number(rating), 0) / validRatings.length;
      }
    }

    // Get trust voting statistics
    const trustStats = await db
      .select({
        trustVotes: sql<number>`count(*) filter (where ${orgTrustVotes.trustVote} = true)`,
        distrustVotes: sql<number>`count(*) filter (where ${orgTrustVotes.trustVote} = false)`,
      })
      .from(orgTrustVotes)
      .where(eq(orgTrustVotes.organizationId, id));

    const trust = trustStats[0];
    const totalTrustVotes = (trust.trustVotes || 0) + (trust.distrustVotes || 0);
    const trustPercentage = totalTrustVotes > 0 ? Math.round(((trust.trustVotes || 0) / totalTrustVotes) * 100) : 0;

    // Get review trends over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const reviewTrends = await db
      .select({
        date: sql<string>`date(${posts.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.organizationId, id),
          eq(posts.type, 'review'),
          gte(posts.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`date(${posts.createdAt})`)
      .orderBy(sql`date(${posts.createdAt})`);

    // Calculate risk signal (>40% negative reviews in last 30 days)
    const recentNegativeStats = await db
      .select({
        totalRecent: sql<number>`count(*)`,
        negativeRecent: sql<number>`count(*) filter (where ${posts.sentiment} = 'negative')`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.organizationId, id),
          eq(posts.type, 'review'),
          gte(posts.createdAt, thirtyDaysAgo)
        )
      );

    const recentStats = recentNegativeStats[0];
    const negativePercentageLast30Days = recentStats.totalRecent > 0 ? 
      Math.round(((recentStats.negativeRecent || 0) / recentStats.totalRecent) * 100) : 0;
    const hasRisk = negativePercentageLast30Days > 40;

    // Get top reviews (most helpful and most controversial)
    const mostHelpfulQuery = db
      .select({
        post: posts,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.organizationId, id), eq(posts.type, 'review')))
      .orderBy(desc(sql`${posts.upvotes} - ${posts.downvotes}`))
      .limit(1);

    const mostControversialQuery = db
      .select({
        post: posts,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.organizationId, id), eq(posts.type, 'review')))
      .orderBy(desc(sql`${posts.upvotes} + ${posts.downvotes}`))
      .limit(1);

    const [mostHelpfulResult, mostControversialResult] = await Promise.all([
      mostHelpfulQuery,
      mostControversialQuery,
    ]);

    const mostHelpful = mostHelpfulResult[0] ? {
      ...mostHelpfulResult[0].post,
      author: {
        ...mostHelpfulResult[0].author,
        karmaLevel: getKarmaLevel(mostHelpfulResult[0].author.karma),
      },
    } : undefined;

    const mostControversial = mostControversialResult[0] ? {
      ...mostControversialResult[0].post,
      author: {
        ...mostControversialResult[0].author,
        karmaLevel: getKarmaLevel(mostControversialResult[0].author.karma),
      },
    } : undefined;

    return {
      ...organization,
      reviewCount: totalReviews,
      averageRating: averageRating,
      sentimentBreakdown: {
        positive: stats.positive || 0,
        neutral: stats.neutral || 0,
        negative: stats.negative || 0,
      },
      trustData: {
        trustVotes: trust.trustVotes || 0,
        distrustVotes: trust.distrustVotes || 0,
        trustPercentage,
      },
      riskSignal: {
        hasRisk,
        negativePercentageLast30Days,
      },
      lastReviewDate: stats.lastReviewDate ? new Date(stats.lastReviewDate) : undefined,
      reviewTrends: reviewTrends.map(trend => ({
        date: trend.date,
        count: trend.count,
      })),
      topReviews: {
        mostHelpful,
        mostControversial,
      },
      // Include individual rating averages
      avgWorkLifeBalance: ratings.avgWorkLifeBalance ? Number(ratings.avgWorkLifeBalance) : null,
      avgCultureValues: ratings.avgCultureValues ? Number(ratings.avgCultureValues) : null,
      avgCareerOpportunities: ratings.avgCareerOpportunities ? Number(ratings.avgCareerOpportunities) : null,
      avgCompensation: ratings.avgCompensation ? Number(ratings.avgCompensation) : null,
      avgManagement: ratings.avgManagement ? Number(ratings.avgManagement) : null,
    };
  }

  // Bowl operations (no creation - predefined only)

  async getBowl(id: number): Promise<Bowl | undefined> {
    const [bowl] = await db.select().from(bowls).where(eq(bowls.id, id));
    return bowl;
  }

  async getBowlByName(name: string): Promise<Bowl | undefined> {
    const [bowl] = await db
      .select()
      .from(bowls)
      .where(sql`lower(${bowls.name}) = lower(${name})`)
      .limit(1);
    return bowl;
  }

  async getBowls(): Promise<Bowl[]> {
    return await db.select().from(bowls).orderBy(desc(bowls.memberCount));
  }

  async getBowlsByCategory(category: string): Promise<Bowl[]> {
    return await db.select().from(bowls).where(eq(bowls.category, category)).orderBy(desc(bowls.memberCount));
  }

  async getBowlsCategories(): Promise<{ category: string; count: number }[]> {
    const result = await db
      .select({
        category: bowls.category,
        count: sql<number>`count(*)`,
      })
      .from(bowls)
      .groupBy(bowls.category)
      .orderBy(bowls.category);
    
    return result;
  }

  async followBowl(follow: InsertBowlFollow): Promise<BowlFollow> {
    try {
      console.log('[storage] followBowl called with:', follow);
      
      const [newFollow] = await db
        .insert(bowlFollows)
        .values(follow)
        .onConflictDoNothing()
        .returning();

      console.log('[storage] Insert result:', newFollow ? 'new follow created' : 'no new follow (conflict)');

      // If no new follow was created (already following), return existing follow
      if (!newFollow) {
        console.log('[storage] Fetching existing follow...');
        const [existingFollow] = await db
          .select()
          .from(bowlFollows)
          .where(
            and(
              eq(bowlFollows.userId, follow.userId),
              eq(bowlFollows.bowlId, follow.bowlId)
            )
          );
        console.log('[storage] Existing follow found:', existingFollow ? existingFollow.id : 'none');
        return existingFollow;
      }

      // Update follower count only if new follow was created
      console.log('[storage] Updating bowl member count...');
      await db
        .update(bowls)
        .set({
          memberCount: sql`${bowls.memberCount} + 1`,
        })
        .where(eq(bowls.id, follow.bowlId));

      console.log('[storage] Follow created successfully:', newFollow.id);
      return newFollow;
    } catch (error) {
      console.error("Error in followBowl:", error);
      throw error;
    }
  }

  async unfollowBowl(userId: string, bowlId: number): Promise<void> {
    await db
      .delete(bowlFollows)
      .where(
        and(
          eq(bowlFollows.userId, userId),
          eq(bowlFollows.bowlId, bowlId)
        )
      );

    // Update follower count
    await db
      .update(bowls)
      .set({
        memberCount: sql`${bowls.memberCount} - 1`,
      })
      .where(eq(bowls.id, bowlId));
  }

  async getUserBowlFollows(userId: string): Promise<(BowlFollow & { bowl: Bowl })[]> {
    return await db
      .select({
        id: bowlFollows.id,
        userId: bowlFollows.userId,
        bowlId: bowlFollows.bowlId,
        followedAt: bowlFollows.followedAt,
        bowl: bowls,
      })
      .from(bowlFollows)
      .innerJoin(bowls, eq(bowlFollows.bowlId, bowls.id))
      .where(eq(bowlFollows.userId, userId));
  }

  async isUserFollowingBowl(userId: string, bowlId: number): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(bowlFollows)
      .where(
        and(
          eq(bowlFollows.userId, userId),
          eq(bowlFollows.bowlId, bowlId)
        )
      );
    return !!follow;
  }

  async updateBowlFavorite(userId: string, bowlId: number, isFavorite: boolean): Promise<void> {
    try {
      console.log('[favorite] Updating favorite:', { userId, bowlId, isFavorite });
      
      if (isFavorite) {
        // Add to favorites
        const [newFavorite] = await db
          .insert(bowlFavorites)
          .values({
            userId,
            bowlId,
          })
          .onConflictDoNothing()
          .returning();

        if (newFavorite) {
          console.log('[favorite] Added to favorites:', newFavorite.id);
        } else {
          console.log('[favorite] Already in favorites');
        }
      } else {
        // Remove from favorites
        const result = await db
          .delete(bowlFavorites)
          .where(and(eq(bowlFavorites.userId, userId), eq(bowlFavorites.bowlId, bowlId)))
          .returning();

        console.log('[favorite] Removed from favorites:', result.length > 0);
      }
    } catch (error) {
      console.error("Error updating bowl favorite:", error);
      throw error;
    }
  }

  async getUserBowlFavorites(userId: string): Promise<BowlFavorite[]> {
    try {
      return await db
        .select()
        .from(bowlFavorites)
        .where(eq(bowlFavorites.userId, userId));
    } catch (error) {
      console.error("Error fetching user bowl favorites:", error);
      return [];
    }
  }

  async isUserFavoritingBowl(userId: string, bowlId: number): Promise<boolean> {
    try {
      const [favorite] = await db
        .select()
        .from(bowlFavorites)
        .where(and(eq(bowlFavorites.userId, userId), eq(bowlFavorites.bowlId, bowlId)));
      
      return !!favorite;
    } catch (error) {
      console.error("Error checking if user is favoriting bowl:", error);
      return false;
    }
  }

  // Poll operations
  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [newPoll] = await db.insert(polls).values(poll).returning();
    return newPoll;
  }

  async createPollOption(option: InsertPollOption): Promise<PollOption> {
    const [newOption] = await db.insert(pollOptions).values(option).returning();
    return newOption;
  }

  async getPollWithDetails(pollId: number, userId?: string): Promise<PollWithDetails | undefined> {
    const result = await db
      .select({
        poll: polls,
        author: users,
        bowl: bowls,
        organization: organizations,
        options: pollOptions,
      })
      .from(polls)
      .leftJoin(users, eq(polls.authorId, users.id))
      .leftJoin(bowls, eq(polls.bowlId, bowls.id))
      .leftJoin(organizations, eq(polls.organizationId, organizations.id))
      .leftJoin(pollOptions, eq(polls.id, pollOptions.pollId))
      .where(eq(polls.id, pollId));

    if (result.length === 0) return undefined;

    const poll = result[0].poll;
    const author = result[0].author!;
    const bowl = result[0].bowl || undefined;
    const organization = result[0].organization || undefined;
    const options = result
      .map(r => r.options)
      .filter((opt): opt is NonNullable<typeof opt> => opt !== null)
      .map(opt => ({ ...opt, isVotedBy: false }));

    // Get user's voting information if userId is provided
    let hasVoted = false;
    let selectedOptions: number[] = [];
    
    if (userId) {
      const userVotes = await db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
      
      hasVoted = userVotes.length > 0;
      selectedOptions = userVotes.map(vote => vote.optionId);
    }

    return {
      ...poll,
      author,
      bowl,
      organization,
      options,
      totalVotes: options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0),
      hasVoted,
      selectedOptions,
    };
  }

  async getAllPolls(filters?: { featured?: boolean; trending?: boolean; time?: string; sortBy?: string; organizationId?: number }): Promise<PollWithDetails[]> {
// Collect all where conditions
const whereConditions = [];

// Apply filters
if (filters?.organizationId) {
  whereConditions.push(eq(polls.organizationId, filters.organizationId));
}

if (filters?.featured) {
  // For now, return polls with high engagement (high upvotes or total votes)
  whereConditions.push(gte(polls.upvotes, 5));
}

if (filters?.time && filters.time !== 'all') {
  const now = new Date();
  let timeThreshold: Date | null = null;
  
  switch (filters.time) {
    case 'hour':
      timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'day': // Frontend sends 'day'
      timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }
  
  if (timeThreshold) {
    whereConditions.push(gte(polls.createdAt, timeThreshold));
  }
}

// Build the base query with where clause first, then join
let query = db
  .select({
    poll: polls,
    author: users,
    bowl: bowls,
    organization: organizations,
    options: pollOptions,
  })
  .from(polls)
  .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
  .leftJoin(users, eq(polls.authorId, users.id))
  .leftJoin(bowls, eq(polls.bowlId, bowls.id))
  .leftJoin(organizations, eq(polls.organizationId, organizations.id))
  .leftJoin(pollOptions, eq(polls.id, pollOptions.pollId));

    let finalQuery;
    if (filters?.sortBy === 'hot') {
      // For 'hot', we sort by upvotes in SQL as a first pass.
      // The detailed "hot" score will be calculated in JS below.
      finalQuery = query.orderBy(desc(polls.upvotes), desc(polls.createdAt));
    } else {
      // Default to 'new'
      finalQuery = query.orderBy(desc(polls.createdAt));
    }

    const result = await finalQuery; // Use the dynamically sorted query

    // Group by poll and aggregate options
    const pollMap = new Map<number, PollWithDetails>();
    
    result.forEach(row => {
      const pollId = row.poll.id;
      if (!pollMap.has(pollId)) {
        pollMap.set(pollId, {
          ...row.poll,
          author: row.author!,
          bowl: row.bowl || undefined,
          organization: row.organization || undefined,
          options: [],
          totalVotes: 0,
          userVote: undefined, // Will be populated later if user is authenticated
        });
      }
      
      if (row.options) {
        const poll = pollMap.get(pollId)!;
        // Check if this option is already added to avoid duplicates
        const existingOption = poll.options.find(opt => opt.id === row.options!.id);
        if (!existingOption) {
          poll.options.push({ ...row.options, isVotedBy: false });
          poll.totalVotes += row.options.voteCount || 0;
        }
      }
    });

    let pollResults = Array.from(pollMap.values());

   // This logic now correctly triggers on `sortBy === 'hot'`
    if (filters?.sortBy === 'hot') {
      pollResults = pollResults.sort((a, b) => {
        const scoreA = (a.upvotes - a.downvotes) + (a.totalVotes * 0.1);
        const scoreB = (b.upvotes - b.downvotes) + (b.totalVotes * 0.1);
        
        // If scores are different, sort by score
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // If scores are the same, fall back to newest
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });
    }
    return pollResults;
  }

  async createPollVote(vote: InsertPollVote): Promise<PollVote> {
    const [newVote] = await db.insert(pollVotes).values(vote).returning();
    return newVote;
  }

  async updatePollOptionVoteCounts(optionIds: number[]): Promise<void> {
    for (const optionId of optionIds) {
      const voteCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(pollVotes)
        .where(eq(pollVotes.optionId, optionId));
      
      await db
        .update(pollOptions)
        .set({ voteCount: voteCount[0].count || 0 })
        .where(eq(pollOptions.id, optionId));
    }
  }

  async hasUserVotedOnPoll(userId: string, pollId: number): Promise<boolean> {
    const existingVote = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.userId, userId), eq(pollVotes.pollId, pollId)))
      .limit(1);
    
    return existingVote.length > 0;
  }

  async updatePollVoteCounts(pollId: number): Promise<void> {
    // Count upvotes and downvotes for the poll
    const upvotes = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(and(eq(votes.targetId, pollId), eq(votes.targetType, 'poll'), eq(votes.voteType, 'up')));
    
    const downvotes = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(and(eq(votes.targetId, pollId), eq(votes.targetType, 'poll'), eq(votes.voteType, 'down')));
    
    // Update the poll with the new vote counts
    await db
      .update(polls)
      .set({ 
        upvotes: upvotes[0].count || 0,
        downvotes: downvotes[0].count || 0
      })
      .where(eq(polls.id, pollId));
    
    // Clear post cache after vote count update (polls are also displayed as posts)
    this.postCache.clear();
  }





  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    // If this is a review, check for existing review by same user for same organization
    if (post.type === 'review' && post.organizationId) {
      const existingReview = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.authorId, post.authorId),
            eq(posts.organizationId, post.organizationId),
            eq(posts.type, 'review')
          )
        )
        .limit(1);

      if (existingReview.length > 0) {
        // Update existing review instead of creating new one
        const [updatedPost] = await db
          .update(posts)
          .set({
            title: post.title,
            content: post.content,
            sentiment: post.sentiment,
            workLifeBalance: post.workLifeBalance,
            cultureValues: post.cultureValues,
            careerOpportunities: post.careerOpportunities,
            compensation: post.compensation,
            management: post.management,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, existingReview[0].id))
          .returning();

        // Clear post cache after updating
        this.postCache.clear();
        console.log('[Storage] Updated existing review:', updatedPost.id);
        
        return updatedPost;
      }
    }

    const [newPost] = await db.insert(posts).values(post).returning();
    
    // Clear post cache after creating a new post
    this.postCache.clear();
    console.log('[Storage] Post cache cleared after creating new post:', newPost.id);
    console.log('[Storage] Cache size after clearing:', this.postCache.size);
    
    return newPost;
  }

  async getPost(id: number): Promise<PostWithDetails | undefined> {
    const result = await db
      .select({
        post: posts,
        author: users,
        organization: organizations,
        bowl: bowls,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(organizations, eq(posts.organizationId, organizations.id))
      .leftJoin(bowls, eq(posts.bowlId, bowls.id))
      .where(eq(posts.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      ...row.post,
      author: row.author!,
      organization: row.organization || undefined,
      bowl: row.bowl || undefined,
    };
  }

  async getCommentById(id: number): Promise<Comment | undefined> {
    const [c] = await db.select().from(comments).where(eq(comments.id, id));
    return c;
  }

  async updatePostCommentCount(postId: number): Promise<void> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.postId, postId));
    const newCount = row?.count || 0;
    await db.update(posts).set({ commentCount: newCount, updatedAt: new Date() }).where(eq(posts.id, postId));
  }

  async deleteCommentCascade(commentId: number, requesterId: string): Promise<void> {
    const target = await this.getCommentById(commentId);
    if (!target) return;
    if (target.authorId !== requesterId) throw new Error('FORBIDDEN');

    // Gather target and all descendants within same post
    const all = await db.select().from(comments).where(eq(comments.postId, target.postId!));
    const idToChildren = new Map<number, number[]>();
    all.forEach(c => {
      if (c.parentId != null) {
        const list = idToChildren.get(c.parentId) || [];
        list.push(c.id);
        idToChildren.set(c.parentId, list);
      }
    });
    const toDelete: number[] = [];
    const stack: number[] = [commentId];
    while (stack.length) {
      const id = stack.pop()!;
      toDelete.push(id);
      const children = idToChildren.get(id) || [];
      children.forEach(ch => stack.push(ch));
    }

    // Delete votes on these comments
    if (toDelete.length > 0) {
      await db.delete(votes).where(and(inArray(votes.targetId, toDelete), eq(votes.targetType, 'comment')));
      await db.delete(comments).where(inArray(comments.id, toDelete));
    }

    // Recompute post comment count
    if (target.postId) {
      await this.updatePostCommentCount(target.postId);
    }
  }

  async deletePostCascade(postId: number, requesterId: string): Promise<void> {
    const post = await this.getPost(postId);
    if (!post) return;
    if (post.authorId !== requesterId) throw new Error('FORBIDDEN');

    // Delete votes on post
    await db.delete(votes).where(and(eq(votes.targetId, postId), eq(votes.targetType, 'post')));

    // Delete all comments on post (and their votes)
    const allComments = await db.select({ id: comments.id }).from(comments).where(eq(comments.postId, postId));
    const commentIds = allComments.map(c => c.id);
    if (commentIds.length > 0) {
      await db.delete(votes).where(and(inArray(votes.targetId, commentIds), eq(votes.targetType, 'comment')));
      await db.delete(comments).where(inArray(comments.id, commentIds));
    }

    // If a poll is linked to this post, delete its data
    const [poll] = await db.select().from(polls).where(eq(polls.postId, postId));
    if (poll) {
      await db.delete(pollVotes).where(eq(pollVotes.pollId, poll.id));
      await db.delete(pollOptions).where(eq(pollOptions.pollId, poll.id));
      await db.delete(comments).where(eq(comments.pollId, poll.id));
      await db.delete(votes).where(and(eq(votes.targetId, poll.id), eq(votes.targetType, 'poll')));
      await db.delete(polls).where(eq(polls.id, poll.id));
    }

    // Finally delete post
    await db.delete(posts).where(eq(posts.id, postId));
    
    // Clear all post caches after deletion
    this.postCache.clear();
  }

  async deletePollCascade(pollId: number, requesterId: string): Promise<void> {
    const poll = await this.getPollWithDetails(pollId);
    if (!poll) return;
    if (poll.author.id !== requesterId) throw new Error('FORBIDDEN');

    await db.delete(pollVotes).where(eq(pollVotes.pollId, pollId));
    await db.delete(pollOptions).where(eq(pollOptions.pollId, pollId));
    await db.delete(comments).where(eq(comments.pollId, pollId));
    await db.delete(votes).where(and(eq(votes.targetId, pollId), eq(votes.targetType, 'poll')));

    // If this poll is linked to a post, delete the post as well (owned by same author)
    if (poll.postId) {
      await db.delete(posts).where(eq(posts.id, poll.postId));
    }

    await db.delete(polls).where(eq(polls.id, pollId));
    
    // Clear all post caches after poll deletion (since polls are also posts)
    this.postCache.clear();
  }

    async getPosts(filters?: {
    organizationId?: number;
    bowlId?: number;
    type?: string;
    featured?: boolean;
    trending?: boolean;
    time?: string;
    sortBy?: string;
    userId?: string;
  }): Promise<PostWithDetails[]> {
    // Clear expired cache entries
    this.clearExpiredCache();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(filters);

    // Check cache first
    const cached = this.postCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.posts;
    }
    
    console.log('[getPosts] Filters:', filters);

    // Debug: Test basic database connection
    try {
      const testPosts = await db.select().from(posts).limit(1);
      console.log('[getPosts] Database connection test - found posts:', testPosts.length);
    } catch (error) {
      console.error('[getPosts] Database connection error:', error);
    }

    const conditions = [];
    if (filters?.organizationId) {
      conditions.push(eq(posts.organizationId, filters.organizationId));
    }
    if (filters?.bowlId) {
      conditions.push(eq(posts.bowlId, filters.bowlId));
    }
    if (filters?.type) {
      conditions.push(eq(posts.type, filters.type));
    }
    if (filters?.userId) {
      console.log('[getPosts] Filtering by userId:', filters.userId, 'type:', typeof filters.userId);
      conditions.push(eq(posts.authorId, filters.userId));
    }

    // Apply time filter for all sorting methods
    if (filters?.time && filters.time !== 'all') {
      const now = new Date();
      let timeThreshold: Date;
      
      switch (filters.time) {
        case 'hour':
          timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      conditions.push(gte(posts.createdAt, timeThreshold));
    }

    // Apply featured filter
    if (filters?.featured) {
      // Posts with high engagement (high upvotes or comment count)
      conditions.push(or(gte(posts.upvotes, 10), gte(posts.commentCount, 5)));
    }

    // Apply trending filter
    if (filters?.trending) {
      const timeFilter = filters.time || 'day';
      const now = new Date();
      let timeThreshold: Date;
      
      switch (timeFilter) {
        case 'hour':
          timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      conditions.push(gte(posts.createdAt, timeThreshold));
    }

    let result: any[];

    if (conditions.length > 0) {
      console.log('[getPosts] Executing query with conditions:', conditions.length);
      console.log('[getPosts] Conditions:', conditions);

      // Debug: Try to execute the query step by step
      try {
        result = await db
          .select({
            post: posts,
            author: users,
            organization: organizations,
            bowl: bowls,
          })
          .from(posts)
          .leftJoin(users, eq(posts.authorId, users.id))
          .leftJoin(organizations, eq(posts.organizationId, organizations.id))
          .leftJoin(bowls, eq(posts.bowlId, bowls.id))
          .where(and(...conditions))
          .orderBy(desc(posts.createdAt));
        console.log('[getPosts] Query result:', result.length, 'posts found');
        if (result.length > 0) {
          console.log('[getPosts] First post authorId:', result[0].post.authorId);
        }
      } catch (error) {
        console.error('[getPosts] Query execution error:', error);
        result = [];
      }
    } else {
      console.log('[getPosts] Executing query without conditions');
      result = await db
        .select({
          post: posts,
          author: users,
          organization: organizations,
          bowl: bowls,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(organizations, eq(posts.organizationId, organizations.id))
        .leftJoin(bowls, eq(posts.bowlId, bowls.id))
        .orderBy(desc(posts.createdAt));
      console.log('[getPosts] Query result:', result.length, 'posts found');
    }

    let postResults = result.map(row => ({
      ...row.post,
      author: row.author!,
      organization: row.organization || undefined,
      bowl: row.bowl || undefined,
    }));

    // Apply server-side sorting based on sortBy parameter
    if (filters?.sortBy) {
      console.log(`[SORTING] Using sortBy: ${filters.sortBy}`);
      switch (filters.sortBy) {
        case 'hot':
          console.log(`[SORTING] Applying hot sorting to ${postResults.length} posts`);
          postResults = postResults.sort((a, b) => {
            const scoreA = this.calculateHotScore(a);
            const scoreB = this.calculateHotScore(b);
            console.log(`[HOT SORT] Post ${a.id}: score=${scoreA.toFixed(4)}, votes=${a.upvotes}-${a.downvotes}, comments=${a.commentCount}`);
            console.log(`[HOT SORT] Post ${b.id}: score=${scoreB.toFixed(4)}, votes=${b.upvotes}-${b.downvotes}, comments=${b.commentCount}`);
            return scoreB - scoreA;
          });
          break;
        case 'new':
          console.log(`[SORTING] Applying new sorting to ${postResults.length} posts`);
          postResults = postResults.sort((a, b) => {
            const timeA = new Date(a.createdAt || '').getTime();
            const timeB = new Date(b.createdAt || '').getTime();
            console.log(`[NEW SORT] Post ${a.id}: createdAt=${a.createdAt}, time=${timeA}`);
            console.log(`[NEW SORT] Post ${b.id}: createdAt=${b.createdAt}, time=${timeB}`);
            return timeB - timeA;
          });
          break;
        case 'top':
          postResults = postResults.sort((a, b) => 
            (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
          );
          break;
        case 'rising':
          postResults = postResults.sort((a, b) => {
            const scoreA = this.calculateRisingScore(a);
            const scoreB = this.calculateRisingScore(b);
            return scoreB - scoreA;
          });
          break;
        case 'trending':
          postResults = postResults.sort((a, b) => {
            const scoreA = this.calculateTrendingScore(a);
            const scoreB = this.calculateTrendingScore(b);
            return scoreB - scoreA;
          });
          break;
        default:
          // Default to new if no valid sortBy
          console.log(`[SORTING] Using default sorting (new) for ${postResults.length} posts`);
          postResults = postResults.sort((a, b) => 
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );
      }
    } else {
      // If no sortBy provided, default to hot
      console.log(`[SORTING] No sortBy provided, defaulting to hot for ${postResults.length} posts`);
      postResults = postResults.sort((a, b) => {
        const scoreA = this.calculateHotScore(a);
        const scoreB = this.calculateHotScore(b);
        return scoreB - scoreA;
      });
    }

    // Cache the results
    this.postCache.set(cacheKey, {
      posts: postResults,
      timestamp: Date.now()
    });

    return postResults;
  }

  async updatePostVoteCounts(postId: number): Promise<void> {
    const voteCounts = await db
      .select({
        upvotes: sql<number>`count(*) filter (where ${votes.voteType} = 'up')`,
        downvotes: sql<number>`count(*) filter (where ${votes.voteType} = 'down')`,
      })
      .from(votes)
      .where(and(eq(votes.targetId, postId), eq(votes.targetType, 'post')));

    const counts = voteCounts[0];
    await db
      .update(posts)
      .set({
        upvotes: counts.upvotes || 0,
        downvotes: counts.downvotes || 0,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
    
    // Clear post cache after vote count update
    this.postCache.clear();
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    console.log('=== CREATING COMMENT ===');
    console.log('Input data:', JSON.stringify(comment, null, 2));
    
    // Ensure parentId is properly handled (convert undefined to null)
    const commentData = {
      ...comment,
      parentId: comment.parentId || null,
    };
    
    console.log('Processed data:', JSON.stringify(commentData, null, 2));
    
    const [newComment] = await db.insert(comments).values(commentData).returning();
    console.log('Database result:', JSON.stringify(newComment, null, 2));
    console.log('========================');

    // Update post comment count if this is a post comment
    if (comment.postId) {
      await db
        .update(posts)
        .set({
          commentCount: sql`${posts.commentCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, comment.postId));
    }

    return newComment;
  }

  async getCommentsByPost(postId: number): Promise<CommentWithDetails[]> {
    console.log('=== FETCHING COMMENTS ===');
    console.log('Post ID:', postId);
    
    // Get all comments for this post
    const allComments = await db
      .select({
        comment: comments,
        author: users,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);

    console.log(`Raw comments from DB: ${allComments.length}`);
    allComments.forEach(row => {
      console.log(`  ID: ${row.comment.id}, ParentID: ${row.comment.parentId}, Content: "${row.comment.content.substring(0, 20)}..."`);
    });

    // Create comments map
    const commentsMap = new Map<number, CommentWithDetails>();
    allComments.forEach(row => {
      commentsMap.set(row.comment.id, {
        ...row.comment,
        author: row.author!,
        userVote: undefined,
        replies: [],
      });
    });

    // Separate top-level comments and replies
    const topLevelComments: CommentWithDetails[] = [];
    const replies: CommentWithDetails[] = [];

    allComments.forEach(row => {
      const commentWithDetails = commentsMap.get(row.comment.id)!;
      
      if (row.comment.parentId === null || row.comment.parentId === undefined) {
        topLevelComments.push(commentWithDetails);
        console.log(`Top-level: ${row.comment.id}`);
      } else {
        replies.push(commentWithDetails);
        console.log(`Reply: ${row.comment.id} -> Parent: ${row.comment.parentId}`);
      }
    });

    // Attach replies to their parents
    replies.forEach(reply => {
      const parent = commentsMap.get(reply.parentId!);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(reply);
        console.log(`✓ Attached reply ${reply.id} to parent ${reply.parentId}`);
      } else {
        console.log(`✗ Parent ${reply.parentId} not found for reply ${reply.id}`);
      }
    });

    console.log(`Final: ${topLevelComments.length} top-level, ${replies.length} replies`);
    topLevelComments.forEach(comment => {
      console.log(`  ${comment.id}: ${comment.replies?.length || 0} replies`);
    });
    console.log('========================');

    return topLevelComments;
  }

  async getCommentsByPoll(pollId: number): Promise<CommentWithDetails[]> {
    console.log('=== FETCHING POLL COMMENTS ===');
    console.log('Poll ID:', pollId);
    
    // Get all comments for this poll
    const allComments = await db
      .select({
        comment: comments,
        author: users,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.pollId, pollId))
      .orderBy(comments.createdAt);

    console.log(`Raw poll comments from DB: ${allComments.length}`);
    allComments.forEach(row => {
      console.log(`  ID: ${row.comment.id}, ParentID: ${row.comment.parentId}, Content: "${row.comment.content.substring(0, 20)}..."`);
    });

    // Create comments map
    const commentsMap = new Map<number, CommentWithDetails>();
    allComments.forEach(row => {
      commentsMap.set(row.comment.id, {
        ...row.comment,
        author: row.author!,
        userVote: undefined,
        replies: [],
      });
    });

    // Separate top-level comments and replies
    const topLevelComments: CommentWithDetails[] = [];
    const replies: CommentWithDetails[] = [];

    allComments.forEach(row => {
      const commentWithDetails = commentsMap.get(row.comment.id)!;
      
      if (row.comment.parentId === null || row.comment.parentId === undefined) {
        topLevelComments.push(commentWithDetails);
        console.log(`Top-level: ${row.comment.id}`);
      } else {
        replies.push(commentWithDetails);
        console.log(`Reply: ${row.comment.id} -> Parent: ${row.comment.parentId}`);
      }
    });

    // Attach replies to their parents
    replies.forEach(reply => {
      const parent = commentsMap.get(reply.parentId!);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(reply);
        console.log(`✓ Attached reply ${reply.id} to parent ${reply.parentId}`);
      } else {
        console.log(`✗ Parent ${reply.parentId} not found for reply ${reply.id}`);
      }
    });

    console.log(`Final: ${topLevelComments.length} top-level, ${replies.length} replies`);
    topLevelComments.forEach(comment => {
      console.log(`  ${comment.id}: ${comment.replies?.length || 0} replies`);
    });
    console.log('========================');

    return topLevelComments;
  }

  async updateCommentVoteCounts(commentId: number): Promise<void> {
    const voteCounts = await db
      .select({
        upvotes: sql<number>`count(*) filter (where ${votes.voteType} = 'up')`,
        downvotes: sql<number>`count(*) filter (where ${votes.voteType} = 'down')`,
      })
      .from(votes)
      .where(and(eq(votes.targetId, commentId), eq(votes.targetType, 'comment')));

    const counts = voteCounts[0];
    await db
      .update(comments)
      .set({
        upvotes: counts.upvotes || 0,
        downvotes: counts.downvotes || 0,
      })
      .where(eq(comments.id, commentId));
  }

  async getCommentsByUser(userId: string): Promise<CommentWithDetails[]> {
    console.log('[getCommentsByUser] Fetching comments for userId:', userId);

    // Get all comments by the user, including both post and poll comments
    const allComments = await db
      .select({
        comment: comments,
        author: users,
        post: posts,
        poll: polls,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .leftJoin(posts, eq(comments.postId, posts.id))
      .leftJoin(polls, eq(comments.pollId, polls.id))
      .where(eq(comments.authorId, userId))
      .orderBy(desc(comments.createdAt));

    console.log('[getCommentsByUser] Found', allComments.length, 'comments');
    console.log('[getCommentsByUser] First comment (if any):', allComments[0]?.comment);

    // Convert to CommentWithDetails format
    return allComments.map(row => ({
      ...row.comment,
      author: row.author!,
      post: row.post || undefined,
      poll: row.poll || undefined,
      userVote: undefined,
      replies: [], // User comments are typically shown as flat list
    }));
  }

  async recalculateAllCommentCounts(): Promise<{ updated: number; total: number }> {
    const allPosts = await db.query.posts.findMany();
    let updatedCount = 0;
    
    for (const post of allPosts) {
      // Count actual comments for this post
      const commentCountResult = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.postId, post.id));
      
      const actualCommentCount = commentCountResult[0]?.count || 0;
      
      // Update post if comment count is incorrect
      if (post.commentCount !== actualCommentCount) {
        await db
          .update(posts)
          .set({ 
            commentCount: actualCommentCount,
            updatedAt: new Date()
          })
          .where(eq(posts.id, post.id));
        
        updatedCount++;
      }
    }
    
    return { updated: updatedCount, total: allPosts.length };
  }

  // Vote operations
  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db.insert(votes).values(vote).returning();
    return newVote;
  }

  async processVoteTransaction(
    userId: string, 
    targetId: number, 
    targetType: string, 
    voteType: "up" | "down"
  ): Promise<{ 
    success: boolean; 
    updatedCounts?: { upvotes: number; downvotes: number }; 
    userVote?: Vote | null;
  }> {
    try {
      // Start a transaction-like operation
      const existingVote = await this.getVote(userId, targetId, targetType);
      
      let resultUserVote: Vote | null = null;
      
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote if same type
          await this.deleteVote(userId, targetId, targetType);
          resultUserVote = null;
        } else {
          // Change vote type
          await this.deleteVote(userId, targetId, targetType);
          const newVote = await this.createVote({
            userId,
            targetId,
            targetType,
            voteType,
          });
          resultUserVote = newVote;
        }
      } else {
        // Create new vote
        const newVote = await this.createVote({
          userId,
          targetId,
          targetType,
          voteType,
        });
        resultUserVote = newVote;
      }

      // Update vote counts based on target type
      if (targetType === 'post') {
        await this.updatePostVoteCounts(targetId);
        const post = await this.getPost(targetId);
        if (post) {
          return {
            success: true,
            updatedCounts: { upvotes: post.upvotes, downvotes: post.downvotes },
            userVote: resultUserVote,
          };
        }
      } else if (targetType === 'poll') {
        await this.updatePollVoteCounts(targetId);
        const poll = await this.getPollWithDetails(targetId);
        if (poll) {
          return {
            success: true,
            updatedCounts: { upvotes: poll.upvotes, downvotes: poll.downvotes },
            userVote: resultUserVote,
          };
        }
      } else if (targetType === 'comment') {
        await this.updateCommentVoteCounts(targetId);
        // Note: Comments don't return updated counts in this implementation
      }

      return {
        success: true,
        userVote: resultUserVote,
      };
    } catch (error) {
      console.error("Error in vote transaction:", error);
      throw error;
    }
  }

  async getVote(userId: string, targetId: number, targetType: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.targetId, targetId),
          eq(votes.targetType, targetType)
        )
      );
    return vote;
  }

  async deleteVote(userId: string, targetId: number, targetType: string): Promise<void> {
    await db
      .delete(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.targetId, targetId),
          eq(votes.targetType, targetType)
        )
      );
  }

  async getUserVotes(userId: string, targetIds: number[], targetType: string): Promise<Vote[]> {
    if (targetIds.length === 0) return [];
    
    try {
      return await db
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.userId, userId),
            inArray(votes.targetId, targetIds),
            eq(votes.targetType, targetType)
          )
        );
    } catch (error) {
      console.error("Error fetching user votes:", error);
      return [];
    }
  }

  // Trust vote operations
  async createOrganizationTrustVote(vote: InsertOrgTrustVote): Promise<OrgTrustVote> {
    const [newVote] = await db
      .insert(orgTrustVotes)
      .values(vote)
      .onConflictDoUpdate({
        target: [orgTrustVotes.userId, orgTrustVotes.organizationId],
        set: {
          trustVote: vote.trustVote,
        },
      })
      .returning();
    return newVote;
  }

  async getOrganizationTrustVote(userId: string, organizationId: number): Promise<OrgTrustVote | undefined> {
    const [vote] = await db
      .select()
      .from(orgTrustVotes)
      .where(
        and(
          eq(orgTrustVotes.userId, userId),
          eq(orgTrustVotes.organizationId, organizationId)
        )
      );
    return vote;
  }

  async deleteOrganizationTrustVote(userId: string, organizationId: number): Promise<void> {
    await db
      .delete(orgTrustVotes)
      .where(
        and(
          eq(orgTrustVotes.userId, userId),
          eq(orgTrustVotes.organizationId, organizationId)
        )
      );
  }

  // Notification operations
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(notification).returning();
    return notif;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }
  async markNotificationAsRead(userId: string, notifId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)));
  }

  // Check if database is empty (check for bowls since they're what we're seeding)
  async isDatabaseEmpty(): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(bowls);
    return result[0]?.count === 0;
  }

  // Calculate hot score for posts (simplified Reddit-style algorithm)
  private calculateHotScore(post: PostWithDetails): number {
    const now = new Date();
    const postAge = (now.getTime() - new Date(post.createdAt || now).getTime()) / (1000 * 60 * 60); // hours
    
    // Simplified hot algorithm: (upvotes - downvotes) / (age_in_hours + 2)^1.5
    const score = post.upvotes - post.downvotes;
    const ageFactor = Math.pow(postAge + 2, 1.5); // +2 to avoid division by zero
    
    // Base hot score
    let hotScore = score / ageFactor;
    
    // Bonus for engagement (comments)
    const commentBonus = post.commentCount * 0.5;
    
    // Bonus for very recent posts (first 2 hours)
    if (postAge < 2) {
      hotScore *= 1.5;
    }
    
    // Bonus for high engagement
    if (post.commentCount > 5) {
      hotScore *= 1.2;
    }
    
    return hotScore + commentBonus;
  }

  // Calculate rising score for posts (velocity-based)
  private calculateRisingScore(post: PostWithDetails): number {
    const now = new Date();
    const postAge = (now.getTime() - new Date(post.createdAt || now).getTime()) / (1000 * 60 * 60); // hours
    
    // Minimum age to avoid division by zero and noise
    const minAge = Math.max(postAge, 0.1); // At least 6 minutes old
    
    const upvoteScore = post.upvotes - post.downvotes;
    const commentScore = post.commentCount * 2; // Comments are worth more for rising
    
    // Velocity calculation: engagement per hour
    const velocity = (upvoteScore + commentScore) / minAge;
    
    // Penalty for very old posts (older than 12 hours for rising)
    if (postAge > 12) {
      return velocity * 0.3;
    }
    
    // Bonus for posts gaining traction quickly (first 3 hours)
    if (postAge < 3 && velocity > 1) {
      return velocity * 1.5;
    }
    
    // Bonus for high engagement in short time
    if (postAge < 1 && (upvoteScore + commentScore) > 5) {
      return velocity * 2.0;
    }
    
    return velocity;
  }

  // Calculate trending score for posts (enhanced version)
  private calculateTrendingScore(post: PostWithDetails): number {
    const now = new Date();
    const postAge = (now.getTime() - new Date(post.createdAt || now).getTime()) / (1000 * 60 * 60); // hours
    const upvoteScore = post.upvotes - post.downvotes;
    const commentScore = post.commentCount * 3; // Comments are worth more for trending
    const recencyBoost = Math.max(0, 48 - postAge) * 0.2; // Boost for newer posts (48 hours)
    
    // Base score calculation
    let score = upvoteScore + commentScore + recencyBoost;
    
    // Bonus for high-engagement posts
    if (post.commentCount > 5) score *= 1.1;
    if (post.upvotes > 10) score *= 1.1;
    
    // Additional bonus for viral posts
    if (post.upvotes > 25) score *= 1.2;
    if (post.commentCount > 15) score *= 1.2;
    
    // Penalty for very old posts (older than 48 hours)
    if (postAge > 48) {
      score *= 0.5;
    }
    
    return score;
  }


  // Anonymous query methods that return sanitized data
  async getAnonymousUser(id: string, isOwnProfile: boolean = false): Promise<any> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    return createAnonymousUserResponse(user, isOwnProfile);
  }

  async getAnonymousPost(id: number): Promise<any> {
    const post = await this.getPostById(id);
    if (!post) return undefined;
    return createAnonymousPostResponse(post);
  }

  async getAnonymousComment(id: number): Promise<any> {
    const comment = await this.getComment(id);
    if (!comment) return undefined;
    return createAnonymousCommentResponse(comment);
  }

  async getAnonymousPostsForBowl(bowlId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    const posts = await this.getPostsForBowl(bowlId, limit, offset);
    return posts.map(post => createAnonymousPostResponse(post));
  }

  async getAnonymousPostsForOrganization(orgId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    const posts = await this.getPostsForOrganization(orgId, limit, offset);
    return posts.map(post => createAnonymousPostResponse(post));
  }

  async getAnonymousCommentsForPost(postId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    const comments = await this.getCommentsForPost(postId, limit, offset);
    return comments.map(comment => createAnonymousCommentResponse(comment));
  }

  // DEV ONLY: Clear all data from tables (order matters for FKs)
  async clearAllDevData() {
    await db.delete(notifications);

    await db.delete(votes);
    await db.delete(orgTrustVotes);
    await db.delete(comments);
    await db.delete(posts);
    await db.delete(bowlFollows);
    await db.delete(bowls);
    await db.delete(organizations);
    await db.delete(users);
  }
}

export const storage = new DatabaseStorage();
