import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  public loadingSpinner: BehaviorSubject<boolean>;

  constructor() {
    this.loadingSpinner = new BehaviorSubject<boolean>(false);
  }
}
