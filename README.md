# Leadsbox Backend

Leadsbox is a SaaS backend designed to turn social media direct messages (DMs) into actionable sales leads. This project powers the backend for Leadsbox, supporting integrations with platforms like Instagram and Telegram, and is built with Node.js, Express, TypeScript, and MongoDB.

## Features
- **Unified Inbox:** Aggregate DMs from Instagram (and more in the future) into a single dashboard.
- **Auto-Reply Engine:** Automatically respond to messages based on keyword triggers and templates.
- **Lead Tagging & CRM:** Assign tags (e.g., New, Interested, Follow-Up) and add notes to conversations.
- **Follow-Up Scheduling:** Schedule reminders for follow-ups, integrated with notifications.
- **DM Template Manager:** Manage customizable reply templates for consistent responses.
- **Basic Analytics Dashboard:** Insights such as response rates, lead conversion metrics, and engagement statistics.
- **Webhooks:** Real-time message delivery and event processing via webhooks from social media platforms.

## Tech Stack
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (Mongoose ODM)
- **Architecture:** Class-based controllers and service layers
- **Integrations:**
  - Instagram Graph API
  - Telegram Bot API
- **Infrastructure:**
  - Ready for Docker/Kubernetes or serverless deployment
  - CI/CD with GitHub Actions (or similar)

## Directory Structure
```
├── src
│   ├── app.ts                # Express app entry point
│   ├── controllers/          # Controllers for Instagram, Telegram, Leads, etc.
│   ├── service/              # Business logic and integrations
│   ├── models/               # Mongoose models for Users, Leads, Transactions, etc.
│   ├── routes/               # API route definitions
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   └── config/               # Configuration files
├── package.json
├── tsconfig.json
├── .env                      # Environment variables
├── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Yarn or npm
- MongoDB Atlas account (or local MongoDB instance)

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd leadsbox-backend
   ```
2. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values (e.g., MongoDB URI, Telegram Bot Token, Instagram credentials).

4. **Run the development server:**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

### Running in Production
- Build the project:
  ```bash
  yarn build
  # or
  npm run build
  ```
- Start the production server:
  ```bash
  yarn start
  # or
  npm start
  ```

## API Overview
- **Instagram Webhook:** `/api/instagram/webhook`
- **Telegram Webhook:** `/api/telegram/webhook`
- **Lead Management:** `/api/leads/*`
- **Follow-Up Scheduling:** `/api/followup/*`

## Integrations
- **Telegram:** Set the webhook for your Telegram bot to point to `/api/telegram/webhook`.
- **Instagram:** Requires a Business Account linked to a Facebook Page and valid access tokens.

## Security
- OAuth tokens and sensitive credentials are managed via environment variables.
- Ensure your `.env` file is never committed to version control.
- Webhook endpoints should be protected and validated for authenticity.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT

---

**Leadsbox** — Automate, Organize, and Convert your social DMs into Revenue!
