declare module "drizzle-orm" {
  export function eq<T>(column: T, value: any): any;
}

declare module "drizzle-orm/postgres-js" {
  export function drizzle(client: any, options?: any): any;
} 