import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, type User, type NewUser } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password'>;
  error?: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
      
      if (existing) {
        return { success: false, error: 'Email already registered' };
      }

      // Validate password
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const newUser: NewUser = {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        role: 'user',
        isActive: true,
      };

      const result = await db.insert(users).values(newUser).returning().get();

      // Return user without password
      const { password: _, ...userWithoutPassword } = result;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user
      const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();

      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Update last login
      await db.update(users)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(users.id, user.id));

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await db.select().from(users).where(eq(users.id, id)).get();
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create token payload from user
   */
  createTokenPayload(user: Omit<User, 'password'>): TokenPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
    };
  }
}

export const authService = new AuthService();
