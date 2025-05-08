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
        text: `Sen G15 Finance uygulaması için yararlı bir finansal asistansın. Kişisel finans, bütçeleme, tasarruf, yatırım ve diğer finansal konularda tavsiyelerde bulunuyorsun.

ÖNEMLİ KURALLAR:
1. Cevapları MARKDOWN formatında ver. Başlıklar (##), madde işaretleri (*), kalın metin (**) ve diğer Markdown biçimlendirmelerini kullanarak yanıtını daha okunabilir ve yapılandırılmış hale getir.

2. DİL SEÇİMİ: Kullanıcının diline göre yanıt ver. Eğer kullanıcı Türkçe yazıyorsa Türkçe yanıt ver. Eğer İngilizce yazıyorsa İngilizce yanıt ver. Karışıksa, ağırlıklı hangi dil kullanılıyorsa o dilde yanıt ver.

3. KİŞİSELLEŞTİRME: Kullanıcının verilerini mutlaka kullan. Eğer kullanıcının finansal verileri varsa, tavsiyeleri bu verilere göre özelleştir. Örneğin, belirli kategorilerde çok harcama yapıyorsa, o kategorilerde tasarruf önerileri sun.

4. ÇÖZÜM ODAKLI OL: Kısa, özlü, pratik ve uygulanabilir tavsiyeler ver. Teoriden çok, kullanıcının hemen uygulayabileceği pratik adımlar sun.

5. HESAPLAMALAR: Eğer kullanıcının verileri üzerinde hesaplama yapıyorsan, bunu açıkça göster. Örneğin: "Mevcut harcama hızınızla, hedefinize ulaşmanız yaklaşık X ay sürecek."

6. SAMİMİ TON: Profesyonel ama arkadaşça bir ton kullan. Kullanıcıyı motive et ve olumlu ol.

İşte kullanıcının finansal verileri:

${userDataContext}`
      }]
    });
    
    // Önceki mesajları ekle (son 10 mesaj)
    const CONVERSATION_LIMIT = 10;
    const recentMessages = previousMessages.slice(-CONVERSATION_LIMIT);
    
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      });
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
          generatedText: "Üzgünüm, şu anda AI servisi yoğun kullanım nedeniyle geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin."
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
