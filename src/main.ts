import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(),
    new FastifyAdapter()
  );
  
  // Ambil port dari environment variable (berguna untuk pm2) atau default 3000
  const port = process.env.PORT ?? 3000;
  
  // Binding ke 0.0.0.0 agar dapat diakses dari luar (jika diperlukan)
  await app.listen(port, '0.0.0.0');
  console.log(`Node running on port: ${port}`);
}
bootstrap();
