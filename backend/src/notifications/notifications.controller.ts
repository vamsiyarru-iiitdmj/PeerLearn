import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current student notifications' })
  async getNotifications(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.notificationsService.getMyNotifications(user.studentId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.notificationsService.markAsRead(id, user.studentId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.notificationsService.markAllAsRead(user.studentId);
  }
}
