import { CloudinaryModuleOptions } from '../../../interface/cloudinary-options.interface';

export function assertOptions(opts: CloudinaryModuleOptions): void {
  if (!opts?.cloud_name || !opts?.api_key || !opts?.api_secret) {
    throw new Error(
      'CloudinaryModule: cloud_name, api_key, and api_secret are required',
    );
  }
  if (
    opts.max_upload_files !== undefined &&
    (typeof opts.max_upload_files !== 'number' ||
      !Number.isInteger(opts.max_upload_files) ||
      opts.max_upload_files < 1)
  ) {
    throw new Error(
      'CloudinaryModule: max_upload_files must be a positive integer when set',
    );
  }
}

export function maxUploadFilesFromEnv(): number | undefined {
  const raw = process.env.CLOUDINARY_MAX_UPLOAD_FILES?.trim();
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      'CloudinaryModule: CLOUDINARY_MAX_UPLOAD_FILES must be a positive integer when set',
    );
  }
  return n;
}

export function optionsFromEnv(): CloudinaryModuleOptions {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '';
  const api_key = process.env.CLOUDINARY_API_KEY?.trim() ?? '';
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim() ?? '';
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'CloudinaryModule: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (e.g. via .env). In tests, override the CLOUDINARY_OPTIONS provider.',
    );
  }
  const folder_root = process.env.CLOUDINARY_FOLDER_ROOT?.trim();
  const max_upload_files = maxUploadFilesFromEnv();
  return {
    cloud_name,
    api_key,
    api_secret,
    ...(folder_root ? { folder_root } : {}),
    ...(max_upload_files !== undefined ? { max_upload_files } : {}),
  };
}
