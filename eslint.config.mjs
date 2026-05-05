// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      '**/node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'data/**',
      'logs/**',
      '**/.env',
      '**/.env.*',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  // ─── Base parser configuration ─────────────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // ─── Global rules ───────────────────────────────────────────────────────────
  {
    rules: {
      // TypeORM uses `any` internally in decorators and metadata reflection;
      // enabling these rules globally produces constant false positives.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',

      // Keep as warning so async context is not lost in NestJS
      '@typescript-eslint/no-floating-promises': 'warn',

      // Allow class properties without explicit initialization
      // (TypeORM initializes them via metadata reflection)
      '@typescript-eslint/no-non-null-assertion': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // ─── TypeORM entity override ─────────────────────────────────────────────────
  {
    files: ['src/**/*.entity.ts'],
    rules: {
      // @Column, @ManyToOne, @OneToMany, etc. require uninitialized properties;
      // TypeORM handles them at runtime.
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },
  // ─── NestJS module override ───────────────────────────────────────────────────
  {
    files: ['src/**/*.module.ts'],
    rules: {
      // forRoot/forRootAsync use dynamic configuration that TypeScript
      // cannot resolve statically without type errors.
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
