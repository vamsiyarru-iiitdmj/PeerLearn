import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/auth-user.type';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If response is already formatted
        if (res && typeof res === 'object' && 'success' in res) {
          return res;
        }

        // Check if pagination was included
        if (res && typeof res === 'object' && 'data' in res && 'pagination' in res) {
          return {
            success: true,
            data: res.data,
            pagination: res.pagination,
            message: res.message,
          };
        }

        const base = (res && typeof res === 'object' && !Array.isArray(res)) ? { ...res } : {};
        const studentFields = (base.student && typeof base.student === 'object' && !Array.isArray(base.student)) ? base.student : {};

        return {
          ...studentFields,
          ...base,
          success: true,
          data: res,
        };
      }),
    );
  }
}
