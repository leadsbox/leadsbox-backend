import dotenv from "dotenv";

dotenv.config();

const TelegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

export { TelegramBotToken, dotenv };
