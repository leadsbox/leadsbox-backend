import axios from 'axios';

/** Send a simple WhatsApp text (MVP) */
export async function sendWhatsAppText(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) throw new Error('Missing WA env vars');
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  try {
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`WA send failed: ${error.response?.status} ${error.response?.data}`);
    }
    throw error;
  }
}
