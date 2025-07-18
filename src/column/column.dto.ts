import { IsString, IsOptional, IsInt, IsHexColor } from 'class-validator';

export class CreateColumnDto {
  @IsString({ message: 'Column name must be a string' })
  name: string;

  @IsHexColor({ message: 'Color must be a valid hex color' })
  @IsOptional()
  color?: string;

  @IsInt({ message: 'Position must be an integer' })
  @IsOptional()
  position?: number;

  @IsInt({ message: 'Project ID must be an integer' })
  projectId: number;
}

export class UpdateColumnDto {
  @IsString({ message: 'Column name must be a string' })
  @IsOptional()
  name?: string;

  @IsHexColor({ message: 'Color must be a valid hex color' })
  @IsOptional()
  color?: string;

  @IsInt({ message: 'Position must be an integer' })
  @IsOptional()
  position?: number;
}
