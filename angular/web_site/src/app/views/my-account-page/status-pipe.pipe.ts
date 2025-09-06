import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusPipe'
})
export class StatusPipePipe implements PipeTransform {

  transform(value: number): string {
    const statusMap = {
      1: 'Processing',
      3: 'Packed',
      6: 'Ongoing',
      7: 'Delivered',
      19: 'Cancelled'
    };

    return statusMap[value] || 'Unknown Status';
  }
}
