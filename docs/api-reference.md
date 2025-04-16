# RaaS Solar API Reference

This document provides a reference for all API endpoints in the RaaS Solar application.

## Authentication

### Login

**Endpoint**: `POST /api/auth/login`

**Description**: Authenticates a user and returns a JWT token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "ADMIN"
  },
  "token": "jwt_token"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

### Register (By Invitation Only)

**Endpoint**: `POST /api/auth/register`

**Description**: Registers a new user with a valid invitation token

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "password": "password",
  "token": "invitation_token"
}
```

**Response**:
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "CUSTOMER"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `401 Unauthorized`: Invalid or expired invitation token
- `409 Conflict`: Email already in use
- `500 Internal Server Error`: Server error

### Setup (First Super Admin)

**Endpoint**: `POST /api/auth/setup`

**Description**: Initial setup to create the first super admin (one-time use)

**Request Body**:
```json
{
  "email": "admin@example.com",
  "name": "Admin Name",
  "password": "password"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Super admin created successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `403 Forbidden`: Setup already completed
- `500 Internal Server Error`: Server error

## Invitations

### Create Invitation

**Endpoint**: `POST /api/invite`

**Description**: Create a new invitation (restricted to SUPER_ADMIN and ADMIN roles)

**Request Body**:
```json
{
  "email": "invitee@example.com",
  "name": "Invitee Name", // Optional
  "role": "CUSTOMER",
  "message": "Custom invitation message" // Optional
}
```

**Response**:
```json
{
  "invitation": {
    "id": "invitation_id",
    "email": "invitee@example.com",
    "name": "Invitee Name",
    "role": "CUSTOMER",
    "status": "PENDING",
    "message": "Custom invitation message",
    "sender": {
      "id": "sender_id",
      "name": "Sender Name"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "expiresAt": "2023-01-08T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: User or invitation already exists
- `500 Internal Server Error`: Server error

### List Invitations

**Endpoint**: `GET /api/invite`

**Description**: List all invitations (restricted to SUPER_ADMIN, ADMIN, and ADMIN_STAFF roles)

**Query Parameters**:
- `status`: Filter by status (PENDING, ACCEPTED, EXPIRED, REVOKED)
- `role`: Filter by role
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response**:
```json
{
  "invitations": [
    {
      "id": "invitation_id",
      "email": "invitee@example.com",
      "name": "Invitee Name",
      "role": "CUSTOMER",
      "status": "PENDING",
      "message": "Custom invitation message",
      "sender": {
        "id": "sender_id",
        "name": "Sender Name"
      },
      "createdAt": "2023-01-01T00:00:00.000Z",
      "expiresAt": "2023-01-08T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Revoke Invitation

**Endpoint**: `DELETE /api/invite/:id`

**Description**: Revoke an invitation (restricted to SUPER_ADMIN and ADMIN roles)

**URL Parameters**:
- `id`: Invitation ID

**Response**:
```json
{
  "success": true,
  "message": "Invitation revoked successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Invitation not found
- `500 Internal Server Error`: Server error

## Distributors

### Create Distributor

**Endpoint**: `POST /api/distributors`

**Description**: Create a new distributor (restricted to SUPER_ADMIN and ADMIN roles)

**Request Body**:
```json
{
  "name": "Distributor Name",
  "code": "DIST123", // Optional
  "price_per_kwh": 0.75
}
```

**Response**:
```json
{
  "distributor": {
    "id": "distributor_id",
    "name": "Distributor Name",
    "code": "DIST123",
    "price_per_kwh": 0.75,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Distributor with this name already exists
- `500 Internal Server Error`: Server error

### List Distributors

**Endpoint**: `GET /api/distributors`

**Description**: List all distributors

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by name or code

**Response**:
```json
{
  "distributors": [
    {
      "id": "distributor_id",
      "name": "Distributor Name",
      "code": "DIST123",
      "price_per_kwh": 0.75,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `500 Internal Server Error`: Server error

## Addresses

### Create Address

**Endpoint**: `POST /api/addresses`

**Description**: Create a new address

**Request Body**:
```json
{
  "street": "Street Name",
  "number": "123",
  "complement": "Apt 4B", // Optional
  "neighborhood": "Neighborhood Name",
  "city": "City Name",
  "state": "State",
  "zip": "12345-678"
}
```

**Response**:
```json
{
  "address": {
    "id": "address_id",
    "street": "Street Name",
    "number": "123",
    "complement": "Apt 4B",
    "neighborhood": "Neighborhood Name",
    "city": "City Name",
    "state": "State",
    "zip": "12345-678",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `401 Unauthorized`: Missing authentication
- `500 Internal Server Error`: Server error

## Installations

### Create Installation

**Endpoint**: `POST /api/installations`

**Description**: Create a new installation (restricted to SUPER_ADMIN and ADMIN roles)

**Request Body**:
```json
{
  "installationNumber": "INST123456",
  "type": "GENERATOR", // GENERATOR or CONSUMER
  "distributorId": "distributor_id",
  "addressId": "address_id",
  "ownerId": "user_id" // Optional
}
```

**Response**:
```json
{
  "installation": {
    "id": "installation_id",
    "installationNumber": "INST123456",
    "type": "GENERATOR",
    "distributor": {
      "id": "distributor_id",
      "name": "Distributor Name"
    },
    "address": {
      "id": "address_id",
      "street": "Street Name",
      "city": "City Name"
    },
    "owner": {
      "id": "user_id",
      "name": "Owner Name"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or validation errors
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Distributor, address, or owner not found
- `409 Conflict`: Installation number already exists
- `500 Internal Server Error`: Server error

### List Installations

**Endpoint**: `GET /api/installations`

**Description**: List installations

**Query Parameters**:
- `type`: Filter by type (GENERATOR or CONSUMER)
- `distributorId`: Filter by distributor
- `ownerId`: Filter by owner
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by installation number

**Response**:
```json
{
  "installations": [
    {
      "id": "installation_id",
      "installationNumber": "INST123456",
      "type": "GENERATOR",
      "distributor": {
        "id": "distributor_id",
        "name": "Distributor Name"
      },
      "address": {
        "id": "address_id",
        "street": "Street Name",
        "city": "City Name"
      },
      "owner": {
        "id": "user_id",
        "name": "Owner Name"
      },
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `500 Internal Server Error`: Server error

## Health Check

### Check API Health

**Endpoint**: `GET /api/health`

**Description**: Check if the API is running properly

**Response**:
```json
{
  "status": "ok",
  "environment": "development",
  "version": "1.0.0",
  "baseUrl": "http://localhost:3000",
  "serverTime": "2023-01-01T00:00:00.000Z"
}
```

## Users

### List Users

**Endpoint**: `GET /api/users`

**Description**: List users (restricted to SUPER_ADMIN, ADMIN, and ADMIN_STAFF roles)

**Query Parameters**:
- `role`: Filter by role
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by name or email

**Response**:
```json
{
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "CUSTOMER",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "profileCompleted": true
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing authentication
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error 