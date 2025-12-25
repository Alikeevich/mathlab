import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 1. Просто импортируем библиотеку (чтобы веб-компоненты зарегистрировались)
import 'mathlive';

// 2. Отключаем клавиатуру через глобальный объект window
// Используем try-catch или проверку, чтобы не упало, если объект еще не создан
try {
  // @ts-ignore - игнорируем ошибку TypeScript, так как он не знает про это свойство
  window.mathVirtualKeyboard.enabled = false;
} catch (e) {
  console.warn('MathLive keyboard setup failed', e);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)