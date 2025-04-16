# RaaS Solar Platform - Business Rules Documentation

## Core Business Model

The RaaS ("Roof as a Service") Solar platform connects consumers who want to save on electricity bills through clean energy with solar plant owners who can rent their excess capacity. The platform owner purchases excess energy from solar plants and offers it to customers who cannot install solar panels at their locations, providing them with discounts on their energy bills.

## User Roles and Access Control (RBAC)

1. **super_admin**:
   - Has complete control over the platform
   - Initially, only `pedro-eli@hotmail.com` can register directly
   - Can invite other users of any role
   - Manages all aspects of the platform including users, invitations, installations, distributors, pricing, invoices, and settings

2. **admin**:
   - Manages users, invitations, installations, distributors, pricing, invoices, and settings
   - Cannot modify super_admin accounts or critical system settings

3. **admin_staff**:
   - Basic administrative functions and customer support
   - Limited management capabilities
   - Can view and process data but has restricted edit rights

4. **customer**:
   - End consumer who subscribes to the service to receive discounts
   - Can view their own installations, energy consumption, credits, and invoices
   - Cannot see other customers' data

5. **energy_renter**:
   - Solar plant owner
   - Can view their generating installations and the consumers receiving their energy
   - Monitors generation and revenue statistics

6. **user**:
   - Basic user (typically before defining a specific role)
   - Limited access until assigned a specific role

## Invitation System

- New user registration (except the initial super_admin) MUST occur through an invitation link sent by a super_admin or admin
- Each invitation specifies the role of the new user
- Invitations have an expiration date (typically 7 days)
- Invitation statuses: PENDING, ACCEPTED, EXPIRED, CANCELED

## Installation and Energy Data Concepts

### Installation Types

- **Geradora (Generator)**: These are the solar plants/installations that generate energy.
- **Consumidora (Consumer)**: These are the units that receive energy from generator installations.

### Installation Number

The installation number is a unique identifier for each Cemig meter, comparable to a "CPF" (unique ID) for each meter. This number uniquely identifies each active and connected Cemig meter regardless of whether it's a generator or consumer.

### Installation Management

- Installations must be associated with a distributor (e.g., CEMIG)
- Installations can be marked as ACTIVE, INACTIVE, or PENDING
- When creating a new installation, the system must verify the installation number is unique for the specified distributor
- Creating an installation requires an address and type (GENERATOR or CONSUMER)
- Installations can optionally be associated with a user (owner)
- Installation owners must have the role CUSTOMER or ENERGY_RENTER

### Energy Data Fields

#### Energy Flow Concepts

1. **Geração (Generation)**: 
   - The amount of energy produced by a generator installation.
   - Measured in kWh.

2. **Transferido (Transferred)**: 
   - How much energy the generator transferred to consumer units in the month.
   - The sum of all transferred energy from a generator should match its generation (minus any direct consumption).

3. **Recebimento (Receipt)**:
   - How much energy each consumer unit actually received from generators.
   - Based on the quota and the generator's production.

4. **Consumo (Consumption)**: 
   - How much energy a unit actually used/consumed during the month.
   - This is the total energy consumed regardless of source.

5. **Compensação (Compensation)**: 
   - When a unit receives energy, it can use it in the same month (compensated).
   - Calculated as: `Compensation = min(Receipt, Consumption)`
   - In other words, it's the actual amount of received energy that was used to offset consumption.

#### Credit/Balance Concepts

6. **Saldo Anterior (Previous Balance)**: 
   - The accumulated balance of received but not compensated energy over time.
   - This is a running total of energy credits.

7. **Saldo Atual (Current Balance)**: 
   - The updated balance after monthly operations.
   - Calculated as: `CurrentBalance = PreviousBalance + Receipt - Compensation`

8. **Saldo Expirado (Expired Balance)**: 
   - Amount of balance that has expired (credits are valid for 5 years).

9. **Quantidade Saldo a Expirar (Expiring Balance Amount)**: 
   - Amount of credits that will expire soon.

10. **Período Saldo a Expirar (Expiring Balance Period)**: 
    - The period when the credits will expire.

### Allocation and Distribution

11. **Quota (%)**: 
    - The percentage of energy that the generator sends to each consumer unit.
    - The sum of quotas for all consumer units associated with a generator must be 100%.
    - For example, if a generator produces 10,000 kWh and a consumer has a 30% quota, they will receive 3,000 kWh.

## Energy Credit System

The energy credit system operates by these key principles:

1. **Credit Generation**: 
   - When a unit receives more energy than it consumes, the excess becomes credit.
   - Formula: `NewCredits = Receipt - Compensation`

2. **Credit Usage**: 
   - If a unit consumes more energy than it receives in a month, it uses part of its accumulated balance (credits) to compensate.
   - This happens automatically when `Consumption > Receipt`

3. **Credit Expiration**: 
   - Credits expire after 5 years.
   - The system tracks when credits will expire and how much is expiring.

## Business Process Rules

### For Generator Units

