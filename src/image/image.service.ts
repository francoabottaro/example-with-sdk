import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import {
  CloudinaryService,
  cloudinary,
} from '../cloudinary/cloudinary.service';
import { UpdateImageDto } from './dto/update-image.dto';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(file: Express.Multer.File, folder?: string) {
    const image = await this.cloudinaryService.uploadOne(
      file,
      folder ?? 'images',
    );
    const newImage = this.imageRepository.create({
      url: image.url,
      public_id: image.id_public,
    });
    await this.imageRepository.save(newImage);
    return { message: `Image created successfully`, image: newImage };
  }

  async createMany(files: Express.Multer.File[], folder?: string) {
    const images = await this.cloudinaryService.uploadMany(
      files,
      folder ?? 'images',
    );
    const newImages = this.imageRepository.create(
      images.map((image) => ({
        url: image.url,
        public_id: image.id_public,
      })),
    );
    await this.imageRepository.save(newImages);
    return { message: `Images created successfully`, images: newImages };
  }

  async findAll() {
    const images = await this.imageRepository.find();
    return { message: `Images found successfully`, images };
  }

  async findOne(id_image: number) {
    const image = await this.imageRepository.findOneOrFail({
      where: { id_image },
    });
    // ? Example of how to get a custom url from Cloudinary
    const img_element = cloudinary.image(image.public_id, {
      width: 100,
      height: 100,
      crop: 'fill',
    });
    return {
      message: `Image found successfully`,
      image: { img_element, ...image },
    };
  }

  async update(
    id_image: number,
    updateImageDto: UpdateImageDto,
    file: Express.Multer.File,
  ) {
    await this.imageRepository.findOneOrFail({
      where: { id_image },
    });
    const { url } = await this.cloudinaryService.replaceOne(
      file,
      updateImageDto.public_id,
    );
    await this.imageRepository.update(id_image, { url });
    return { message: `Image updated successfully` };
  }

  async remove(id_image: number) {
    const image = await this.imageRepository.findOneOrFail({
      where: { id_image },
    });
    await this.imageRepository.delete(image.id_image);
    await this.cloudinaryService
      .delete([{ kind: 'one', publicId: image.public_id }])
      .save();
    return { message: `Image ${id_image} deleted successfully` };
  }

  async removeFolder(path: string) {
    const images = await this.imageRepository.find({
      where: { public_id: Like(`%${path}%`) },
    });
    if (images.length === 0) {
      throw new NotFoundException('No images matched this folder path');
    }
    await this.imageRepository.delete(images.map((image) => image.id_image));
    await this.cloudinaryService.delete({ kind: 'byFolder', path }).save();
    return { message: `Folder "${path}" removed successfully` };
  }

  async removeMany(ids: number[]) {
    const images = await this.imageRepository.find({
      where: { id_image: In(ids) },
    });
    if (images.length === 0) {
      throw new NotFoundException('No images matched the given ids');
    }
    await this.imageRepository.delete(images.map((image) => image.id_image));
    await this.cloudinaryService
      .delete(
        images.map((image) => ({ kind: 'one', publicId: image.public_id })),
      )
      .save();
    return {
      message: `Images deleted successfully: ${ids.join(', ')}`,
    };
  }
}
