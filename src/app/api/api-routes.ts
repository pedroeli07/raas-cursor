// src/app/api/api-routes.ts
// Este arquivo contém todas as rotas da API utilizadas no sistema

export const API_ROUTES = {
  // Autenticação
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    resetPassword: '/api/auth/reset-password',
    verifyEmail: '/api/auth/verify-email',
    verifyTwoFactor: '/api/auth/verify-two-factor',
    fillProfile: '/api/auth/fill-profile',
  },
  
  // Usuários
  users: {
    me: '/api/users/me',
    profile: '/api/users/profile',
    byId: (id: string) => `/api/users/${id}`,
    list: '/api/users',
    installations: (userId: string) => `/api/users/${userId}/installations`,
  },
  
  // Instalações
  installations: {
    list: '/api/installations',
    byId: (id: string) => `/api/installations/${id}`,
    create: '/api/installations',
  },
  
  // Distribuidoras
  distributors: {
    list: '/api/distributors',
    byId: (id: string) => `/api/distributors/${id}`,
  },

  // Configurações
  settings: {
    list: '/api/settings',
    byId: (id: string) => `/api/settings/${id}`,
  },

  // Invoices
  invoices: {
    list: '/api/invoices',
    byId: (id: string) => `/api/invoices/${id}`,
  },

  // Notifications
  notifications: {
    list: '/api/notifications',
  },

  // Test
  test: {
    emailCheck: '/api/test/email-check',
  },

  // Invitations
  invitations: {
    list: '/api/invitations',
    byId: (id: string) => `/api/invitations/${id}`,
  },

  // Dev
  dev: {
    invitations: '/api/dev/invitations',
  },

  // Logs
  logs: {
    list: '/api/logs',
  },

  //adresses
  adresses: {
    list: '/api/adresses',
    byId: (id: string) => `/api/adresses/${id}`,
  },

  //contacts
  contacts: {
    list: '/api/contacts',
    byId: (id: string) => `/api/contacts/${id}`,
  },

  //documents 
  documents: {
    list: '/api/documents',
    byId: (id: string) => `/api/documents/${id}`,
  },

 //help   
 help: {
  list: '/api/help',
  byId: (id: string) => `/api/help/${id}`,
 },

 //health 
 health: {
  list: '/api/health',
  byId: (id: string) => `/api/health/${id}`,
 },

 //logs
 
 
  

};

// URLs absolutas com base no prefixo da API
export function getApiUrl(route: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}${route}`;
} 