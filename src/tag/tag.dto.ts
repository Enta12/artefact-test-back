import { IsString, IsHexColor, IsInt, IsOptional } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name: string;

  @IsHexColor()
  color: string;

  @IsInt()
  projectId: number;
}

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;
}
