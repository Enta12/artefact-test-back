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
} from '@nestjs/common';
import { ColumnService } from './column.service';
import { CreateColumnDto, UpdateColumnDto } from './column.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('columns')
@UseGuards(JwtAuthGuard)
export class ColumnController {
  constructor(private readonly columnService: ColumnService) {}

  @Post()
  create(@Request() req, @Body() createColumnDto: CreateColumnDto) {
    return this.columnService.create(req.user.id, createColumnDto);
  }

  @Get('project/:projectId')
  findAll(@Request() req, @Param('projectId') projectId: string) {
    return this.columnService.findAll(req.user.id, +projectId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.columnService.findOne(req.user.id, +id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateColumnDto: UpdateColumnDto) {
    return this.columnService.update(req.user.id, +id, updateColumnDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.columnService.remove(req.user.id, +id);
  }
}
