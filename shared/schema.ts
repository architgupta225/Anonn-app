import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  serial,
  integer,
  boolean,
  inet,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - wallet-based authentication only
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  username: varchar("username", { length: 50 }).unique(),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  bannerUrl: varchar("banner_url", { length: 500 }),
  bio: text("bio"),
  location: varchar("location", { length: 100 }),
  website: varchar("website", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 255 }).unique().notNull(),
  authNonce: varchar("auth_nonce", { length: 255 }), // Nonce for wallet signature verification
  allowlisted: boolean("allowlisted").default(true).notNull(),
  karma: integer("karma").default(0).notNull(),
  postKarma: integer("post_karma").default(0).notNull(),
  commentKarma: integer("comment_karma").default(0).notNull(),
  awardeeKarma: integer("awardee_karma").default(0).notNull(),
  followerCount: integer("follower_count").default(0).notNull(),
  followingCount: integer("following_count").default(0).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  premiumExpiresAt: timestamp("premium_expires_at"),
  isOnline: boolean("is_online").default(true).notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Company verification fields (using ZK proofs)
  companyEmail: varchar("company_email", { length: 255 }),
  companyDomain: varchar("company_domain", { length: 100 }),
  companyName: varchar("company_name", { length: 255 }),
  isCompanyVerified: boolean("is_company_verified").default(false).notNull(),
  companyVerifiedAt: timestamp("company_verified_at"),
  zkProofHash: varchar("zk_proof_hash", { length: 255 }), // Hash of the ZK proof for verification
  verificationCode: varchar("verification_code", { length: 10 }), // Temporary verification code
  verificationCodeExpiresAt: timestamp("verification_code_expires_at"), // When verification code expires
}, (table) => ({
  // Add indexes for better performance
  usernameIdx: index("users_username_idx").on(table.username),
  walletAddressIdx: index("users_wallet_address_idx").on(table.walletAddress),
  createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  companyDomainIdx: index("users_company_domain_idx").on(table.companyDomain),
  companyVerifiedIdx: index("users_company_verified_idx").on(table.isCompanyVerified),
}));

// Organizations table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  logoUrl: varchar("logo_url"),
  website: varchar("website"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  // Security columns
  accessLevel: varchar("access_level", { length: 20 }).default("public").notNull(), // public, private, admin_only
  allowedUsers: text("allowed_users").array(), // Array of user IDs who can access
  adminOnlyFeatures: jsonb("admin_only_features").default("{}"), // JSON object of admin-only features
  securitySettings: jsonb("security_settings").default("{}"), // Additional security settings
}, (table) => ({
  nameIdx: index("organizations_name_idx").on(table.name),
  featuredIdx: index("organizations_featured_idx").on(table.isFeatured),
  createdByIdx: index("organizations_created_by_idx").on(table.createdBy),
  accessLevelIdx: index("organizations_access_level_idx").on(table.accessLevel),
}));

// Audit logs table for security monitoring
export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // access_granted, access_denied, create, update, delete
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // organization, post, user
  resourceId: integer("resource_id"),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("access_logs_user_id_idx").on(table.userId),
  createdAtIdx: index("access_logs_created_at_idx").on(table.createdAt),
  resourceIdx: index("access_logs_resource_idx").on(table.resourceType, table.resourceId),
}));

// Bowls (Communities) table
export const bowls = pgTable("bowls", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  iconUrl: varchar("icon_url"),
  bannerUrl: varchar("banner_url"),
  category: varchar("category", { length: 50 }).notNull().default("general"), // 'industries', 'job-groups', 'general', 'user-moderated'
  memberCount: integer("member_count").default(0).notNull(),
  onlineCount: integer("online_count").default(0).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  isRestricted: boolean("is_restricted").default(false).notNull(), // Only approved users can post
  isNSFW: boolean("is_nsfw").default(false).notNull(),
  primaryColor: varchar("primary_color", { length: 7 }).default("#ff4500"), // Hex color
  rules: jsonb("rules"), // Array of community rules
  flairs: jsonb("flairs"), // Available post flairs
  sidebar: text("sidebar"), // Community wiki/sidebar content
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bowl follows (replaces memberships)
export const bowlFollows = pgTable("bowl_follows", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bowlId: integer("bowl_id").references(() => bowls.id).notNull(),
  followedAt: timestamp("followed_at").defaultNow(),
}, (table) => ({
  uniqueUserBowl: uniqueIndex("unique_user_bowl_follow").on(table.userId, table.bowlId),
}));

