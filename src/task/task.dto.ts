import { IsString, IsOptional, IsInt, IsEnum, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType, Priority, TaskStatus } from '../../generated/prisma';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @IsInt()
  projectId: number;

  @IsInt()
  columnId: number;

  @IsInt()
  @IsOptional()
  userId?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  tagIds?: number[];

  @IsInt()
  position: number;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @IsInt()
  @IsOptional()
  columnId?: number;

  @IsInt()
  @IsOptional()
  userId?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  tagIds?: number[];

  @IsInt()
  @IsOptional()
  position?: number;
}
