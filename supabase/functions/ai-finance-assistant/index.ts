/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client yapılandırması
const supabaseClient = (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://g15-finance-genius.supabase.co';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, financialContext, conversationId } = await req.json();
    console.log("Message received:", message);
    console.log("Financial context received:", financialContext ? "Yes" : "No");
    console.log("Conversation ID:", conversationId);
    
    if (!message) {
      return new Response(JSON.stringify({
        error: 'Message is required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    
    // Mesaj geçmişini al
    let previousMessages = [];
    if (conversationId) {
      try {
        const supabase = supabaseClient(req);
        const { data, error } = await supabase
          .from('ai_messages')
          .select('role, content, timestamp')
          .eq('conversation_id', conversationId)
          .order('timestamp', { ascending: true });
        
        if (error) {
          console.error("Error fetching conversation history:", error);
        } else {
          previousMessages = data || [];
        }
      } catch (error) {
        console.error("Error connecting to Supabase:", error);
      }
    }
    
    // Gerçek Gemini API çağrısı
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyDcoZyVwEsZzHtA5giDMwWK4VKowWHXlP4";
    console.log("Using API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 3));
    
    // Kullanıcı verilerini formatla
    let userDataContext = "Kullanıcı verisi bulunmuyor.";
    
    if (financialContext) {
      userDataContext = "# Kullanıcı Finansal Verileri\n\n";
      
      // Hedefler
      if (financialContext.goals && financialContext.goals.length > 0) {
        userDataContext += "## Finansal Hedefler\n";
        financialContext.goals.forEach((goal: any) => {
          const progress = goal.current_amount / goal.target_amount * 100;
          userDataContext += `- **${goal.name}**: ${goal.current_amount} / ${goal.target_amount} TL (${progress.toFixed(1)}% tamamlandı)\n`;
        });
        userDataContext += "\n";
      }
      
      // Bütçe kategorileri
      if (financialContext.categories && financialContext.categories.length > 0) {
        userDataContext += "## Bütçe Kategorileri\n";
        financialContext.categories.forEach((category: any) => {
          userDataContext += `- **${category.name}**: ${category.budget_amount} TL\n`;
        });
        userDataContext += "\n";
      }
      
      // Son işlemler
      if (financialContext.transactions && financialContext.transactions.length > 0) {
        userDataContext += "## Son İşlemler\n";
        financialContext.transactions.forEach((transaction: any) => {
          const date = new Date(transaction.date).toLocaleDateString();
          const type = transaction.type === 'income' ? 'Gelir' : 'Gider';
          const amount = Math.abs(transaction.amount);
          userDataContext += `- **${date}**: ${type} - ${amount} TL ${transaction.category ? `(${transaction.category})` : ''}\n`;
        });
        userDataContext += "\n";
      }
    }
    
    // Sohbet geçmişini hazırla
    const contents = [];
    
    // İlk mesaj olarak sistem yönergesini ekle
    contents.push({
      role: "user",
      parts: [{
        text: `You are a helpful financial assistant for the G15 Finance app. You provide advice on personal finance, budgeting, saving, investing, and other financial topics.

IMPORTANT RULES:
1. Provide answers in MARKDOWN format. Use headings (##), bullets (*), bold text (**), and other Markdown formatting to make your answer more readable and structured.

2. LANGUAGE SELECTION: Respond according to the user's language. If the user writes in Turkish, respond in Turkish. If the user writes in English, respond in English. If it's mixed, respond in the language that is predominantly used.

3. PERSONALIZATION: Always use the user's data. If the user has financial data, customize the advice according to that data. For example, if they spend a lot in certain categories, offer savings suggestions in those categories.

4. BE SOLUTION-FOCUSED: Provide short, concise, practical, and applicable advice. Provide practical steps that the user can implement right away, rather than theory.

5. CALCULATIONS: If you’re doing calculations on the user’s data, make that clear. For example: “At your current spending pace, it will take you approximately X months to reach your goal.”

6. FRIENDLY TONE: Use a professional yet friendly tone. Motivate the user and be positive.

7. REFERENCE PREVIOUS MESSAGES: In your responses, reference the user’s previous messages. For example: “You asked me earlier about your savings goals…”

8. FLOW OF CONVERSATION: Keep the conversation flowing and don’t forget the previous context in your responses.

Here’s the user’s financial data:

${userDataContext}`
      }]
    });
    
    // Önceki mesajları ekle (son 10 mesaj)
    const CONVERSATION_LIMIT = 10;
    const recentMessages = previousMessages.slice(-CONVERSATION_LIMIT);
    
    // Eğer mesaj geçmişi varsa, yanıta dahil et
    if (recentMessages.length > 0) {
      // İlk yanıta ekle
      contents[0].parts[0].text += "\n\n### Conversation History:\n";
      
      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i];
        // Konuşma geçmişini kullanıcı yönergelerine ekle
        contents[0].parts[0].text += `\n**${msg.role === 'user' ? 'user' : 'assistant'}**: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`;
        
        // Ayrıca Gemini'nin konuşma modelini kullanabilmesi için ayrı içerikler olarak da ekle
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Son kullanıcı mesajını ekle
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800
        }
      })
    });
    
    // API yanıtı kontrol et
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      
      // Kota hatası (429) özel mesajı
      if (response.status === 429) {
        return new Response(JSON.stringify({
          generatedText: "I'm sorry, the AI service is temporarily unavailable due to high usage. Please try again in a few minutes."
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      return new Response(JSON.stringify({
        error: `Gemini API error: ${response.status}`,
        details: errorText
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    const responseData = await response.json();
    console.log("Gemini API response received");
    
    // Check if we have a valid response
    if (responseData.candidates && responseData.candidates.length > 0 && 
        responseData.candidates[0].content && responseData.candidates[0].content.parts) {
        
      const generatedText = responseData.candidates[0].content.parts[0].text || '';
      console.log("Generated text length:", generatedText.length);
      
      return new Response(JSON.stringify({
        generatedText
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.error("Unexpected API response:", JSON.stringify(responseData));
      return new Response(JSON.stringify({
        error: 'Failed to generate response',
        details: responseData
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
  } catch (error) {
    console.error('Error in ai-finance-assistant function:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
