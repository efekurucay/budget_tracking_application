
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Duration options for reports
const durations = [
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 90 Days" },
  { value: "year", label: "This Year" },
];

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Reports = () => {
  const { user } = useAuth();
  const [duration, setDuration] = useState("30days");
  
  // Get date range based on selected duration
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (duration) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "year":
        startDate = new Date(endDate.getFullYear(), 0, 1); // Start of current year
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  // Fetch transactions for selected time period
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", duration],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });
      
      if (error) {
        toast.error("Failed to load transactions");
        throw error;
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare data for income vs expense chart
  const prepareIncomeExpenseData = () => {
    if (!transactions || transactions.length === 0) return [];
    
    // Group by date and calculate daily totals
    const dailyData: Record<string, { date: string; income: number; expense: number }> = {};
    
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date).toLocaleDateString();
      
      if (!dailyData[date]) {
        dailyData[date] = { date, income: 0, expense: 0 };
      }
      
      if (transaction.type === "income") {
        dailyData[date].income += transaction.amount;
      } else {
        dailyData[date].expense += transaction.amount;
      }
    });
    
    return Object.values(dailyData);
  };

  // Prepare data for category breakdown chart
  const prepareCategoryData = () => {
    if (!transactions || transactions.length === 0) return [];
    
    // Only use expense transactions
    const expenses = transactions.filter(t => t.type === "expense");
    
    // Group by category
    const categoryData: Record<string, { name: string; value: number }> = {};
    
    expenses.forEach((expense) => {
      const category = expense.category || "Uncategorized";
      
      if (!categoryData[category]) {
        categoryData[category] = { name: category, value: 0 };
      }
      
      categoryData[category].value += expense.amount;
    });
    
    return Object.values(categoryData);
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!transactions || transactions.length === 0) {
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0, avgDailySpending: 0 };
    }
    
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netBalance = totalIncome - totalExpenses;
    
    // Calculate date range in days for average
    const { startDate, endDate } = getDateRange();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const avgDailySpending = totalExpenses / daysDiff;
    
    return { totalIncome, totalExpenses, netBalance, avgDailySpending };
  };
  
  const incomeExpenseData = prepareIncomeExpenseData();
  const categoryData = prepareCategoryData();
  const { totalIncome, totalExpenses, netBalance, avgDailySpending } = calculateSummary();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-gray-600">Analyze your financial performance</p>
        </div>
        
        <div className="w-[200px]">
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              {durations.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Total Income</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5">
            <div className="text-2xl font-bold text-g15-success">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5">
            <div className="text-2xl font-bold text-g15-error">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Net Balance</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5">
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-g15-success" : "text-g15-error"}`}>
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Avg. Daily Spending</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5">
            <div className="text-2xl font-bold">{formatCurrency(avgDailySpending)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="income_expense" className="space-y-6">
        <TabsList>
          <TabsTrigger value="income_expense">Income vs. Expenses</TabsTrigger>
          <TabsTrigger value="categories">Spending by Category</TabsTrigger>
        </TabsList>
        
        <TabsContent value="income_expense" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income vs. Expenses Over Time</CardTitle>
              <CardDescription>
                Compare your income and expenses over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {incomeExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={incomeExpenseData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)} 
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#4ade80" name="Income" strokeWidth={2} />
                    <Line type="monotone" dataKey="expense" stroke="#f87171" name="Expenses" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">
                    Not enough data to display this chart. Add more transactions to see insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
              <CardDescription>
                Monthly income, expenses and savings
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {incomeExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incomeExpenseData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#4ade80" />
                    <Bar dataKey="expense" name="Expenses" fill="#f87171" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">
                    Not enough data to display this chart. Add more transactions to see insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                See which categories are using most of your budget
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              {categoryData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  <div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="value" fill="#8884d8">
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">
                    No category data available. Add transactions with categories to see insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Reports;
