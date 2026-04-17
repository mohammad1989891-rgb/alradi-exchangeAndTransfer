import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

const zai = ZAI.create();

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const conversationHistory = new Map<string, ChatMessage[]>();

const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `أنت مساعد ذكي يعمل في شركة "الراضي للصرافة والحوالات" في سوريا. دورك هو مساعدة العملاء والإجابة على استفساراتهم بأسلوب مهني وودود.

يمكنك المساعدة في المواضيع التالية:
- أسعار الصرف: تقديم معلومات عن أسعار صرف العملات المختلفة (الدولار الأمريكي، اليورو، الليرة السورية، الريال السعودي، الدرهم الإماراتي، وغيرها)
- خدمات الحوالات: شرح كيفية إرسال واستقبال الحوالات المالية، الرسوم، والأوقات المتوقعة للتسليم
- تحويل العملات: مساعدة العملاء في حساب المبالغ المحولة بين العملات المختلفة
- ساعات العمل ومعلومات التواصل: تقديم معلومات عن ساعات العمل، العنوان، وأرقام التواصل

يجب عليك:
- الرد دائماً باللغة العربية
- أن تكون مهنياً وودوداً في ردودك
- عدم تقديم نصائح مالية استثمارية
- إذا لم تكن متأكداً من معلومة، اطلب من العميل التواصل مع الفرع مباشرة
- استخدام العملة السورية (ل.س) كعملة أساسية في الحسابات ما لم يطلب العميل غير ذلك`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, response: 'يرجى تقديم رسالة صالحة' },
        { status: 400 }
      );
    }

    const sessionKey = sessionId || 'default';

    // Get or create conversation history for this session
    let history = conversationHistory.get(sessionKey);
    if (!history) {
      history = [];
      conversationHistory.set(sessionKey, history);
    }

    // Build messages array with system prompt
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-MAX_HISTORY),
      { role: 'user', content: message },
    ];

    // Call ZAI API
    const zaiInstance = await zai;
    const completion = await zaiInstance.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const assistantResponse =
      completion.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.';

    // Update conversation history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: assistantResponse });

    // Enforce history limit (keep only last MAX_HISTORY messages)
    if (history.length > MAX_HISTORY) {
      conversationHistory.set(sessionKey, history.slice(-MAX_HISTORY));
    }

    return NextResponse.json({
      success: true,
      response: assistantResponse,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        success: false,
        response: 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.',
      },
      { status: 500 }
    );
  }
}
