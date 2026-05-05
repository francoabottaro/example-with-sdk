import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BulkDeleteImagesDto } from './dto/bulk-delete-images.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { ImageService } from './image.service';

const multipartFileField = {
  type: 'object' as const,
  properties: {
    file: { type: 'string', format: 'binary' },
    folder: {
      type: 'string',
      description:
        'Target folder in Cloudinary (optional; defaults to "images")',
      example: 'images',
    },
  },
  required: ['file'],
};

const multipartFilesField = {
  type: 'object' as const,
  properties: {
    files: {
      type: 'array',
      items: { type: 'string', format: 'binary' },
    },
    folder: {
      type: 'string',
      description:
        'Target folder in Cloudinary (optional; defaults to "images")',
      example: 'images',
    },
  },
  required: ['files'],
};

@ApiTags('image')
@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: multipartFileField })
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    return this.imageService.create(file, folder);
  }

  @Post('many')
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: multipartFilesField })
  @UseInterceptors(FilesInterceptor('files'))
  createMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    return this.imageService.createMany(files, folder);
  }

  @Get()
  @ApiOperation({ summary: 'List all images' })
  findAll() {
    return this.imageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an image by id' })
  @ApiParam({ name: 'id', type: 'integer', example: 1 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.imageService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an image (multipart file + public_id field)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: 'integer', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'public_id'],
      properties: {
        public_id: { type: 'string', example: 'images/abc123' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateImageDto: UpdateImageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.imageService.update(id, updateImageDto, file);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Delete multiple images by ids' })
  @ApiBody({ type: BulkDeleteImagesDto })
  removeMany(@Body() dto: BulkDeleteImagesDto) {
    return this.imageService.removeMany(dto.ids);
  }

  @Delete('folder/:path')
  @ApiOperation({
    summary: 'Delete a Cloudinary folder path and matching DB records',
  })
  @ApiParam({
    name: 'path',
    description:
      'Single path segment only (e.g. "summer"). Multi-segment paths do not match this route.',
    example: 'summer',
  })
  removeFolder(@Param('path') path: string) {
    return this.imageService.removeFolder(path);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an image by id' })
  @ApiParam({ name: 'id', type: 'integer', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.imageService.remove(id);
  }
}
