import React, { useState, useCallback, useEffect } from "react";
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
  RefreshCcw,
  AlertCircle
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
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const queryClient = useQueryClient();

  console.log("Groups rendering. Auth loading:", isAuthLoading, "User ID:", user?.id, "Authenticated:", isAuthenticated);

  // Form handling
  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch user's groups with improved error handling
  const { 
    data: groups = [], // default empty array
    isLoading: isGroupsLoading, 
    error: groupsError,
    isError: isGroupsError,
    refetch: refetchGroups
  } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.warn("Groups queryFn: User ID not available");
        return [];
      }
      console.log("Groups queryFn: Fetching groups for user:", user.id);

      try {
        const { data: memberData, error: memberError } = await supabase
          .from("group_members")
          .select(`
            group_id,
            role,
            groups:group_id (id, name, description, created_at)
          `)
          .eq("user_id", user.id);

        if (memberError) throw memberError;
        if (!memberData || memberData.length === 0) return [];

        // Üye sayılarını çek (hata yakalama ile)
        const groupsWithCount = await Promise.all(
          memberData
            .filter(item => item.groups) // Null grupları filtrele
            .map(async (item) => {
              try {
                const { count, error: countError } = await supabase
                  .from("group_members")
                  .select("id", { count: "exact", head: true })
                  .eq("group_id", item.groups.id);

                if (countError) {
                  console.error(`Groups queryFn: Member count error (Group ${item.groups.id}):`, countError);
                  // Hata olsa bile grubu döndür
                  return { id: item.groups.id, name: item.groups.name, description: item.groups.description, created_at: item.groups.created_at, member_count: 1, role: item.role };
                }
                return { id: item.groups.id, name: item.groups.name, description: item.groups.description, created_at: item.groups.created_at, member_count: count ?? 0, role: item.role };
              } catch (err) {
                console.error(`Groups queryFn: Group processing error (${item.groups.id}):`, err);
                return { id: item.groups.id, name: item.groups.name, description: item.groups.description, created_at: item.groups.created_at, member_count: 1, role: item.role }; // Fallback
              }
            })
        );
        return groupsWithCount as Group[];
      } catch (error) {
        console.error("Groups queryFn: Error fetching groups:", error);
        throw error; 
      }
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: 1,
    retryDelay: 1500,
  });

  // Kimlik doğrulama değişikliklerine yanıt ver
  useEffect(() => {
    // Auth artık yüklü değil ve kullanıcı giriş yapmamış
    if (!isAuthLoading && !isAuthenticated) {
      console.log("Groups: Not authenticated, redirecting to signin");
      navigate("/signin", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Grup yenileme fonksiyonu
  const handleRefreshGroups = useCallback(() => {
    console.log("Groups: Group refresh triggered");
    if (!isAuthLoading && isAuthenticated) {
      toast.info("Refreshing groups...");
      refetchGroups();
    } else {
      toast.error("Cannot refresh, authentication not ready");
    }
  }, [refetchGroups, isAuthLoading, isAuthenticated]);

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof groupSchema>) => {
      if (!user?.id) throw new Error("User not authenticated");
      console.log("Creating new group:", values.name);
      
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert([
          {
            name: values.name,
            description: values.description || null,
            created_by: user.id,
          },
        ])
        .select('id')
        .single();

      if (groupError) throw groupError;
      if (!groupData) throw new Error("Failed to retrieve created group ID");

      // Add the creator as an owner
      const { error: memberError } = await supabase
        .from("group_members")
        .insert([
          {
            group_id: groupData.id,
            user_id: user.id,
            role: "owner",
          },
        ]);

      if (memberError) {
        // Attempt to clean up the group if adding member fails
        await supabase.from('groups').delete().eq('id', groupData.id);
        throw memberError;
      }

      return groupData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
      toast.success("Group created successfully");
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Group creation error:", error);
      toast.error(`Failed to create group: ${error.message}`);
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      console.log("Joining group with ID:", groupId);

      // Check if already a member
      const { data: existingMember, error: checkError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingMember) throw new Error("You are already a member of this group");

      // Add the user as a member
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
      queryClient.invalidateQueries({ queryKey: ["groups", user?.id] });
      toast.success("Joined group successfully");
      setJoinDialogOpen(false);
      setJoinCode("");
    },
    onError: (error: any) => {
      console.error("Group join error:", error);
      toast.error(`Failed to join group: ${error.message}`);
    },
  });

  // Form submit handlers
  const handleCreateSubmit = form.handleSubmit((data) => createGroupMutation.mutate(data));

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      toast.error("Please enter a valid group ID");
      return;
    }
    if (!user?.id) {
      toast.error("Authentication error");
      return;
    }

    try {
      // Verify group exists
      const { data, error } = await supabase
        .from("groups")
        .select("id")
        .eq("id", trimmedCode)
        .single();

      if (error || !data) {
        toast.error("Group not found with the provided ID");
        return;
      }

      joinGroupMutation.mutate(trimmedCode);
    } catch (error: any) {
      toast.error(`Failed to join group: ${error.message || 'Unknown error'}`);
    }
  };

  // --- YÜKLEME VE HATA DURUMLARI ---

  // 1. AuthContext hala kimlik doğrulamasını kontrol ediyor
  if (isAuthLoading) {
    console.log("Groups: Auth is loading...");
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Checking authentication...</span>
        </div>
      </DashboardLayout>
    );
  }

  // 2. Kimlik doğrulaması bitti ama kullanıcı giriş yapmamış
  if (!isAuthenticated || !user) {
    console.log("Groups: Not authenticated, redirecting to signin");
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 text-center">
          <p>Please <a href="/signin" className="text-primary underline">sign in</a> to view your groups.</p>
        </div>
      </DashboardLayout>
    );
  }

  // 3. Kimlik doğrulaması tamam, gruplar yükleniyor
  if (isGroupsLoading) {
    console.log("Groups: Groups are loading...");
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Groups</h1>
              <p className="text-gray-600">Loading your financial groups...</p>
            </div>
            <Button variant="outline" onClick={handleRefreshGroups} disabled={isGroupsLoading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isGroupsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Loading groups...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 4. Kimlik doğrulaması tamam, gruplar yüklenirken HATA oluştu
  if (isGroupsError) {
    console.error("Groups: Query error", groupsError);
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Groups</h1>
            </div>
            <Button variant="outline" onClick={handleRefreshGroups}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-3 text-red-700">Error Loading Groups</h2>
            <p className="mb-4 text-gray-700">We couldn't load your groups data. Please try again.</p>
            <p className="text-xs text-red-600">Error: {groupsError?.message || "Unknown error"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 5. Her şey başarılı, ana içeriği göster
  console.log("Groups: Rendering main content. Group count:", groups.length);
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Groups</h1>
            <p className="text-gray-600">Collaborate on finances with family, friends or teams</p>
          </div>
          <div className="flex space-x-4">
            {/* Join Group Dialog */}
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" /> Join Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Group</DialogTitle>
                  <DialogDescription>Enter the Group ID to join an existing group</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinSubmit} className="space-y-4 pt-4">
                  <Input 
                    id="groupId" 
                    value={joinCode} 
                    onChange={(e) => setJoinCode(e.target.value)} 
                    placeholder="Group ID" 
                    required
                    disabled={joinGroupMutation.isPending}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={joinGroupMutation.isPending}>
                      {joinGroupMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Joining...</>
                      ) : "Join"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Create Group Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group</DialogTitle>
                  <DialogDescription>Start a new financial group</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={createGroupMutation.isPending} />
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
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              disabled={createGroupMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createGroupMutation.isPending}>
                        {createGroupMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Creating...</>
                        ) : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Group List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Groups exist, show them */}
          {groups.length > 0 ? (
            groups.map((group) => (
              <Card key={group.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle>{group.name}</CardTitle>
                  <Badge variant={group.role === "owner" ? "default" : "secondary"}>
                    {group.role}
                  </Badge>
                  <CardDescription className="text-xs pt-1">
                    Created: {new Date(group.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pb-4">
                  {group.description && (
                    <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Users size={16} className="mr-2" />
                    <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    View Group
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            /* No groups, show empty state */
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <Card className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No groups yet</h3>
                <p className="mt-2 text-gray-500">Create a new group or join an existing one to get started.</p>
                <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Group
                  </Button>
                  <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Join Group
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Groups;
