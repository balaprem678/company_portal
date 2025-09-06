import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'usersCount'
})
export class UsersCountPipe implements PipeTransform {

  transform(value: any, ...args: unknown[]): unknown {
    let userCount = '0';
    if (value) {
      // console.log("valuevalue", value)
      if(value < 1000){
        userCount = value;
      }else if((value >= 1000) && (value < 1000000)){
        userCount = (value / 1000).toFixed(2) + "k";
      }else if(value >= 1000000){
        userCount = (value / 1000000).toFixed(2) + "M"
      };
    }
    return userCount;
  }

}
