
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Award, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Form validation schema
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
});

interface UserBadge {
  id: string;
  badge: {
    id: string;
    name: string;
    description: string;
    points: number;
    icon: string;
  };
  earned_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Form handling
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });
  
  // Fetch user badges
  const { data: badges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ["user-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          id,
          earned_at,
          badge:badge_id (
            id,
            name,
            description,
            points,
            icon
          )
        `)
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data as UserBadge[];
    },
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    updateProfileMutation.mutate(data);
  });

  const getInitials = () => {
    if (!user) return "";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const totalPoints = badges?.reduce((sum, badge) => sum + badge.badge.points, 0) || user?.points || 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={user?.email || ""} disabled />
                  </FormControl>
                  <FormDescription>
                    Your email address is used for login and cannot be changed
                  </FormDescription>
                </FormItem>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* User Info Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-xl bg-g15-primary text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle>{user?.firstName} {user?.lastName}</CardTitle>
            <div className="flex items-center justify-center text-gray-500 text-sm">
              <Mail className="h-4 w-4 mr-1" />
              {user?.email}
            </div>
            
            {/* Membership status */}
            <div className="mt-4">
              <Badge variant={user?.isPro ? "default" : "outline"} className={`${user?.isPro ? "bg-g15-accent" : ""} px-3 py-1`}>
                {user?.isPro ? "Pro Membership" : "Free Plan"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-amber-500 mr-2" />
                  <span>Points</span>
                </div>
                <Badge variant="secondary" className="text-base font-semibold">
                  {totalPoints}
                </Badge>
              </div>
              
              {user?.isPro ? (
                <div className="text-center text-sm text-gray-500">
                  You're enjoying all premium features
                </div>
              ) : (
                <div className="text-center">
                  <Button variant="outline" className="w-full">
                    Upgrade to Pro
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">
                    Use your {totalPoints} points for discounts!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          
          <Separator />
          
          <CardHeader className="pt-6">
            <div className="flex items-center">
              <Award className="h-5 w-5 text-g15-primary mr-2" />
              <CardTitle className="text-base">Your Badges</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoadingBadges ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Loading badges...</p>
              </div>
            ) : badges && badges.length > 0 ? (
              <div className="space-y-3">
                {badges.map((userBadge) => (
                  <div key={userBadge.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-g15-primary/10 h-8 w-8 rounded-full flex items-center justify-center mr-3">
                        <Award className="h-4 w-4 text-g15-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{userBadge.badge.name}</div>
                        <div className="text-xs text-gray-500">
                          Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      +{userBadge.badge.points}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  You haven't earned any badges yet. Complete goals to earn badges!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
