import { ConfigOptions } from 'cloudinary';
export interface CloudinaryModuleOptions extends ConfigOptions {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  /**
   * Default `folder` for `uploadOne` / `uploadMany` when the `folder` argument is
   * omitted or blank. Falls back to `'general'` when unset.
   */
  folder_root?: string;
  /**
   * When set, `uploadMany` and `replaceMany` reject calls with more than this many files.
   */
  max_upload_files?: number;
}
