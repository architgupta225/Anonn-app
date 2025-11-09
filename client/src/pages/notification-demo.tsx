import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, MessageSquare, Heart, Users, Star, Hash, Zap, Play, Pause } from "lucide-react";
import Navigation from "@/components/Navigation";
import NotificationBell from "@/components/NotificationBell";
import { notificationService } from "@/lib/notificationService";
import type { NotificationPayload } from "@/lib/notificationService";

export default function NotificationDemo() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  const [customNotification, setCustomNotification] = useState<NotificationPayload>({
    type: 'reply',
    title: 'Custom Notification',
    message: 'This is a custom notification message',
    username: 'DemoUser',
    avatar: 'D'
  });

  const startSimulation = () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    const interval = setInterval(() => {
      // Simulate notifications every 10 seconds
      if (Math.random() > 0.5) {
        const types: NotificationPayload['type'][] = ['reply', 'upvote', 'mention', 'community'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        const notification: NotificationPayload = {
          type: randomType,
          title: `Random ${randomType.charAt(0).toUpperCase() + randomType.slice(1)}`,
          message: `This is a randomly generated ${randomType} notification`,
          username: 'RandomUser' + Math.floor(Math.random() * 1000),
          avatar: 'R'
        };
        
        // Send via notification service
        notificationService.sendNotification(notification);
      }
    }, 10000);
    
    setSimulationInterval(interval);
  };

  const stopSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setIsSimulating(false);
  };

  const sendCustomNotification = () => {
    notificationService.sendNotification(customNotification);
  };

  const sendQuickNotification = (type: NotificationPayload['type']) => {
    const quickNotifications = {
      reply: {
        title: 'Quick Reply',
        message: 'Someone quickly replied to your post!',
        username: 'QuickUser',
        avatar: 'Q'
      },
      upvote: {
        title: 'Quick Upvote',
        message: 'Your post got a quick upvote!',
        username: 'Upvoter',
        avatar: 'U'
      },
      mention: {
        title: 'Quick Mention',
        message: 'You were quickly mentioned!',
        username: 'Mentioner',
        avatar: 'M'
      },
      community: {
        title: 'Quick Community Update',
        message: 'Quick update from your community!',
        username: 'CommunityBot',
        avatar: 'C'
      }
    };

    const notification = quickNotifications[type];
    notificationService.sendNotification({
      type,
      ...notification
    });
  };

  return (
    <div className="min-h-screen bg-reddit-light dark:bg-slate-900">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Real-Time Notifications Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Experience the power of instant notifications in Anonn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Demo Controls */}
          <div className="space-y-6">
            {/* Simulation Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Auto-Simulation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically generate random notifications every 10 seconds
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={startSimulation}
                    disabled={isSimulating}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Simulation
                  </Button>
                  <Button
                    onClick={stopSimulation}
                    disabled={!isSimulating}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Simulation
                  </Button>
                </div>
                {isSimulating && (
                  <div className="text-sm text-green-600 dark:text-green-400 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Simulation is running...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  <span>Quick Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send instant notifications of different types
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => sendQuickNotification('reply')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span>Reply</span>
                  </Button>
                  <Button
                    onClick={() => sendQuickNotification('upvote')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>Upvote</span>
                  </Button>
                  <Button
                    onClick={() => sendQuickNotification('mention')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>Mention</span>
                  </Button>
                  <Button
                    onClick={() => sendQuickNotification('community')}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Hash className="h-4 w-4 text-green-500" />
                    <span>Community</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Notification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  <span>Custom Notification</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={customNotification.type}
                      onValueChange={(value: NotificationPayload['type']) =>
                        setCustomNotification(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reply">Reply</SelectItem>
                        <SelectItem value="upvote">Upvote</SelectItem>
                        <SelectItem value="mention">Mention</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="follow">Follow</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={customNotification.title}
                      onChange={(e) =>
                        setCustomNotification(prev => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Notification title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Input
                      id="message"
                      value={customNotification.message}
                      onChange={(e) =>
                        setCustomNotification(prev => ({ ...prev, message: e.target.value }))
                      }
                      placeholder="Notification message"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={customNotification.username || ''}
                      onChange={(e) =>
                        setCustomNotification(prev => ({ ...prev, username: e.target.value }))
                      }
                      placeholder="Username"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={sendCustomNotification}
                  className="w-full"
                  variant="outline"
                >
                  Send Custom Notification
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Live Preview */}
          <div className="space-y-6">
            {/* Notification Bell Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  <span>Live Notification Bell</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <NotificationBell />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
                  Click the bell to see your notifications in real-time!
                </p>
              </CardContent>
            </Card>

            {/* Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Real-time WebSocket updates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Multiple notification types</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Toast notifications</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Mark as read functionality</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Beautiful animations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Responsive design</span>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p>1. <strong>WebSocket Connection:</strong> Establishes real-time connection</p>
                  <p>2. <strong>Event Subscription:</strong> Listens for notification events</p>
                  <p>3. <strong>Instant Updates:</strong> Shows notifications immediately</p>
                  <p>4. <strong>User Interaction:</strong> Mark as read, dismiss, etc.</p>
                  <p>5. <strong>Toast Alerts:</strong> Desktop notifications for new items</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
