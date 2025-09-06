import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-payment-failure',
  templateUrl: './payment-failure.component.html',
  styleUrls: ['./payment-failure.component.scss']
})
export class PaymentFailureComponent implements OnInit {

  constructor() {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);   }

  ngOnInit(): void {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);
  }

}
