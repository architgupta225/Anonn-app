// components/NotificationsContent.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AtSign,
  Users,
  Check,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: number;
  userId: string;
  type: string;
  content: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated: authIsAuthenticated,
    getAccessToken,
    refreshProfile,
  } = useAuth();

  // Check authentication first - show connect wallet if not authenticated
  if (!authIsAuthenticated) {
    return (
      <div className="max-w-[1400px] mx-auto px-[4%]">
        <Card className="bg-[#2a2a2a] border-gray-800 p-12 text-center flex flex-col justify-center">
          <Bell className="h-16 w-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
            Authentication Required
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Please connect your wallet to view your notifications and stay
            updated with your activity.
          </p>
          <Button
            onClick={() => {
              const event = new CustomEvent("triggerWalletConnect");
              window.dispatchEvent(event);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  // Fetch notifications with proper query function
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch("/api/notifications", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      console.log("dsf", response);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    retry: false,
    enabled: authIsAuthenticated, // Only fetch when authenticated
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) =>
          apiRequest("POST", `/api/notifications/${n.id}/read`, {})
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "comment":
      case "reply":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "upvote":
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case "downvote":
        return <ThumbsDown className="h-5 w-5 text-red-500" />;
      case "mention":
        return <AtSign className="h-5 w-5 text-purple-500" />;
      case "community":
      case "bowl":
        return <Users className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === "all" ? true : !n.read
  );
  console.log("not", filteredNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Add error state
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="bg-[#2a2a2a] border-gray-800 p-8 text-center">
          <Bell className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Failed to load notifications
          </h3>
          <p className="text-gray-400 mb-4">
            There was an error loading your notifications.
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["/api/notifications"],
              })
            }
            variant="outline"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "unread")}
        >
          <TabsList className="bg-[#2a2a2a] border border-gray-700">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[#2a2a2a] border-gray-800 p-4">
              <div className="animate-pulse">
                <div className="flex space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="bg-[#2a2a2a] border-gray-800 p-12 text-center">
          <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </h3>
          <p className="text-gray-500">
            {filter === "unread"
              ? "You're all caught up!"
              : "When you get notifications, they'll show up here"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`bg-[#2a2a2a] border-gray-800 transition-all hover:bg-[#333333] ${
                !notification.read ? "border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-300">
                        {notification.content}
                      </p>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="ml-2 text-gray-500 hover:text-gray-300 transition-colors"
                          title="Mark as read"
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 mt-2">
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                      {notification.link && (
                        <Link href={notification.link}>
                          <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                            View
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
