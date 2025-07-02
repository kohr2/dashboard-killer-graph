import { injectable, singleton } from 'tsyringe';
import { createClient, RedisClientType } from 'redis';
import { logger } from '@shared/utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@injectable()
@singleton()
export class CacheService {
  private client: RedisClientType;
  private connected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.connect();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      await this.connect();
      const serialized = JSON.stringify(value);
      
      if (options?.ttl) {
        await this.client.setEx(key, options.ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      await this.connect();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error('Cache invalidate error:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }
}

// Cache decorators for common patterns
export function Cached(ttl: number = 300) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${(target as any).constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      const cacheService = new CacheService();
      
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cacheService.set(cacheKey, result, { ttl });
      
      return result;
    };
  };
} 