// Bowl favorites table
export const bowlFavorites = pgTable("bowl_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bowlId: integer("bowl_id").references(() => bowls.id).notNull(),
  favoritedAt: timestamp("favorited_at").defaultNow(),
}, (table) => ({
  uniqueUserBowl: uniqueIndex("unique_user_bowl_favorite").on(table.userId, table.bowlId),
}));

// Bowl moderators table
export const bowlModerators = pgTable("bowl_moderators", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bowlId: integer("bowl_id").references(() => bowls.id).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("moderator"), // 'owner', 'admin', 'moderator'
  permissions: jsonb("permissions"), // Custom permissions object
  appointedBy: varchar("appointed_by").references(() => users.id),
  appointedAt: timestamp("appointed_at").defaultNow(),
});

// Bowl bans table
export const bowlBans = pgTable("bowl_bans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bowlId: integer("bowl_id").references(() => bowls.id).notNull(),
  reason: text("reason"),
  bannedBy: varchar("banned_by").references(() => users.id).notNull(),
  bannedAt: timestamp("banned_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null for permanent bans
  isActive: boolean("is_active").default(true).notNull(),
});

// User flairs in communities
export const userFlairs = pgTable("user_flairs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bowlId: integer("bowl_id").references(() => bowls.id).notNull(),
  flairText: varchar("flair_text", { length: 100 }),
  flairColor: varchar("flair_color", { length: 7 }).default("#0079d3"), // Hex color
  isEditable: boolean("is_editable").default(true).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// User following system
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").references(() => users.id).notNull(),
  followedId: varchar("followed_id").references(() => users.id).notNull(),
  followedAt: timestamp("followed_at").defaultNow(),
});

// Awards system
export const awards = pgTable("awards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  iconUrl: varchar("icon_url").notNull(),
  cost: integer("cost").notNull(), // Cost in coins
  isPremium: boolean("is_premium").default(false).notNull(),
  giverKarma: integer("giver_karma").default(0).notNull(), // Karma given to the giver
  receiverKarma: integer("receiver_karma").default(0).notNull(), // Karma given to receiver
  coinReward: integer("coin_reward").default(0).notNull(), // Coins given to receiver
  createdAt: timestamp("created_at").defaultNow(),
});

// Post/Comment awards
export const postAwards = pgTable("post_awards", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  commentId: integer("comment_id").references(() => comments.id),
  awardId: integer("award_id").references(() => awards.id).notNull(),
  giverId: varchar("giver_id").references(() => users.id).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id).notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  message: text("message"), // Optional message from giver
  givenAt: timestamp("given_at").defaultNow(),
});

// User coins/points system
export const userCoins = pgTable("user_coins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  balance: integer("balance").default(0).notNull(),
  totalEarned: integer("total_earned").default(0).notNull(),
  totalSpent: integer("total_spent").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Private messages
export const privateMessages = pgTable("private_messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id).notNull(),
  subject: varchar("subject", { length: 200 }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  parentMessageId: integer("parent_message_id"),
  sentAt: timestamp("sent_at").defaultNow(),
});

// User saved posts/comments
export const savedContent = pgTable("saved_content", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => posts.id),
  commentId: integer("comment_id").references(() => comments.id),
  savedAt: timestamp("saved_at").defaultNow(),
});

