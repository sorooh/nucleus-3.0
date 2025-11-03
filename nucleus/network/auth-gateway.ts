import { Router, Request, Response } from 'express';
import { authModule } from '../core/auth-module';
import { userManager } from '../core/user-manager';
import { sessionManager } from '../core/session-manager';
import { rolePolicy } from '../core/role-policy';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const response = await authModule.execute({
      action: 'register',
      data: req.body
    });

    if (response.success) {
      return res.status(201).json({
        success: true,
        data: response.data
      });
    } else {
      return res.status(400).json({
        success: false,
        error: response.error
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const response = await authModule.execute({
      action: 'login',
      data: req.body
    });

    if (response.success && response.data?.user) {
      // Store user in session
      (req.session as any).user = response.data.user;
      
      return res.status(200).json({
        success: true,
        data: response.data
      });
    } else {
      return res.status(401).json({
        success: false,
        error: response.error
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const response = await authModule.execute({
      action: 'logout',
      data: { token }
    });

    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/validate', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token is required'
      });
    }

    const response = await authModule.execute({
      action: 'validate',
      data: { token }
    });

    if (response.success) {
      return res.status(200).json({
        success: true,
        data: response.data
      });
    } else {
      return res.status(401).json({
        success: false,
        error: response.error
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token is required'
      });
    }

    const user = await userManager.validateSession(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    const authStatus = await authModule.getStatus();
    const userStatus = await userManager.getStatus();
    const sessionStatus = await sessionManager.getStatus();
    const policyStatus = await rolePolicy.getStatus();

    return res.status(200).json({
      success: true,
      data: {
        auth: authStatus,
        users: userStatus,
        sessions: sessionStatus,
        roles: policyStatus
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export function setupAuthAPI(app: any) {
  app.use('/api/auth', router);
  console.log('🔐 Auth API Gateway initialized');
}
