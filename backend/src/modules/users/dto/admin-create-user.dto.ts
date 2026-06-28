import { Role } from '../../../../generated/prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