1. A generator produces energy (Geração).
2. It transfers energy to consumer units based on their quotas (Transferido).
3. It may also consume some energy directly.
4. The generation and transfer are tracked monthly.

### For Consumer Units

1. A consumer receives energy from generators (Recebimento).
2. It uses energy for its consumption needs (Consumo).
3. The amount of received energy used to offset consumption is tracked (Compensação).
4. Any excess received energy becomes credit and is added to the balance.
5. If consumption exceeds receipt, the unit uses its accumulated balance.

### Installation and User Relationships

- A user can own multiple installations.
- An installation must be associated with a distributor (e.g., CEMIG).
- An installation can be either a generator or a consumer.
- Generator installations distribute energy to consumer installations based on quota percentages.

## Distributor Management

- Distributors represent energy distribution companies (e.g., CEMIG, CELESC)
- Each distributor must have a unique name and code
- Distributors must have an address
- Administrators can set kWh prices for distributors
- kWh prices have a start date and can have an end date (for historical pricing)
- The system uses the most recent active price for calculations
- Each distributor can have multiple installations associated with it

## File Upload and Data Import

### Energy Data Upload

1. **Supported File Types**: Only Excel (.xlsx) files are supported for data imports
2. **Upload Process**:
   - Admin selects a distributor when uploading a file
   - The system validates the file format
   - Data is processed and matched to existing installations based on installation numbers
   - If installations don't exist, they can be auto-created by the system
   - Uploads are tracked in the EnergyDataUploadBatch table
   - Each upload creates a batch record with status: processing → success/failed

3. **Data Mapping**:
   - The system parses the Excel file to extract energy data fields
   - Field names may vary slightly between distributors (e.g., "Geração" vs "Geracao")
   - Data is mapped to standardized fields in the database

4. **Validation Rules**:
   - Installation numbers must exist in the system or be auto-created
   - Period (month/year) must be specified
   - Numeric values (consumption, generation, etc.) are converted to appropriate units

5. **Error Handling**:
   - The system tracks errors, not found installations, and processing statistics
   - Uploads may be partially successful (some records processed, some failed)

## Notification System

1. **Notification Types**:
   - SYSTEM: System-generated notifications (e.g., new features, maintenance)
   - INVOICE: Invoice-related notifications (e.g., new invoice, payment reminder)
   - ENERGY: Energy-related notifications (e.g., generation reports, credits expiring)
   - ADMIN: Administrative notifications (e.g., new user invitation)

2. **Notification Statuses**:
   - UNREAD: New notification that hasn't been viewed
   - READ: Notification that has been viewed
   - ARCHIVED: Hidden from primary view but still accessible

3. **Delivery Rules**:
   - Notifications are user-specific
   - Critical notifications may also be sent via email
   - Notifications can have a relatedId linking to a specific entity (e.g., an invoice)
   - System auto-generates notifications for significant events

## Help Request System

1. **Help Request Workflow**:
   - Users create help requests with a title and message
   - Admins can claim and respond to help requests
   - Multiple responses can be added to a single help request

2. **Help Request Statuses**:
   - OPEN: New help request awaiting admin attention
   - IN_PROGRESS: Being worked on by an admin
   - RESOLVED: Issue has been resolved
   - CLOSED: Request is closed (may be resolved or abandoned)

## Invoice Management

1. **Invoice Generation**:
   - Invoices are generated monthly based on energy consumption data
   - Admin can manually generate invoices or the system can do it automatically
   - Invoices consider the kWh price, consumption, and applicable discounts

2. **Invoice Statuses**:
   - PENDING: Invoice generated but not yet paid
   - PAID: Invoice paid in full
   - OVERDUE: Payment deadline has passed
   - CANCELED: Invoice canceled by admin

3. **Payment Handling**:
   - System can generate payment slips/boletos
   - Admins can manually mark invoices as paid
   - Integration with payment processors is possible

## Security and Authentication

1. **Authentication**:
   - Email/password login
   - JWT (JSON Web Token) based authentication
   - Tokens are valid for 3 days of inactivity before requiring re-login
   - Email verification for new accounts

2. **Password Management**:
   - Password reset via email link
   - Password minimum complexity requirements
   - Failed login attempt limits

3. **Two-Factor Authentication**:
   - Optional 2FA for enhanced security
   - Email or authenticator app as second factor

## Glossary

- **Instalação (Installation)**: A Cemig meter, which can be either a generator or consumer.
- **Geradora (Generator)**: Solar plant/installation that produces energy.
- **Consumidora (Consumer)**: Unit that receives energy from generators.
- **Distribuidora (Distributor)**: Energy distribution company (e.g., CEMIG).
- **Quota**: Percentage of a generator's production allocated to a specific consumer.
- **Período (Period)**: The month/year format (MM/AAAA) for which the data applies.
- **kWh (kilowatt-hour)**: Unit of energy measurement.
- **Compensação (Compensation)**: Amount of received energy used to offset consumption.
- **Saldo (Balance)**: Accumulated energy credits.
- **Convite (Invitation)**: Link sent to invite a new user to the platform.
- **Boleto/Fatura (Invoice)**: Payment document for solar energy services. 