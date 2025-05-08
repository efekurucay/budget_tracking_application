import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  Users, 
  UserPlus, 
  User,
  Calendar,
  Target,
  Wallet,
  Loader2,
  RefreshCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

// Types for groups
interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
  role: string;
}

// Form validation schema
const groupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  description: z.string().optional(),
});

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const queryClient = useQueryClient();
  const [isSessionRefreshing, setIsSessionRefreshing] = useState(true);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check and refresh session on component mount
  useEffect(() => {
    console.log("Groups component mounted, checking session");
    const checkSession = async () => {
      try {
        console.log("Session check started", new Date().toISOString());
        setIsSessionRefreshing(true);
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("Current session:", session ? "exists" : "none", error ? `Error: ${error.message}` : "");
        
        if (!session) {
          console.log("No session found, redirecting to signin");
          toast.error("Session expired. Please sign in again.");
          navigate('/signin');
          return;
        }
        
        try {
          // Refresh session to ensure it's current
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          console.log("Session refresh result:", refreshError ? `Error: ${refreshError.message}` : "Success");
          
          if (refreshError) {
            console.error("Error refreshing session:", refreshError);
            // Check if user still exists in context before redirecting
            if (!user) {
              toast.error("Session expired. Please sign in again.");
              navigate('/signin');
              return;
            }
          }
          
          // Force refetch groups data when session is refreshed
          queryClient.invalidateQueries({ queryKey: ["groups"] });
        } catch (refreshError) {
          console.error("Exception in refreshSession:", refreshError);
          // If refresh throws, check if we still have user data
          if (!user) {
            toast.error("Authentication error. Please sign in again.");
            navigate('/signin');
            return;
          }
        }
        
        setSessionChecked(true);
      } catch (error) {
        console.error("Error checking session:", error);
        toast.error("An error occurred. Please try again.");
        navigate('/signin');
      } finally {
        console.log("Session check finished, setting isSessionRefreshing=false");
        setIsSessionRefreshing(false);
      }
    };

    // Set timeout for session check
    const sessionTimeout = setTimeout(() => {
      if (isSessionRefreshing) {
        console.log("Session refresh timeout occurred");
        setIsSessionRefreshing(false);
        setSessionChecked(true); // Let's try to proceed anyway
        toast.error("Session check timed out. Some features may not work properly.");
      }
    }, 20000);

    checkSession();
    
    return () => {
      clearTimeout(sessionTimeout);
    };
  }, [queryClient, user, navigate]);

  // Form handling
  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch user's groups with improved error handling and timeouts
  const { 
    data: groups = [], // default empty array
    isLoading: isGroupsLoading, 
    error: groupsError,
    refetch: refetchGroups
  } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!user || !user.id) {
        console.error("User not available for groups query");
        return [];
      }

      try {
        console.log("Fetching groups data for user:", user.id);
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Groups fetch timeout")), 30000);
        });
        
        // Create fetch promise
        const fetchPromise = supabase
          .from("group_members")
          .select(`
            group_id,
            role,
            groups:group_id (
              id,
              name,
              description,
              created_at
            )
          `)
          .eq("user_id", user.id);
        
        try {
          // Race between fetch and timeout
          const { data, error } = await Promise.race([
            fetchPromise, 
            timeoutPromise
          ]) as any;
          
          if (error) {
            console.error("Error fetching groups:", error);
            toast.error("Failed to load groups");
            throw error;
          }

          console.log("Groups data fetched:", data ? data.length : 0, "groups found");
          
          if (!data || data.length === 0) {
            return [];
          }

          // Get member count for each group
          const groupsWithCount = await Promise.all(
            data.map(async (item) => {
              try {
                const { data: members, error: countError } = await supabase
                  .from("group_members")
                  .select("id", { count: "exact" })
                  .eq("group_id", item.group_id);
                
                if (countError) {
                  console.error("Error fetching member count:", countError);
                }
                
                return {
                  id: item.groups.id,
                  name: item.groups.name,
                  description: item.groups.description,
                  created_at: item.groups.created_at,
                  member_count: members?.length || 0,
                  role: item.role
                };
              } catch (err) {
                // Handle error in individual group processing
                console.error("Error processing group:", err);
                return {
                  id: item.groups.id,
                  name: item.groups.name,
                  description: item.groups.description,
                  created_at: item.groups.created_at,
                  member_count: 0, // Default if count fails
                  role: item.role
                };
              }
            })
          );
          
          return groupsWithCount as Group[];
        } catch (err) {
          console.error("Race promise error:", err);
          toast.error("Error fetching groups data");
          
          // Doğrudan normal sorgu yapmayı dene (timeout olmadan)
          const { data, error } = await supabase
            .from("group_members")
            .select(`
              group_id,
              role,
              groups:group_id (
                id,
                name,
                description,
                created_at
              )
            `)
            .eq("user_id", user.id);
            
          if (error) {
            console.error("Backup query error:", error);
            return [];
          }
          
          if (!data || data.length === 0) {
            return [];
          }
          
          // Kurtarma verisi ile devam et
          console.log("Using backup query data");
          return data.map(item => ({
            id: item.groups.id,
            name: item.groups.name,
            description: item.groups.description,
            created_at: item.groups.created_at,
            member_count: 1,
            role: item.role
          }));
        }
      } catch (err) {
        console.error("Error in groups query function:", err);
        return []; // Return empty array to prevent UI crashes
      }
    },
    enabled: !!user?.id && sessionChecked && !isSessionRefreshing,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // 1 second between retries
  });

  // Manually refresh groups data
  const handleRefreshGroups = useCallback(() => {
    setTimeoutOccurred(false);
    refetchGroups();
    toast.info("Refreshing groups data...");
    
    // If refetch also times out, show error again
    const retryTimeout = setTimeout(() => {
      if (isGroupsLoading) {
        setTimeoutOccurred(true);
        toast.error("Still having trouble loading groups. Please try again later.");
      }
    }, 10000);
    
    return () => clearTimeout(retryTimeout);
  }, [refetchGroups, isGroupsLoading]);

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof groupSchema>) => {
      if (!user) throw new Error("User not authenticated");
      
      // 1. Insert the new group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert([
          {
            name: values.name,
            description: values.description || null,
            created_by: user.id,
          },
        ])
        .select();

      if (groupError) throw groupError;
      
      // 2. Add the creator as an owner member
      if (groupData && groupData[0]) {
        const { error: memberError } = await supabase
          .from("group_members")
          .insert([
            {
              group_id: groupData[0].id,
              user_id: user.id,
              role: "owner",
            },
          ]);

        if (memberError) throw memberError;
      }
      
      return groupData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created successfully");
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating group:", error);
      toast.error(`Failed to create group: ${error.message}`);
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("group_members")
        .insert([
          {
            group_id: groupId,
            user_id: user.id,
            role: "member",
          },
        ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Joined group successfully");
      setJoinDialogOpen(false);
      setJoinCode("");
    },
    onError: (error) => {
      console.error("Error joining group:", error);
      toast.error(`Failed to join group: ${error.message}`);
    },
  });

  const handleCreateSubmit = form.handleSubmit((data) => {
    createGroupMutation.mutate(data);
  });

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      toast.error("Please enter a valid group ID");
      return;
    }
    
    try {
      // Check if group exists
      const { data, error } = await supabase
        .from("groups")
        .select("id")
        .eq("id", joinCode)
        .single();
      
      if (error || !data) {
        toast.error("Group not found");
        return;
      }
      
      // Check if already a member
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", joinCode)
        .eq("user_id", user?.id)
        .single();
      
      if (memberData) {
        toast.error("You are already a member of this group");
        return;
      }
      
      // Join the group
      joinGroupMutation.mutate(joinCode);
      
    } catch (error) {
      toast.error("Failed to join group");
      console.error(error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Show appropriate loading and error states
  if (isSessionRefreshing) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Checking authentication...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check for loading timeout
  useEffect(() => {
    // Set timeout for groups loading
    const timer = setTimeout(() => {
      if (isGroupsLoading && !timeoutOccurred) {
        console.log("Groups loading timeout occurred");
        setTimeoutOccurred(true);
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [isGroupsLoading, timeoutOccurred]);

  // Error or timeout state
  if (timeoutOccurred || groupsError) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {timeoutOccurred ? "Loading Timeout" : "Error Loading Groups"}
            </h1>
            <p className="mb-4">
              {timeoutOccurred 
                ? "It's taking longer than expected to load your groups." 
                : "There was a problem loading your groups."}
            </p>
            <Button onClick={handleRefreshGroups}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  if (isGroupsLoading && !timeoutOccurred) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Groups</h1>
              <p className="text-gray-600">Loading your groups...</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefreshGroups}
              disabled={isSessionRefreshing}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-gray-500">Loading groups data...</p>
              <div className="text-sm text-gray-400 mt-2 max-w-md text-center">
                (Bu işlem biraz zaman alabilir. Eğer uzun süre bekliyorsanız, sayfayı yenileyebilir veya Refresh butonuna tıklayabilirsiniz.)
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-gray-600">Collaborate on finances with family, friends or teams</p>
        </div>
        
        <div className="flex space-x-4">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" /> Join Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join an existing group</DialogTitle>
                <DialogDescription>
                  Enter the group ID to join a group
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="groupId" className="text-sm font-medium">Group ID</label>
                  <Input 
                    id="groupId" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter group ID..."
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={joinGroupMutation.isPending}>
                    {joinGroupMutation.isPending ? "Joining..." : "Join Group"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new group</DialogTitle>
                <DialogDescription>
                  Create a group to manage finances together
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Family Budget, Roommates, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What is this group for?" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Briefly describe the purpose of this group
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={createGroupMutation.isPending}>
                      {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups && groups.length > 0 ? (
          groups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Created on {new Date(group.created_at).toLocaleDateString()}
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant={group.role === "owner" ? "default" : "outline"}>
                    {group.role === "owner" ? "Owner" : "Member"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pb-3">
                <div className="space-y-3">
                  {group.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}
                  
                  <div className="flex items-center">
                    <Users size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-3 flex justify-between">
                <Button size="sm" variant="outline" className="w-full">
                  <User className="mr-2 h-4 w-4" /> Members
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  <Target className="mr-2 h-4 w-4" /> Goals
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  <Wallet className="mr-2 h-4 w-4" /> Budget
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="col-span-full p-8">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No groups yet</h3>
              <p className="mt-2 text-gray-500">
                Create a new group or join an existing one to collaborate on finances
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Group
                </Button>
                <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Join Group
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Groups;
