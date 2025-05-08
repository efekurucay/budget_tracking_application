/// <reference types="https://deno.land/x/types/index.d.ts" />
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, financialContext } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBUi9bTM6Ui11ymKuuJuLQfoF4kjErCW-M";
    
    // Format financial context for the AI
    let contextText = "";
    if (financialContext) {
      // Format goals
      if (financialContext.goals && financialContext.goals.length > 0) {
        contextText += "Financial Goals:\n";
        financialContext.goals.forEach((goal: any) => {
          const progress = goal.current_amount / goal.target_amount * 100;
          contextText += `- ${goal.name}: $${goal.current_amount} of $${goal.target_amount} (${progress.toFixed(1)}% complete)\n`;
        });
        contextText += "\n";
      }
      
      // Format budget categories
      if (financialContext.categories && financialContext.categories.length > 0) {
        contextText += "Budget Categories:\n";
        financialContext.categories.forEach((category: any) => {
          contextText += `- ${category.name}: $${category.budget_amount}\n`;
        });
        contextText += "\n";
      }
      
      // Format recent transactions
      if (financialContext.transactions && financialContext.transactions.length > 0) {
        contextText += "Recent Transactions:\n";
        financialContext.transactions.forEach((transaction: any) => {
          const date = new Date(transaction.date).toLocaleDateString();
          contextText += `- ${date}: ${transaction.type === 'income' ? 'Income' : 'Expense'} of $${Math.abs(transaction.amount)} ${transaction.category ? `in ${transaction.category}` : ''}\n`;
        });
        contextText += "\n";
      }
    }
    
    // If we have no context, provide a note
    if (!contextText) {
      contextText = "Note: No financial data is available for this user yet.";
    }

    // Create a more detailed system prompt
    const systemPrompt = `You are G15, an intelligent financial assistant for the G15 Finance app. You provide personalized advice based on the user's financial situation and goals. Your responses should be:

1. CONCISE - Keep responses brief and to the point
2. PRACTICAL - Offer specific, actionable advice
3. PERSONALIZED - Reference the user's specific financial data when available
4. CLEAR - Use simple language to explain financial concepts
5. SUPPORTIVE - Be encouraging and positive about financial progress

Here is information about the user's current financial situation:

${contextText}

When responding to the user:
- If they ask about their goals or budget, reference the specific data provided above
- If they ask for advice, offer personalized suggestions based on their data
- If they want to add/update/delete financial records, explain that this must be done through the app interface
- If they ask about something you don't have data for, be honest and suggest they enter that information in the app
- DO NOT make up information about their finances that isn't provided in the context above

User message: ${message}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    const responseData = await response.json();
    
    // Check if we have a valid response
    if (responseData.candidates && responseData.candidates.length > 0 && 
        responseData.candidates[0].content && responseData.candidates[0].content.parts) {
        
      const generatedText = responseData.candidates[0].content.parts[0].text || '';
      
      return new Response(
        JSON.stringify({ generatedText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Unexpected API response:", JSON.stringify(responseData));
      return new Response(
        JSON.stringify({ error: 'Failed to generate response', details: responseData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in ai-finance-assistant function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
