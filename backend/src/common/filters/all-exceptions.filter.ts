import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred. Please try again.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj['message'] || exception.message;
        code = resObj['error'] || exception.name;
        details = resObj['details'] || (Array.isArray(resObj['message']) ? resObj['message'] : undefined);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Error [${requestId}]: ${exception.message}`, exception.stack);
      message = exception.message;
      code = exception.name || 'UNKNOWN_ERROR';
    } else {
      this.logger.error(`Unknown exception [${requestId}]: ${JSON.stringify(exception)}`);
    }

    response.status(status).json({
      success: false,
      error: {
        code: typeof code === 'string' ? code.toUpperCase().replace(/\s+/g, '_') : 'ERROR',
        message: Array.isArray(message) ? message.join('; ') : message,
        requestId,
        ...(details ? { details } : {}),
      },
    });
  }
}
