import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { UserModel } from "../models/user.model";

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
      clientID: process.env.FACEBOOK_APP_ID as string,
      clientSecret: process.env.FACEBOOK_APP_SECRET as string,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL as string,
      profileFields: ["id", "emails", "name"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0]?.value;
        const facebookId = profile.id;
        const firstName = profile.name?.givenName || "";
        const lastName = profile.name?.familyName || "";
        console.log("Facebook profile:", profile);
        console.log("Facebook ID:", facebookId);
        console.log("Email:", email);
        console.log("First Name:", firstName);
        console.log("Last Name:", lastName);

        let user = await UserModel.findOne({ facebookId });
        if (!user) {
          user = await UserModel.create({
            facebookId,
            username: `${firstName} ${lastName}`.trim(),
            email: email || "",
            password: "",
            userId: facebookId,
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

export default passport;
