// Path: src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PrismaClient } from '@prisma/client';
import * as schema from './schema';
import { createLogger } from '@/lib/utils/logger';
import { eq } from 'drizzle-orm';

const logger = createLogger('Database');

// For Prisma compatibility with existing code
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Connection string from environment variables
const connectionString = process.env.DATABASE_URL || '';

// Create Postgres connection for Drizzle
const queryClient = postgres(connectionString);

// Create Drizzle client with schema
const drizzleDb = drizzle(queryClient, { schema });

// Create a hybrid db object that works with both Prisma and Drizzle patterns
export const db = {
  ...prisma,
  // Add drizzle-specific operations
  query: {
    invoices: {
      findFirst: async ({ where, with: relations }: any) => {
        try {
          logger.info('Finding invoice with Drizzle');
          const result = await drizzleDb.query.invoices.findFirst({
            where,
            with: relations
          });
          return result;
        } catch (error) {
          logger.error('Error finding invoice with Drizzle, falling back to Prisma', { error });
          
          // Convert 'with' to Prisma 'include'
          const include = Object.keys(relations || {}).reduce((acc: any, key) => {
            acc[key] = relations[key] === true ? true : relations[key];
            return acc;
          }, {});
          
          return prisma.invoice.findFirst({
            where,
            include
          });
        }
      }
    }
  },
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => {
        try {
          logger.info(`Updating ${table.name || 'record'} with Drizzle`);
          return drizzleDb.update(table).set(data).where(condition);
        } catch (error) {
          logger.error(`Error updating with Drizzle, falling back to Prisma`, { error });
          
          // Convert drizzle condition to Prisma format if needed
          // This is a simplified approach and may need refinement based on actual usage
          let prismaWhere: any = {};
          
          // Handle common case of eq() condition
          if (condition.left && condition.operator === '=' && condition.right) {
            prismaWhere[condition.left.name] = condition.right;
          } else {
            // Fallback for more complex conditions - this may need customization
            prismaWhere = { id: condition }; 
          }
          
          return prisma.invoice.update({
            where: prismaWhere,
            data
          });
        }
      }
    })
  }),
  // Expose drizzle directly for advanced usage
  drizzle: drizzleDb,
  eq // Export eq helper function
};

// Make db available globally in development for easier debugging
if (process.env.NODE_ENV !== 'production') {
  (global as any).db = db;
} 