import { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";
import { neon } from "@neondatabase/serverless";

// Lazy initialization - only create connection when needed (not during build)
function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export const authOptions: NextAuthOptions = {
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
        const sql = getSql();
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

          const sql2 = getSql();
          await sql2`
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
          const sql3 = getSql();
          await sql3`
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
          // ALWAYS fetch fresh user data from DB (no cache)
          // This ensures database changes (like plan updates) are reflected immediately
          const sql = getSql();
          const userData = await sql`
            SELECT id, email, name, plan, expiry_date, trial_started_at, trial_ended_at
            FROM users
            WHERE provider = ${token.provider as string}
            AND provider_user_id = ${token.sub}
          `;

          if (userData.length > 0) {
            const user = userData[0];
            (session.user as any).id = user.id;
            (session.user as any).plan = user.plan;
            // Check premium status with expiry date
            const isPremium = user.plan === 'premium' && 
              (!user.expiry_date || new Date(user.expiry_date) > new Date());
            (session.user as any).isPremium = isPremium;
            
            // Also check trial status for hasPremiumAccess
            let isTrial = false;
            if (user.trial_started_at) {
              const trialStart = new Date(user.trial_started_at);
              const trialEnd = user.trial_ended_at ? new Date(user.trial_ended_at) : null;
              if (!trialEnd) {
                const calculatedEnd = new Date(trialStart);
                calculatedEnd.setDate(calculatedEnd.getDate() + 3);
                const now = new Date();
                isTrial = now >= trialStart && now < calculatedEnd;
              } else {
                const now = new Date();
                isTrial = now >= trialStart && now < trialEnd;
              }
            }
            (session.user as any).hasPremiumAccess = isPremium || isTrial;
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

  // Mobile deep link callback support
  // This allows the app to handle OAuth redirects
  // via custom URL scheme: com.kriptokirmizi.alerta://
  // NextAuth will use this for OAuth callback URLs

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

