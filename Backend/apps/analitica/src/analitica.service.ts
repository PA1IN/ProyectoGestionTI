import { Injectable } from '@nestjs/common';

@Injectable()
export class AnaliticaService {
  getHello(): string {
    return 'Hello World!';
  }
}
