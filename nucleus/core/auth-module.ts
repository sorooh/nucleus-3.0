import { EventEmitter } from "events";
import { userManager } from "./user-manager";
import { sessionManager } from "./session-manager";
import { rolePolicy } from "./role-policy";
import type { User } from "../../shared/schema";

export interface AuthModuleStatus {
  active: boolean;
  userManager: boolean;
  sessionManager: boolean;
  rolePolicy: boolean;
}

export interface AuthRequest {
  action: 'register' | 'login' | 'logout' | 'validate' | 'check-permission';
  data: any;
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class AuthModule extends EventEmitter {
  public name: string = 'auth-module';
  private active: boolean = false;

  async initialize(): Promise<void> {
    if (this.active) {
      console.log('🔐 Auth Module already initialized - skipping');
      return;
    }

    await userManager.initialize();
    await sessionManager.initialize();
    await rolePolicy.initialize();

    console.log('🔐 Auth Module initialized - All subsystems ready');
    this.active = true;
  }

  async execute(task: any): Promise<any> {
    return await this.process(task);
  }

  status(): { active: boolean; health: number } {
    return {
      active: this.active,
      health: this.active ? 100 : 0,
    };
  }

  async process(request: AuthRequest): Promise<AuthResponse> {
    try {
      switch (request.action) {
        case 'register':
          return await this.handleRegister(request.data);
        
        case 'login':
          return await this.handleLogin(request.data);
        
        case 'logout':
          return await this.handleLogout(request.data);
        
        case 'validate':
          return await this.handleValidate(request.data);
        
        case 'check-permission':
          return await this.handleCheckPermission(request.data);
        
        default:
          return {
            success: false,
            error: 'Unknown auth action',
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async handleRegister(data: any): Promise<AuthResponse> {
    const { username, password, email, role } = data;

    if (!username || !password || !email) {
      return {
        success: false,
        error: 'Username, password, and email are required',
      };
    }

    const user = await userManager.register({
      username,
      password,
      email,
      role: role || 'user',
    });

    this.emit('user:registered', { userId: user.id, username: user.username });

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async handleLogin(data: any): Promise<AuthResponse> {
    const { username, password } = data;

    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required',
      };
    }

    const { user, token } = await userManager.login({ username, password });

    this.emit('user:logged-in', { userId: user.id, username: user.username });

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      },
    };
  }

  private async handleLogout(data: any): Promise<AuthResponse> {
    const { token } = data;

    if (!token) {
      return {
        success: false,
        error: 'Token is required',
      };
    }

    await userManager.logout(token);

    this.emit('user:logged-out', { token });

    return {
      success: true,
      data: { message: 'Logged out successfully' },
    };
  }

  private async handleValidate(data: any): Promise<AuthResponse> {
    const { token } = data;

    if (!token) {
      return {
        success: false,
        error: 'Token is required',
      };
    }

    const user = await userManager.validateSession(token);

    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    };
  }

  private async handleCheckPermission(data: any): Promise<AuthResponse> {
    const { role, resource } = data;

    if (!role || !resource) {
      return {
        success: false,
        error: 'Role and resource are required',
      };
    }

    const hasPermission = await rolePolicy.hasPermission(role, resource);

    return {
      success: true,
      data: { hasPermission },
    };
  }

  async getStatus(): Promise<AuthModuleStatus> {
    const userManagerStatus = await userManager.getStatus();
    const sessionManagerStatus = await sessionManager.getStatus();
    const rolePolicyStatus = await rolePolicy.getStatus();

    return {
      active: this.active,
      userManager: userManagerStatus.active,
      sessionManager: sessionManagerStatus.active,
      rolePolicy: rolePolicyStatus.active,
    };
  }

  async shutdown(): Promise<void> {
    await userManager.shutdown();
    await sessionManager.shutdown();
    await rolePolicy.shutdown();

    console.log('🔐 Auth Module shutting down...');
    this.active = false;
  }
}

export const authModule = new AuthModule();
