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

const app = express();
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/leads', leadsRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/telegram', telegramRoutes);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3003;
  MongoDBClient.getInstance().then((client) => {
    if (client) {
      client
        .connect()
        .then(() => {
          app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
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