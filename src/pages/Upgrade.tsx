import React, { useState } from "react";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Zap, Award, MessageSquare, ChevronRight, Loader2, HourglassIcon, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

const Upgrade = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [isUpgradeRequested, setIsUpgradeRequested] = useState(false);
  const [cardMessage, setCardMessage] = useState('');
  const [cardType, setCardType] = useState('Credit Card');
  
  const { t } = useTranslation();
  
  // Fetch user badges and points
  const { data: userBadges } = useQuery({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge:badge_id (points)")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate total points (could come from user profile directly)
  const totalPoints = userBadges?.reduce((sum, item) => sum + item.badge.points, 0) || user?.points || 0;
  
  // Calculate price with discount
  const regularPrice = 9.99;
  const pointValue = 0.01; // $0.01 per point
  const discount = (pointsToUse * pointValue).toFixed(2);
  const finalPrice = Math.max(0, regularPrice - Number(discount)).toFixed(2);
  
  // Upgrade request function
  const requestUpgradeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User ID is required");

      const notes = cardMessage || `Requested via payment form using ${cardType}.`;
      
      // Call the RPC function
      const { data, error } = await supabase.rpc('request_pro_upgrade', {
        p_notes: notes
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      return data;
    },
    onSuccess: () => {
      setIsProcessing(false);
      setIsUpgradeRequested(true);
      setPaymentDialog(false);
      toast.success(t("upgrade.requestSuccess", "Pro üyelik talebiniz alındı. İncelendikten sonra size bildirim yapılacaktır."));
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast.error(`${t("upgrade.requestFailed", "Pro üyelik talebi başarısız")}: ${error.message}`);
    }
  });
  
  // Check if user has a pending upgrade request
  const { data: hasPendingRequest, isLoading: isCheckingRequest } = useQuery({
    queryKey: ["pending-upgrade-request", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc('check_pending_upgrade_request', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error("Error checking upgrade request:", error);
        return false;
      }
      
      return data || false;
    },
    enabled: !!user?.id && !user.isPro,
  });

  const planFeatures = {
    free: [
      "Financial goals tracking",
      "Basic budget management",
      "Transaction history",
      "Group finance collaboration",
      "Reports & analytics",
    ],
    pro: [
      "Everything in Free plan",
      "AI-powered budget recommendations",
      "Intelligent financial chatbot",
      "Public showcase participation",
      "Priority support",
      "Early access to new features",
    ],
  };
  
  const handleUpgrade = () => {
    setPaymentDialog(true);
  };
  
  const processPayment = async () => {
    if (!cardNumber || !cardName) {
      toast.error(t("upgrade.fillPaymentDetails", "Lütfen tüm ödeme bilgilerini doldurun"));
      return;
    }
    
    setIsProcessing(true);
    
    // Request upgrade instead of directly upgrading
    requestUpgradeMutation.mutate();
  };
  
  // If user is already Pro
  if (user?.isPro) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pro Subscription</h1>
          <p className="text-gray-600">You are already enjoying our premium features</p>
        </div>
        
        <Card className="max-w-md mx-auto border-2 border-g15-accent">
          <CardHeader className="bg-gradient-to-r from-g15-accent/20 to-g15-primary/10 text-center">
            <div className="flex items-center justify-center">
              <Zap className="h-6 w-6 text-g15-accent mr-2" />
              <CardTitle>Active Pro Subscription</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-g15-accent/10 flex items-center justify-center">
                <Award className="h-12 w-12 text-g15-accent" />
              </div>
              <h3 className="text-xl font-semibold">Thank you for being a Pro user!</h3>
              <p className="text-center text-gray-600">
                You have full access to all premium features including the AI Assistant, 
                personalized recommendations, and much more.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = '/ai-assistant'}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Try the AI Assistant
            </Button>
          </CardFooter>
        </Card>
      </DashboardLayout>
    );
  }

  // If user has a pending upgrade request
  if (hasPendingRequest) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("upgrade.proRequestTitle", "Pro Üyelik Talebi")}</h1>
          <p className="text-gray-600">{t("upgrade.proRequestSubtitle", "Talebiniz inceleniyor")}</p>
        </div>
        
        <Card className="max-w-md mx-auto border-2 border-yellow-400">
          <CardHeader className="bg-yellow-50 text-center">
            <div className="flex items-center justify-center">
              <HourglassIcon className="h-6 w-6 text-yellow-500 mr-2" />
              <CardTitle>{t("upgrade.pendingRequest", "Bekleyen Pro Üyelik Talebi")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-yellow-100 flex items-center justify-center">
                <HourglassIcon className="h-12 w-12 text-yellow-500" />
              </div>
              <h3 className="text-xl font-semibold">{t("upgrade.waitingApproval", "Onay Bekleniyor")}</h3>
              <p className="text-center text-gray-600">
                {t("upgrade.approvalProcess", "Pro üyelik talebiniz alındı ve şu anda inceleniyor. Onaylandığında size bildirim gönderilecektir.")}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.backToDashboard", "Dashboard'a Dön")}
            </Button>
          </CardFooter>
        </Card>
      </DashboardLayout>
    );
  }
  
  // If upgrade was just requested successfully (temporary state until page reload)
  if (isUpgradeRequested) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("upgrade.proRequestTitle", "Pro Üyelik Talebi")}</h1>
          <p className="text-gray-600">{t("upgrade.proRequestSubtitle", "Talebiniz alındı")}</p>
        </div>
        
        <Card className="max-w-md mx-auto border-2 border-green-400">
          <CardHeader className="bg-green-50 text-center">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
              <CardTitle>{t("upgrade.requestReceived", "Talebiniz Alındı")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold">{t("upgrade.thankYou", "Teşekkürler!")}</h3>
              <p className="text-center text-gray-600">
                {t("upgrade.requestConfirmation", "Pro üyelik talebiniz başarıyla alınmıştır. Talebiniz incelendikten sonra size bildirim yapılacaktır.")}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = '/dashboard'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.backToDashboard", "Dashboard'a Dön")}
            </Button>
          </CardFooter>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upgrade to Pro</h1>
        <p className="text-gray-600">Unlock premium features to enhance your financial journey</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Your current plan</CardDescription>
            <div className="mt-4">
              <div className="text-3xl font-bold">$0</div>
              <p className="text-gray-500 text-sm">Forever free</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {planFeatures.free.map((feature, index) => (
              <div key={index} className="flex items-start">
                <Check className="h-5 w-5 text-g15-success mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
            {planFeatures.pro.slice(1).map((feature, index) => (
              <div key={index} className="flex items-start opacity-50">
                <X className="h-5 w-5 text-g15-error mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button disabled variant="outline" className="w-full">
              Current Plan
            </Button>
          </CardFooter>
        </Card>
        
        {/* Pro Plan */}
        <Card className="border-g15-accent">
          <CardHeader className="bg-gradient-to-r from-g15-accent/10 to-g15-primary/10">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-g15-accent mr-2" />
              <CardTitle>Pro Plan</CardTitle>
            </div>
            <CardDescription>Enhanced features</CardDescription>
            <div className="mt-4">
              <div className="flex items-end">
                <div className="text-3xl font-bold">$9.99</div>
                <div className="text-gray-500 ml-1">/month</div>
              </div>
              {totalPoints > 0 && (
                <div className="mt-1 text-g15-accent text-sm flex items-center">
                  <Award className="h-4 w-4 mr-1" />
                  Use your {totalPoints} points for discount!
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {planFeatures.pro.map((feature, index) => (
              <div key={index} className="flex items-start">
                <Check className="h-5 w-5 text-g15-accent mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleUpgrade} 
              className="w-full bg-g15-accent hover:bg-g15-accent/90"
            >
              Upgrade Now <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Pro Features Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-g15-accent/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-g15-accent" />
            </div>
            <CardTitle>AI Financial Assistant</CardTitle>
            <CardDescription>
              Your personal financial advisor powered by AI
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Ask questions about your budget, get personalized recommendations, and manage your finances through natural conversation.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-g15-accent/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-g15-accent" />
            </div>
            <CardTitle>Public Showcase</CardTitle>
            <CardDescription>
              Celebrate achievements with the community
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Share your financial milestones and badges with others, get motivated, and inspire the community with your progress.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-g15-accent/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-g15-accent" />
            </div>
            <CardTitle>Smart Insights</CardTitle>
            <CardDescription>
              AI-powered recommendations and analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Get intelligent budget suggestions based on your spending patterns, predictive analysis, and optimization tips to reach your goals faster.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8 text-center bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium">Satisfaction Guaranteed</h3>
        <p className="mt-2 text-gray-600">
          Try Pro risk-free with our 30-day money-back guarantee. <br />
          If you're not completely satisfied, we'll refund your payment.
        </p>
      </div>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Pro Plan</DialogTitle>
            <DialogDescription>
              Enter your payment details to complete your upgrade
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {totalPoints > 0 && (
              <div className="space-y-2">
                <Label>Use Points for Discount</Label>
                <div className="flex items-center space-x-4">
                  <Input 
                    type="number" 
                    min="0" 
                    max={totalPoints} 
                    value={pointsToUse}
                    onChange={(e) => setPointsToUse(parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                  <div className="text-sm text-gray-500">
                    {pointsToUse} points = ${discount} discount
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input 
                id="cardNumber" 
                placeholder="1234 5678 9012 3456" 
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardName">Name on Card</Label>
              <Input 
                id="cardName" 
                placeholder="John Doe" 
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM/YY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" placeholder="123" />
              </div>
            </div>
            
            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between font-medium">
                <span>Monthly Subscription:</span>
                <span>${regularPrice}</span>
              </div>
              {pointsToUse > 0 && (
                <div className="flex justify-between text-sm text-g15-accent">
                  <span>Points Discount:</span>
                  <span>-${discount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                <span>Total:</span>
                <span>${finalPrice}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={processPayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay ${finalPrice}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Upgrade;
