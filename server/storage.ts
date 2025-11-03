import { type User, type InsertUser, type Conversation, type InsertConversation } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon to use ws for WebSocket
neonConfig.webSocketConstructor = ws;

// PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool });

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Brain Core & Learning methods
  getRecentConversations(userId: string, limit: number): Promise<Conversation[]>;
  saveConversation(data: InsertConversation): Promise<Conversation>;
  storeMemory(userId: string, memory: string, importance: number): Promise<void>;
  getBrainCoreStats(): Promise<{ totalConversations: number } | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private memories: Map<string, Array<{ memory: string; importance: number; timestamp: Date }>>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.memories = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getRecentConversations(userId: string, limit: number): Promise<Conversation[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
    
    return userConversations;
  }

  async saveConversation(data: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      id,
      message: data.message,
      response: data.response,
      userId: data.userId || null,
      context: data.context || null,
      createdAt: new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async storeMemory(userId: string, memory: string, importance: number): Promise<void> {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, []);
    }
    
    const userMemories = this.memories.get(userId)!;
    userMemories.push({
      memory,
      importance,
      timestamp: new Date()
    });
    
    // Keep only top 100 memories
    userMemories.sort((a, b) => b.importance - a.importance);
    if (userMemories.length > 100) {
      userMemories.splice(100);
    }
  }

  async getBrainCoreStats(): Promise<{ totalConversations: number } | null> {
    return {
      totalConversations: this.conversations.size
    };
  }
}

export const storage = new MemStorage();
