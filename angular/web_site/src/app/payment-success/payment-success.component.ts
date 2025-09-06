import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit {
  email: any;
  order_id:any
  constructor() {
    var eml = localStorage.getItem('order_email');
    if (eml) {
      this.email = eml
    }
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);
  }

  ngOnInit(): void {
    if (window.history.state.order_id) {
      this.order_id = window.history.state.order_id;
    }

    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);
  }

}
