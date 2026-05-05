import { Provider } from '@nestjs/common';
import {
  CLOUDINARY_CLIENT,
  CLOUDINARY_OPTIONS,
} from '../../const/cloudinary.constants';
import { CloudinaryModuleOptions } from '../../interface/cloudinary-options.interface';
import { assertOptions, optionsFromEnv } from './config/provider.config';
import { cloudinary } from '../../cloudinary.service';

export const cloudinaryOptionsProvider: Provider = {
  provide: CLOUDINARY_OPTIONS,
  useFactory: () => optionsFromEnv(),
};

export const cloudinaryClientProvider: Provider = {
  provide: CLOUDINARY_CLIENT,
  inject: [CLOUDINARY_OPTIONS],
  useFactory: (opts: CloudinaryModuleOptions) => {
    assertOptions(opts);
    return cloudinary.config({
      ...opts,
    });
  },
};
