const axios = require("axios");

require("dotenv").config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_PATH = "/api/telegram/webhook";
const NGROK_API_URL = "http://127.0.0.1:4040/api/tunnels";

async function getNgrokUrl() {
  try {
    const response = await axios.get(NGROK_API_URL);
    const tunnels = response.data.tunnels;
    const httpsTunnel = tunnels.find((tunnel) =>
      tunnel.public_url.startsWith("https://"),
    );
    if (!httpsTunnel) {
      throw new Error("No HTTPS tunnel found. Make sure ngrok is running.");
    }
    return httpsTunnel.public_url;
  } catch (error) {
    console.error("Error retrieving ngrok URL:", error.message);
    process.exit(1);
  }
}

async function setTelegramWebhook(publicUrl) {
  const webhookUrl = `${publicUrl}${WEBHOOK_PATH}`;
  const telegramSetWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
  console.log(`Setting webhook to: ${webhookUrl}`);
  try {
    const response = await axios.get(telegramSetWebhookUrl);
    console.log("Telegram webhook response:", response.data);
  } catch (error) {
    console.error("Error setting Telegram webhook:", error.message);
    process.exit(1);
  }
}

(async () => {
  const publicUrl = await getNgrokUrl();
  await setTelegramWebhook(publicUrl);
})();
