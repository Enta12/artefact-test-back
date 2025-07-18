import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;
}
