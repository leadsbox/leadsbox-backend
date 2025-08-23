import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { MongoDBClient } from './config/db';
import passport from 'passport';
import './config/passport';
import leadsRoutes from './routes/leads.routes';
import instagramRoutes from './routes/instagram.routes';
import authRoutes from './routes/auth.routes';
import telegramRoutes from './routes/telegram.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import providerRoutes from './routes/provider.routes';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import invoiceRoutes from './routes/invoices.routes';
import settingsRoutes from './routes/settings.routes';
import orgRoutes from './routes/org.routes';

const app = express();
const corsOptions = {
  origin: 'https://a2a7b30154d5.ngrok-free.app', // Allow the frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Enable cookies
};

app.use(cors(corsOptions));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // @ts-ignore
      req.rawBody = buf;
    },
  })
);

app.use(
  session({
    name: 'leadsbox.sid',
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'dev',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('API is running...');
});

// src/app.ts
app.get('/api/debug/wa', (_req, res) => {
  res.json({
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    tokenTail: process.env.WHATSAPP_ACCESS_TOKEN,
    publicUrl: process.env.PUBLIC_APP_URL,
  });
});

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

app.use('/api/leads', leadsRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.use('/api/invoices', invoiceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orgs', orgRoutes);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3003;
  MongoDBClient.getInstance().then((client) => {
    if (client) {
      client
        .connect()
        .then(() => {
          app.listen(PORT, () => {
            console.log(
              `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
            );
          });
        })
        .catch((err) => {
          console.error('Error connecting to MongoDB:', err);
          process.exit(1);
        });
    } else {
      console.error('MongoDB client instance not available.');
      process.exit(1);
    }
  });
}

export default app;
