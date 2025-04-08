# Authentication System Debugging Guide

## Overview

This guide provides information on how to debug and monitor the authentication system, including registration, login, email verification, and two-factor authentication.

## System Components

1. **Registration Flow**:
   - User submits registration form
   - Backend creates user in database with `emailVerified: false`
   - Verification code sent via email
   - User redirected to email verification page

2. **Email Verification**:
   - User enters 6-digit code
   - Backend validates code
   - User marked as verified

3. **Login Flow**:
   - User provides credentials
   - If email not verified, redirect to verification
   - If 2FA enabled, code sent and redirect to 2FA page
   - On successful 2FA, JWT token issued
   - Redirect to appropriate dashboard based on role

4. **Password Reset**:
   - User requests password reset
   - Token sent via email
   - User sets new password

## Development Mode Features

### Fixed Verification Code
In development mode, all verification codes are set to `123456` for easier testing.

### Email Redirection
All emails are sent to the development email (configurable via `DEV_EMAIL_RECIPIENT` in .env), regardless of the actual recipient address. This allows testing the email flows without real email addresses.

### Enhanced Logging
Development mode provides detailed logs including sensitive information (tokens, emails, verification codes) to aid debugging.

## API Testing Endpoints

### Email Test Endpoint
Test various email templates:

```
GET /api/test/email?type=verification&email=test@example.com&name=Test+User
```

Parameters:
- `type`: verification, 2fa, invitation, reset
- `email`: Recipient email
- `name`: User name for personalization

## Logs

All application logs include detailed information about operations:

### Frontend Logs (Client-side)
- Format: `[timestamp] [level] [FRONTEND] message {data}`
- Source file information included in development mode

### Backend Logs (Server-side)
- Format: `[timestamp] [level] [BACKEND] message {data}`
- Stack trace information included in development mode

## Common Issues and Solutions

### "Email Verification Required" Loop
If the user is stuck in an email verification loop, check:
1. Database: Is the `emailVerified` flag correctly set?
2. Logs: Are verification emails being sent?
3. Token: Is the email verification code being correctly stored in the database?

### Token Validation Issues
If token validation is failing:
1. Check `.env` file for correct `JWT_SECRET`
2. Ensure token hasn't expired
3. Check logs for any decoding errors

### Email Delivery Problems
If emails aren't being received:
1. Check Resend API logs via Resend dashboard
2. Verify `.env` contains correct `RESEND_API_KEY`
3. Check server logs for email sending errors
4. In development, verify `DEV_EMAIL_RECIPIENT` is correctly set

## Testing Authentication

### Quick Test Steps

1. **Register:**
   - Use email: `testuser@example.com`
   - Password: `password123`
   - Verification code: `123456` (in development)

2. **Email Verification:**
   - After registration, you'll be redirected to verification screen
   - Use code `123456` in development

3. **Login:**
   - When 2FA is required, use code `123456` in development
   
4. **Test Email Functionality:**
   ```
   curl "http://localhost:3000/api/test/email?type=verification&email=test@example.com"
   ```

## Monitoring and Observability

During development, monitor:
1. Browser console for frontend logs
2. Server console for backend logs
3. Resend dashboard for email delivery status

## Environment Variables

The following environment variables affect authentication:

```
RESEND_API_KEY=<your_resend_api_key>
JWT_SECRET=<your_jwt_secret>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DEFAULT_FROM_EMAIL=onboarding@resend.dev
DEV_EMAIL_RECIPIENT=your-email@example.com
SUPPORT_EMAIL=support@example.com
```

## Quick Authentication Troubleshooting Checklist

1. Is the server running?
2. Are environment variables correctly set?
3. Are database tables properly created?
4. Check server logs for errors
5. Check browser console for frontend errors
6. Verify Resend API is working via the test endpoint
7. Is JWT_SECRET consistent and available?
8. Run database queries to check user state (emailVerified, tokens, etc.) 