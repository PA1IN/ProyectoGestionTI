import { Injectable } from '@nestjs/common';

@Injectable()
export class ConciliacionService {
  getHello(): string {
    return 'Hello World!';
  }
}
