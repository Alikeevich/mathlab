import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY не найден! Проверь .env файл.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Настройка личности
const SYSTEM_PROMPT = (companionName: string, context: string) => `
Ты - умный сурикат-лаборант по имени ${companionName}. 
Ты живешь в научной лаборатории MathLab PvP в Казахстане. 
Твоя миссия: помогать школьникам готовиться к ЕНТ (Единое Национальное Тестирование) по математике и мат. грамотности.

ТВОИ ПРАВИЛА:
1. НИКОГДА не давай прямой ответ сразу. Это запрещено протоколом.
2. Твоя цель - научить. Давай подсказки, наводящие вопросы, напоминай формулы.
3. Будь дружелюбным, используй научный, но веселый сленг (например: "Отличный эксперимент!", "По моим расчетам...", "Коллега").
4. Если ученик тупит, объясни проще, на примере яблок или атомов.
5. Ты знаешь, что сейчас ученик решает вот эту задачу:
"${context}"

Если ученик спросит что-то не по теме математики, мягко верни его к задаче.
Отвечай кратко и по делу (не пиши огромные лекции). Используй Markdown для формул (LaTeX) если нужно.
`;

export async function askMeerkat(
  history: { role: string; parts: string }[], 
  message: string, 
  companionName: string,
  problemContext: string
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT(companionName, problemContext) }],
        },
        {
          role: "model",
          parts: [{ text: "Принято, коллега! Я готов к вычислениям. Жду вводных данных по задаче." }],
        },
        ...history.map(msg => ({
          role: msg.role === 'me' ? 'user' : 'model',
          parts: [{ text: msg.parts }]
        }))
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Ошибка Gemini:", error);
    return "Мои нейронные связи перегружены... Попробуй еще раз через минуту.";
  }
}