// Posts table (for both reviews and discussions)
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'text', 'link', 'image', 'video', 'poll', 'review'
  sentiment: varchar("sentiment", { length: 20 }), // 'positive', 'neutral', 'negative' (for reviews)
  linkUrl: varchar("link_url"), // For link posts
  mediaUrls: jsonb("media_urls"), // Array of image/video URLs
  flair: varchar("flair", { length: 100 }), // Post flair text
  flairColor: varchar("flair_color", { length: 7 }).default("#0079d3"), // Flair color
  isNSFW: boolean("is_nsfw").default(false).notNull(),
  isSpoiler: boolean("is_spoiler").default(false).notNull(),
  isOC: boolean("is_oc").default(false).notNull(), // Original Content
  isLocked: boolean("is_locked").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  bowlId: integer("bowl_id").references(() => bowls.id),
  imageUrl: varchar("image_url"), // Deprecated, use mediaUrls
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  awardCount: integer("award_count").default(0).notNull(),
  // Category-based ratings for reviews
  workLifeBalance: integer("work_life_balance"), // 1-5 rating
  cultureValues: integer("culture_values"), // 1-5 rating
  careerOpportunities: integer("career_opportunities"), // 1-5 rating
  compensation: integer("compensation"), // 1-5 rating
  management: integer("management"), // 1-5 rating
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => posts.id), // Made optional to support polls
  pollId: integer("poll_id").references(() => polls.id), // Added to support polls
  parentId: integer("parent_id").references((): any => comments.id),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});



// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  targetId: integer("target_id").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull(), // 'post' or 'comment'
  voteType: varchar("vote_type", { length: 10 }).notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at").defaultNow(),
});

// Trust voting table for organizations
export const orgTrustVotes = pgTable("org_trust_votes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  trustVote: boolean("trust_vote").notNull(), // true for trust, false for distrust
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 32 }).notNull(), // 'comment', 'upvote', 'downvote', etc.
  content: text("content").notNull(),
  link: varchar("link", { length: 512 }), // URL to the relevant post/discussion
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company domains mapping table - maps email domains to company names
export const companyDomains = pgTable("company_domains", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 100 }).notNull().unique(), // e.g., "google.com", "microsoft.com"
  companyName: varchar("company_name", { length: 255 }).notNull(), // e.g., "Google", "Microsoft"
  isVerified: boolean("is_verified").default(true).notNull(), // Whether this domain is officially verified
  logo: varchar("logo", { length: 500 }), // Company logo URL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  domainIdx: index("company_domains_domain_idx").on(table.domain),
  verifiedIdx: index("company_domains_verified_idx").on(table.isVerified),
}));

// Company verification attempts and ZK proofs table
export const companyVerifications = pgTable("company_verifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),
  verificationCode: varchar("verification_code", { length: 10 }).notNull(),
  zkProof: text("zk_proof"), // The actual ZK proof data
  zkProofHash: varchar("zk_proof_hash", { length: 255 }), // Hash of the ZK proof
  starknetTxHash: varchar("starknet_tx_hash", { length: 255 }), // Starknet transaction hash for proof verification
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, verified, failed, expired
  expiresAt: timestamp("expires_at").notNull(), // When the verification code expires
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("company_verifications_user_id_idx").on(table.userId),
  emailIdx: index("company_verifications_email_idx").on(table.email),
  statusIdx: index("company_verifications_status_idx").on(table.status),
  expiresAtIdx: index("company_verifications_expires_at_idx").on(table.expiresAt),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  votes: many(votes),
  bowlFollows: many(bowlFollows),
  bowlFavorites: many(bowlFavorites),
  moderatedBowls: many(bowlModerators),
  bannedFromBowls: many(bowlBans),
  userFlairs: many(userFlairs),
  followers: many(userFollows, { relationName: "followed" }),
  following: many(userFollows, { relationName: "follower" }),
  givenAwards: many(postAwards, { relationName: "giver" }),
  receivedAwards: many(postAwards, { relationName: "receiver" }),
  coinBalance: many(userCoins),
  sentMessages: many(privateMessages, { relationName: "sender" }),
  receivedMessages: many(privateMessages, { relationName: "receiver" }),
  savedContent: many(savedContent),
  createdOrganizations: many(organizations),
  createdBowls: many(bowls),
  trustVotes: many(orgTrustVotes),
}));

