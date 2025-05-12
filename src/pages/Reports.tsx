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
  { value: "previousYear", label: "Previous Year" }, // Add Previous Year option
];

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#fb8c00', '#d0ed57', '#a4de6c']; // Added more colors

const Reports = () => {
  const { user } = useAuth();
  const [duration, setDuration] = useState("30days");

  // Get date range based on selected duration
  const getDateRange = () => {
    let endDate = new Date(); // Changed const to let
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
      case "previousYear": // Handle Previous Year
        startDate = new Date(endDate.getFullYear() - 1, 0, 1); // Start of previous year
        endDate = new Date(endDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999); // End of previous year
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
    // Using Turkish Lira format as per user preference
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Prepare data for income vs expense chart (Line Chart)
  const prepareIncomeExpenseLineData = () => {
    if (!transactions || transactions.length === 0) return [];

    // Group by date and calculate daily totals
    const dailyData: Record<string, { date: string; income: number; expense: number }> = {};

    transactions.forEach((transaction) => {
      // Format date as YYYY-MM-DD for consistent sorting and display
      const dateKey = new Date(transaction.date).toISOString().split('T')[0];

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }

      if (transaction.type === "income") {
        dailyData[dateKey].income += transaction.amount;
      } else {
        dailyData[dateKey].expense += transaction.amount;
      }
    });

    // Sort by date before returning
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Prepare data for category breakdown chart (Pie/Bar for selected period total)
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

  // Prepare data for monthly category breakdown (Stacked Bar for Previous Year)
  const prepareMonthlyCategoryData = () => {
    // Only run this calculation if the duration is 'previousYear'
    if (!transactions || transactions.length === 0 || duration !== "previousYear") return null; // Return null if not applicable

    const monthlyData: Record<string, Record<string, number>> = {}; // { "YYYY-MM": { "Category": amount } }
    const categories = new Set<string>(); // Keep track of all categories encountered

    const expenses = transactions.filter(t => t.type === "expense");

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format: YYYY-MM
      const category = expense.category || "Uncategorized";
      categories.add(category);

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      if (!monthlyData[monthKey][category]) {
        monthlyData[monthKey][category] = 0;
      }
      monthlyData[monthKey][category] += expense.amount;
    });

    // Convert to array format suitable for charts/tables, ensuring all categories exist for each month
    const result = Object.entries(monthlyData)
      .map(([month, categoryAmounts]) => {
        const monthEntry: Record<string, string | number> = { month };
        categories.forEach(cat => {
          monthEntry[cat] = categoryAmounts[cat] || 0; // Add amount or 0 if category not present for the month
        });
        return monthEntry;
      })
      .sort((a, b) => (a.month as string).localeCompare(b.month as string)); // Sort by month

    return { data: result, categories: Array.from(categories) };
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
    // Ensure at least 1 day difference to avoid division by zero
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const avgDailySpending = totalExpenses / daysDiff;

    return { totalIncome, totalExpenses, netBalance, avgDailySpending };
  };

  const incomeExpenseLineData = prepareIncomeExpenseLineData();
  const categoryData = prepareCategoryData();
  const monthlyCategoryResult = prepareMonthlyCategoryData(); // Get monthly data object or null
  const monthlyCategoryData = monthlyCategoryResult ? monthlyCategoryResult.data : [];
  const allCategories = monthlyCategoryResult ? monthlyCategoryResult.categories : [];
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

  // Determine the default active tab based on duration
  const defaultTab = duration === "previousYear" ? "monthly_category" : "income_expense";

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Total Income</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5 pb-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5 pb-4">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Net Balance</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5 pb-4">
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-sm font-medium text-gray-500">Avg. Daily Spending</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-5 pb-4">
            <div className="text-2xl font-bold">{formatCurrency(avgDailySpending)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report views */}
      <Tabs defaultValue={defaultTab} value={defaultTab} className="space-y-6">
        <TabsList>
          {/* Standard Tabs - Disabled when Previous Year is selected */}
          <TabsTrigger value="income_expense" disabled={duration === "previousYear"}>Income vs. Expenses</TabsTrigger>
          <TabsTrigger value="categories" disabled={duration === "previousYear"}>Spending by Category</TabsTrigger>
          {/* Previous Year Tab - Only shown when Previous Year is selected */}
          {duration === "previousYear" && (
            <TabsTrigger value="monthly_category">Previous Year Monthly Breakdown</TabsTrigger>
          )}
        </TabsList>

        {/* Content for Standard Tabs (Income/Expense and Category Totals) */}
        {duration !== "previousYear" && (
          <>
            <TabsContent value="income_expense" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income vs. Expenses Over Time</CardTitle>
                  <CardDescription>
                    Compare your income and expenses for the selected period.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {incomeExpenseLineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={incomeExpenseLineData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Expenses" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No transaction data for this period.</p>
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
                    Breakdown of total expenses by category for the selected period.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  {categoryData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                      {/* Pie Chart */}
                      <div className="h-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                             <Pie
                               data={categoryData}
                               cx="50%"
                               cy="50%"
                               labelLine={false}
                               outerRadius="80%"
                               fill="#8884d8"
                               dataKey="value"
                               label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                             >
                               {categoryData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                             </Pie>
                             <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                             <Legend />
                           </PieChart>
                         </ResponsiveContainer>
                      </div>
                      {/* Vertical Bar Chart */}
                      <div className="h-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart
                             data={categoryData}
                             layout="vertical"
                             margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                           >
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                             <YAxis type="category" dataKey="name" width={100} interval={0} />
                             <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                             <Bar dataKey="value" name="Total Spent" fill="#8884d8">
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
                      <p className="text-gray-500">No expense data with categories for this period.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {/* Content for Previous Year Monthly Breakdown */}
        {duration === "previousYear" && (
          <TabsContent value="monthly_category">
            <Card>
              <CardHeader>
                <CardTitle>Previous Year: Monthly Spending by Category</CardTitle>
                <CardDescription>
                  Breakdown of expenses per category for each month of the previous year.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                {monthlyCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyCategoryData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value, name) => `${formatCurrency(Number(value))} (${name})`} />
                      <Legend />
                      {/* Dynamically create a Bar for each category */}
                      {allCategories.map((category, index) => (
                        <Bar
                          key={category}
                          dataKey={category}
                          stackId="a" // Use stackId to stack bars
                          fill={COLORS[index % COLORS.length]}
                          name={category}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">No data available for the previous year.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* End of Tab Contents */}

      </Tabs> {/* Correct closing tag for Tabs */}
    </DashboardLayout>
  );
};

export default Reports; // Ensure only one default export
