import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
  ) {}

  findAll(): Promise<Book[]> {
    return this.booksRepository.find();
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.booksRepository.findOneBy({ id });
    if (!book) throw new NotFoundException(`Buku dengan ID ${id} tidak ditemukan`);
    return book;
  }

  create(bookData: Partial<Book>): Promise<Book> {
    const newBook = this.booksRepository.create(bookData);
    return this.booksRepository.save(newBook);
  }

  async update(id: number, bookData: Partial<Book>): Promise<Book> {
    const book = await this.findOne(id);
    const updated = this.booksRepository.merge(book, bookData);
    return this.booksRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const book = await this.findOne(id);
    await this.booksRepository.remove(book);
  }
}
