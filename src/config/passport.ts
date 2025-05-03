import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { UserModel } from '../models/user.model';
import { UserProvider } from '../types';
import { mongoLinkStateService, mongoProviderService, mongoUserService } from '../service/mongo';
import { Toolbox } from '../utils/tools';
import { CryptoUtils } from '../utils/crypto';
import { mongoose } from './db';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      profileFields: ['id', 'emails', 'name'],
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const state = (req.query.state as string) || '';
        const link = await mongoLinkStateService.findOne({ state });

        if (!link.status || !link.data) {
          return done(new Error('Invalid or expired state'), false);
        }

        // 1. Find your original user
        const user = await mongoUserService.findOne(
          { userId: link.data?.userId },
          { session: null }
        );
        if (!user.status || !user.data) {
          throw new Error('User to link not found');
        }

        // 2. Merge Facebook into their providers
        const update = await mongoProviderService.updateOne(
          { userId: link.data?.userId },
          {
            provider: UserProvider.FACEBOOK,
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            username: `${profile.name?.givenName} ${profile.name?.familyName}`.trim(),
            token: accessToken,
            profileImage: profile.photos?.[0]?.value
          }
        );
        if (!update.status) {
          throw new Error('Failed to save Facebook link');
        }

        return done(null, { ...user.data, provider: UserProvider.FACEBOOK });
      } catch (err) {
        done(err as Error, false);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_REDIRECT_URI as string,
    },

    async (accessToken, _refreshToken, profile, done) => {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI as string;
      console.log('Redirect URI being used:', redirectUri);

      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned'), false);
        const profileImage = profile.photos?.[0]?.value;
        console.log('Google profile:', profile);

        let existingUser = await mongoUserService.findOneMongo(
          {
            $or: [{ provider: UserProvider.GOOGLE }, { email }],
          },
          { session: null }
        );
        if (!existingUser.status || !existingUser.data) {
          const _id = new mongoose.Types.ObjectId();

          const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
          const Auth = {
            PUBLIC_KEY,
            ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
              PRIVATE_KEY,
              process.env.JWT_SECRET as string
            ),
          };

          const token = await Toolbox.createToken({
            userId: _id.toString(),
            email,
            username: profile.displayName || email.split('@')[0],
            provider: UserProvider.GOOGLE,
            Auth,
          });

          const createPayload = {
            userId: _id.toString(),
            username: profile.displayName || email.split('@')[0],
            email,
            provider: UserProvider.GOOGLE,
            token,
            providerId: profile.id,
            profileImage,
          };

          const creation = await mongoUserService.updateOne(
            { _id },
            createPayload
          );
          if (!creation.status || !creation.data) {
            throw new Error('Failed to create Google user');
          }
          existingUser = creation;
        }
        const userData = existingUser.data!;
        const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
        const Auth = {
          PUBLIC_KEY,
          ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
            PRIVATE_KEY,
            process.env.JWT_SECRET as string
          ),
        };
        const token = await Toolbox.createToken({
          userId: userData.userId,
          email: userData.email,
          username: userData.username,
          provider: userData.provider,
          Auth,
        });
        await mongoUserService.updateOne({ _id: userData._id }, { token });
        const userWithToken = {
          ...userData,
          token,
          PUBLIC_KEY,
        };
        return done(null, userWithToken);
      } catch (err) {
        console.error('Google auth error:', err);
        return done(err as Error, false);
      }
    }
  )
);

export default passport;
