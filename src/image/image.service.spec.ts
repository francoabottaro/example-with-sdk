import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityNotFoundError, In, Like } from 'typeorm';
import {
  cloudinary,
  CloudinaryService,
} from '../cloudinary/cloudinary.service';
import { Image } from './entities/image.entity';
import { ImageService } from './image.service';

function mockImage(overrides: Partial<Image> = {}): Image {
  const base: Image = {
    id_image: 1,
    url: 'u',
    public_id: 'p',
    createdAt: new Date('2024-06-01T12:00:00.000Z'),
    updatedAt: new Date('2024-06-01T12:00:00.000Z'),
  };
  return { ...base, ...overrides };
}

function multerStub(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'x.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from('test'),
    size: 4,
  } as Express.Multer.File;
}

type RepoMock = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOneOrFail: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type CloudinaryMock = {
  uploadOne: jest.Mock;
  uploadMany: jest.Mock;
  replaceOne: jest.Mock;
  delete: jest.Mock;
};

describe('ImageService', () => {
  let service: ImageService;
  let repository: RepoMock;
  let cloudinarySvc: CloudinaryMock;
  let cloudinaryImageSpy: jest.SpiedFunction<typeof cloudinary.image>;

  beforeEach(async () => {
    cloudinaryImageSpy = jest
      .spyOn(cloudinary, 'image')
      .mockReturnValue('https://cdn.example/transformed.png');

    repository = {
      create: jest.fn().mockImplementation((v: unknown) => v),
      save: jest.fn().mockImplementation((v: unknown) => Promise.resolve(v)),
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    cloudinarySvc = {
      uploadOne: jest.fn(),
      uploadMany: jest.fn(),
      replaceOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        { provide: getRepositoryToken(Image), useValue: repository },
        { provide: CloudinaryService, useValue: cloudinarySvc },
      ],
    }).compile();

    service = module.get(ImageService);
  });

  afterEach(() => {
    cloudinaryImageSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const file = multerStub();

    it('uploads, persists with default folder, and returns payload', async () => {
      cloudinarySvc.uploadOne.mockResolvedValue({
        url: 'https://cdn.example/u.png',
        id_public: 'images/u',
      });
      const createdRow = {
        url: 'https://cdn.example/u.png',
        public_id: 'images/u',
      };
      repository.create.mockReturnValue(createdRow);
      repository.save.mockResolvedValue(
        Object.assign({}, createdRow, { id_image: 1 }),
      );

      const result = await service.create(file);

      expect(cloudinarySvc.uploadOne).toHaveBeenCalledWith(file, 'images');
      expect(repository.create).toHaveBeenCalledWith({
        url: 'https://cdn.example/u.png',
        public_id: 'images/u',
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Image created successfully');
      expect(result.image).toEqual(createdRow);
    });

    it('passes custom folder and persists via save', async () => {
      cloudinarySvc.uploadOne.mockResolvedValue({
        url: 'https://cdn.example/u.png',
        id_public: 'custom/u',
      });
      const row = { url: 'https://cdn.example/u.png', public_id: 'custom/u' };
      repository.create.mockReturnValue(row);
      repository.save.mockResolvedValue({ ...row, id_image: 1 });

      await service.create(file, 'custom');

      expect(cloudinarySvc.uploadOne).toHaveBeenCalledWith(file, 'custom');
      expect(repository.save).toHaveBeenCalledWith(row);
    });

    it('does not persist when upload fails', async () => {
      cloudinarySvc.uploadOne.mockRejectedValue(new Error('upload failed'));

      await expect(service.create(file)).rejects.toThrow('upload failed');
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('createMany', () => {
    const file = multerStub();

    it('uploads many and saves mapped rows', async () => {
      const files = [file, file];
      cloudinarySvc.uploadMany.mockResolvedValue([
        { url: 'https://a', id_public: 'p/a' },
        { url: 'https://b', id_public: 'p/b' },
      ]);
      const createdRows = [
        { url: 'https://a', public_id: 'p/a' },
        { url: 'https://b', public_id: 'p/b' },
      ];
      repository.create.mockReturnValue(createdRows);
      repository.save.mockResolvedValue(createdRows);

      const result = await service.createMany(files);

      expect(cloudinarySvc.uploadMany).toHaveBeenCalledWith(files, 'images');
      expect(repository.create).toHaveBeenCalledWith([
        { url: 'https://a', public_id: 'p/a' },
        { url: 'https://b', public_id: 'p/b' },
      ]);
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Images created successfully',
        images: createdRows,
      });
    });

    it('passes custom folder to uploadMany', async () => {
      const files = [file];
      cloudinarySvc.uploadMany.mockResolvedValue([
        { url: 'https://a', id_public: 'gallery/a' },
      ]);
      repository.create.mockReturnValue([
        { url: 'https://a', public_id: 'gallery/a' },
      ]);
      repository.save.mockResolvedValue([]);

      await service.createMany(files, 'gallery');

      expect(cloudinarySvc.uploadMany).toHaveBeenCalledWith(files, 'gallery');
    });

    it('does not save when uploadMany fails', async () => {
      cloudinarySvc.uploadMany.mockRejectedValue(
        new Error('batch upload failed'),
      );

      await expect(service.createMany([file])).rejects.toThrow(
        'batch upload failed',
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all images from repository', async () => {
      const rows = [mockImage({ id_image: 1, public_id: 'p1' })];
      repository.find.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledTimes(1);
      expect(repository.find).toHaveBeenCalledWith();
      expect(result).toEqual({
        message: 'Images found successfully',
        images: rows,
      });
    });
  });

  describe('findOne', () => {
    it('returns row plus img_element from cloudinary.image', async () => {
      const row = mockImage({
        id_image: 5,
        url: 'https://original.example/x',
        public_id: 'folder/item',
      });
      const transformed = 'https://cdn.example/tag.png';
      cloudinaryImageSpy.mockReturnValue(transformed);
      repository.findOneOrFail.mockResolvedValue({ ...row });

      const result = await service.findOne(5);

      expect(repository.findOneOrFail).toHaveBeenCalledWith({
        where: { id_image: 5 },
      });
      expect(cloudinary.image).toHaveBeenCalledWith('folder/item', {
        width: 100,
        height: 100,
        crop: 'fill',
      });
      expect(result).toEqual({
        message: 'Image found successfully',
        image: {
          img_element: transformed,
          ...row,
        },
      });
    });

    it('propagates cloudinary.image failures', async () => {
      repository.findOneOrFail.mockResolvedValue(mockImage({ id_image: 1 }));
      cloudinaryImageSpy.mockImplementation(() => {
        throw new Error('image tag failed');
      });

      await expect(service.findOne(1)).rejects.toThrow('image tag failed');
    });

    it('propagates EntityNotFoundError when row is missing', async () => {
      repository.findOneOrFail.mockRejectedValue(
        new EntityNotFoundError(Image, { id_image: 99 }),
      );

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
    });
  });

  describe('update', () => {
    const file = multerStub();

    it('replaces asset and updates url', async () => {
      repository.findOneOrFail.mockResolvedValue(mockImage({ id_image: 2 }));
      cloudinarySvc.replaceOne.mockResolvedValue({
        url: 'https://cdn.example/new.png',
        id_public: 'replaced',
      });
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.update(2, { public_id: 'old/id' }, file);

      expect(cloudinarySvc.replaceOne).toHaveBeenCalledWith(file, 'old/id');
      expect(repository.update).toHaveBeenCalledWith(2, {
        url: 'https://cdn.example/new.png',
      });
      expect(result).toEqual({ message: 'Image updated successfully' });
    });

    it('propagates replaceOne failures', async () => {
      repository.findOneOrFail.mockResolvedValue(mockImage({ id_image: 2 }));
      cloudinarySvc.replaceOne.mockRejectedValue(new Error('replace failed'));

      await expect(service.update(2, { public_id: 'x' }, file)).rejects.toThrow(
        'replace failed',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not replace when image id is missing', async () => {
      repository.findOneOrFail.mockRejectedValue(
        new EntityNotFoundError(Image, { id_image: 404 }),
      );

      await expect(
        service.update(404, { public_id: 'any' }, file),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
      expect(cloudinarySvc.replaceOne).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes row then cloudinary asset', async () => {
      const row = mockImage({ id_image: 3, public_id: 'folder/x' });
      repository.findOneOrFail.mockResolvedValue(row);
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });
      const save = jest.fn().mockResolvedValue(undefined);
      cloudinarySvc.delete.mockReturnValue({ save });

      const result = await service.remove(3);

      expect(repository.findOneOrFail.mock.invocationCallOrder[0]).toBeLessThan(
        repository.delete.mock.invocationCallOrder[0],
      );
      expect(repository.delete).toHaveBeenCalledWith(3);
      expect(cloudinarySvc.delete).toHaveBeenCalledWith([
        { kind: 'one', publicId: 'folder/x' },
      ]);
      expect(save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Image 3 deleted successfully' });
    });

    it('does not delete when image is missing', async () => {
      repository.findOneOrFail.mockRejectedValue(
        new EntityNotFoundError(Image, { id_image: 99 }),
      );

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cloudinarySvc.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeFolder', () => {
    it('throws when no rows match and never deletes', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.removeFolder('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cloudinarySvc.delete).not.toHaveBeenCalled();
    });

    it('queries Like path, deletes ids, then cloudinary folder', async () => {
      const rows = [
        mockImage({ id_image: 1, public_id: 'summer/a' }),
        mockImage({ id_image: 2, public_id: 'summer/b' }),
      ];
      repository.find.mockResolvedValue(rows);
      repository.delete.mockResolvedValue({ affected: 2, raw: [] });
      const save = jest.fn().mockResolvedValue(undefined);
      cloudinarySvc.delete.mockReturnValue({ save });

      const result = await service.removeFolder('summer');

      expect(repository.find.mock.invocationCallOrder[0]).toBeLessThan(
        repository.delete.mock.invocationCallOrder[0],
      );
      expect(repository.find).toHaveBeenCalledWith({
        where: { public_id: Like('%summer%') },
      });
      expect(repository.delete).toHaveBeenCalledWith([1, 2]);
      expect(cloudinarySvc.delete).toHaveBeenCalledWith({
        kind: 'byFolder',
        path: 'summer',
      });
      expect(result).toEqual({
        message: 'Folder "summer" removed successfully',
      });
    });
  });

  describe('removeMany', () => {
    it('throws when no rows match and never deletes', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.removeMany([9, 10])).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cloudinarySvc.delete).not.toHaveBeenCalled();
    });

    it('queries In(ids), deletes, then cloudinary batch', async () => {
      const rows = [
        mockImage({ id_image: 1, public_id: 'p/1' }),
        mockImage({ id_image: 2, public_id: 'p/2' }),
      ];
      repository.find.mockResolvedValue(rows);
      repository.delete.mockResolvedValue({ affected: 2, raw: [] });
      const save = jest.fn().mockResolvedValue(undefined);
      cloudinarySvc.delete.mockReturnValue({ save });

      const result = await service.removeMany([1, 2]);

      expect(repository.find.mock.invocationCallOrder[0]).toBeLessThan(
        repository.delete.mock.invocationCallOrder[0],
      );
      expect(repository.find).toHaveBeenCalledWith({
        where: { id_image: In([1, 2]) },
      });
      expect(repository.delete).toHaveBeenCalledWith([1, 2]);
      expect(cloudinarySvc.delete).toHaveBeenCalledWith([
        { kind: 'one', publicId: 'p/1' },
        { kind: 'one', publicId: 'p/2' },
      ]);
      expect(result).toEqual({
        message: 'Images deleted successfully: 1, 2',
      });
    });

    it('deletes only found ids but message lists all requested ids', async () => {
      const rows = [mockImage({ id_image: 1, public_id: 'p/1' })];
      repository.find.mockResolvedValue(rows);
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });
      const save = jest.fn().mockResolvedValue(undefined);
      cloudinarySvc.delete.mockReturnValue({ save });

      const result = await service.removeMany([1, 99]);

      expect(repository.delete).toHaveBeenCalledWith([1]);
      expect(cloudinarySvc.delete).toHaveBeenCalledWith([
        { kind: 'one', publicId: 'p/1' },
      ]);
      expect(result.message).toBe('Images deleted successfully: 1, 99');
    });
  });
});
