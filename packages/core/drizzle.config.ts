import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
