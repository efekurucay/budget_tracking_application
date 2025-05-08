import React, { useState, useEffect, useCallback } from "react";
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
  const [dataLoadTimeoutOccurred, setDataLoadTimeoutOccurred] = useState(false);
  
  console.log("Dashboard rendering. Auth loading:", isAuthLoading, "User ID:", user?.id, "Authenticated:", isAuthenticated, "at", new Date().toISOString());

  // Fetch recent transactions with retry and timeout
  const { 
    data: transactions = [], 
    isLoading: isLoadingTransactions,
    error: transactionsError,
    isError: isTransactionsError,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ["recent-transactions", user?.id],
    queryFn: async () => {
      console.log("Attempting to fetch transactions for user:", user?.id);
      if (!user?.id) {
        console.warn("No user ID, skipping transactions fetch.");
        return [];
      }
      
      try {
        const { data: queryData, error: queryError, status } = await supabase
        .from("transactions")
        .select("*")
          .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(5);

        if (queryError) {
          console.error("Supabase error fetching transactions:", { status, ...queryError });
          throw new Error(queryError.message);
        }
        
        console.log("Transactions fetched successfully:", queryData?.length || 0);
        return queryData || [];
      } catch (err: any) {
        console.error("Overall error in transactions queryFn:", err.message);
        throw err;
      }
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 2,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 1,
  });

  // Fetch financial goals with retry and timeout
  const { 
    data: goals = [], 
    isLoading: isLoadingGoals,
    error: goalsError,
    isError: isGoalsError,
    refetch: refetchGoals
  } = useQuery({
    queryKey: ["goals-summary", user?.id],
    queryFn: async () => {
      console.log("Attempting to fetch goals for user:", user?.id);
      if (!user?.id) {
        console.warn("No user ID, skipping goals fetch.");
        return [];
      }
      
      try {
        const { data: queryData, error: queryError, status } = await supabase
        .from("goals")
        .select("*")
          .eq("user_id", user.id)
        .order("target_amount", { ascending: false })
        .limit(3);

        if (queryError) {
          console.error("Supabase error fetching goals:", { status, ...queryError });
          throw new Error(queryError.message);
        }
        
        console.log("Goals fetched successfully:", queryData?.length || 0);
        return queryData || [];
      } catch (err: any) {
        console.error("Overall error in goals queryFn:", err.message);
        throw err;
      }
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 2,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 1,
  });

  // Data loading timeout check
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (!isAuthLoading && isAuthenticated && (isLoadingTransactions || isLoadingGoals)) {
      console.log("Dashboard data queries are loading, starting timeout check...");
      timer = setTimeout(() => {
        if (isLoadingTransactions || isLoadingGoals) {
          console.warn("Dashboard data loading timeout occurred because queries are still loading.");
          setDataLoadTimeoutOccurred(true);
          toast.error("Data is taking longer than expected to load. You can try refreshing.", { duration: 7000 });
        } else {
          console.log("Timeout check: Queries finished loading before timeout triggered.");
        }
      }, 25000);
    } else {
      if (timer) clearTimeout(timer);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAuthLoading, isAuthenticated, isLoadingTransactions, isLoadingGoals]);

  const handleRetry = useCallback(() => {
    console.log("Retrying data fetch...");
    setDataLoadTimeoutOccurred(false);
    if (user?.id && isAuthenticated) {
      toast.info("Refreshing dashboard data...");
      if (isTransactionsError || transactionsError) refetchTransactions();
      if (isGoalsError || goalsError) refetchGoals();
      
      if (!isTransactionsError && !isGoalsError && !transactionsError && !goalsError) {
        refetchTransactions();
        refetchGoals();
      }
    } else {
      toast.error("Cannot refresh data, user not authenticated or available.");
      console.warn("Retry attempt failed: User not authenticated or no user ID.");
    }
  }, [user?.id, isAuthenticated, refetchTransactions, refetchGoals, isTransactionsError, isGoalsError, transactionsError, goalsError]);
  
  // Auth durumu yükleniyorsa göster
  if (isAuthLoading) {
    console.log("Auth is loading, showing full page loader.");
    return <FullPageLoader message="Authenticating..." />;
  }

  // Auth yüklendi ama kullanıcı yoksa veya doğrulanmamışsa login sayfasına yönlendir
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      console.log("User not authenticated after auth check, redirecting to signin.");
      toast.info("Please sign in to continue.");
      navigate("/signin");
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Kullanıcı var ama veri hala yükleniyorsa ve zaman aşımı olmadıysa
  if (isAuthenticated && user && (isLoadingTransactions || isLoadingGoals) && !dataLoadTimeoutOccurred) {
    console.log("User authenticated, data queries loading...");
    return <FullPageLoader message="Loading your financial overview..." />;
  }
  
  // Hata durumu veya zaman aşımı
  if (isAuthenticated && user && (isTransactionsError || isGoalsError || dataLoadTimeoutOccurred)) {
    console.warn("Data loading error or timeout. Error states - Transactions:", isTransactionsError, "Goals:", isGoalsError, "Timeout:", dataLoadTimeoutOccurred);
    console.error("Transactions error details:", transactionsError);
    console.error("Goals error details:", goalsError);
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3 text-red-700">
              {dataLoadTimeoutOccurred ? "Data Loading Timeout" : "Error Loading Dashboard"}
            </h1>
            <p className="mb-6 text-gray-700">
              {dataLoadTimeoutOccurred 
                ? "It's taking much longer than expected to load your dashboard data." 
                : "We encountered a problem while loading your dashboard data. Please check your internet connection."}
            </p>
            <Button onClick={handleRetry} variant="destructive" size="lg">
              <RefreshCcw className="h-5 w-5 mr-2" /> Try Again
            </Button>
            {transactionsError && <p className="mt-4 text-xs text-red-600">Details (Transactions): {transactionsError.message}</p>}
            {goalsError && <p className="mt-1 text-xs text-red-600">Details (Goals): {goalsError.message}</p>}
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Kullanıcı yoksa (ama Auth yüklemesi bitti), bu durumun normalde useEffect tarafından yakalanıp /signin'e yönlendirilmesi gerekir.
  // Ancak bir güvenlik ağı olarak burada da kontrol edilebilir.
  if (!isAuthLoading && !isAuthenticated) {
     console.log("Render: Not authenticated and auth loading finished. Should be redirecting via useEffect.");
    // Yönlendirme useEffect'i bu durumu ele alacağından, burada null veya minimal bir şey döndürülebilir.
    // Ya da bir yükleyici gösterilebilir ki kullanıcı anlık bir boş sayfa görmesin.
    return <FullPageLoader message="Redirecting..." />;
  }

  // Veriler yüklendi ve hata yoksa Dashboard'ı göster
  if (!isAuthLoading && isAuthenticated && user && !isLoadingTransactions && !isLoadingGoals) {
    console.log("All data loaded, rendering main dashboard content.");
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
            Hello, {user?.firstName || "Welcome"}
        </h1>
          <p className="text-gray-600">Financial overview of your accounts</p>
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
              {formatCurrency(totalIncome || 5400)}
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
              {formatCurrency(totalExpenses || 3200)}
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
              {formatCurrency(netBalance || 2200)}
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
                {isLoadingTransactions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-gray-100 animate-pulse rounded-md"
                      ></div>
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
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
              {isLoadingGoals ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="space-y-2"
                    >
                      <div className="h-4 bg-gray-100 animate-pulse rounded-md w-3/4"></div>
                      <div className="h-2 bg-gray-100 animate-pulse rounded-md"></div>
                      <div className="h-2 bg-gray-100 animate-pulse rounded-md w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : goals && goals.length > 0 ? (
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
                          Limit is %85 full.
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
    </DashboardLayout>
  );
  }

  return null; // This should never be reached
};

export default Dashboard;
