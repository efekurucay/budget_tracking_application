import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

// Type definitions for transactions and financial data
interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  category: string;
  created_at: string;
}

interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
}

interface ExpenseDataPoint {
  name: string; // Month
  amount: number; // Total expenses
}

interface CategoryDataPoint {
  name: string; // Category name
  value: number; // Total amount
  color?: string;
}

// Color constants for charts
const COLORS = [
  "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", 
  "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#FF595E"
];

// Category colors mapping
const CATEGORY_COLORS: Record<string, string> = {
  "Food": "#FF6384",
  "Housing": "#36A2EB",
  "Transportation": "#FFCE56",
  "Entertainment": "#4BC0C0",
  "Healthcare": "#9966FF",
  "Shopping": "#FF9F40",
  "Education": "#8AC926",
  "Bills": "#1982C4",
  "Other": "#FF595E",
};

// Loading component
const FullPageLoader = ({ message }: { message: string }) => {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-gray-500">{message}</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  const getProgressValue = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Transactions query
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
        return [];
      }
      
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(5);

        if (error) throw new Error(error.message);
        return data || [];
      } catch (err: any) {
        throw err;
      }
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 1,
  });

  // Goals query
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
        return [];
      }
      
      try {
        const { data, error } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("target_amount", { ascending: false })
          .limit(3);

        if (error) throw new Error(error.message);
        return data || [];
      } catch (err: any) {
        throw err;
      }
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 1,
  });

  // All transactions query for charts
  const { 
    data: allTransactions = [], 
    isLoading: isLoadingAllTransactions,
    error: allTransactionsError,
    isError: isAllTransactionsError,
    refetch: refetchAllTransactions
  } = useQuery({
    queryKey: ["all-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", sixMonthsAgoStr)
        .order("date", { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated,
    retry: 1,
  });
  
  // Loading and error states
  const isDataLoading = isLoadingTransactions || isLoadingGoals || isLoadingAllTransactions;
  const isDataError = isTransactionsError || isGoalsError || isAllTransactionsError;
  const dataError = transactionsError || goalsError || allTransactionsError;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/signin", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);
  
  // Refresh handler
  const handleRetry = useCallback(() => {
    if (!isAuthLoading && isAuthenticated) {
      toast.info(t("common.refreshing", "Veriler yenileniyor..."));
      refetchTransactions();
      refetchGoals();
      refetchAllTransactions();
    } else {
      toast.error(t("common.authNotReady", "Yenilenemedi, kimlik doğrulama hazır değil"));
    }
  }, [isAuthLoading, isAuthenticated, refetchTransactions, refetchGoals, refetchAllTransactions, t]);

  // Data processing functions
  const prepareExpenseData = useCallback((data: any[]): ExpenseDataPoint[] => {
    if (!data?.length) return [];
    
    const months: Record<string, number> = {};
    const monthNames = [
      "Oca", "Şub", "Mar", "Nis", 
      "May", "Haz", "Tem", "Ağu", 
      "Eyl", "Eki", "Kas", "Ara"
    ];
    
    // Get expenses for last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    
    // Initialize all 6 months with 0
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(sixMonthsAgo.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = 0;
    }
    
    // Sum expenses by month
    data.forEach(tx => {
      if (tx.type !== 'expense') return;
      
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      
      // Only include last 6 months
      if (months[key] !== undefined) {
        months[key] += tx.amount;
      }
    });
    
    // Convert to array format needed by chart
    return Object.keys(months).map(key => {
      const [year, month] = key.split('-').map(Number);
      return {
        name: `${monthNames[month]} ${year}`,
        amount: months[key]
      };
    });
  }, []);

  const prepareCategoryData = useCallback((data: any[]): CategoryDataPoint[] => {
    if (!data?.length) return [];
    
    const categories: Record<string, number> = {};
    
    // Get expenses only from last month
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);
    lastMonth.setDate(1);
    
    // Sum expenses by category
    data.forEach(tx => {
      if (tx.type !== 'expense') return;
      
      const txDate = new Date(tx.date);
      if (txDate < lastMonth) return;
      
      const category = tx.category || "Kategorisiz";
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += tx.amount;
    });
    
    // Convert to array format needed by chart
    return Object.keys(categories).map((category, index) => ({
      name: category,
      value: categories[category],
      color: CATEGORY_COLORS[category] || COLORS[index % COLORS.length]
    }));
  }, []);

  const calculateSummary = useCallback((data: any[]) => {
    let totalIncome = 0;
    let totalExpenses = 0;
    
    // Consider transactions from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    data.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate < thirtyDaysAgo) return;
      
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpenses += tx.amount;
      }
    });
    
    const netBalance = totalIncome - totalExpenses;
    
    return { totalIncome, totalExpenses, netBalance };
  }, []);

  // Memoized data
  const expenseData = useMemo(() => 
    prepareExpenseData(allTransactions), [prepareExpenseData, allTransactions]);
  
  const categoryData = useMemo(() => 
    prepareCategoryData(allTransactions), [prepareCategoryData, allTransactions]);
  
  const financialSummary = useMemo(() => 
    calculateSummary(allTransactions), [calculateSummary, allTransactions]);
  
  const { totalIncome, totalExpenses, netBalance } = financialSummary;

  // Loading and error states
  if (isAuthLoading) {
    return <FullPageLoader message={t("auth.checking", "Kimlik doğrulanıyor...")} />;
  }

  if (!isAuthenticated || !user) {
    return <FullPageLoader message={t("auth.pleaseSignIn", "Devam etmek için lütfen giriş yapın")} />;
  }

  if (isDataLoading) {
    return <FullPageLoader message={t("dashboard.loading", "Finansal özet yükleniyor...")} />;
  }

  if (isDataError) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3 text-red-700">{t("common.error", "Veri Yükleme Hatası")}</h1>
            <p className="text-gray-700 mb-6">
              {dataError instanceof Error 
                ? dataError.message 
                : t("common.errorUnknown", "Bilinmeyen bir hata oluştu.")}
            </p>
            <Button onClick={handleRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" /> 
              {t("common.retry", "Tekrar Dene")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Normal render
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {t("dashboard.hello", "Merhaba")}, {user?.firstName || t("common.welcome", "Hoş Geldiniz")}
            </h1>
            <p className="text-gray-600">{t("dashboard.financialOverview", "Hesaplarınızın finansal özeti")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={isDataLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isDataLoading ? 'animate-spin' : ''}`} /> 
            {t("dashboard.refreshData", "Verileri Yenile")}
          </Button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.totalIncome", "Toplam Gelir")}</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-g15-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-g15-success">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t("dashboard.last30Days", "Son 30 gün")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.totalExpenses", "Toplam Gider")}</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-g15-error" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-g15-error">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t("dashboard.last30Days", "Son 30 gün")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.netBalance", "Net Bakiye")}</CardTitle>
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
              <p className="text-xs text-gray-500 mt-1">{t("dashboard.available", "Kullanılabilir")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Expenses Chart */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.expensesTrend", "Gider Trendi")}</CardTitle>
                <CardDescription>{t("dashboard.last6MonthsExpense", "Son 6 ayın gider dağılımı")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {expenseData.length > 0 ? (
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
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <p className="text-gray-500">{t("dashboard.noData", "Gider verisi bulunamadı")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t("dashboard.recentTransactions", "Son İşlemler")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/transactions")}
                    >
                      {t("common.viewAll", "Tümünü Gör")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions && transactions.length > 0 ? (
                    <div className="space-y-4">
                      {transactions.map((transaction) => (
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
                                {transaction.description || t("transactions.transaction", "İşlem")}
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
                        {t("transactions.noTransactions", "İşlem Bulunamadı")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("transactions.addFirstTransaction", "İşlem sayfasını ziyaret ederek ilk işleminizi ekleyin.")}
                      </p>
                      <Button
                        className="mt-4"
                        size="sm"
                        onClick={() => navigate("/transactions")}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t("transactions.addTransaction", "İşlem Ekle")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.categoriesDistribution", "Gider Kategorileri")}</CardTitle>
                  <CardDescription>{t("dashboard.expensesByCategory", "Kategorilere göre giderler")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-52">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={false}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center">
                        <p className="text-gray-500">{t("dashboard.noData", "Kategori verisi bulunamadı")}</p>
                      </div>
                    )}
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
                  <span>{t("goals.pageTitle", "Finansal Hedefler")}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/goals")}
                  >
                    {t("common.viewAll", "Tümünü Gör")}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goals && goals.length > 0 ? (
                  <div className="space-y-6">
                    {goals.map((goal) => (
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
                          {getProgressValue(goal.current_amount || 0, goal.target_amount)}% {t("goals.completed", "tamamlandı")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Target className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium">
                      {t("goals.noGoals", "Hedef Bulunamadı")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("goals.createFirstGoal", "İlk finansal hedefinizi oluşturun.")}
                    </p>
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={() => navigate("/goals")}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t("goals.addGoal", "Hedef Ekle")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.quickActions", "Hızlı İşlemler")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/transactions")}
                  >
                    <Wallet className="h-5 w-5" />
                    <span className="text-xs">{t("transactions.addTransaction", "İşlem Ekle")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/goals")}
                  >
                    <Target className="h-5 w-5" />
                    <span className="text-xs">{t("goals.addGoal", "Hedef Ekle")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/reports")}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-xs">{t("reports.viewReport", "Rapor Görüntüle")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center p-3 justify-start space-y-2"
                    onClick={() => navigate("/groups")}
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">{t("group.pageTitle", "Gruplar")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("upgrade.proFeatures", "Pro Özellikler")}</span>
                  {!user?.isPro && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-g15-accent/10 text-g15-accent border-g15-accent/20"
                      onClick={() => navigate("/upgrade")}
                    >
                      {t("upgrade.upgrade", "Yükselt")}
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
                      <h4 className="text-sm font-medium">{t("upgrade.aiAdvisor", "AI Finans Danışmanı")}</h4>
                      <p className="text-xs text-gray-500">
                        {t("upgrade.aiAdvisorDesc", "Kişiselleştirilmiş finansal tavsiyeler alın ve harcama alışkanlıklarınızı optimize edin.")}
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
                        <h4 className="text-sm font-medium">{t("notifications.budgetReminder", "Bütçe Hatırlatıcı")}</h4>
                        <p className="text-xs text-gray-500">
                          {t("notifications.budgetReminderDesc", "\"Yiyecek\" kategorisinde bütçe limitinizin %85'ine ulaştınız.")}
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
                        <h4 className="text-sm font-medium">{t("notifications.unexpectedTransaction", "Beklenmeyen İşlem")}</h4>
                        <p className="text-xs text-gray-500">
                          {t("notifications.unexpectedTransactionDesc", "Son 24 saatte normal harcama tutarınızı aşan bir işlem tespit edildi.")}
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
