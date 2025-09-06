import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-cod-order-status',
  templateUrl: './cod-order-status.component.html',
  styleUrls: ['./cod-order-status.component.scss']
})
export class CodOrderStatusComponent implements OnInit {
  
  order_id: string;
  email: any;
  constructor() {
    var eml = localStorage.getItem('order_email');
    if (eml) {
      this.email = eml
    }
  }

  ngOnInit(): void {
    if (window.history.state.order_id) {
      this.order_id = window.history.state.order_id;
    }
    window.scroll(0, 0);
  }

}
