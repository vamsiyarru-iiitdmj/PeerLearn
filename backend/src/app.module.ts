import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { InsforgeModule } from './insforge/insforge.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { AcademicsModule } from './academics/academics.module';
import { SkillsModule } from './skills/skills.module';
import { DoubtsModule } from './doubts/doubts.module';
import { MatchingModule } from './matching/matching.module';
import { SessionsModule } from './sessions/sessions.module';
import { RatingsModule } from './ratings/ratings.module';
import { TutorsModule } from './tutors/tutors.module';
import { ResourcesModule } from './resources/resources.module';
import { PlannerModule } from './planner/planner.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    InsforgeModule,
    AuthModule,
    StudentsModule,
    AcademicsModule,
    SkillsModule,
    DoubtsModule,
    MatchingModule,
    SessionsModule,
    RatingsModule,
    TutorsModule,
    ResourcesModule,
    PlannerModule,
    AnalyticsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
