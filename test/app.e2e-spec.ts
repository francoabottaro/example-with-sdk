import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import {
  CLOUDINARY_CLIENT,
  CLOUDINARY_OPTIONS,
} from '../src/cloudinary/const/cloudinary.constants';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { cloudinary } from '../src/cloudinary/cloudinary.service';
import { Image } from '../src/image/entities/image.entity';
import { ImageModule } from '../src/image/image.module';

describe('Image HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let cloudinaryImageSpy: jest.SpiedFunction<typeof cloudinary.image>;

  const cloudinaryMock = {
    uploadOne: jest.fn(),
    uploadMany: jest.fn(),
    replaceOne: jest.fn(),
    delete: jest.fn(() => ({
      save: jest.fn().mockResolvedValue(undefined),
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    if (dataSource?.isInitialized) {
      await dataSource.getRepository(Image).clear();
    }
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Image],
          synchronize: true,
        }),
        ImageModule,
      ],
    })
      .overrideProvider(CLOUDINARY_OPTIONS)
      .useValue({
        cloud_name: 'test',
        api_key: '123456789012345',
        api_secret: 'test-secret',
      })
      .overrideProvider(CLOUDINARY_CLIENT)
      .useValue({})
      .overrideProvider(CloudinaryService)
      .useValue(cloudinaryMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    cloudinaryImageSpy = jest
      .spyOn(cloudinary, 'image')
      .mockReturnValue('https://res.example/mock-img-tag');
  });

  afterAll(async () => {
    cloudinaryImageSpy.mockRestore();
    if (app) {
      await app.close();
    }
  });

  it('GET /image returns an empty list initially', async () => {
    const res = await request(app.getHttpServer()).get('/image').expect(200);

    expect(res.body).toMatchObject({
      message: 'Images found successfully',
      images: [],
    });
  });

  it('POST /image persists metadata after Cloudinary upload', async () => {
    cloudinaryMock.uploadOne.mockResolvedValue({
      url: 'https://res.cloudinary.com/demo/sample.png',
      id_public: 'folder/sample',
    });

    const res = await request(app.getHttpServer())
      .post('/image')
      .attach('file', Buffer.from('fake-png'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(cloudinaryMock.uploadOne).toHaveBeenCalledTimes(1);
    expect(cloudinaryMock.uploadOne).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldname: 'file',
        mimetype: 'image/png',
      }),
      'images',
    );
    const created = res.body as {
      message: string;
      image: { url: string; public_id: string; id_image: number };
    };
    expect(created.message).toBe('Image created successfully');
    expect(created.image).toMatchObject({
      url: 'https://res.cloudinary.com/demo/sample.png',
      public_id: 'folder/sample',
    });
    expect(created.image.id_image).toEqual(expect.any(Number));

    const list = await request(app.getHttpServer()).get('/image').expect(200);
    const listed = list.body as {
      message: string;
      images: { public_id: string }[];
    };
    expect(listed.message).toBe('Images found successfully');
    expect(listed.images).toHaveLength(1);
    expect(listed.images[0].public_id).toBe('folder/sample');
  });

  it('POST /image passes custom folder to Cloudinary', async () => {
    cloudinaryMock.uploadOne.mockResolvedValue({
      url: 'https://cdn.example/u.png',
      id_public: 'custom/u',
    });

    await request(app.getHttpServer())
      .post('/image')
      .field('folder', 'custom')
      .attach('file', Buffer.from('x'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(cloudinaryMock.uploadOne).toHaveBeenCalledWith(
      expect.objectContaining({ fieldname: 'file' }),
      'custom',
    );
  });

  it('POST /image/many persists all rows', async () => {
    cloudinaryMock.uploadMany.mockResolvedValue([
      { url: 'https://a/1.png', id_public: 'album/a1' },
      { url: 'https://a/2.png', id_public: 'album/a2' },
    ]);

    const res = await request(app.getHttpServer())
      .post('/image/many')
      .attach('files', Buffer.from('a'), {
        filename: 'a.png',
        contentType: 'image/png',
      })
      .attach('files', Buffer.from('b'), {
        filename: 'b.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(cloudinaryMock.uploadMany).toHaveBeenCalledTimes(1);
    const body = res.body as {
      message: string;
      images: { public_id: string; url: string }[];
    };
    expect(body.message).toBe('Images created successfully');
    expect(body.images).toHaveLength(2);
    expect(body.images.map((i) => i.public_id).sort()).toEqual([
      'album/a1',
      'album/a2',
    ]);
  });

  it('GET /image/:id returns image with img_element', async () => {
    cloudinaryMock.uploadOne.mockResolvedValue({
      url: 'https://cdn.example/x.png',
      id_public: 'pfx/item',
    });
    const post = await request(app.getHttpServer())
      .post('/image')
      .attach('file', Buffer.from('x'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(201);
    const id = (post.body as { image: { id_image: number } }).image.id_image;

    const res = await request(app.getHttpServer())
      .get(`/image/${id}`)
      .expect(200);

    const body = res.body as {
      message: string;
      image: { public_id: string; img_element: string };
    };
    expect(body.message).toBe('Image found successfully');
    expect(body.image.public_id).toBe('pfx/item');
    expect(body.image.img_element).toBe('https://res.example/mock-img-tag');
    expect(cloudinaryImageSpy).toHaveBeenCalled();
  });

  it('GET /image/:id rejects non-numeric id', async () => {
    await request(app.getHttpServer()).get('/image/not-a-number').expect(400);
  });

  it('PATCH /image/:id updates url after replaceOne', async () => {
    cloudinaryMock.uploadOne.mockResolvedValue({
      url: 'https://old.url/img.png',
      id_public: 'folder/asset',
    });
    const post = await request(app.getHttpServer())
      .post('/image')
      .attach('file', Buffer.from('x'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(201);
    const id = (post.body as { image: { id_image: number } }).image.id_image;

    cloudinaryMock.replaceOne.mockResolvedValue({
      url: 'https://new.url/img.png',
      id_public: 'folder/asset',
    });

    const patch = await request(app.getHttpServer())
      .patch(`/image/${id}`)
      .field('public_id', 'folder/asset')
      .attach('file', Buffer.from('y'), {
        filename: 'y.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(patch.body).toMatchObject({ message: 'Image updated successfully' });
    expect(cloudinaryMock.replaceOne).toHaveBeenCalledWith(
      expect.objectContaining({ fieldname: 'file' }),
      'folder/asset',
    );

    const one = await request(app.getHttpServer())
      .get(`/image/${id}`)
      .expect(200);
    expect((one.body as { image: { url: string } }).image.url).toBe(
      'https://new.url/img.png',
    );
  });

  it('DELETE /image/:id removes row and calls Cloudinary delete', async () => {
    cloudinaryMock.uploadOne.mockResolvedValue({
      url: 'https://x',
      id_public: 'to-delete/id',
    });
    const post = await request(app.getHttpServer())
      .post('/image')
      .attach('file', Buffer.from('x'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(201);
    const id = (post.body as { image: { id_image: number } }).image.id_image;
    const save = jest.fn().mockResolvedValue(undefined);
    cloudinaryMock.delete.mockReturnValue({ save });

    const del = await request(app.getHttpServer())
      .delete(`/image/${id}`)
      .expect(200);
    expect(del.body).toMatchObject({
      message: `Image ${id} deleted successfully`,
    });
    expect(cloudinaryMock.delete).toHaveBeenCalledWith([
      { kind: 'one', publicId: 'to-delete/id' },
    ]);
    expect(save).toHaveBeenCalled();

    const missing = await request(app.getHttpServer()).get(`/image/${id}`);
    // Nest default: TypeORM EntityNotFoundError maps to 500 unless a filter converts it.
    expect(missing.status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /image/bulk removes matching ids', async () => {
    cloudinaryMock.uploadMany.mockResolvedValue([
      { url: 'https://u1', id_public: 'bulk/a' },
      { url: 'https://u2', id_public: 'bulk/b' },
    ]);
    const post = await request(app.getHttpServer())
      .post('/image/many')
      .attach('files', Buffer.from('1'), {
        filename: '1.png',
        contentType: 'image/png',
      })
      .attach('files', Buffer.from('2'), {
        filename: '2.png',
        contentType: 'image/png',
      })
      .expect(201);
    const ids = (post.body as { images: { id_image: number }[] }).images.map(
      (i) => i.id_image,
    );
    const save = jest.fn().mockResolvedValue(undefined);
    cloudinaryMock.delete.mockReturnValue({ save });

    const res = await request(app.getHttpServer())
      .delete('/image/bulk')
      .send({ ids })
      .set('Content-Type', 'application/json')
      .expect(200);

    expect(res.body.message).toBe(
      `Images deleted successfully: ${ids.join(', ')}`,
    );
    expect(save).toHaveBeenCalled();

    const list = await request(app.getHttpServer()).get('/image').expect(200);
    expect((list.body as { images: unknown[] }).images).toHaveLength(0);
  });

  it('DELETE /image/folder/:path removes matching rows', async () => {
    cloudinaryMock.uploadOne.mockResolvedValue({
      url: 'https://u',
      id_public: 'summer/photo1',
    });
    await request(app.getHttpServer())
      .post('/image')
      .attach('file', Buffer.from('x'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(201);
    const save = jest.fn().mockResolvedValue(undefined);
    cloudinaryMock.delete.mockReturnValue({ save });

    const res = await request(app.getHttpServer())
      .delete('/image/folder/summer')
      .expect(200);

    expect(res.body).toMatchObject({
      message: 'Folder "summer" removed successfully',
    });
    expect(cloudinaryMock.delete).toHaveBeenCalledWith({
      kind: 'byFolder',
      path: 'summer',
    });
    expect(save).toHaveBeenCalled();

    const list = await request(app.getHttpServer()).get('/image').expect(200);
    expect((list.body as { images: unknown[] }).images).toHaveLength(0);
  });

  it('DELETE /image/folder/:path returns 404 when nothing matches', async () => {
    await request(app.getHttpServer())
      .delete('/image/folder/ghost')
      .expect(404);
  });

  it('DELETE /image/bulk returns 404 when ids match nothing', async () => {
    await request(app.getHttpServer())
      .delete('/image/bulk')
      .send({ ids: [99999, 88888] })
      .set('Content-Type', 'application/json')
      .expect(404);
  });
});
