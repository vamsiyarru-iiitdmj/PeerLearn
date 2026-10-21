import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InsforgeService } from '../../insforge/insforge.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    private insforgeService: InsforgeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing or invalid');
    }

    try {
      const userClient = this.insforgeService.getUserClient(token);
      const { data: user, error: authError } = await userClient.auth.getCurrentUser();

      if (authError || !user) {
        throw new UnauthorizedException(authError?.message || 'Invalid or expired session');
      }

      // Check application student record linked to this auth user
      const admin = this.insforgeService.getAdminClient();
      const { data: students } = await admin.database
        .from('students')
        .select('id, roll_number, full_name, institute_email')
        .eq('auth_user_id', user.id)
        .limit(1);

      const student = students && students.length > 0 ? students[0] : null;

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        accessToken: token,
        studentId: student?.id,
        rollNumber: student?.roll_number,
        fullName: student?.full_name,
      };

      request.user = authUser;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Auth token verification failed: ${err.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    // Also check cookies if present
    if (request.cookies && request.cookies['insforge_token']) {
      return request.cookies['insforge_token'];
    }
    return null;
  }
}
