import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sizeFilter'
})
export class SizeFilterPipe implements PipeTransform {

  transform(items: any[], filter: any): any {
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    console.log("items", items)
    console.log("filter", filter)
    return items.filter(item => {return (item.size == filter && item.quantity > 0) || (item.size == filter && item.status == 2)});
  }

}
