import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const sendTelegramNotification = async (message: string) => {
  try {
    const settingsSnap = await getDoc(doc(db, 'app_settings', 'general'));
    if (!settingsSnap.exists()) return;

    const settings = settingsSnap.data();
    if (!settings.enableTelegramNotify || !settings.telegramBotToken || !settings.telegramChatId) {
      return;
    }

    const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
};
