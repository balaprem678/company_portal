import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-return-view',
  templateUrl: './return-view.component.html',
  styleUrls: ['./return-view.component.scss']
})
export class ReturnViewComponent  implements OnInit{
  id: any;
  data: any;
  user: any;
  transactions: any;
  food: any;
  driver: any;
  apiUrl: any;
  time:any;
  status:any;
  scheduleTimeLable: boolean = false
  constructor(private apiService: ApiService,
    private route: ActivatedRoute,
    private notifyService: NotificationService,
    private router: Router,
    private _location: Location
  ) { }

  ngOnInit(): void {
    this.apiUrl = environment.apiUrl
    this.id = this.route.snapshot.paramMap.get('id')
    this.time = this.route.snapshot.paramMap.get('time')
    this.status = this.route.snapshot.paramMap.get('status')
    console.log(this.id,'id');
    console.log(this.time,'time');
    console.log(this.status,'status');

    
    this.apiService.CommonApi(Apiconfig.returnViewOrder.method, Apiconfig.returnViewOrder.url, { order_id: this.id, time:this.time, status:this.status }).subscribe((result) => {
      console.log(result, 'this is result');

      if (result) {
        this.data = result;
        this.user = result.user
        console.log(this.data,'this.data');
        console.log(this.user,'this.user');
        
        // this.transactions = result[0].transactions
        this.food = result.foods;
        console.log("foodky", this.food)
        if (this.data && this.data[0] && this.data[0].schedule_time_slot != undefined && this.data[0].schedule_time_slot != null) {
          this.scheduleTimeLable = true
        }
        // console.log("foody", this.data[0].schedule_time_slot)
        this.apiService.notificationFunction({ data: { type: 'nofif' } })
      }
      else {
        this.data = []
      }

    })
  }
  printDocument(order_id) {
    this.apiService.CommonApi(Apiconfig.printOrders.method, Apiconfig.printOrders.url, { order_id: order_id }).subscribe(
      (result) => {
        console.log(result)
        if (result.status == 1) {
          var a = document.createElement('a');
          a.href = result.filepath;
          a.download = result.filename;
          var event = document.createEvent('MouseEvents');
          event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
          a.dispatchEvent(event);
        }
      }
    )
  }

  packedOrder(id) {
    this.apiService.CommonApi(Apiconfig.packedOrders.method, Apiconfig.packedOrders.url, { id: id }).subscribe(
      (result) => {
        if (!result) {
          this.notifyService.showError('Error in accept_Order order');
        } else {
          this.notifyService.showSuccess(result.message);
          this.router.navigate(['/app/orders/packedorders']);
        }
      }, (error) => {
        this.notifyService.showError(error);
      }
    )
  }
  backClicked() {
    this._location.back();
  }
}
