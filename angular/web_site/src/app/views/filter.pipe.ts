import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  pure: false
})
export class FilterPipe implements PipeTransform {

  transform(items: any[]): any {
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    return items.filter(item => item.is_available == '0');
}

}