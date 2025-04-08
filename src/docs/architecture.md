# RaaS Solar System Architecture

## Authentication System Architecture

### Overview

The authentication system is designed to provide secure access to the RaaS Solar platform. It includes user registration, email verification, two-factor authentication, login, and role-based access control.

### Components

#### 1. User Management
- **Registration**: New users can register with invitation or be super admin
- **Email Verification**: All new accounts require email verification
- **Two-Factor Authentication**: Optional email-based 2FA for enhanced security
- **Password Management**: Includes forgot password and reset functionality

#### 2. Authentication Flow

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│              │     │               │     │              │
│  Register    │────►│ Verify Email  │────►│    Login     │
│              │     │               │     │              │
└──────────────┘     └───────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│              │     │               │     │              │
│  Dashboard   │◄────│ JWT Token     │◄────│ 2FA (if      │
│  (by role)   │     │ Generation    │     │ enabled)     │
│              │     │               │     │              │
└──────────────┘     └───────────────┘     └──────────────┘
```

#### 3. Security Layers

1. **Password Security**:
   - Passwords are hashed using bcrypt
   - Minimum password length enforced
   - Password reset flow secure with unique tokens

2. **Email Verification**:
   - 6-digit verification codes
   - Codes expire after 30 minutes
   - Limited to 3 code requests per 5 minutes to prevent abuse

3. **Two-Factor Authentication**:
   - Email-based verification codes
   - Codes expire after 10 minutes
   - Limited to 3 code requests per 5 minutes
   - Enabled by default, can be disabled by users

4. **JWT Based Sessions**:
   - Stateless authentication with signed JWT
   - Short token expiry (1 hour) to limit risk
   - Contains minimal claims (userId, email, role)
   - Validated on every protected request

5. **Role-Based Access Control**:
   - Roles: SUPER_ADMIN, ADMIN, ADMIN_STAFF, CUSTOMER, ENERGY_RENTER
   - Middleware validates role permissions on protected routes
   - Redirect to unauthorized page for insufficient permissions

### Database Models

#### User Model
```
User {
  id: string (PK)
  name: string?
  password: string (hashed)
  role: Enum(Role)
  contactId: string (FK to Contact)
  addressId: string? (FK to Address)
  emailVerified: boolean
  isTwoFactorEnabled: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Contact Model
```
Contact {
  id: string (PK)
  email: string
  phone: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### VerificationCode Model
```
VerificationCode {
  id: string (PK)
  code: string
  userId: string (FK to User)
  type: Enum(VerificationType) // EMAIL_VERIFICATION or LOGIN
  expiresAt: DateTime
  usedAt: DateTime?
  createdAt: DateTime
}
```

#### PasswordReset Model
```
PasswordReset {
  id: string (PK)
  token: string
  userId: string (FK to User)
  expiresAt: DateTime
  usedAt: DateTime?
  createdAt: DateTime
}
```

#### Invitation Model
```
Invitation {
  id: string (PK)
  email: string
  name: string?
  role: Enum(Role)
  token: string
  status: Enum(InvitationStatus)
  createdAt: DateTime
  expiresAt: DateTime
}
```

### API Endpoints

#### Authentication Routes

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login with email and password
- `POST /api/auth/verify-email`: Verify email with verification code
- `POST /api/auth/verify-two-factor`: Verify 2FA code
- `POST /api/auth/forgot-password`: Request password reset
- `GET /api/auth/validate-token`: Validate password reset token
- `POST /api/auth/reset-password`: Reset password with token
- `POST /api/auth/resend-verification`: Resend verification code
- `PUT /api/auth/settings/two-factor`: Toggle 2FA

#### Middleware Protection

All routes are processed through middleware that:
1. Verifies JWT for protected routes
2. Validates role permissions
3. Redirects to appropriate pages based on authentication/authorization status
4. Adds user information to API request headers for backend processing

### Email Service

The application uses Resend for email delivery:

1. **Email Templates**:
   - Registration verification
   - Two-factor authentication
   - Password reset
   - Invitation emails

2. **Implementation**:
   - Templated HTML emails
   - Error handling with retry logic
   - Separate logger for email operations
   - Development mode redirection for testing

### Development Features

In development mode, the system provides:
1. Fixed verification codes (`123456`)
2. Detailed logging of sensitive information
3. Email redirection to developer email
4. Test endpoints for verifying functionality 