import { PrismaClient } from '@prisma/client'
import dns from 'dns'

if (typeof window === 'undefined') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  } catch {
    // Ignore if not allowed or in edge runtime
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
