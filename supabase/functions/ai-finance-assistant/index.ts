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
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://g15-finance-genius.supabase.co';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  const globalHeaders: Record<string, string> = {};
  if (authHeader) {
    globalHeaders['Authorization'] = authHeader;
  }
  // Add apikey header for all requests to Supabase, as it's often required
  // Use the service role key here if you intend to bypass RLS for admin tasks within the function,
  // otherwise, if you want to respect user's RLS, you should rely on the user's JWT in authHeader.
  // For invoking other functions or direct table access where RLS should apply based on user,
  // ensure the user's JWT is passed. For now, assuming service_role for internal operations.
  // If an anon key is needed for some reason, it should be handled carefully.
  // globalHeaders['apikey'] = supabaseServiceKey; // This might be needed if not using authHeader for all internal calls

  return createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: globalHeaders },
    auth: { persistSession: false }
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // For non-OPTIONS requests, try to parse the body
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (e) {
    console.error("Failed to parse request body:", e.message);
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
  
  try {
    const { action, payload, message, userId, financialContext, conversationId } = requestBody;

    console.log("Action received:", action);
    console.log("Payload received:", payload);
    console.log("Message received:", message);
    console.log("Financial context received:", financialContext ? "Yes" : "No");
    console.log("Conversation ID:", conversationId);

    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyDcoZyVwEsZzHtA5giDMwWK4VKowWHXlP4"; // Ensure API key is defined early

    if (action === 'suggest_next_month_budget') {
      if (!payload || !payload.currentCategories) {
        return new Response(JSON.stringify({ error: 'currentCategories is required for budget suggestion' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { currentCategories } = payload;
      // Construct a prompt for Gemini API to suggest budgets
      let budgetPrompt = `You are a financial advisor for the G15 Finance app.
The user wants suggestions for their next month's budget based on their current budget categories and last month's spending.
Analyze the following categories and provide a suggested budget for each.
The response should be a JSON array of objects, where each object has "categoryId" and "suggestedBudget" (as a number).
Do not include any other text, just the JSON array.

Current Categories and Spending:
`;
      currentCategories.forEach((cat: any) => {
        budgetPrompt += `- Category: "${cat.name}" (ID: ${cat.id}), Current Budget: ${cat.currentBudget} TL, Last Month Spent: ${cat.lastMonthSpent} TL\n`;
      });
      budgetPrompt += "\nSuggest new budget amounts for next month. For example: [{ \"categoryId\": \"uuid1\", \"suggestedBudget\": 1200 }, { \"categoryId\": \"uuid2\", \"suggestedBudget\": 350 }]\n";
      
      console.log("Budget Prompt for Gemini:", budgetPrompt);

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: budgetPrompt }] }],
          generationConfig: {
            temperature: 0.3, // Slightly more creative for suggestions
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            response_mime_type: "application/json", // Request JSON output
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`Gemini API error for budget suggestion (${geminiResponse.status}):`, errorText);
        return new Response(JSON.stringify({ error: `Gemini API error: ${geminiResponse.status}`, details: errorText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const responseData = await geminiResponse.json();
      console.log("Gemini API raw response for budget suggestion:", JSON.stringify(responseData, null, 2));

      if (responseData.candidates && responseData.candidates[0].content && responseData.candidates[0].content.parts && responseData.candidates[0].content.parts[0].text) {
        let rawText = responseData.candidates[0].content.parts[0].text;
        
        // Attempt to clean the text if it's wrapped in markdown code blocks
        rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        console.log("Cleaned raw JSON text:", rawText);

        try {
          const suggestions = JSON.parse(rawText);
          // Validate if suggestions is an array
          if (!Array.isArray(suggestions)) {
            console.error("Parsed suggestions is not an array:", suggestions);
            throw new Error("AI response format error: expected an array of suggestions.");
          }
          // Validate structure of each suggestion (optional but good practice)
          suggestions.forEach((s: any, index: number) => {
            if (typeof s.categoryId !== 'string' || typeof s.suggestedBudget !== 'number') {
              console.error(`Invalid suggestion structure at index ${index}:`, s);
              throw new Error(`AI response format error: suggestion at index ${index} has invalid structure.`);
            }
          });

          console.log("Successfully parsed suggestions:", suggestions);
          return new Response(JSON.stringify({ suggestions }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseError) {
          console.error("Failed to parse Gemini JSON response for budget suggestions:", parseError.message, "Raw text was:", rawText);
          return new Response(JSON.stringify({ error: 'Failed to parse AI suggestions as JSON.', details: parseError.message, rawResponse: rawText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
      } else {
        console.error("No valid content/parts in Gemini response:", responseData);
        return new Response(JSON.stringify({ error: 'No valid suggestions from AI. Response structure incorrect.', details: responseData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }
    // End of new 'suggest_next_month_budget' action block

    // Existing chat logic starts here
    // Ensure message is required only for chat action, and not for 'suggest_next_month_budget'
    if (action !== 'suggest_next_month_budget' && !message) { 
      return new Response(JSON.stringify({
        error: 'Message is required for chat action'
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
        const supabase = supabaseClient(req); // Ensure supabaseClient is called with req for chat part too
        if (!supabase.auth.getUser) { // Check if auth methods are available
             console.warn("Supabase client created without auth context for chat history, this might be an issue if RLS depends on user.");
        }
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
        console.error("Error connecting to Supabase for chat history:", error);
      }
    }
    
    // Gerçek Gemini API çağrısı (Bu kısım sadece action === 'chat' gibi bir durumda çalışmalı)
    // Eğer action 'suggest_next_month_budget' ise buraya gelinmemeli.
    if (action !== 'suggest_next_month_budget') { // Ensure this block only runs for chat
        console.log("Using API key for chat:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 3));
        
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
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { // Changed to 1.5-flash for chat too
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
              // response_mime_type: "application/json", // Not typically used for general chat
            }
          })
        });
        
        // API yanıtı kontrol et
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error for chat (${response.status}):`, errorText);
          
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
        console.log("Gemini API chat response received");
        
        // Check if we have a valid response
        if (responseData.candidates && responseData.candidates.length > 0 && 
            responseData.candidates[0].content && responseData.candidates[0].content.parts) {
            
          const generatedText = responseData.candidates[0].content.parts[0].text || '';
          console.log("Generated chat text length:", generatedText.length);
          
          return new Response(JSON.stringify({
            generatedText
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } else {
          console.error("Unexpected API response for chat:", JSON.stringify(responseData));
          return new Response(JSON.stringify({
            error: 'Failed to generate chat response',
            details: responseData
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 500
          });
        }
    } // End of if (action !== 'suggest_next_month_budget')
    
  } catch (error) {
    console.error('Error in ai-finance-assistant function:', error.message, error.stack);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred in the function.',
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
