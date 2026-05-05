import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import {
  cloudinaryClientProvider,
  cloudinaryOptionsProvider,
} from './helpers/provider/cloudinary.providers';

@Module({
  providers: [
    cloudinaryOptionsProvider,
    cloudinaryClientProvider,
    CloudinaryService,
  ],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
