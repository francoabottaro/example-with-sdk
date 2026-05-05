/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common';
import {
  parsePublicIdsJson,
  requireNonEmptyString,
} from './cloudinary-http.helpers';

describe('cloudinary-http.helpers', () => {
  describe('requireNonEmptyString', () => {
    it('returns value when defined and non-empty', () => {
      expect(requireNonEmptyString('x', 'field')).toBe('x');
    });

    it('throws BadRequestException when undefined', () => {
      expect(() => requireNonEmptyString(undefined, 'name')).toThrow(
        BadRequestException,
      );
      expect(() => requireNonEmptyString(undefined, 'name')).toThrow(
        'name is required',
      );
    });

    it('throws BadRequestException when empty string', () => {
      expect(() => requireNonEmptyString('', 'name')).toThrow(
        BadRequestException,
      );
      expect(() => requireNonEmptyString('', 'name')).toThrow(
        'name is required',
      );
    });
  });

  describe('parsePublicIdsJson', () => {
    it('parses a valid JSON string array', () => {
      expect(parsePublicIdsJson('["a","b"]')).toEqual(['a', 'b']);
    });

    it.each([
      {
        label: 'undefined',
        raw: undefined as string | undefined,
        message: /publicIds form field is required/,
      },
      {
        label: 'empty string',
        raw: '',
        message: /publicIds form field is required/,
      },
    ])('throws when raw is $label', ({ raw, message }) => {
      expect(() => parsePublicIdsJson(raw)).toThrow(BadRequestException);
      expect(() => parsePublicIdsJson(raw)).toThrow(message);
    });

    it('throws when JSON is not a string array', () => {
      expect(() => parsePublicIdsJson('[1,2]')).toThrow(BadRequestException);
      expect(() => parsePublicIdsJson('[1,2]')).toThrow(
        'publicIds must be a JSON array of strings',
      );
    });

    it('throws when JSON is invalid', () => {
      expect(() => parsePublicIdsJson('not-json')).toThrow(BadRequestException);
      expect(() => parsePublicIdsJson('not-json')).toThrow(
        'publicIds must be valid JSON',
      );
    });

    it('rethrows BadRequestException from inner validation', () => {
      expect(() => parsePublicIdsJson('{}')).toThrow(BadRequestException);
      expect(() => parsePublicIdsJson('{}')).toThrow(
        'publicIds must be a JSON array of strings',
      );
    });
  });
});
