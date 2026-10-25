import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InsforgeService implements OnModuleInit {
  private readonly logger = new Logger(InsforgeService.name);
  private sdk: any;
  private adminClient: any;
  private anonClient: any;

  private baseUrl: string;
  private anonKey: string;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('INSFORGE_URL', 'https://c35py4a8.us-east.insforge.app');
    this.anonKey = this.configService.get<string>('INSFORGE_ANON_KEY', '');
    this.apiKey = this.configService.get<string>('INSFORGE_API_KEY', '');
  }

  async onModuleInit() {
    try {
      // Dynamic import to support both ESM and CJS NestJS runtime
      const importDynamic = new Function('modulePath', 'return import(modulePath)');
      this.sdk = await importDynamic('@insforge/sdk');

      if (this.apiKey) {
        this.adminClient = this.sdk.createAdminClient({
          baseUrl: this.baseUrl,
          apiKey: this.apiKey,
        });
        this.logger.log('InsForge admin client initialized successfully');
      } else {
        this.logger.warn('INSFORGE_API_KEY not provided; admin operations will fail');
      }

      if (this.anonKey) {
        this.anonClient = this.sdk.createClient({
          baseUrl: this.baseUrl,
          anonKey: this.anonKey,
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to initialize InsForge SDK: ${err?.message}`, err?.stack);
      throw err;
    }
  }

  getAdminClient() {
    if (!this.adminClient) {
      throw new Error('InsForge Admin Client not initialized. Check INSFORGE_API_KEY.');
    }
    return this.adminClient;
  }

  getAnonClient() {
    if (!this.anonClient) {
      return this.sdk.createClient({ baseUrl: this.baseUrl, anonKey: this.anonKey });
    }
    return this.anonClient;
  }

  getUserClient(accessToken: string) {
    if (!accessToken) {
      return this.getAnonClient();
    }
    return this.sdk.createClient({
      baseUrl: this.baseUrl,
      accessToken,
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiKey(): string {
    return this.apiKey;
  }
}
