
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { 
  Bell, 
  Check, 
  Calendar,
  Target,
  Award, 
  Users,
  Wallet,
  AlertTriangle
} from "lucide-react";

// Mock notification data (in a real app, this would come from an API)
const mockNotifications = [
  {
    id: 1,
    type: "goal",
    title: "Goal nearing completion",
    message: "Your 'Emergency Fund' goal is 90% complete!",
    date: new Date(Date.now() - 1000 * 60 * 60),
    read: false,
  },
  {
    id: 2,
    type: "budget",
    title: "Budget limit reached",
    message: "You've spent 100% of your Entertainment budget this month.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: 3,
    type: "badge",
    title: "New badge earned",
    message: "Congratulations! You earned the 'First Goal Achieved' badge.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
  {
    id: 4,
    type: "group",
    title: "New group invite",
    message: "You've been invited to join 'Family Budget' group.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
  },
  {
    id: 5,
    type: "transaction",
    title: "Large transaction detected",
    message: "A transaction of $500 was recorded in your account.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 72),
    read: true,
  },
];

const Notifications = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState(mockNotifications);
  
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "unread") {
      return !notification.read;
    }
    return true;
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = (id: number) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };
  
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "goal":
        return <Target className="h-5 w-5 text-g15-primary" />;
      case "budget":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "badge":
        return <Award className="h-5 w-5 text-purple-500" />;
      case "group":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "transaction":
        return <Wallet className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="mr-3 h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-gray-600">Stay updated on important events</p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle>Your Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge className="ml-2">{unreadCount} new</Badge>
              )}
            </div>
            
            <Tabs 
              value={activeTab} 
              onValueChange={(v) => setActiveTab(v as "all" | "unread")}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`flex rounded-lg border p-4 ${!notification.read ? 'bg-gray-50' : ''}`}
                >
                  <div className="mr-4">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${!notification.read ? 'text-g15-primary' : ''}`}>
                        {notification.title}
                      </h3>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatRelativeTime(notification.date)}
                      </div>
                    </div>
                    
                    <p className="mt-1 text-gray-600">{notification.message}</p>
                    
                    {!notification.read && (
                      <div className="mt-2 flex justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Mark as read
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 text-lg font-medium">No notifications</h3>
              <p className="mt-1 text-gray-500">
                {activeTab === "unread" 
                  ? "You have no unread notifications"
                  : "You don't have any notifications yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Notifications;
