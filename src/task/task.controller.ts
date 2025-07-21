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
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(req.user.id, createTaskDto);
  }

  @Get('project/:projectId')
  findAll(@Request() req, @Param('projectId') projectId: string) {
    const projectIdNum = parseInt(projectId);
    if (isNaN(projectIdNum)) {
      throw new BadRequestException('Invalid project ID');
    }
    return this.taskService.findAll(req.user.id, projectIdNum);
  }

  @Get('column/:columnId')
  findByColumn(@Request() req, @Param('columnId') columnId: string) {
    const columnIdNum = parseInt(columnId);
    if (isNaN(columnIdNum)) {
      throw new BadRequestException('Invalid column ID');
    }
    return this.taskService.findByColumn(req.user.id, columnIdNum);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.taskService.findOne(req.user.id, taskId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.taskService.update(req.user.id, taskId, updateTaskDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.taskService.remove(req.user.id, taskId);
  }
}
