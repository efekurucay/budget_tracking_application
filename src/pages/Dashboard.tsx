import React, { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PlusCircle,
  TrendingUp,
  Target,
  Users,
  Award,
  Bell,
  AlertCircle,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

const FullPageLoader = ({ message }: { message: string }) => (
  <DashboardLayout>
    <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-gray-600">{message}</p>
    </div>
  </DashboardLayout>
);

const Dashboard = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  console.log("Dashboard rendering. Auth loading:", isAuthLoading, "User ID:", user?.id, "Authenticated:", isAuthenticated);

  // Fetch recent transactions with improved error handling
  const { 
    data: transactions = [], 
    isLoading: isLoadingTransactions,
    error: transactionsError,
    isError: isTransactionsError,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ["recent-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.warn("Dashboard queryFn: No user ID available");
        return [];
      }
      
      console.log("Dashboard queryFn: Fetching transactions for user:", user.id);
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Dashboard queryFn: Supabase error fetching transactions:", error);
          throw new Error(error.message);
        }
        
        console.log("Dashboard queryFn: Transactions fetched successfully:", data?.length || 0);
        return data || [];
      } catch (err: any) {
        console.error("Dashboard queryFn: Error in transactions fetch:", err.message);
        throw err;
      }
    },
    // SADECE Auth yüklemesi bittiğinde VE kullanıcı giriş yapmışsa etkinleştir
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 1,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 1,
  });

  // Fetch financial goals with improved error handling
  const { 
    data: goals = [], 
    isLoading: isLoadingGoals,
    error: goalsError,
    isError: isGoalsError,
    refetch: refetchGoals
  } = useQuery({
    queryKey: ["goals-summary", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.warn("Dashboard queryFn: No user ID available");
        return [];
      }
      
      console.log("Dashboard queryFn: Fetching goals for user:", user.id);
      try {
        const { data, error } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("target_amount", { ascending: false })
          .limit(3);

        if (error) {
          console.error("Dashboard queryFn: Supabase error fetching goals:", error);
          throw new Error(error.message);
        }
        
        console.log("Dashboard queryFn: Goals fetched successfully:", data?.length || 0);
        return data || [];
      } catch (err: any) {
        console.error("Dashboard queryFn: Error in goals fetch:", err.message);
        throw err;
      }
    },
    // SADECE Auth yüklemesi bittiğinde VE kullanıcı giriş yapmışsa etkinleştir
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 1,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  // Veri yükleme ve hata durumları için yardımcı değişkenler
  const isDataLoading = isLoadingTransactions || isLoadingGoals;
  const isDataError = isTransactionsError || isGoalsError;
  const dataError = transactionsError || goalsError;

  // Redirect to login if not authenticated (after auth check is complete)
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      console.log("Dashboard: Not authenticated after auth check, redirecting to signin");
      navigate("/signin", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Veri yenileme fonksiyonu
  const handleRetry = useCallback(() => {
    console.log("Dashboard: Data refresh triggered");
    if (!isAuthLoading && isAuthenticated) {
      toast.info("Refreshing dashboard data...");
      refetchTransactions();
      refetchGoals();
    } else {
      toast.error("Cannot refresh, authentication not ready");
    }
  }, [isAuthLoading, isAuthenticated, refetchTransactions, refetchGoals]);

  // --- YÜKLEME VE HATA DURUMLARI ---

  // 1. AuthContext yükleniyor
  if (isAuthLoading) {
    console.log("Dashboard: Auth is loading...");
    return <FullPageLoader message="Checking authentication..." />;
  }

  // 2. Auth yüklendi, giriş yapılmamış
  if (!isAuthenticated || !user) {
    console.log("Dashboard: Not authenticated, redirecting...");
    return <FullPageLoader message="Please sign in to continue" />;
  }

  // 3. Auth tamam, Veriler yükleniyor
  if (isDataLoading) {
    console.log("Dashboard: Data is loading...");
    return <FullPageLoader message="Loading your financial overview..." />;
  }

  // 4. Auth tamam, Veri yüklenirken HATA
  if (isDataError) {
    console.error("Dashboard: Data loading error", dataError);
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3 text-red-700">Error Loading Dashboard Data</h1>
            <p className="mb-6 text-gray-700">Could not load your financial data. Please try again.</p>
            <Button onClick={handleRetry} variant="destructive" size="lg">
              <RefreshCcw className="h-5 w-5 mr-2" /> Retry
            </Button>
            <p className="mt-4 text-xs text-red-600">Details: {dataError?.message || "Unknown error"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 5. Her şey başarılı, ana içeriği göster
  console.log("Dashboard: Rendering main content");

  // Sample data for charts
  const expenseData = [
    { name: "Jan", amount: 2400 },
    { name: "Feb", amount: 1398 },
    { name: "Mar", amount: 9800 },
    { name: "Apr", amount: 3908 },
    { name: "May", amount: 4800 },
    { name: "Jun", amount: 3800 },
  ];

  const categoryData = [
    { name: "Food", value: 2500 },
    { name: "Rent", value: 5500 },
    { name: "Bills", value: 1200 },
    { name: "Entertainment", value: 800 },
    { name: "Other", value: 1800 },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Calculate totals
  const totalIncome =
    transactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalExpenses =
    transactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0) || 0;
  const netBalance = totalIncome - totalExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getProgressValue = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Hello, {user?.firstName || "Welcome"}
            </h1>
            <p className="text-gray-600">Financial overview of your accounts</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={isDataLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isDataLoading ? 'animate-spin' : ''}`} /> Refresh Data
          </Button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-g15-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-g15-success">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-g15-error" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-g15-error">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <Wallet className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  netBalance >= 0 ? "text-g15-success" : "text-g15-error"
                }`}
              >
                {formatCurrency(netBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Available</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Expenses Chart */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Trend</CardTitle>
                <CardDescription>Last 6 months expense distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={expenseData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Transactions</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/transactions")}
                    >
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions && transactions.length > 0 ? (
                    <div className="space-y-4">
                      {(transactions || []).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                transaction.type === "income"
                                  ? "bg-g15-success/20"
                                  : "bg-g15-error/20"
                              }`}
                            >
                              {transaction.type === "income" ? (
                                <ArrowUpRight className="h-4 w-4 text-g15-success" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-g15-error" />
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-sm">
                                {transaction.description || "Transaction"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(transaction.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`font-medium ${
                              transaction.type === "income"
                                ? "text-g15-success"
                                : "text-g15-error"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Wallet className="mx-auto h-8 w-8 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium">
                        No Transactions Found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Add your first transaction by visiting the transaction page.
                      </p>
                      <Button
                        className="mt-4"
                        size="sm"
                        onClick={() => navigate("/transactions")}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>Expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="value"
                          label={({
                            cx,
                            cy,
                            midAngle,
                            innerRadius,
                            outerRadius,
                            value,
                            index,
                          }) => {
                            const RADIAN = Math.PI / 180;
                            const radius =
                              25 + innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x =
                              cx + radius * Math.cos(-midAngle * RADIAN);
                            const y =
                              cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                              <text
                                x={x}
                                y={y}
                                fill={COLORS[index % COLORS.length]}
                                textAnchor={x > cx ? "start" : "end"}
                                dominantBaseline="central"
                                fontSize={12}
                              >
                                {categoryData[index].name}
                              </text>
                            );
                          }}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Goals, Quick Actions, Reminders */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Financial Goals</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/goals")}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goals && goals.length > 0 ? (
                  <div className="space-y-6">
                    {(goals || []).map((goal) => (
                      <div key={goal.id}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-sm">{goal.name}</span>
                          <span className="text-sm">
                            {formatCurrency(goal.current_amount || 0)} /{" "}
                            {formatCurrency(goal.target_amount)}
                          </span>
                        </div>
                        <Progress
                          value={getProgressValue(goal.current_amount || 0, goal.target_amount)}
                          className="h-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {getProgressValue(goal.current_amount || 0, goal.target_amount)}% completed
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Target className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium">
                      No Goals Found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create your first financial goal.
                    </p>
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={() => navigate("/goals")}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Goal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/transactions")}
                  >
                    <Wallet className="h-5 w-5" />
                    <span className="text-xs">Add Transaction</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/goals")}
                  >
                    <Target className="h-5 w-5" />
                    <span className="text-xs">Add Goal</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/reports")}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-xs">View Report</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/groups")}
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Groups</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pro Features</span>
                  {!user?.isPro && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-g15-accent/10 text-g15-accent border-g15-accent/20"
                      onClick={() => navigate("/upgrade")}
                    >
                      Upgrade
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="h-8 w-8 rounded-full bg-g15-accent/10 flex items-center justify-center mr-3 flex-shrink-0">
                      <Award className="h-4 w-4 text-g15-accent" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">AI Financial Advisor</h4>
                      <p className="text-xs text-gray-500">
                        Get personalized financial advice and optimize your spending habits.
                      </p>
                    </div>
                  </div>

                  {/* Notification sample */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-start">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <Bell className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Budget Reminder</h4>
                        <p className="text-xs text-gray-500">
                          You've reached 85% of your budget limit in the "Food" category.
                          Limit is 85% full.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-start">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Unexpected Transaction</h4>
                        <p className="text-xs text-gray-500">
                          A transaction was detected that exceeded your normal spending amount in the last 24 hours.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
