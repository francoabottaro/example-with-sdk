import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BulkDeleteImagesDto } from './dto/bulk-delete-images.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';

function multerStub(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'x.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from('x'),
    size: 1,
    ...overrides,
  } as Express.Multer.File;
}

describe('ImageController', () => {
  let controller: ImageController;
  let imageService: jest.Mocked<
    Pick<
      ImageService,
      | 'create'
      | 'createMany'
      | 'findAll'
      | 'findOne'
      | 'update'
      | 'remove'
      | 'removeFolder'
      | 'removeMany'
    >
  >;

  beforeEach(async () => {
    imageService = {
      create: jest.fn(),
      createMany: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      removeFolder: jest.fn(),
      removeMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageController],
      providers: [{ provide: ImageService, useValue: imageService }],
    }).compile();

    controller = module.get(ImageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates with file and folder', async () => {
      const file = multerStub();
      const payload = { message: 'ok', image: {} };
      imageService.create.mockResolvedValue(payload);

      const result = await controller.create(file, 'albums');

      expect(imageService.create).toHaveBeenCalledTimes(1);
      expect(imageService.create).toHaveBeenCalledWith(file, 'albums');
      expect(result).toBe(payload);
    });

    it('delegates with undefined folder when omitted', async () => {
      const file = multerStub();
      imageService.create.mockResolvedValue({ message: 'ok', image: {} });

      await controller.create(file, undefined);

      expect(imageService.create).toHaveBeenCalledWith(file, undefined);
    });
  });

  describe('createMany', () => {
    it('delegates and returns service payload', async () => {
      const files = [multerStub(), multerStub({ originalname: 'b.png' })];
      const payload = { message: 'ok', images: [] };
      imageService.createMany.mockResolvedValue(payload);

      const result = await controller.createMany(files, 'f');

      expect(imageService.createMany).toHaveBeenCalledTimes(1);
      expect(imageService.createMany).toHaveBeenCalledWith(files, 'f');
      expect(result).toBe(payload);
    });
  });

  describe('findAll', () => {
    it('returns service result', async () => {
      const payload = { message: 'ok', images: [] };
      imageService.findAll.mockResolvedValue(payload);

      const result = await controller.findAll();

      expect(imageService.findAll).toHaveBeenCalledTimes(1);
      expect(imageService.findAll).toHaveBeenCalledWith();
      expect(result).toBe(payload);
    });
  });

  describe('findOne', () => {
    it('delegates with numeric id', async () => {
      const payload = {
        message: 'ok',
        image: {
          img_element: '<img/>',
          id_image: 7,
          url: 'u',
          public_id: 'p',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      imageService.findOne.mockResolvedValue(payload);

      const result = await controller.findOne(7);

      expect(imageService.findOne).toHaveBeenCalledWith(7);
      expect(result).toBe(payload);
    });

    it('propagates NotFoundException from service', async () => {
      imageService.findOne.mockRejectedValue(new NotFoundException('gone'));

      await expect(controller.findOne(404)).rejects.toThrow(NotFoundException);
      expect(imageService.findOne).toHaveBeenCalledWith(404);
    });
  });

  describe('update', () => {
    it('delegates with id, dto, and file', async () => {
      const file = multerStub();
      const dto: UpdateImageDto = { public_id: 'p/old' };
      const payload = { message: 'updated' };
      imageService.update.mockResolvedValue(payload);

      const result = await controller.update(4, dto, file);

      expect(imageService.update).toHaveBeenCalledWith(4, dto, file);
      expect(result).toBe(payload);
    });
  });

  describe('removeMany', () => {
    it('delegates with dto.ids', async () => {
      const dto: BulkDeleteImagesDto = { ids: [1, 2] };
      const payload = { message: 'deleted' };
      imageService.removeMany.mockResolvedValue(payload);

      const result = await controller.removeMany(dto);

      expect(imageService.removeMany).toHaveBeenCalledWith([1, 2]);
      expect(result).toBe(payload);
    });
  });

  describe('removeFolder', () => {
    it('delegates with path', async () => {
      const payload = { message: 'ok' };
      imageService.removeFolder.mockResolvedValue(payload);

      const result = await controller.removeFolder('summer');

      expect(imageService.removeFolder).toHaveBeenCalledWith('summer');
      expect(result).toBe(payload);
    });
  });

  describe('remove', () => {
    it('delegates with id', async () => {
      const payload = { message: 'ok' };
      imageService.remove.mockResolvedValue(payload);

      const result = await controller.remove(9);

      expect(imageService.remove).toHaveBeenCalledWith(9);
      expect(result).toBe(payload);
    });
  });
});
