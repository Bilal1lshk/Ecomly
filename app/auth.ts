import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/database/db";
import { User } from "@/lib/models/user";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        const user = await User.findOne({ email: credentials.email }).select(
          "+passwordHash +emailVerified"
        );

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);

        if (!isValid) return null;

        if (!user.emailVerified) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Every tenant-scoped query is keyed on `session.user.id`, which downstream
     * code validates as a Mongo ObjectId (see getSessionUserId). With the
     * Credentials provider `user.id` is already the Mongo `_id`, but OAuth
     * providers (we don't use an adapter) hand us the provider's account id,
     * e.g. Google's numeric `sub`. That is not a valid ObjectId, so the session
     * looked authenticated while getSessionUserId() returned null and org
     * creation 401'd. Persist/upsert the DB user and use its `_id` instead.
     */
    async jwt({ token, user, account }) {
      if (user) {
        if (account && account.type !== "credentials" && user.email) {
          await connectDB();
          const dbUser = await User.findOneAndUpdate(
            { email: user.email.toLowerCase() },
            {
              $setOnInsert: {
                name: user.name ?? "User",
                emailVerified: true,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          if (dbUser) {
            const id = dbUser._id.toString();
            token.id = id;
            token.sub = id;
          }
        } else {
          token.id = user.id;
          token.sub = user.id;
        }
      }
      return token;
    },
    /**
     * NextAuth's default session callback copies only name/email/image and drops
     * `id`, so `session.user.id` is undefined without this. That silently breaks
     * getSessionUserId()/getOrgId() and therefore every tenant-scoped query.
     */
    session({ session, token }) {
      const id = (token.sub ?? token.id) as string | undefined;
      if (id) session.user.id = id;
      return session;
    },
  },
});