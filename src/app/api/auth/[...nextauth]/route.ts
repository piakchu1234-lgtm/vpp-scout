/**
 * NEXTAUTH.JS API ROUTE
 *
 * App Router compatible authentication for SimplySite admin routes.
 * Protects /admin/crawler and API endpoints from unauthorized access.
 *
 * Environment Variables Required:
 * - NEXTAUTH_SECRET: Secret for JWT encryption
 * - NEXTAUTH_URL: Base URL (http://localhost:3000 or production URL)
 * - ADMIN_USERNAME: Admin login username
 * - ADMIN_PASSWORD: Admin login password (hashed in production)
 */

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'admin' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Verify against environment variables
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminUsername || !adminPassword) {
          console.error('[NextAuth] ADMIN_USERNAME or ADMIN_PASSWORD not configured');
          return null;
        }

        // Simple credential check (upgrade to bcrypt in production)
        if (
          credentials?.username === adminUsername &&
          credentials?.password === adminPassword
        ) {
          return {
            id: '1',
            name: 'SimplySite Admin',
            email: 'admin@simplysite.local',
            role: 'admin',
          };
        }

        // Invalid credentials
        return null;
      },
    }),
  ],

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    async jwt({ token, user }) {
      // Add role to JWT token
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      // Add role to session
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
