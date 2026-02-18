// src/lib/paddle.ts
import { initializePaddle, Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | undefined;

export async function getPaddleInstance() {
  if (paddleInstance) return paddleInstance;

  paddleInstance = await initializePaddle({
    environment: 'sandbox', // Поменяй на 'production' когда будешь готов
    token: 'test_kw_...', // ТВОЙ CLIENT TOKEN ИЗ PADDLE
    eventCallback: (data) => {
      // Можно логировать события, например закрытие чекаута
      console.log(data);
    }
  });

  return paddleInstance;
}