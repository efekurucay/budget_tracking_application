import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { 
  Bell, 
  Check, 
  Calendar,
  Target,
  Award, 
  Users,
  Wallet,
  AlertTriangle,
  Loader2
} from "lucide-react";

// Notification type definition
interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();
  
  // Fetch notifications from Supabase
  const { 
    data: notifications = [], 
    isLoading,
    error,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user?.id
  });
  
  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
    onError: (error) => {
      toast.error(t("notifications.markReadError", "Failed to mark notification as read"));
      console.error("Error marking notification as read:", error);
    }
  });
  
  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Using the RPC function we defined in SQL
      const { data, error } = await supabase.rpc("mark_all_notifications_as_read");
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success(t("notifications.allMarkedRead", "All notifications marked as read"));
    },
    onError: (error) => {
      toast.error(t("notifications.markAllReadError", "Failed to mark all notifications as read"));
      console.error("Error marking all notifications as read:", error);
    }
  });
  
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "unread") {
      return !notification.read;
    }
    return true;
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };
  
  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return t("time.daysAgo", { count: diffDay });
    } else if (diffHour > 0) {
      return t("time.hoursAgo", { count: diffHour });
    } else if (diffMin > 0) {
      return t("time.minutesAgo", { count: diffMin });
    } else {
      return t("time.justNow", "Just now");
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
      case "system":
        return <Bell className="h-5 w-5 text-g15-primary" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-g15-primary" />
            <p className="text-gray-500">{t("common.loading", "Loading...")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 bg-red-50 rounded-lg border border-red-200 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-700 mb-2">
            {t("notifications.error", "Error Loading Notifications")}
          </h1>
          <p className="mb-4 text-red-600">
            {error instanceof Error ? error.message : t("common.errorUnknown", "Unknown error")}
          </p>
          <Button onClick={() => refetch()}>
            {t("common.retry", "Retry")}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="mr-3 h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t("notifications.pageTitle", "Notifications")}</h1>
            <p className="text-gray-600">{t("notifications.subtitle", "Stay updated on important events")}</p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {t("notifications.markAllAsRead", "Mark all as read")}
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle>{t("notifications.yourNotifications", "Your Notifications")}</CardTitle>
              {unreadCount > 0 && (
                <Badge className="ml-2">{unreadCount} {t("notifications.new", "new")}</Badge>
              )}
            </div>
            
            <Tabs 
              value={activeTab} 
              onValueChange={(v) => setActiveTab(v as "all" | "unread")}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">{t("common.all", "All")}</TabsTrigger>
                <TabsTrigger value="unread">
                  {t("notifications.unread", "Unread")} {unreadCount > 0 && `(${unreadCount})`}
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
                        {formatRelativeTime(notification.created_at)}
                      </div>
                    </div>
                    
                    <p className="mt-1 text-gray-600">{notification.message}</p>
                    
                    {!notification.read && (
                      <div className="mt-2 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          {markAsReadMutation.isPending ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-3 w-3" />
                          )}
                          {t("notifications.markAsRead", "Mark as read")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-600">
                {activeTab === "all" 
                  ? t("notifications.noNotifications", "No notifications") 
                  : t("notifications.noUnreadNotifications", "No unread notifications")}
              </h3>
              <p className="mt-2 text-gray-500">
                {activeTab === "all" 
                  ? t("notifications.checkBackLater", "Check back later for updates") 
                  : t("notifications.allCaughtUp", "You're all caught up!")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Notifications;
