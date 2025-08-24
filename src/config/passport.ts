import passport, { Profile } from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { UserModel } from '../models/user.model';
import { UserProvider } from '../types';
import {
  mongoLinkStateService,
  mongoProviderService,
  mongoUserService,
} from '../service/mongo';
import { Toolbox } from '../utils/tools';
import { CryptoUtils } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { userService } from '../service/user.service';

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
      passReqToCallback: true,
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
            username:
              `${profile.name?.givenName} ${profile.name?.familyName}`.trim(),
            token: accessToken,
            profileImage: profile.photos?.[0]?.value,
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
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_REDIRECT_URI!,
    },
    // VERIFY CALLBACK — persists user in Postgres via Prisma userService
    async (
      accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done
    ) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email)
          return done(new Error('No email returned from Google'), false);

        const provider = UserProvider.GOOGLE;
        const providerId = profile.id;
        const username = (profile.displayName || email.split('@')[0] || 'user')
          .replace(/\s+/g, ' ')
          .trim();
        const profileImage = profile.photos?.[0]?.value || null;
        const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
        const Auth = {
          PUBLIC_KEY,
          ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
            PRIVATE_KEY,
            process.env.JWT_SECRET as string
          ),
        };

        // 1) Try provider match first, then email fallback
        let user =
          (await userService.findByProvider(provider, providerId)) ||
          (await userService.findByEmail(email));

        // 2) Create if missing
        if (!user) {
          const userId = uuidv4();

          const token = await Toolbox.createToken({
            userId,
            email,
            username,
            provider,
            // Auth,
          });

          user = await userService.create({
            userId,
            username,
            email,
            password: null, 
            token: token,
            provider,
            providerId,
            profileImage,
            // Auth,
          });
        } else {
          // 3) Backfill/refresh fields if user existed by email
          const patch: any = {};
          if (!user.providerId) {
            patch.providerId = providerId;
            patch.provider = provider;
          }
          if (!user.profileImage && profileImage) {
            patch.profileImage = profileImage;
          }
          if (Object.keys(patch).length > 0) {
            user = await userService.update(user.id, patch);
          }
        }

        // 4) Rotate a COMPACT session token for the cookie
        const sessionToken = await Toolbox.createToken({
          userId: user.userId,
          email: user.email,
          username: user.username || '',
          provider,
          // Auth,
        });

        // Optionally persist latest session token in DB
        try {
          await userService.update(user.id, { token: sessionToken });
        } catch {}

        // 5) Hand minimal info to controller (googleCallback will set cookie)
        return done(null, {
          userId: user.userId,
          email: user.email,
          username: user.username,
          provider,
          token: sessionToken,
          profileImage: user.profileImage || profileImage,
        });
      } catch (err) {
        console.error('Google auth (Prisma) error:', err);
        return done(err as Error, false);
      }
    }
  )
);

export default passport;
