import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Allow sign in
        return true;
      } catch (error) {
        console.error('[NextAuth] SignIn callback error:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      // Use the provided callbackUrl if it's a relative path
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If it's an absolute URL on the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to dashboard
      return `${baseUrl}/dashboard`;
    },
    async session({ session, user, token }) {
      try {
        if (session.user) {
          // For database strategy, use user.id; for JWT, use token.sub
          session.user.id = user?.id || token?.sub || '';
        }
        return session;
      } catch (error) {
        console.error('[NextAuth] Session callback error:', error);
        return session;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: false,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

