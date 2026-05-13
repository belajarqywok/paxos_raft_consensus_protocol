import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { Book } from './book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
