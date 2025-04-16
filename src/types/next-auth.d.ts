import { Role } from '@/hooks/use-auth'
import "next-auth"
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    } & DefaultSession["user"];
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
  }
}

// Fix invoice schema errors
declare module "@/lib/db/schema" {
  interface Invoice {
    discountPercentage?: number
    savingsPercentage?: number
    savings?: number
    invoiceAmount?: number
    customerId?: string
    lastWhatsAppSentAt?: Date
    pdfGeneratedAt?: Date
    lastEmailSentAt?: Date
  }
}

// Extend JWT with custom fields
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
} 