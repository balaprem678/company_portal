import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private orderSubject = new BehaviorSubject<any | null>(null);
  order$ = this.orderSubject.asObservable();

  setOrder(order: any) {
    this.orderSubject.next(order);
  }
}
