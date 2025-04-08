This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## RaaS Solar Project Documentation

This section documents the specifics of the RaaS Solar backend implementation.

### Authentication Setup (Backend)

**Implemented:** 2024-07-28

**Summary:**
Implemented the core backend authentication system using JWT, role-based access control (RBAC) via middleware, and an invitation-based registration process.

**Key Components:**

*   **Environment Variables (`.env`):**
    *   `DATABASE_URL`: PostgreSQL connection string (using Neon.tech).
    *   `RESEND_API_KEY`: API key for sending emails (invitations) via Resend.
    *   `JWT_SECRET`: Secret key for signing and verifying JSON Web Tokens.
    *   `NEXT_PUBLIC_BASE_URL`: Base URL of the application (e.g., `http://localhost:3000`) used in invitation links.
*   **Prisma Schema (`prisma/schema.prisma`):**
    *   `Role` enum: Defines user roles (`SUPER_ADMIN`, `ADMIN`, `ADMIN_STAFF`, `CUSTOMER`, `ENERGY_RENTER`).
    *   `User` model: Stores user details including email, hashed password, and role.
    *   `Invitation` model: Stores invitation details including email, role, unique token, usage status, and expiration date.
*   **Library Setup (`src/lib/`):**
    *   `prisma.ts`: Singleton Prisma client instance with query logging enabled in development.
    *   `logger.ts`: Pino logger configured with `pino-pretty` for readable development logs, including a `[BACKEND]` prefix.
*   **API Routes (`src/app/api/auth/`, `src/app/api/invite/`):**
    *   `auth/register/route.ts`: Handles user registration. Allows direct registration only for the `SUPER_ADMIN` (`pedro-eli@hotmail.com`). Other users must provide a valid, unused invitation token corresponding to their email. Uses `bcrypt` to hash passwords and `zod` for input validation.
    *   `auth/login/route.ts`: Handles user login. Validates email and password (`bcrypt.compare`), and issues a JWT (`jsonwebtoken`) upon success, valid for 1 hour. Uses `zod` for input validation.
    *   `invite/route.ts`: Handles invitation creation. Protected route accessible only by `SUPER_ADMIN` and `ADMIN`. Generates a unique token (`crypto`), stores the invitation in the database, and sends an invitation email via Resend. Uses `zod` for input validation.
*   **Middleware (`src/middleware.ts`):**
    *   Intercepts requests to protected API routes (defined in `protectedRoutes`, e.g., `/api/invite`).
    *   Excludes public routes (`/api/auth/login`, `/api/auth/register`).
    *   Verifies the JWT from the `Authorization: Bearer <token>` header using `jose`.
    *   Checks if the user's role (from the JWT payload) is allowed access to the requested route based on `protectedRoutes` configuration.
    *   Returns 401 (Unauthorized) for missing/invalid tokens or 403 (Forbidden) for insufficient permissions.
    *   Adds user information (`x-user-id`, `x-user-email`, `x-user-role`) to request headers for use in API handlers.

**Testing:**

The authentication flow was tested using `curl` commands for:

1.  Registering the initial `SUPER_ADMIN`.
2.  Logging in as `SUPER_ADMIN` to obtain a JWT.
3.  Creating an invitation for an `ADMIN` user using the `SUPER_ADMIN` JWT.
4.  Registering the `ADMIN` user using the invitation token.
5.  Logging in as the `ADMIN` user.
6.  Creating an invitation as the `ADMIN` user.
7.  Attempting unauthorized actions (direct registration, login with wrong password, accessing protected routes without/with invalid token/role).

Logs were monitored using `npm run dev`.

**Next Steps:**

*   Create a minimal frontend page for easier testing of login/registration/invitation flows.
*   Implement other backend features (user management, installations, etc.).
