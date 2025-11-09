import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  username?: string | null;
  profileImageUrl?: string | null;
  // Email removed for anonymity
}

interface UserAvatarProps {
  user: User;
  size?: "xs" | "sm" | "default" | "lg" | "xl" | "2xl";
  className?: string;
}

export default function UserAvatar({
  user,
  size = "default",
  className
}: UserAvatarProps) {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
    "2xl": "h-24 w-24"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    default: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl"
  };



  // Generate initials from user data - only use username for privacy
  const getInitials = () => {
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "A"; // Anonymous
  };

  // Generate background color based on user ID or name
  const getBackgroundColor = () => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-yellow-500",
      "bg-gray-500"
    ];
    
    const seed = user.id || user.username || "";
    const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={cn(sizeClasses[size], "ring-2 ring-white dark:ring-slate-800")}>
        <AvatarImage 
          src={user.profileImageUrl || undefined} 
          alt={`${user.username || "User"}'s profile picture`}
        />
        <AvatarFallback className={cn(
          getBackgroundColor(),
          "text-white font-semibold",
          textSizeClasses[size]
        )}>
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// Group avatar component for multiple users
interface GroupAvatarProps {
  users: User[];
  size?: "xs" | "sm" | "default" | "lg" | "xl" | "2xl";
  maxDisplay?: number;
  className?: string;
}

export function GroupAvatar({ users, size = "default", maxDisplay = 3, className }: GroupAvatarProps) {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
    "2xl": "h-24 w-24"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    default: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl"
  };

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  if (users.length === 0) {
    return (
      <Avatar className={cn(sizeClasses[size], "ring-2 ring-white dark:ring-slate-800", className)}>
        <AvatarFallback className={cn("bg-gray-300 text-gray-600", textSizeClasses[size])}>
          ?
        </AvatarFallback>
      </Avatar>
    );
  }

  if (users.length === 1) {
    return <UserAvatar user={users[0]} size={size} className={className} />;
  }

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayUsers.map((user, index) => (
        <UserAvatar
          key={user.id}
          user={user}
          size={size}
          className="ring-2 ring-white dark:ring-slate-800"
        />
      ))}
      {remainingCount > 0 && (
        <Avatar className={cn(
          sizeClasses[size],
          "ring-2 ring-white dark:ring-slate-800 bg-gray-300 text-gray-600"
        )}>
          <AvatarFallback className={cn("font-semibold", textSizeClasses[size])}>
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
