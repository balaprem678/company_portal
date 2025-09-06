import { Component, OnInit } from '@angular/core';
import { ApiService } from '../_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-paymentstatus',
  templateUrl: './paymentstatus.component.html',
  styleUrls: ['./paymentstatus.component.scss']
})
export class PaymentstatusComponent implements OnInit {
orderStatus:string;
  constructor(
    private apiService: ApiService,
    private activatedRoute: ActivatedRoute
  ) { 
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);
  }
id:string;
  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      // console.log(params['order_id'],'params[');
      
       this.id = params['order_id'];
    })
    this.getStatus()
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 400);
  }

  getStatus(){
    // console.log("====================================================================");
    
    this.apiService.CommonApi(Apiconfig.checkPaymentStatus.method, Apiconfig.checkPaymentStatus.url, {id:this.id}).subscribe(res => {
      let getOrderResponse = res.data; //Get Order API Response
      if(res.status==true){
if(getOrderResponse.filter(transaction => transaction.payment_status === "SUCCESS").length > 0){
    this.orderStatus = "Success"
}else if(getOrderResponse.filter(transaction => transaction.payment_status === "PENDING").length > 0){
  this.orderStatus = "Pending"
}else{
  this.orderStatus = "Failure"
}
      }else{

      }
      // console.log(this.orderStatus,'this is the order status');
      // console.log(res,'this is the response from me');
    })
  }

}
