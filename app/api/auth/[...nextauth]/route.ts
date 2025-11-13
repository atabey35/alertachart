import NextAuth, { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const authOptions: NextAuthOptions = {
  providers: [
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      checks: ['none'], // Disable PKCE completely for Apple
      authorization: {
        params: {
          scope: 'name email',
          response_mode: 'form_post',
          response_type: 'code',
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[NextAuth] signIn callback:', {
        provider: account?.provider,
        email: user?.email,
        name: user?.name,
        providerAccountId: account?.providerAccountId,
        profile,
      });

      if (!account) {
        console.error('[NextAuth] Missing account');
        return false;
      }

      // For Apple: if email is not shared, use Apple user ID as email
      const userEmail = user.email || (account.provider === 'apple' 
        ? `${account.providerAccountId}@privaterelay.appleid.com` 
        : null);

      if (!userEmail) {
        console.error('[NextAuth] Missing email and cannot generate fallback');
        return false;
      }

      try {
        // Check if user exists
        const existingUser = await sql`
          SELECT * FROM users 
          WHERE provider = ${account.provider} 
          AND provider_user_id = ${account.providerAccountId}
        `;

        console.log('[NextAuth] Existing user check:', { found: existingUser.length > 0 });

        if (existingUser.length === 0) {
          // Create new user
          console.log('[NextAuth] Creating new user:', {
            email: user.email,
            name: user.name,
            provider: account.provider,
          });

          await sql`
            INSERT INTO users (
              email, 
              name, 
              provider, 
              provider_user_id,
              plan
            ) VALUES (
              ${userEmail},
              ${user.name || account.providerAccountId},
              ${account.provider},
              ${account.providerAccountId},
              'free'
            )
          `;

          console.log('[NextAuth] User created successfully');
        } else {
          // Update last login
          await sql`
            UPDATE users 
            SET last_login_at = NOW()
            WHERE provider = ${account.provider}
            AND provider_user_id = ${account.providerAccountId}
          `;
        }

        return true;
      } catch (error) {
        console.error('[NextAuth] Sign in error:', error);
        return false;
      }
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        try {
          // Fetch user data from DB
          const userData = await sql`
            SELECT id, email, name, plan, expiry_date
            FROM users
            WHERE provider = ${token.provider as string}
            AND provider_user_id = ${token.sub}
          `;

          if (userData.length > 0) {
            const user = userData[0];
            (session.user as any).id = user.id;
            (session.user as any).plan = user.plan;
            (session.user as any).isPremium = 
              user.plan === 'premium' && 
              (!user.expiry_date || new Date(user.expiry_date) > new Date());
          }
        } catch (error) {
          console.error('Session error:', error);
        }
      }
      return session;
    },

    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
  },

  pages: {
    signIn: '/', // Redirect to home page for sign in
  },

  session: {
    strategy: "jwt",
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    nonce: {
      name: 'next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };