import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto } from './tag.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(@Request() req, @Body() createTagDto: CreateTagDto) {
    return this.tagService.create(req.user.id, createTagDto);
  }

  @Get('project/:projectId')
  findAll(@Request() req, @Param('projectId') projectId: string) {
    const id = parseInt(projectId);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid project ID format');
    }
    return this.tagService.findAll(req.user.id, id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const tagId = parseInt(id);
    if (isNaN(tagId)) {
      throw new BadRequestException('Invalid tag ID format');
    }
    return this.tagService.findOne(req.user.id, tagId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    const tagId = parseInt(id);
    if (isNaN(tagId)) {
      throw new BadRequestException('Invalid tag ID format');
    }
    return this.tagService.update(req.user.id, tagId, updateTagDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    const tagId = parseInt(id);
    if (isNaN(tagId)) {
      throw new BadRequestException('Invalid tag ID format');
    }
    return this.tagService.remove(req.user.id, tagId);
  }
}
