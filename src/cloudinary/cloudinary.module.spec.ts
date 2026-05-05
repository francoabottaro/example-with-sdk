import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CLOUDINARY_OPTIONS } from './const/cloudinary.constants';
import { CloudinaryModule } from './cloudinary.module';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryModule', () => {
  const validOptions = {
    cloud_name: 'c',
    api_key: 'k',
    api_secret: 's',
  };

  describe('with overridden CLOUDINARY_OPTIONS', () => {
    it('compiles and exposes CloudinaryService', async () => {
      const mod = await Test.createTestingModule({
        imports: [CloudinaryModule],
      })
        .overrideProvider(CLOUDINARY_OPTIONS)
        .useValue(validOptions)
        .compile();

      expect(mod.get(CloudinaryService)).toBeDefined();
    });

    it('throws when options omit required fields', async () => {
      await expect(
        Test.createTestingModule({
          imports: [CloudinaryModule],
        })
          .overrideProvider(CLOUDINARY_OPTIONS)
          .useValue({
            cloud_name: '',
            api_key: 'k',
            api_secret: 's',
          })
          .compile(),
      ).rejects.toThrow(/cloud_name, api_key, and api_secret are required/);
    });

    it('throws when max_upload_files is not a positive integer', async () => {
      await expect(
        Test.createTestingModule({
          imports: [CloudinaryModule],
        })
          .overrideProvider(CLOUDINARY_OPTIONS)
          .useValue({
            ...validOptions,
            max_upload_files: 0,
          })
          .compile(),
      ).rejects.toThrow(/max_upload_files must be a positive integer/);
    });
  });

  describe('configuration from process.env', () => {
    const keys = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'CLOUDINARY_MAX_UPLOAD_FILES',
    ] as const;
    let snapshot: Record<string, string | undefined>;

    beforeEach(() => {
      snapshot = {};
      for (const k of keys) {
        snapshot[k] = process.env[k];
        delete process.env[k];
      }
    });

    afterEach(() => {
      for (const k of keys) {
        if (snapshot[k] === undefined) delete process.env[k];
        else process.env[k] = snapshot[k];
      }
    });

    it('compiles and exposes CloudinaryService when CLOUDINARY_* env is set', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'feat_cloud';
      process.env.CLOUDINARY_API_KEY = 'feat_key';
      process.env.CLOUDINARY_API_SECRET = 'feat_secret';

      const mod = await Test.createTestingModule({
        imports: [CloudinaryModule],
      }).compile();

      expect(mod.get(CloudinaryService)).toBeDefined();
    });

    it('fails compile when env vars are missing', async () => {
      await expect(
        Test.createTestingModule({
          imports: [CloudinaryModule],
        }).compile(),
      ).rejects.toThrow(/CLOUDINARY_CLOUD_NAME/);
    });

    it('rejects compile when CLOUDINARY_MAX_UPLOAD_FILES is invalid', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'e';
      process.env.CLOUDINARY_API_KEY = 'k';
      process.env.CLOUDINARY_API_SECRET = 's';
      process.env.CLOUDINARY_MAX_UPLOAD_FILES = '0';

      await expect(
        Test.createTestingModule({
          imports: [CloudinaryModule],
        }).compile(),
      ).rejects.toThrow(/CLOUDINARY_MAX_UPLOAD_FILES/);
    });
  });

  describe('nested module import', () => {
    it('resolves CloudinaryService when CloudinaryModule is imported via another module', async () => {
      @Module({
        imports: [CloudinaryModule],
        exports: [CloudinaryModule],
      })
      class HostModule {}

      const mod = await Test.createTestingModule({
        imports: [HostModule],
      })
        .overrideProvider(CLOUDINARY_OPTIONS)
        .useValue(validOptions)
        .compile();

      expect(mod.get(CloudinaryService)).toBeDefined();
    });
  });
});
