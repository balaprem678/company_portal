import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'categoryPipe'
})
export class CategoryPipePipe implements PipeTransform {

  transform(items: any[], id: any): any {
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    return items.filter(item => item._id == id);
  } 

}
