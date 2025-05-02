# Leadsbox Backend

Leadsbox is a SaaS backend designed to turn social media direct messages (DMs) into actionable sales leads. This project powers the backend for Leadsbox, supporting integrations with platforms like Instagram, Telegram, and WhatsApp, and is built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Unified Inbox:** Aggregate DMs from Instagram, Telegram, WhatsApp (and more in the future) into a single dashboard.
- **Auto-Reply Engine:** Automatically respond to messages based on keyword triggers and templates.
- **Lead Tagging & CRM:** Assign tags (e.g., New, Interested, Follow-Up, etc.) and add notes to conversations. Tagging is robust and uses a comprehensive set of lead labels.
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
  - WhatsApp Cloud API
- **Infrastructure:**
  - Ready for Docker/Kubernetes or serverless deployment
  - CI/CD with GitHub Actions (or similar)

## Directory Structure

```
├── src
│   ├── app.ts                # Express app entry point
│   ├── controllers/          # Controllers for Instagram, Telegram, WhatsApp, Leads, etc.
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

   - Copy `.env.example` to `.env` and fill in the required values (e.g., MongoDB URI, Telegram Bot Token, WhatsApp credentials, Instagram credentials).

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
- **WhatsApp Webhook:** `/api/whatsapp/webhook`
- **Lead Management:** `/api/leads/*`
- **Follow-Up Scheduling:** `/api/followup/*`

## Integration Flows

### Telegram Integration Flow
1. Telegram bot is set up and webhook is configured to `/api/telegram/webhook`.
2. Incoming Telegram messages are received by the `TelegramController.handleUpdate` method.
3. The message text is analyzed and tagged using the robust `LeadController.tagConversation` logic, which uses a comprehensive set of lead labels.
4. The lead is stored in MongoDB using the `LeadService`.
5. Auto-replies and follow-up scheduling are supported.

### To log in to the app frontend, sign in using Telegram. 
1. Open the leasdbox-frontend application
2. run the FE localhost using ngrok - ngrok http 3010
3. Copy the ngrok URl and paste it in the bot settings in telegram
4. Open the telergam and go to botfather
5. Type /setdomain and paste the ngrok URL
6. Past the ngrok URL in the set domain
7. Open the app in your browser
8. Click on the "Login with Telegram" button.
9. The app will redirect you to the Telegram login page.
10. Login using your Telegram account.
11. After successful login, you will be redirected back to the app with your Telegram account information.
12. You can now use the app to manage your leads and conversations.

### Whatsapp Webhook Integration Flow
1. Go to this website in the browser: https://developers.facebook.com/apps/1350971909282292/whatsapp-business/wa-settings/?business_id=494503737743299&phone_number_id=
2. Click on the Whatsapp -> Configuration on the side panel
3. Add the ngrok URL in the webhook url: https://2b0f-102-90-80-62.ngrok-free.app/api/whatsapp/webhook
4. add your verify token in the verify token field
5. Click on the verify and save button
6. Subscribe to all he webhook events
7. You would get a response in your terminal -> ✅ WhatsApp webhook verified

### WhatsApp Integration Flow
1. WhatsApp webhook is configured to `/api/whatsapp/webhook` (with GET for verification and POST for message delivery).
2. Incoming WhatsApp messages are received by the `WhatsappController.handleUpdate` method.
3. The webhook signature is verified for authenticity.
4. The message text is analyzed and tagged using the same `LeadController.tagConversation` logic.
5. The lead is stored in MongoDB using the `LeadService`.
6. Auto-replies and follow-up scheduling are supported.

### WhatsApp Cloud API **Account‑Linking** Flow (OAuth)
1. Front‑end hits `/api/auth/whatsapp/login`; backend redirects the user to the Facebook OAuth dialog with required scopes (`whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`).
2. After consent, Meta redirects to `/api/auth/whatsapp/callback` with `code` and `state`.
3. Backend exchanges the `code` for a user access token → finds the user’s Business Manager → picks a WhatsApp Business Account (WABA) → picks a phone number → stores the connection → registers the webhook.

WhatsApp Cloud API Account‑Linking Flow (OAuth)

Leadsbox uses a five‑step wizard so each user can pick exactly which Business ➜ WABA ➜ phone number they want to connect.

Step

HTTP method / path

What happens

1

GET /api/auth/whatsapp/login

Redirects the browser to Meta’s OAuth dialog with the scopes whatsapp_business_management, whatsapp_business_messaging, business_management.

2

GET /api/auth/whatsapp/callback

Exchanges the code for a user access‑token and returns a JSON payload: { accessToken, businesses:[{id,name},…] }. UI asks the user to choose a Business Manager.

3

POST /api/auth/whatsapp/select‑business

Body: { accessToken, businessId } ⇒ returns { accessToken, wabas:[{id,name},…] }. User picks a WhatsApp Business Account (WABA) inside that business.

4

POST /api/auth/whatsapp/select‑waba

Body: { accessToken, wabaId } ⇒ returns { accessToken, wabaId, phoneNumbers:[{id,display},…] }. User selects the phone number they want Leadsbox to manage.

5

POST /api/auth/whatsapp/connect

Body: { accessToken, wabaId, phoneId, userId } ⇒ Saves the connection in MongoDB and calls /{wabaId}/subscribed_apps to enable webhooks. Responds "WhatsApp account linked".

After step 5 inbound messages for that phone number will hit /api/whatsapp/webhook, be tagged by Leadsbox, and appear in the unified inbox.

### **Connecting a WhatsApp Business Account in Dev (step‑by‑step)**
*(This is what you’ll do the very first time using ngrok.)*

1. **Expose the backend locally**
   ```bash
   ngrok http 3010   # 3010 is your Express port
   # e.g. https://https://13f1-102-90-102-138.ngrok-free.app
   ```
2. **Meta App › Settings → Basic**
   - **App Domains:** `https://13f1-102-90-102-138.ngrok-free.app`
   - **Add Platform → Website → Site URL:** `https://https://13f1-102-90-102-138.ngrok-free.app`
3. **Facebook Login → Settings**
   - **Client OAuth Login:** ON  │  **Web OAuth Login:** ON
   - **Valid OAuth Redirect URIs:**
     ```
     https://https://13f1-102-90-102-138.ngrok-free.app/api/auth/whatsapp/callback
     ```
4. **WhatsApp → Getting Started / Configuration**
   - If you don’t have a WABA yet, click **Create WhatsApp Business Account** — Meta will generate a *test* WABA and phone number automatically.
   - Under **Webhook** paste: `https://https://13f1-102-90-102-138.ngrok-free.app/api/whatsapp/webhook` and **Verify**.
5. **Assign Roles**
   - In **Business Settings → WhatsApp Accounts** add your Facebook profile as **Admin** to the WABA so the API can list it.
6. **Environment variables** (`.env`)
   ```env
   WHATSAPP_REDIRECT_URI=https://https://13f1-102-90-102-138.ngrok-free.app/api/auth/whatsapp/callback
   FACEBOOK_APP_ID=<your‑app‑id>
   FACEBOOK_APP_SECRET=<your‑app‑secret>
   ```
7. **Restart** the backend (`npm run dev`) and visit `/api/auth/whatsapp/login` in the browser. Approve permissions.
8. The callback handler will log business, WABA and phone number IDs and respond **"WhatsApp account linked"**.
9. Send a test message to the test number; the webhook delivers the payload to `/api/whatsapp/webhook` and Leadsbox stores the lead.

> **Tip:** Free ngrok tunnels reset each time; either reserve a domain (ngrok paid) or repeat steps 1‑4 whenever the URL changes.


## Lead Tagging

Leads are tagged using a robust set of labels defined in the `LeadLabel` enum (see `src/types/leads.ts`). Tagging is keyword-driven and can be easily extended for new categories.

## Security

- OAuth tokens and sensitive credentials are managed via environment variables.
- Ensure your `.env` file is never committed to version control.
- Webhook endpoints are protected and validated for authenticity (signature validation for WhatsApp).

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT

---

**Leadsbox** — Automate, Organize, and Convert your social DMs into Revenue!
