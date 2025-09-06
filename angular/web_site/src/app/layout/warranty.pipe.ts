import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'varntfiltr'
})
export class WarrantyPipe implements PipeTransform {

  transform(varnts, match) {
    var varnt = varnts.filter(function (e) {
      return e._id == match;
    })
    return varnt && varnt[0] && varnt[0].unit ? ' - ' + varnt[0].quantity + ' ' + varnt[0].unit : '';
  }

}
