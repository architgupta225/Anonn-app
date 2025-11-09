import type { Notification } from "@/components/NotificationBell";

export interface NotificationPayload {
  type: 'reply' | 'mention' | 'upvote' | 'downvote' | 'follow' | 'community' | 'system';
  title: string;
  message: string;
  userId?: string;
  username?: string;
  postId?: string;
  commentId?: string;
  communityId?: string;
  communityName?: string;
  avatar?: string;
}

class NotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Set<(notification: Notification) => void> = new Set();
  private isConnected = false;

  constructor() {
    this.setupWebSocket();
  }

  private setupWebSocket() {
    try {
      // In production, connect to your WebSocket server
      // const wsUrl = 'wss://your-server.com/notifications';
      
      // For demo purposes, we'll simulate WebSocket behavior
      // In real implementation, uncomment the line above
      console.log('NotificationService: Setting up WebSocket connection...');
      
      // Simulate connection
      this.isConnected = true;
      this.startSimulation();
      
    } catch (error) {
      console.error('NotificationService: Failed to setup WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private startSimulation() {
    // Simulate real-time notifications for demo
    setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every interval
        this.simulateNotification();
      }
    }, 45000); // Every 45 seconds
  }

  private simulateNotification() {
    const notificationTypes: NotificationPayload['type'][] = ['reply', 'upvote', 'mention', 'community'];
    const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    
    const notification: Notification = {
      id: Date.now().toString(),
      type: randomType,
      title: this.getRandomTitle(randomType),
      message: this.getRandomMessage(randomType),
      username: 'User' + Math.floor(Math.random() * 1000),
      isRead: false,
      createdAt: new Date(),
      avatar: 'U'
    };

    this.notifyListeners(notification);
  }

  private getRandomTitle(type: NotificationPayload['type']): string {
    switch (type) {
      case 'reply':
        return 'New Reply';
      case 'upvote':
        return 'Post Upvoted';
      case 'mention':
        return 'You were mentioned';
      case 'community':
        return 'Community Update';
      default:
        return 'New Activity';
    }
  }

  private getRandomMessage(type: NotificationPayload['type']): string {
    switch (type) {
      case 'reply':
        return 'Someone replied to your post in Layer 2';
      case 'upvote':
        return 'Your post about Web3 got 3 upvotes';
      case 'mention':
        return 'A user mentioned you in a comment';
      case 'community':
        return 'New members joined your community today';
      default:
        return 'Something new happened in your communities';
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`NotificationService: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.setupWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('NotificationService: Max reconnection attempts reached');
    }
  }

  public connect() {
    if (!this.isConnected) {
      this.setupWebSocket();
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public subscribe(callback: (notification: Notification) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(notification: Notification) {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('NotificationService: Error in listener callback:', error);
      }
    });
  }

  public sendNotification(notification: NotificationPayload) {
    // In production, send via WebSocket
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
    }
  }

  public markAsRead(notificationId: string): Promise<void> {
    // In production, make API call to mark notification as read
    return new Promise((resolve) => {
      // Simulate API call
      setTimeout(() => {
        console.log(`NotificationService: Marked notification ${notificationId} as read`);
        resolve();
      }, 100);
    });
  }

  public markAllAsRead(): Promise<void> {
    // In production, make API call to mark all notifications as read
    return new Promise((resolve) => {
      // Simulate API call
      setTimeout(() => {
        console.log('NotificationService: Marked all notifications as read');
        resolve();
      }, 200);
    });
  }

  public deleteNotification(notificationId: string): Promise<void> {
    // In production, make API call to delete notification
    return new Promise((resolve) => {
      // Simulate API call
      setTimeout(() => {
        console.log(`NotificationService: Deleted notification ${notificationId}`);
        resolve();
      }, 100);
    });
  }

  public getNotifications(): Promise<Notification[]> {
    // In production, fetch notifications from API
    return new Promise((resolve) => {
      // Simulate API call
      setTimeout(() => {
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'reply',
            title: 'New Reply',
            message: 'Someone replied to your post in Layer 2',
            username: 'CryptoWhale',
            postId: '123',
            isRead: false,
            createdAt: new Date(Date.now() - 5 * 60 * 1000),
            avatar: 'C'
          },
          {
            id: '2',
            type: 'upvote',
            title: 'Post Upvoted',
            message: 'Your post about Web3 gaming got 5 upvotes',
            username: 'GamerPro',
            postId: '124',
            isRead: false,
            createdAt: new Date(Date.now() - 15 * 60 * 1000),
            avatar: 'G'
          },
          {
            id: '3',
            type: 'mention',
            title: 'You were mentioned',
            message: 'CryptoWhale mentioned you in a comment',
            username: 'CryptoWhale',
            commentId: '456',
            isRead: false,
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
            avatar: 'C'
          }
        ];
        resolve(mockNotifications);
      }, 300);
    });
  }

  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export for use in components
export default notificationService;
