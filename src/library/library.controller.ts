import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Book } from './book.entity';

@Controller('library')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  @RequirePermissions('read_book')
  findAll() {
    return this.libraryService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_book')
  findOne(@Param('id') id: string) {
    return this.libraryService.findOne(+id);
  }

  @Post()
  @RequirePermissions('create_book')
  create(@Body() dto: Partial<Book>) {
    return this.libraryService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('update_book')
  update(@Param('id') id: string, @Body() dto: Partial<Book>) {
    return this.libraryService.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_book')
  remove(@Param('id') id: string) {
    return this.libraryService.remove(+id);
  }
}
