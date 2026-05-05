import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Image } from '../../image/entities/image.entity';

export const TypeOrmOptions: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const isProd = configService.get<string>('NODE_ENV') === 'production';
    const database =
      configService.get<string>('DATABASE_URL') ?? './data/app.sqlite';
    return {
      type: 'sqlite',
      database,
      entities: [Image],
      synchronize: !isProd,
    };
  },
};
