import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Admin access required');
    }

    // Role check or configured admin emails
    if (user.role === 'admin') {
      return true;
    }

    const adminEmails = (this.configService.get<string>('ADMIN_EMAILS', '') || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.includes(user.email.toLowerCase())) {
      return true;
    }

    throw new ForbiddenException('Admin privileges required for this operation');
  }
}