export const orgTrustVotesRelations = relations(orgTrustVotes, ({ one }) => ({
  user: one(users, {
    fields: [orgTrustVotes.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [orgTrustVotes.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
  }),
  reviews: many(posts),
  trustVotes: many(orgTrustVotes),
}));

export const bowlsRelations = relations(bowls, ({ one, many }) => ({
  creator: one(users, {
    fields: [bowls.createdBy],
    references: [users.id],
  }),
  posts: many(posts),
  follows: many(bowlFollows),
  favorites: many(bowlFavorites),
  moderators: many(bowlModerators),
  bans: many(bowlBans),
  userFlairs: many(userFlairs),
}));

export const bowlFollowsRelations = relations(bowlFollows, ({ one }) => ({
  user: one(users, {
    fields: [bowlFollows.userId],
    references: [users.id],
  }),
  bowl: one(bowls, {
    fields: [bowlFollows.bowlId],
    references: [bowls.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
  bowl: one(bowls, {
    fields: [posts.bowlId],
    references: [bowls.id],
  }),
  comments: many(comments),
  votes: many(votes),
  awards: many(postAwards),
  savedBy: many(savedContent),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  poll: one(polls, {
    fields: [comments.pollId],
    references: [polls.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "parent_comment",
  }),
  replies: many(comments, {
    relationName: "parent_comment",
  }),
  votes: many(votes),
  awards: many(postAwards),
  savedBy: many(savedContent),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertBowlSchema = createInsertSchema(bowls).omit({
  id: true,
  memberCount: true,
  createdAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  upvotes: true,
  downvotes: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  upvotes: true,
  downvotes: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertBowlFollowSchema = createInsertSchema(bowlFollows).omit({
  id: true,
  followedAt: true,
});

export const insertBowlFavoriteSchema = createInsertSchema(bowlFavorites).omit({
  id: true,
  favoritedAt: true,
});

export const insertOrgTrustVoteSchema = createInsertSchema(orgTrustVotes).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertBowl = z.infer<typeof insertBowlSchema>;
export type Bowl = typeof bowls.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertBowlFollow = z.infer<typeof insertBowlFollowSchema>;
export type BowlFollow = typeof bowlFollows.$inferSelect;
export type InsertBowlFavorite = z.infer<typeof insertBowlFavoriteSchema>;
export type BowlFavorite = typeof bowlFavorites.$inferSelect;
export type OrgTrustVote = typeof orgTrustVotes.$inferSelect;
export type InsertOrgTrustVote = z.infer<typeof insertOrgTrustVoteSchema>;
export type Notification = typeof notifications.$inferSelect;

// New table types
export type BowlModerator = typeof bowlModerators.$inferSelect;
export type BowlBan = typeof bowlBans.$inferSelect;
export type UserFlair = typeof userFlairs.$inferSelect;
export type UserFollow = typeof userFollows.$inferSelect;
export type Award = typeof awards.$inferSelect;
export type PostAward = typeof postAwards.$inferSelect;
export type UserCoins = typeof userCoins.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;
export type SavedContent = typeof savedContent.$inferSelect;
export type CompanyDomain = typeof companyDomains.$inferSelect;
export type CompanyVerification = typeof companyVerifications.$inferSelect;
export type InsertCompanyVerification = typeof companyVerifications.$inferInsert;

// Karma levels helper function
export function getKarmaLevel(karma: number): { level: number; name: string; color: string } {
  if (karma >= 200) return { level: 3, name: "Trusted", color: "text-purple-600" };
  if (karma >= 50) return { level: 2, name: "Experienced", color: "text-blue-600" };
  if (karma >= 10) return { level: 1, name: "Active", color: "text-green-600" };
  return { level: 0, name: "New", color: "text-gray-600" };
}

// Extended types with relations
export type PostWithDetails = Post & {
  author: User & { karmaLevel?: ReturnType<typeof getKarmaLevel> };
  organization?: Organization;
  bowl?: Bowl;
  userVote?: Vote;
};

export type CommentWithDetails = Comment & {
  author: User & { karmaLevel?: ReturnType<typeof getKarmaLevel> };
  userVote?: Vote;
  replies?: CommentWithDetails[];
};

export type OrganizationWithStats = Organization & {
  reviewCount: number;
  averageRating: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trustData?: {
    trustVotes: number;
    distrustVotes: number;
    trustPercentage: number;
  };
  riskSignal?: {
    hasRisk: boolean;
    negativePercentageLast30Days: number;
  };
  lastReviewDate?: Date;
  reviewTrends?: {
    date: string;
    count: number;
  }[];
  topReviews?: {
    mostHelpful?: PostWithDetails;
    mostControversial?: PostWithDetails;
  };
  // Rating averages from reviews
  avgWorkLifeBalance?: number | null;
  avgCultureValues?: number | null;
  avgCareerOpportunities?: number | null;
  avgCompensation?: number | null;
  avgManagement?: number | null;
};

export type BowlWithStats = Bowl & {
  memberCount: number;
  postCount: number;
};

// Polls table
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  bowlId: integer("bowl_id").references(() => bowls.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  postId: integer("post_id").references(() => posts.id), // Link to the corresponding post
  allowMultipleChoices: boolean("allow_multiple_choices").default(false).notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  endDate: timestamp("end_date"),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Poll options table
export const pollOptions = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").references(() => polls.id).notNull(),
  text: varchar("text", { length: 200 }).notNull(),
  voteCount: integer("vote_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Poll votes table
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").references(() => polls.id).notNull(),
  optionId: integer("option_id").references(() => pollOptions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Poll relations
export const pollsRelations = relations(polls, ({ one, many }) => ({
  author: one(users, {
    fields: [polls.authorId],
    references: [users.id],
  }),
  bowl: one(bowls, {
    fields: [polls.bowlId],
    references: [bowls.id],
  }),
  organization: one(organizations, {
    fields: [polls.organizationId],
    references: [organizations.id],
  }),
  post: one(posts, {
    fields: [polls.postId],
    references: [posts.id],
  }),
  options: many(pollOptions),
  votes: many(pollVotes),
  comments: many(comments),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
}));

// New table relations
export const bowlModeratorsRelations = relations(bowlModerators, ({ one }) => ({
  user: one(users, {
    fields: [bowlModerators.userId],
    references: [users.id],
  }),
  bowl: one(bowls, {
    fields: [bowlModerators.bowlId],
    references: [bowls.id],
  }),
  appointedBy: one(users, {
    fields: [bowlModerators.appointedBy],
    references: [users.id],
  }),
}));

export const bowlBansRelations = relations(bowlBans, ({ one }) => ({
  user: one(users, {
    fields: [bowlBans.userId],
    references: [users.id],
  }),
  bowl: one(bowls, {
    fields: [bowlBans.bowlId],
    references: [bowls.id],
  }),
  bannedBy: one(users, {
    fields: [bowlBans.bannedBy],
    references: [users.id],
  }),
}));

export const userFlairsRelations = relations(userFlairs, ({ one }) => ({
  user: one(users, {
    fields: [userFlairs.userId],
    references: [users.id],
  }),
  bowl: one(bowls, {
    fields: [userFlairs.bowlId],
    references: [bowls.id],
  }),
  assignedBy: one(users, {
    fields: [userFlairs.assignedBy],
    references: [users.id],
  }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  followed: one(users, {
    fields: [userFollows.followedId],
    references: [users.id],
    relationName: "followed",
  }),
}));

export const postAwardsRelations = relations(postAwards, ({ one }) => ({
  post: one(posts, {
    fields: [postAwards.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [postAwards.commentId],
    references: [comments.id],
  }),
  award: one(awards, {
    fields: [postAwards.awardId],
    references: [awards.id],
  }),
  giver: one(users, {
    fields: [postAwards.giverId],
    references: [users.id],
    relationName: "giver",
  }),
  receiver: one(users, {
    fields: [postAwards.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const userCoinsRelations = relations(userCoins, ({ one }) => ({
  user: one(users, {
    fields: [userCoins.userId],
    references: [users.id],
  }),
}));

export const privateMessagesRelations = relations(privateMessages, ({ one, many }) => ({
  sender: one(users, {
    fields: [privateMessages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [privateMessages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
  parentMessage: one(privateMessages, {
    fields: [privateMessages.parentMessageId],
    references: [privateMessages.id],
  }),
  replies: many(privateMessages),
}));

export const savedContentRelations = relations(savedContent, ({ one }) => ({
  user: one(users, {
    fields: [savedContent.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [savedContent.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [savedContent.commentId],
    references: [comments.id],
  }),
}));

export const awardsRelations = relations(awards, ({ many }) => ({
  givenAwards: many(postAwards),
}));

export const companyDomainsRelations = relations(companyDomains, ({ many }) => ({
  verifications: many(companyVerifications),
}));

export const companyVerificationsRelations = relations(companyVerifications, ({ one }) => ({
  user: one(users, {
    fields: [companyVerifications.userId],
    references: [users.id],
  }),
}));



// Poll schemas and types
export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPollOptionSchema = createInsertSchema(pollOptions).omit({
  id: true,
  createdAt: true,
  voteCount: true,
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({
  id: true,
  createdAt: true,
});

export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type PollOption = typeof pollOptions.$inferSelect;
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;

export type PollWithDetails = Poll & {
  author: User;
  bowl?: Bowl;
  organization?: Organization;
  options: (PollOption & { isVotedBy?: boolean })[];
  totalVotes: number;
  userVotes?: PollVote[];
  hasVoted?: boolean;
  selectedOptions?: number[];
  userVote?: Vote; // For post-style voting
};

// ZK Proof related types for company email verification
export interface ZKProofData {
  proof: Uint8Array;
  publicInputs: string[];
  verificationKey?: string;
}

export interface EphemeralKey {
  publicKey: bigint;
  privateKey: bigint;
  salt: bigint;
  expiry: Date;
  ephemeralPubkeyHash: bigint;
}

export interface ZKVerificationResult {
  isValid: boolean;
  proofHash: string;
  errors?: string[];
  starknetTxHash?: string;
}

export interface ZKProvider {
  name: string;
  generateProof(ephemeralKey: EphemeralKey): Promise<{
    proof: Uint8Array;
    anonGroup: AnonGroup;
    proofArgs: Record<string, any>;
  }>;
  verifyProof(
    proof: Uint8Array,
    anonGroupId: string,
    ephemeralPubkey: bigint,
    ephemeralPubkeyExpiry: Date,
    proofArgs: Record<string, any>
  ): Promise<boolean>;
  getAnonGroup(groupId: string): AnonGroup;
}

export interface AnonGroup {
  id: string;
  title: string;
  logoUrl: string;
}

export interface ZKJWTInputs {
  partial_data: number[];
  partial_hash: number[];
  full_data_length: number;
  base64_decode_offset: number;
  jwt_pubkey_modulus_limbs: bigint[];
  jwt_pubkey_redc_params_limbs: bigint[];
  jwt_signature_limbs: bigint[];
  domain: string;
  ephemeral_pubkey: string;
  ephemeral_pubkey_salt: string;
  ephemeral_pubkey_expiry: string;
}

export interface ZKProofVerification {
  domain: string;
  jwtPubKey: bigint;
  ephemeralPubkey: bigint;
  ephemeralPubkeyExpiry: Date;
}

// Helper function to split big integers into limbs for ZK circuits
export function splitBigIntToLimbs(value: bigint, limbSize: number, numLimbs: number): bigint[] {
  const limbs: bigint[] = [];
  const mask = (BigInt(1) << BigInt(limbSize)) - BigInt(1);

  for (let i = 0; i < numLimbs; i++) {
    limbs.push(value & mask);
    value >>= BigInt(limbSize);
  }

  return limbs;
}


