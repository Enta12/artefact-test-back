import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { ColumnModule } from './column/column.module';
import { TagModule } from './tag/tag.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule, ProjectModule, ColumnModule, TagModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
