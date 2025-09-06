import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { OrderService } from 'src/app/_services/order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-new-order-received',
  templateUrl: './new-order-received.component.html',
  styleUrls: ['./new-order-received.component.scss']
})
export class NewOrderReceivedComponent implements OnInit ,OnDestroy{

  order: any ;
  apiUrl=''
  totalWeight:number
  total:number
  currency_symbol : any
  progressValue: number = 1;
  grandTotal: any;
  userdetails : any
  shipping : any
  cod_charge : any
  tax : any
  coupon_discount: any;
  statusMapping = {
    1: { label: 'Ordered' },
    3: { label: 'Packed' },
    6: { label: 'Shipped' },
    7: { label: 'Delivered' },
    9: { label: 'Canceled' },
    16: { label: 'Return Confirmed' },
    17: { label: 'Collected' },
    18: { label: 'Refunded' }
  };
  constructor(
    private router: Router,
    private apiService: ApiService,
    private activatedRoute:ActivatedRoute,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {
    this.userdetails = JSON.parse(localStorage.getItem('userDetails'));
    console.log(this.userdetails,"this.userdetailsthis.userdetails");
    

  }




  ngOnInit(): void {
    this.apiUrl = environment.apiUrl
    this.orderService.order$.subscribe(order => {
      this.order = order;      
      console.log(this.order,"dasdasdasdasdads---");
      
      let weight =[]
      if (!this.order) {
        const orderData = localStorage.getItem('currentOrder');
        if (orderData) {
          this.order = JSON.parse(orderData);
          this.getOrderStatus(this.order.order_id)
          console.log(this.order,"this.order");

          this.calculateProgressValue();
          // this.cdr.detectChanges();
        }

      }else{
        this.calculateProgressValue();

      }

      this.total = 0;
      for(let item of this.order.foods){
        this.total+=item.price * item.net_quantity
        weight.push(item.variations[0][0].chaild_name)
      }
       this.grandTotal = this.order.billings.amount.grand_total
       this.shipping = this.order.billings.amount.shippingCharge
       this.cod_charge = this.order.billings.amount.cod_charge
       this.tax = this.order.billings.amount.service_tax
       this.coupon_discount = this.order.billings.amount.coupon_discount
       this.totalWeight = this.order.billings.amount.total_weight
      // this.totalWeight = this.calculateTotalWeight(weight)
      console.log(this.totalWeight,'this is weight...')
    });
    this.apiService.CommonApi(Apiconfig.siteSettign.method, Apiconfig.siteSettign.url, {}).subscribe(result => {

      console.log(result,"resulttttttttttttttttttttttttt");
      this.currency_symbol = result.settings.currency_symbol
    })
    console.log(this.order,"odddddererererre");

    console.log(this.order.billing_address,"order.billing_address");
    
  }
 
  
  
  ngOnDestroy(): void {

    localStorage.removeItem('currentOrder');
  }

  calculateProgressValue() {
    // Map order status to progress percentage
    const statusMapping: { [key: number]: { progress: number; label: string } } = {
        1: { progress: 10, label: 'Ordered' },          // Ordered
        3: { progress: 30, label: 'Packed' },           // Packed
        6: { progress: 50, label: 'Shipped' },                    // Shipped
        7: { progress: 100, label: 'Delivered' },       // Delivered
        9: { progress: 100, label: 'Canceled' },        // Canceled
        16: { progress: 100, label: 'Return Confirmed' }, // Return Confirmed
        17: { progress: 100, label: 'Collected' },      // Collected
        18: { progress: 100, label: 'Refunded' }        // Refunded
    };
     
    
    let currentStatus = this.order.status; // Use the 'status' field from the order collection
    let statusInfo = statusMapping[currentStatus] || { progress: 0, label: 'Unknown Status' };

    if(currentStatus==7){
      this.progressValue=100
      return 
    }
    
    if (this.order.shiprocket_data?.out_for_delivery_date && this.order.shiprocket_data?.out_for_delivery_date !== "") {
      // If the order is out for delivery, set progress to 80%
      currentStatus = 6;  // We still treat it as "Shipped", but it should have 80% progress
      statusInfo =  { progress: 80, label: 'Out for Delivery' } // Directly set progress to 80%
  }
    // Set progress value and log the status label
    this.progressValue = statusInfo.progress;
    console.log(`Current Order Status: ${statusInfo.label}`);
}
  

getOrderStatus(orderId){
  this.apiService.CommonApi(Apiconfig.shiprocketOrdersStatus.method, Apiconfig.shiprocketOrdersStatus.url, { order_id: orderId }).subscribe(
    (result) => {
      
      if (result.status == 1) {
        console.log("oeder updated");
        
      }
    }
  )

}

parseDate(dateString: string): Date {
  const parts = dateString.split(' '); // Split the date and time
  const dateParts = parts[0].split('-'); // Split the date by '-'
  const timeParts = parts[1].split(':'); // Split the time by ':'

  // Create a new Date object using the components
  return new Date(
    +dateParts[2],   // year (2024)
    +dateParts[1] - 1, // month (0-based, so subtract 1)
    +dateParts[0],   // day (22)
    +timeParts[0],   // hour (17)
    +timeParts[1],   // minute (04)
    +timeParts[2]    // second (15)
  );
}


  calculateTotalWeight(weights) {
    const densityKgPerL = 1; 
  
    const totalWeightKg = weights.reduce((total, weight) => {
      
      const match = weight.match(/^(\d+(\.\d+)?)\s*(g|kg|ml|l)$/i);
  
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[3].toLowerCase();
  
  
        if (unit === 'g') {
          return total + (value / 1000);
        } else if (unit === 'kg') {
          return total + value; 
        } else if (unit === 'ml') {
          return total + (value / 1000) * densityKgPerL;
        } else if (unit === 'l') {
          return total + value * densityKgPerL; 
        }
      }
  
      
      console.warn(`Invalid weight format: ${weight}`);
      return total;
    }, 0);
  
    return totalWeightKg;
  }



}


