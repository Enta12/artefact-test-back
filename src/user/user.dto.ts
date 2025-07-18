import { IsString, IsEmail, IsOptional, MinLength, IsDefined } from 'class-validator';

export class CreateUserDto {
  @IsDefined({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsDefined({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name?: string;
}

export class UpdateUserDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsOptional()
  password?: string;

  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name?: string;
}
