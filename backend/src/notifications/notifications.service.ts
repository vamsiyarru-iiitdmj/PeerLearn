import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';

@Injectable()
export class NotificationsService {
  constructor(private insforgeService: InsforgeService) {}

  async getMyNotifications(studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: notifications, error } = await admin.database
      .from('notifications')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException(`Failed to retrieve notifications: ${error.message}`);
    return notifications || [];
  }

  async markAsRead(notificationId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: notif } = await admin.database
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.user_id !== studentId) throw new BadRequestException('Forbidden');

    const { data: updated, error } = await admin.database
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update notification: ${error.message}`);
    return updated;
  }

  async markAllAsRead(studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    await admin.database
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', studentId)
      .is('read_at', null);

    return { message: 'All notifications marked as read' };
  }
}
