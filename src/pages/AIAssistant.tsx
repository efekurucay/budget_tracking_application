import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { 
  Loader2, 
  Send, 
  Bot, 
  RefreshCcw, 
  AlertCircle, 
  SparkleIcon, 
  ExternalLink,
  ChevronDown,
  BarChart,
  Wallet,
  PiggyBank,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Message schema 
const messageSchema = z.object({
  content: z.string().min(1, "Please enter a message"),
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  visualData?: {
    type: "progress" | "chart" | "link" | "table" | "suggestion";
    data: any;
  }[];
};

type ConversationHistory = {
  id: string;
  title: string;
  lastMessageDate: Date;
  messages: Message[];
};

const AIAssistant = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationHistory[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  
  const [suggestedPrompts] = useState([
    t("aiAssistant.suggestions.items.0", "How can I improve my saving habits?"),
    t("aiAssistant.suggestions.items.1", "What's the best way to pay off debt?"),
    t("aiAssistant.suggestions.items.2", "How should I start investing?"),
    t("aiAssistant.suggestions.items.3", "Analyze my spending patterns"),
    t("aiAssistant.suggestions.items.4", "Create a budget plan for me"),
    t("aiAssistant.suggestions.items.5", "How can I save for a house down payment?")
  ]);

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  // Fetch user profile info to check if user is Pro
  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Load conversation history
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user?.id) return;
      
      try {
        // In a real app, you would store conversations in Supabase
        // For now, we'll use localStorage to simulate this
        const savedConversations = localStorage.getItem(`g15_conversations_${user.id}`);
        if (savedConversations) {
          const parsed = JSON.parse(savedConversations);
          setConversations(parsed);
          
          // If we have conversations, load the latest one
          if (parsed.length > 0) {
            const latestConversation = parsed.sort((a: ConversationHistory, b: ConversationHistory) => 
              new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
            )[0];
            
            setCurrentConversationId(latestConversation.id);
            setMessages(latestConversation.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })));
          } else {
            // If no conversations, create a welcome message
            addWelcomeMessage();
          }
        } else {
          // If no conversations, create a welcome message
          addWelcomeMessage();
        }
      } catch (error) {
        console.error("Error loading conversation history:", error);
        addWelcomeMessage();
      }
    };
    
    loadConversationHistory();
  }, [user?.id]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if user is Pro
  useEffect(() => {
    if (profileData) {
      setIsPro(profileData.is_pro);
      setIsLoading(false);
    }
  }, [profileData]);

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: "welcome-message",
      role: "assistant" as const,
      content: t("aiAssistant.welcomeMessage", "Hello! I'm your G15 AI financial assistant. How can I help you with your finances today?"),
      timestamp: new Date(),
      visualData: [
        {
          type: "suggestion" as const,
          data: [
            t("aiAssistant.suggestions.general.0", "How do I create a budget?"),
            t("aiAssistant.suggestions.general.1", "What are good saving strategies?"),
            t("aiAssistant.suggestions.general.2", "How can I reduce my expenses?")
          ]
        }
      ]
    };
    
    setMessages([welcomeMessage]);
    
    // Create a new conversation
    const newConversation = {
      id: crypto.randomUUID(),
      title: t("aiAssistant.newConversation", "New Conversation"),
      lastMessageDate: new Date(),
      messages: [welcomeMessage]
    };
    
    setCurrentConversationId(newConversation.id);
    setConversations([newConversation]);
    
    // Save to localStorage
    if (user?.id) {
      localStorage.setItem(`g15_conversations_${user.id}`, JSON.stringify([newConversation]));
    }
  };

  // Fetch user's financial data to provide to the AI
  const fetchUserFinancialContext = async () => {
    if (!user?.id) return null;
    
    try {
      // Get user's goals
      const { data: goals } = await supabase
        .from("goals")
        .select("name, target_amount, current_amount")
        .eq("user_id", user.id)
        .limit(5);
      
      // Get user's recent transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type, category, date, description")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(15);
      
      // Get user's budget categories
      const { data: categories } = await supabase
        .from("budget_categories")
        .select("name, budget_amount")
        .eq("user_id", user.id);
      
      return {
        goals: goals || [],
        transactions: transactions || [],
        categories: categories || []
      };
    } catch (error) {
      console.error("Error fetching financial data:", error);
      return null;
    }
  };

  const saveConversation = (updatedMessages: Message[]) => {
    if (!user?.id || !currentConversationId) return;
    
    // Find the current conversation and update it
    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          lastMessageDate: new Date(),
          messages: updatedMessages,
          // Update title based on first few messages if it's "New Conversation"
          title: conv.title === "New Conversation" && updatedMessages.length >= 3 ? 
            updatedMessages[1].content.substring(0, 30) + "..." : 
            conv.title
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    
    // Save to localStorage
    localStorage.setItem(`g15_conversations_${user.id}`, JSON.stringify(updatedConversations));
  };

  const enhanceAIResponse = (text: string) => {
    // Parse the response for any special formatting or data
    let visualData: any[] = [];
    
    // Pattern for progress bars [PROGRESS:name:current:target]
    const progressRegex = /\[PROGRESS:(.*?):(.*?):(.*?)\]/g;
    let match;
    const enhancedText = text.replace(progressRegex, (match, name, current, target) => {
      const currentValue = parseFloat(current);
      const targetValue = parseFloat(target);
      const percentage = Math.min(100, Math.round((currentValue / targetValue) * 100));
      
      visualData.push({
        type: "progress",
        data: { name, current: currentValue, target: targetValue, percentage }
      });
      
      return `${name}: $${current} of $${target} (${percentage}% complete)`;
    });
    
    // Pattern for suggested actions [ACTION:text:url]
    const actionRegex = /\[ACTION:(.*?):(.*?)\]/g;
    const enhancedTextWithActions = enhancedText.replace(actionRegex, (match, text, url) => {
      visualData.push({
        type: "link",
        data: { text, url }
      });
      
      return text;
    });
    
    return {
      enhancedText: enhancedTextWithActions,
      visualData: visualData.length > 0 ? visualData : undefined
    };
  };

  const handleSendMessage = async (data: z.infer<typeof messageSchema>) => {
    // Check if user is Pro
    if (isPro === false) {
      toast.error(t("aiAssistant.proFeatureMessage", "AI Assistant is a Pro feature. Please upgrade to access this feature."), {
        duration: 5000,
      });
      return;
    }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: data.content,
      timestamp: new Date(),
    };
    
    // Add thinking message
    const thinkingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: t("aiAssistant.thinking", "Thinking..."),
      timestamp: new Date(),
      isLoading: true
    };
    
    const updatedMessages = [...messages, userMessage, thinkingMessage];
    setMessages(updatedMessages);
    form.reset();
    
    setIsProcessing(true);
    
    try {
      // Get user's financial context
      const financialContext = await fetchUserFinancialContext();
      
      // Call the edge function
      const { data: responseData, error } = await supabase.functions.invoke("ai-finance-assistant", {
        body: { 
          message: userMessage.content,
          userId: user?.id,
          financialContext
        },
      });
      
      if (error) throw error;
      
      // Process the AI response for enhanced formatting
      const { enhancedText, visualData } = enhanceAIResponse(responseData.generatedText || "");
      
      // Remove the thinking message and add the real response
      const finalMessages = updatedMessages.filter(m => m.id !== thinkingMessage.id);
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: enhancedText || responseData.generatedText || t("aiAssistant.errorProcessing", "I'm sorry, I couldn't process your request. Please try again."),
        timestamp: new Date(),
        visualData
      };
      
      const finalUpdatedMessages = [...finalMessages, assistantMessage];
      setMessages(finalUpdatedMessages);
      
      // Save the conversation
      saveConversation(finalUpdatedMessages);
      
    } catch (error) {
      console.error("Error calling AI assistant:", error);
      toast.error(t("aiAssistant.errorResponse", "Failed to get a response. Please try again."));
      
      // Remove the thinking message and add an error message
      const finalMessages = updatedMessages.filter(m => m.id !== thinkingMessage.id);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t("aiAssistant.errorMessage", "I'm sorry, I encountered an error while processing your request. Please try again later."),
        timestamp: new Date(),
      };
      
      const finalUpdatedMessages = [...finalMessages, errorMessage];
      setMessages(finalUpdatedMessages);
      
      // Save the conversation even with error
      saveConversation(finalUpdatedMessages);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    form.setValue("content", suggestion);
    form.handleSubmit((data) => handleSendMessage(data))();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startNewConversation = () => {
    // Create a new conversation ID
    const newConversationId = crypto.randomUUID();
    
    const welcomeMessage = {
      id: "welcome-message-new",
      role: "assistant" as const,
      content: t("aiAssistant.welcomeMessage", "Hello! I'm your G15 AI financial assistant. How can I help you with your finances today?"),
      timestamp: new Date(),
      visualData: [
        {
          type: "suggestion" as const,
          data: [
            t("aiAssistant.suggestions.general.0", "How do I create a budget?"),
            t("aiAssistant.suggestions.general.1", "What are good saving strategies?"),
            t("aiAssistant.suggestions.general.2", "How can I reduce my expenses?")
          ]
        }
      ]
    };
    
    // Update state
    setMessages([welcomeMessage]);
    setCurrentConversationId(newConversationId);
    
    // Create a new conversation object
    const newConversation = {
      id: newConversationId,
      title: t("aiAssistant.newConversation", "New Conversation"),
      lastMessageDate: new Date(),
      messages: [welcomeMessage]
    };
    
    // Add to conversations list
    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    
    // Save to localStorage
    if (user?.id) {
      localStorage.setItem(`g15_conversations_${user.id}`, JSON.stringify(updatedConversations));
    }
  };
  
  const loadConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
      setCurrentConversationId(conversationId);
      setShowConversationList(false);
    }
  };

  // Render visual components based on type
  const renderVisualData = (visual: any) => {
    switch (visual.type) {
      case "progress":
        return (
          <div className="my-2 space-y-1" key={`progress-${visual.data.name}`}>
            <div className="flex justify-between text-sm">
              <span>{visual.data.name}</span>
              <span>${visual.data.current} of ${visual.data.target}</span>
            </div>
            <Progress value={visual.data.percentage} className="h-2" />
            <p className="text-xs text-gray-500">{visual.data.percentage}% complete</p>
          </div>
        );
      
      case "link":
        return (
          <a
            href={visual.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:underline mt-2"
            key={`link-${visual.data.url}`}
          >
            <span>{visual.data.text}</span>
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        );
      
      case "suggestion":
        return (
          <div className="grid grid-cols-1 gap-2 mt-2" key="suggestions">
            {visual.data.map((suggestion: string, i: number) => (
              <Button
                key={`suggestion-${i}`}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2"
                onClick={() => handleUseSuggestion(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        );
        
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">{t("common.loading", "Loading...")}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isPro === false) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-4xl py-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <SparkleIcon className="h-6 w-6 mr-2 text-primary" />
                {t("aiAssistant.proFeatureTitle", "AI Financial Assistant - Pro Feature")}
              </CardTitle>
              <CardDescription>
                {t("aiAssistant.proFeatureDesc", "Unlock personalized financial advice with our AI assistant")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-6">
                <h3 className="text-xl font-semibold mb-2">{t("upgrade.upgradeToPro", "Upgrade to Pro to access:")}</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t("aiAssistant.benefits.0", "Personal financial advisor powered by AI")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t("aiAssistant.benefits.1", "Personalized budget recommendations")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t("aiAssistant.benefits.2", "Financial goal planning assistance")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{t("aiAssistant.benefits.3", "Investment strategy advice")}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => window.location.href = '/upgrade'}>
                {t("upgrade.upgradeNow", "Upgrade to Pro")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t("aiAssistant.pageTitle", "AI Financial Assistant")}</h1>
              <p className="text-gray-600">{t("aiAssistant.subtitle", "Get personalized financial advice and guidance")}</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConversationList(!showConversationList)}
                className="flex items-center"
              >
                {t("aiAssistant.history", "History")}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={startNewConversation}
                disabled={isProcessing}
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> {t("aiAssistant.newConversation", "New Conversation")}
              </Button>
            </div>
          </div>
        </div>
        
        {showConversationList && conversations.length > 1 && (
          <Card className="mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">{t("aiAssistant.conversationHistory", "Conversation History")}</CardTitle>
            </CardHeader>
            <CardContent className="py-0">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {conversations.map(conv => (
                  <Button
                    key={conv.id}
                    variant={conv.id === currentConversationId ? "secondary" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => loadConversation(conv.id)}
                  >
                    <span className="truncate">{conv.title}</span>
                    <span className="ml-auto text-xs text-gray-500">
                      {new Date(conv.lastMessageDate).toLocaleDateString()}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto p-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className={message.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                      {message.role === "assistant" ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        <AvatarFallback>
                          {user?.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className={message.role === "user" ? "text-right" : ""}>
                      <div
                        className={`rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.isLoading
                            ? "bg-muted/80"
                            : "bg-muted"
                        }`}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">{t("aiAssistant.thinking", "Thinking...")}</span>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            
                            {/* Render any visual components */}
                            {message.visualData && message.visualData.map((visual, i) => (
                              <div key={`visual-${i}`} className="mt-2">
                                {renderVisualData(visual)}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          <CardFooter className="border-t p-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSendMessage)}
                className="flex w-full gap-2"
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder={t("aiAssistant.askSomething", "Type your message...")}
                          {...field}
                          disabled={isProcessing}
                          className="focus-visible:ring-1"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isProcessing}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">{t("aiAssistant.send", "Send")}</span>
                </Button>
              </form>
            </Form>
          </CardFooter>
        </Card>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">{t("aiAssistant.suggestions.title", "Suggested Questions")}</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {suggestedPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                className="text-sm h-auto py-2 justify-start"
                onClick={() => handleUseSuggestion(prompt)}
                disabled={isProcessing}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
        
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("aiAssistant.howToMakeTheMost", "How to make the most of your AI Assistant")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("aiAssistant.assistantDescription", "You can ask about your financial situation, get personalized advice, budget suggestions, and more. The AI knows about your goals, recent transactions, and budget categories to give you tailored guidance.")}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AIAssistant;
