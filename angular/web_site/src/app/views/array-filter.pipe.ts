import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arrayFilter',
  pure: false
})
export class ArrayFilterPipe implements PipeTransform {

  transform(items: any[], filter: any): any {
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    return items.filter(item => item.type == filter.type).slice(0,filter.limit);
  }

}
