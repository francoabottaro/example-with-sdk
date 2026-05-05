import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateImageDto {
  @ApiProperty({ example: 'images/abc123' })
  @IsNotEmpty()
  @IsString()
  public_id!: string;
}
