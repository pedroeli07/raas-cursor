// Tipos para a aplicação RaaS Solar

// Tipos de usuários do sistema
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ADMIN_STAFF = 'admin_staff',
  CUSTOMER = 'customer',
  ENERGY_RENTER = 'energy_renter',
  USER = 'user'
}

// Tipo de unidade (consumidora ou geradora)
export type InstallationType = 'CONSUMER' | 'GENERATOR';

// Interface de usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
  profileImageUrl?: string;
}

// Interface de instalação
export interface Installation {
  id: string;
  installationNumber: string;
  type: InstallationType;
  address?: Address;
  ownerId?: string;
  owner?: User;
  distributorId: string;
  distributor?: Distributor;
  createdAt: Date;
  updatedAt: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

// Interface da distribuidora
export interface Distributor {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface de endereço
export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface de alocação (relação entre geradora e consumidora)
export interface Allocation {
  id: string;
  generatorId: string;
  generator?: Installation;
  consumerId: string;
  consumer?: Installation;
  quota: number; // percentual de 0 a 100
  createdAt: Date;
  updatedAt: Date;
}

// Interface de registro de energia
export interface EnergyRecord {
  id: string;
  installationId: string;
  installation?: Installation;
  referenceDate: Date; // Mês de referência
  generation?: number; // kWh gerados (para geradoras)
  consumption?: number; // kWh consumidos (para consumidoras)
  transfer?: number; // kWh transferidos para a distribuidora (geradoras)
  receipt?: number; // kWh recebidos da geradora (consumidoras)
  compensation?: number; // kWh compensados no mês
  balance?: number; // Saldo de créditos em kWh
  expirationDate?: Date; // Data de expiração dos créditos (5 anos)
  createdAt: Date;
  updatedAt: Date;
}

// Interface de fatura
export interface Invoice {
  id: string;
  userId: string;
  user?: User;
  installationId: string;
  installation?: Installation;
  referenceDate: Date;
  dueDate: Date;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
  paidAt?: Date;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELED = 'CANCELED'
}

// Interface de notificação
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SYSTEM' | 'INVOICE' | 'CREDIT' | 'SUPPORT';
  status: 'READ' | 'UNREAD';
  link?: string;
  createdAt: Date;
  readAt?: Date;
}

// Interface para dados do dashboard
export interface DashboardData {
  totalUsers: number;
  totalInstallations: {
    generators: number;
    consumers: number;
  };
  totalEnergyGenerated: number; // kWh
  totalEnergySaved: number; // kWh
  recentInvoices: Invoice[];
  recentNotifications: Notification[];
}

// Interface para estatísticas do usuário cliente
export interface CustomerStats {
  totalSaved: number; // Valor economizado em R$
  currentCredits: number; // Créditos atuais em kWh
  energyUsage: number; // kWh consumidos no mês
  energyReceived: number; // kWh recebidos no mês
  monthlySavings: number[]; // Economia por mês (últimos 12 meses)
}

// Interface para estatísticas do usuário locador
export interface RenterStats {
  totalGenerated: number; // kWh gerados total
  monthlyGeneration: number; // kWh gerados no mês
  allocatedPercentage: number; // % da energia alocada
  revenues: number; // Receitas no mês em R$
  monthlyGeneration12m: number[]; // Geração por mês (últimos 12 meses)
}

// Interface para upload de dados
export interface EnergyDataUpload {
  distributorId: string;
  referenceDate: Date;
  fileUrl: string;
  status: 'PROCESSING' | 'COMPLETED' | 'ERROR';
  processedRows?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para convite
export interface Invitation {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  createdBy: string;
  createdAt: Date;
}

// Interface para suporte/ticket
export interface SupportTicket {
  id: string;
  userId: string;
  user?: User;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedToId?: string;
  assignedTo?: User;
  createdAt: Date;
  updatedAt: Date;
  messages: SupportMessage[];
}

// Interface para mensagens de suporte
export interface SupportMessage {
  id: string;
  ticketId: string;
  userId: string;
  user?: User;
  message: string;
  attachments?: string[];
  createdAt: Date;
}

export interface EnergyBalance {
  id: string;
  installationId: string;
  installation?: Installation;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithDetailsDto extends User {
  installations?: Installation[];
  allocations?: Allocation[];
  invoices?: Invoice[];
  energyBalance?: EnergyBalance;
  metadata?: Record<string, any>;
} 