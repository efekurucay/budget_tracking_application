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
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

// Message schema 
const messageSchema = z.object({
  content: z.string().min(1, "Please enter a message"),
});

type VisualDataType = "progress" | "chart" | "link" | "table" | "suggestion";

type VisualData = {
  type: VisualDataType;
  data: any;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  visualData?: VisualData[];
};

type ConversationHistory = {
  id: string;
  title: string;
  lastMessageDate: Date;
  messages: Message[];
};

// Helper function to safely convert database roles to message roles
const convertToMessageRole = (role: string): "user" | "assistant" => {
  return role === "user" ? "user" : "assistant";
};

// Helper function to safely convert database visual data to message visual data
const convertToVisualData = (visualData: any): VisualData[] | undefined => {
  if (!visualData) return undefined;
  
  try {
    return visualData.map((vd: any) => ({
      type: vd.type as VisualDataType,
      data: vd.data
    }));
  } catch (err) {
    console.error("Error converting visual data:", err);
    return undefined;
  }
};

const AIAssistant = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationHistory[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const isMobile = useIsMobile();
  
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

  // Set isPro state based on profile data
  useEffect(() => {
    if (profileData) {
      setIsPro(!!profileData.is_pro);
    }
  }, [profileData]);

  // Load conversation history
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Supabase'den kullanıcının konuşmalarını getir
        const { data: conversationsData, error: conversationsError } = await supabase
          .rpc('get_ai_conversations', { user_id_param: user.id });
        
        if (conversationsError) throw conversationsError;
        
        if (conversationsData && conversationsData.length > 0) {
          // Konuşmaları düzenle ve state'e ekle
          const formattedConversations = await Promise.all(conversationsData.map(async (conv) => {
            // Her konuşma için mesajları getir
            const { data: messagesData, error: messagesError } = await supabase
              .rpc('get_ai_messages', { 
                conversation_id_param: conv.id,
                user_id_param: user.id
              });
            
            if (messagesError) throw messagesError;
            
            // Mesajları doğru formata dönüştür
            const formattedMessages = messagesData.map(msg => ({
              id: msg.id,
              role: convertToMessageRole(msg.role),
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              visualData: convertToVisualData(msg.visual_data)
            }));
            
            return {
              id: conv.id,
              title: conv.title,
              lastMessageDate: new Date(conv.updated_at),
              messages: formattedMessages
            };
          }));
          
          setConversations(formattedConversations);
          
          // En son konuşmayı yükle
          const latestConversation = formattedConversations.sort((a, b) => 
            b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
          )[0];
          
          setCurrentConversationId(latestConversation.id);
          setMessages(latestConversation.messages);
        } else {
          // Konuşma yoksa, yeni bir hoş geldin mesajı oluştur
          addWelcomeMessage();
        }
      } catch (error) {
        console.error("Error loading conversation history:", error);
        toast.error(t("error.loading_conversations", "Konuşma geçmişi yüklenirken bir hata oluştu"));
        addWelcomeMessage();
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversationHistory();
  }, [user?.id]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const addWelcomeMessage = async () => {
    if (!user?.id) return;
    
    try {
      // Yeni bir konuşma oluştur
      const { data: conversationData, error: conversationError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: t("aiAssistant.newConversation", "Yeni Konuşma")
        })
        .select()
        .single();
      
      if (conversationError) throw conversationError;
      
      const conversationId = conversationData.id;
      
      // Hoş geldin mesajını oluştur
      const welcomeMessageContent = t("aiAssistant.welcomeMessage", "Merhaba! Ben G15 AI finansal asistanınızım. Bugün finanslarınızla ilgili size nasıl yardımcı olabilirim?");
      
      // Visual data için JSON
      const visualData: VisualData = {
        type: "suggestion",
        data: [
          t("aiAssistant.suggestions.general.0", "Bütçe nasıl oluşturulur?"),
          t("aiAssistant.suggestions.general.1", "İyi tasarruf stratejileri nelerdir?"),
          t("aiAssistant.suggestions.general.2", "Harcamalarımı nasıl azaltabilirim?")
        ]
      };
      
      // Hoş geldin mesajını veritabanına ekle
      const { data: messageData, error: messageError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: welcomeMessageContent,
          visual_data: [visualData]
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // State'i güncelle
      const welcomeMessage: Message = {
        id: messageData.id,
        role: "assistant",
        content: welcomeMessageContent,
        timestamp: new Date(messageData.timestamp),
        visualData: [visualData]
      };
      
      setMessages([welcomeMessage]);
      setCurrentConversationId(conversationId);
      
      // Konuşmalar listesini güncelle
      const newConversation: ConversationHistory = {
        id: conversationId,
        title: t("aiAssistant.newConversation", "Yeni Konuşma"),
        lastMessageDate: new Date(),
        messages: [welcomeMessage]
      };
      
      setConversations(prev => [newConversation, ...prev]);
      
    } catch (error) {
      console.error("Error creating welcome message:", error);
      toast.error(t("error.creating_conversation", "Yeni konuşma oluşturulurken bir hata oluştu"));
    }
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

  const handleSendMessage = async (data: z.infer<typeof messageSchema>) => {
    // Check if user is Pro
    if (!isPro) {
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

      // Yeni konuşma oluştur ve ID'yi al
      if (!currentConversationId) {
        await startNewConversation();
      }
      
      // Önce kullanıcı mesajını kaydet
      await supabase
        .from('ai_messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.timestamp.toISOString()
        });
      
      // Call the edge function
      const { data: responseData, error } = await supabase.functions.invoke("ai-finance-assistant", {
        body: { 
          message: userMessage.content,
          userId: user?.id,
          financialContext,
          conversationId: currentConversationId
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
      
      // Asistan mesajını kaydet
      await supabase
        .from('ai_messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp.toISOString(),
          visual_data: assistantMessage.visualData || null
        });
      
      // Konuşmanın son güncelleme zamanını güncelle
      await supabase
        .from('ai_conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          // Eğer konuşma başlığı "Yeni Konuşma" ise başlığı güncelle
          ...(conversations.find(c => c.id === currentConversationId)?.title === t("aiAssistant.newConversation", "Yeni Konuşma") ? {
            title: userMessage.content.substring(0, 30) + "..."
          } : {})
        })
        .eq('id', currentConversationId);
        
      // Conversations listesini güncelle
      const updatedConversations = conversations.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            lastMessageDate: new Date(),
            messages: finalUpdatedMessages,
            title: conv.title === t("aiAssistant.newConversation", "Yeni Konuşma") ? 
              userMessage.content.substring(0, 30) + "..." : 
              conv.title
          };
        }
        return conv;
      });
      
      setConversations(updatedConversations);
      
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
      
      // Hata mesajını kaydet
      if (currentConversationId) {
        try {
          await supabase
            .from('ai_messages')
            .insert({
              conversation_id: currentConversationId,
              role: 'assistant',
              content: errorMessage.content,
              timestamp: errorMessage.timestamp.toISOString()
            });
            
          // Konuşmanın son güncelleme zamanını yine de güncelle
          await supabase
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);
        } catch (saveError) {
          console.error("Error saving error message:", saveError);
        }
      }
      
      // Conversations listesini güncelle
      const updatedConversations = conversations.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            lastMessageDate: new Date(),
            messages: finalUpdatedMessages
          };
        }
        return conv;
      });
      
      setConversations(updatedConversations);
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

  const startNewConversation = async () => {
    if (!user?.id) return;
    
    try {
      // Yeni bir konuşma oluştur
      const { data: conversationData, error: conversationError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: t("aiAssistant.newConversation", "Yeni Konuşma")
        })
        .select()
        .single();
      
      if (conversationError) throw conversationError;
      
      const conversationId = conversationData.id;
      
      // Hoş geldin mesajını oluştur
      const welcomeMessageContent = t("aiAssistant.welcomeMessage", "Merhaba! Ben G15 AI finansal asistanınızım. Bugün finanslarınızla ilgili size nasıl yardımcı olabilirim?");
      
      // Visual data için JSON
      const visualData: VisualData = {
        type: "suggestion",
        data: [
          t("aiAssistant.suggestions.general.0", "Bütçe nasıl oluşturulur?"),
          t("aiAssistant.suggestions.general.1", "İyi tasarruf stratejileri nelerdir?"),
          t("aiAssistant.suggestions.general.2", "Harcamalarımı nasıl azaltabilirim?")
        ]
      };
      
      // Hoş geldin mesajını veritabanına ekle
      const { data: messageData, error: messageError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: welcomeMessageContent,
          visual_data: [visualData]
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // State'i güncelle
      const welcomeMessage: Message = {
        id: messageData.id,
        role: "assistant",
        content: welcomeMessageContent,
        timestamp: new Date(messageData.timestamp),
        visualData: [visualData]
      };
      
      setMessages([welcomeMessage]);
      setCurrentConversationId(conversationId);
      
      // Konuşmalar listesini güncelle
      const newConversation: ConversationHistory = {
        id: conversationId,
        title: t("aiAssistant.newConversation", "Yeni Konuşma"),
        lastMessageDate: new Date(),
        messages: [welcomeMessage]
      };
      
      setConversations([newConversation, ...conversations]);
      
    } catch (error) {
      console.error("Error creating new conversation:", error);
      toast.error(t("error.creating_conversation", "Yeni konuşma oluşturulurken bir hata oluştu"));
    }
  };
  
  const loadConversation = async (conversationId: string) => {
    if (!user?.id) return;
    
    try {
      // Konuşmanın mesajlarını getir
      const { data: messagesData, error: messagesError } = await supabase
        .rpc('get_ai_messages', { 
          conversation_id_param: conversationId,
          user_id_param: user.id
        });
      
      if (messagesError) throw messagesError;
      
      // Mesajları doğru formata dönüştür
      const formattedMessages = messagesData.map(msg => ({
        id: msg.id,
        role: convertToMessageRole(msg.role),
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        visualData: convertToVisualData(msg.visual_data)
      }));
      
      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      setShowConversationList(false);
      
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error(t("error.loading_conversation", "Konuşma yüklenirken bir hata oluştu"));
    }
  };

  // Render visual components based on type
  const renderVisualData = (visual: any) => {
    switch (visual.type) {
      case "progress":
        return (
          <div className="my-1 sm:my-2 space-y-1" key={`progress-${visual.data.name}`}>
            <div className="flex justify-between text-xs sm:text-sm">
              <span>{visual.data.name}</span>
              <span>${visual.data.current} of ${visual.data.target}</span>
            </div>
            <Progress value={visual.data.percentage} className="h-1.5 sm:h-2" />
            <p className="text-[10px] sm:text-xs text-gray-500">{visual.data.percentage}% complete</p>
          </div>
        );
      
      case "link":
        return (
          <a
            href={visual.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:underline mt-1 sm:mt-2 text-xs sm:text-sm"
            key={`link-${visual.data.url}`}
          >
            <span>{visual.data.text}</span>
            <ExternalLink className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </a>
        );
      
      case "suggestion":
        return (
          <div className="grid grid-cols-1 gap-1 sm:gap-2 mt-1 sm:mt-2" key="suggestions">
            {visual.data.map((suggestion: string, i: number) => (
              <Button
                key={`suggestion-${i}`}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-1 sm:py-2 text-xs sm:text-sm"
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

  if (!isPro) {
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
      <div className="flex flex-col h-full max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{t("aiAssistant.pageTitle", "AI Financial Assistant")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("aiAssistant.description", "Ask me anything about your finances")}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={() => setShowConversationList(!showConversationList)}
              className="flex items-center"
            >
              <ChevronDown size={16} className="mr-1" />
              {!isMobile && t("aiAssistant.conversations", "Conversations")}
            </Button>
            
            <Button
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              onClick={startNewConversation}
              className="flex items-center"
            >
              <RefreshCcw size={16} className="mr-1" />
              {!isMobile && t("aiAssistant.newChat", "New Chat")}
            </Button>
          </div>
        </div>
        
        {showConversationList && (
          <Card className="mb-4">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">{t("aiAssistant.conversationHistory", "Conversation History")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[200px] overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  {t("aiAssistant.noConversations", "No conversations yet")}
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((convo) => (
                    <div 
                      key={convo.id}
                      className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 ${
                        currentConversationId === convo.id ? "bg-gray-100" : ""
                      }`}
                      onClick={() => {
                        loadConversation(convo.id);
                        setShowConversationList(false);
                      }}
                    >
                      <div className="font-medium truncate">{convo.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(convo.lastMessageDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <Card className="flex-1 flex flex-col border-none shadow-none bg-transparent">
          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            <div className="h-full overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-g15-primary" />
                  <p className="text-sm text-muted-foreground">{t("aiAssistant.loading", "Loading conversations...")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`rounded-lg p-4 max-w-[85%] md:max-w-[70%] flex ${
                          message.role === "user"
                            ? "bg-g15-primary text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8 mr-3 mt-1 flex-shrink-0">
                            <AvatarImage src="/bot-avatar.png" alt="AI" />
                            <AvatarFallback className="bg-g15-accent text-g15-accent-foreground">
                              <Bot size={16} />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="space-y-2">
                          {message.isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-pulse bg-current opacity-30 h-3 w-3 rounded-full"></div>
                              <div className="animate-pulse bg-current opacity-50 h-3 w-3 rounded-full"></div>
                              <div className="animate-pulse bg-current opacity-70 h-3 w-3 rounded-full"></div>
                            </div>
                          ) : (
                            <>
                              <div className={message.role === "assistant" ? "prose" : ""}>
                                <ReactMarkdown 
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    a: ({ node, ...props }) => (
                                      <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />
                                    ),
                                    code: ({ node, ...props }) => (
                                      <code {...props} className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm" />
                                    ),
                                    pre: ({ node, ...props }) => (
                                      <pre {...props} className="bg-gray-800 text-gray-200 p-3 rounded-md text-sm overflow-auto my-2" />
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                              
                              {message.visualData && message.visualData.length > 0 && (
                                <div className="pt-2 space-y-3">
                                  {message.visualData.map((visual, idx) => (
                                    <div key={idx} className="border rounded-md p-3 bg-white">
                                      {renderVisualData(visual)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Suggestion chips for empty state */}
            {messages.length === 1 && messages[0].role === "assistant" && !isLoading && (
              <div className="px-4 my-4">
                <p className="text-sm font-medium mb-2 text-g15-primary">
                  {t("aiAssistant.suggestions.title", "Try asking:")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-g15-primary/30 hover:border-g15-primary text-sm"
                      onClick={() => handleUseSuggestion(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 border-t">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSendMessage)}
                  className="flex items-end space-x-2"
                >
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea
                            placeholder={t("aiAssistant.inputPlaceholder", "Type your message...")}
                            className="resize-none min-h-[60px] max-h-[120px]"
                            {...field}
                            disabled={isProcessing || !isPro}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(handleSendMessage)();
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-[60px]"
                    disabled={isProcessing || !isPro}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              </Form>
              
              {!isPro && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {t("aiAssistant.proRequired", "This feature requires a Pro subscription")}
                    </p>
                    <Button
                      variant="link"
                      className="px-0 h-auto text-sm text-amber-600"
                      onClick={() => navigate("/upgrade")}
                    >
                      {t("upgrade.upgradeToPro", "Upgrade to Pro")} 
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AIAssistant;
