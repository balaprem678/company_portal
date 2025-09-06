import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { OrderService } from 'src/app/_services/order.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import * as html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-my-orders',
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss']
})
export class MyOrdersComponent implements OnInit {

  userId: any;
  userDetails: any;
  search: any;

  selectedReason: string;
  customComment: string = '';
  orderDetails: any[] = [];
  apiurl: any;
  currency: any;
  product_id: any;
  viewImage: boolean = true;
  images: any[] = [];
  showorder: boolean = false;
  orderId: string;
  ratingDetails: any;
  currentPage: number = 1;
  itemsPerPage: number = 1;
  totalItems: number;
  skip: number = 0;
  limit: number = 10;
  review_rating: boolean = false;
  env_url: string = environment.apiUrl;
  productName: BsModalRef<any>;
  rowData: any;
  cartDetails: any;
  constructor(
    private route: Router,
    private notifyService: NotificationService,
    private socketService: WebsocketService,
    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private modalService: BsModalService,
    public store: DefaultStoreService,
    config: NgbRatingConfig,
    private orderService: OrderService,
  ) {
    this.apiurl = environment.apiUrl;
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }
    config.max = 5;
    this.store.generalSettings.subscribe((result) => {
      if (result) {
        this.currency = result.currency_symbol;
        if (result.review_rating) {
          this.review_rating = result.review_rating;
        }
      }
    });
  }

  ngOnInit(): void {
    window.scroll(0, 0);
    if (this.userId) {
      var valur = {
        user_id: this.userId,
      };
      this.getOrderDetails(valur);
    }
  }




  productDetails(slug, id, rcat, scat, cart_id, size) {
    setTimeout(() => {
      var data = {
        view: 'cart',
        cart_id: cart_id,
        size: size
      }
      this.apiService.viewProductPage({ data: data })
    }, 100);
    // this.route.navigate(['/products', slug], {
    //   relativeTo: this.activatedRoute,
    //   skipLocationChange: false,
    //   onSameUrlNavigation: "reload"
    //   // queryParams: {
    //   //   id: id,
    //   //   rcat: rcat,
    //   //   scat: scat
    //   // }
    // })
  }


  getOrderDetails(data) {
    data.skip = this.skip;
    data.limit = this.limit;

    // console.log(data,'this is the filtering data for me ...')

    this.apiService
      .CommonApi(Apiconfig.orderList.method, Apiconfig.orderList.url, data)
      .subscribe((result) => {

        if (result && result.status == 1) {
          this.orderDetails = result.data || [];
          console.log(result,'this is the orders resutl...')
          console.log(" this.orderDetails", this.orderDetails)

          // console.log("-----------------this.orderDetails---------------------------", this.orderDetails)
          this.totalItems = result.count;
          this.showorder = true;
        } else {
          this.showorder = true;
        }
      });
  }


  getCartDetails() {
    var data = {} as any;
    data.userId = '';
    console.log(this.userId, "cart deeeeee");

    if (this.userId) {
      data.userId = this.userId;
      data.user_id = this.userId
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey');
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    // data.cityid = this.cityid || "";
    // data.schedule_type = 0;
    // if (data.userId != '') {
    //   data.client_offset = new Date().getTimezoneOffset();
    //   this.socketService
    //     .socketCall('r2e_cart_details', data)
    //     .subscribe((response) => {
    //       if (response.err == 0) {
    //         this.cartDetails = response.cartDetails;
    //         this.cart_details = this.cartDetails
    //           ? this.cartDetails.cart_details &&
    //             this.cartDetails.cart_details.length > 0
    //             ? this.cartDetails.cart_details.map((e) => {
    //               return e.id;
    //             })
    //             : []
    //           : [];
    //         this.updateQuantity(this.cartDetails);
    //         console.log('cart details',this.cartDetails);
    //       }

    //     });
    // }

    if (data.userId != '') {
      // console.log("22222222222222");
      data.client_offset = new Date().getTimezoneOffset();
      // console.log(data,"data.client_offset");

      this.socketService.socketCall('r2e_cart_details', data).subscribe((response) => {
        // console.log("111111111111111");

        if (response.err == 0) {
          // console.log(response, 'cart res');
          this.cartDetails = response.cartDetails;
          // console.log(
          //   this.cartDetails,
          //   'this.cartDetailsthis.cartDetailsthis.cartDetails'
          // );
         
             
         
          // console.log(this.cartDetails, 'cart details...');
          this.store.cartdetails.next(this.cartDetails);
          // console.log(this.cartLength, ' this.cartLength');

        }
      });
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.skip = page * this.limit - this.limit;
      var valur = {
        user_id: this.userId,
      };
      this.getOrderDetails(valur);
      window.scrollTo(0, 0); 
    }
  }

  getVisiblePageNumbers(): number[] {
    const visiblePages = 4;
    const halfVisiblePages = Math.floor(visiblePages / 2);
    const startPage = Math.max(this.currentPage - halfVisiblePages, 1);
    const endPage = Math.min(startPage + visiblePages - 1, this.totalPages);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => i + startPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.limit);
  }


  viewOrderDetails(order:any) {
    this.orderService.setOrder(order);
    localStorage.setItem('currentOrder', JSON.stringify(order));
    this.route.navigate(['/my-account-page/new-order-received']);
  }   
  reOrder(order:any) {
    console.log(order,"order");
    // let orderId = order.order_id
    // let userId =  this.userId
    let data = {
      orderId:order._id||''  ,
      userId:this.userId
    }
    this.apiService
    .CommonApi(Apiconfig.reOrder.method, Apiconfig.reOrder.url, data)
    .subscribe((result) => {

      if (result && result.success == true) {
        // this.orderDetails = result.data || [];
        console.log(result,'this is t')
        console.log(" this.orderDetails", this.orderDetails)

       
        // this.totalItems = result.count;
        // this.showorder = true;
        // this.store.cartdetails.next(result.cart);
        this.getCartDetails()

      } else {
        this.showorder = true;
      }
    });
    // this.orderService.setOrder(order);
    // localStorage.setItem('currentOrder', JSON.stringify(order));
    // this.route.navigate(['/my-account-page/new-order-received']);
  }  
  
  

//   invoice(data) {
    
//     const now = new Date();
//     // let paid 
//     // let color 
//     // let textColor 
//     // if(this.data[0].transactions[0].type == 'COD'){
//     //     paid = "Unpaid"
//     //     color = "#bc0d00"
//     //     textColor     = "#ffffff"
//     // }else{
//     //     paid = "Paid"
//     //     color = "#dcf6e9"
//     //     textColor     = "#13c56b"
//     // }
//     console.log(data);
    
//     this.rowData =  data
//   //   this.download.emit(this.rowData);
// 	// console.log(this.rowData,"this.rowDatathis.rowData");
   
//     let formHTML = `
//    <!DOCTYPE html>
// <html>
// <head>
// 	<title>Pillais - Invoice</title>
// </head>
// <body>
// 	<table style="margin: 0; padding: 0; color: #000; padding-top: 40px; padding-bottom: 40px; font-family: 'Montserrat', sans-serif; font-weight: 500; padding-left: 20px;padding-right: 20px; margin:0 auto; width:100%;" border="0" cellspacing="0" cellpadding="0">
// 		<tbody>
// 			<tr>
// 				<td>
// 					<table style="width: 100%;">
// 						<tbody>
// 							<tr>
// 								<td width="36%" style="vertical-align: top;">
// 									<img src="assets/img/logo.png" style="width:80px;">
// 									<img src="assets/img/top-logo.png" style="width:140px;vertical-align: top;">
// 								</td>
// 								<td width="32%" style="vertical-align: top;">
// 									<p style="margin: 0;font-size: 18px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 700; text-align:left; color:#0A472E;">Pillai’s Foods IN</p>
// 									<p style="margin: 0;font-size: 14px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 500; text-align:left; color:#535D66; line-height: 26px;"> #3/29, Ragava Nagar, 2nd Street, <br> Madipakkam, Chennai <br> 600091</p>
// 								</td>
// 								<td width="32%" style="vertical-align: middle;">
// 									<p style="margin: 0;font-size: 13px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 500; text-align:left; color:#535D66;">GST No: 33AAKCR8418G1Z8</p>
// 									<p style="margin: 0;font-size: 13px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 500; text-align:left; color:#535D66;"><span> +91 95660 32510</span> | <span>helpdesk@pillais.in</span></p>
// 								</td>
// 							</tr>
// 							<tr>
// 								<td colspan="3" style="height:30px;"></td>
// 							</tr>
// 							<tr style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; color:#495057; vertical-align: top;">
// 								<td>
// 									<p style="font-weight:700; color:#535D66; font-size:16px; line-height:30px; margin: 0; ">INVOICE: <span>4225</span></p>
// 									<p style="font-weight:700; color:#535D66; font-size:16px; line-height:30px; margin:0px;">Order No: <span># ${this.rowData.order_id}</span></p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:30px; margin: 0;"> Invoice Date: <span>${new Date(this.rowData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:30px; margin:0px;">Order Date: <span>${new Date(this.rowData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
// 									<p style="font-weight:700; color:#535D66; font-size:16px; line-height:30px; margin:0px;">Payment Method: <span>${this.rowData.transactions[0]?.type == 'COD'?"Cash on delivery":"Prepaid" }</span></p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:30px; margin:0px;">Shipping Method: Standard Shipping <span>(Free)</span></p>
// 								</td>
// 								<td>
// 									<p style="font-weight:700; color:#0A472E; font-size:16px; line-height:25px; margin: 0;">Billing Address</p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin: 0; padding-top:10px;">${this.rowData.billing_address.first_name} ${this.rowData.billing_address.last_name}</p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;"> ${this.rowData.billing_address.line1} <br> ${this.rowData.billing_address.city} - ${this.rowData.billing_address.pincode} <br> ${this.rowData.billing_address.state}, ${this.rowData.billing_address.country}</p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;">${this.rowData.delivery_address.phone || this.rowData.delivery_address.phone.number ||this.rowData.delivery_address.phone_number}</p>
// 								</td>
// 								<td>
// 									<p style="font-weight:700; color:#0A472E; font-size:16px; line-height:25px; margin: 0;">Shipping Address</p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin: 0; padding-top:10px;">${this.rowData.delivery_address.first_name} ${this.rowData.delivery_address.last_name}</p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;"> ${this.rowData.delivery_address.line1} <br> ${this.rowData.delivery_address.city} - ${this.rowData.delivery_address.pincode} <br> ${this.rowData.delivery_address.state}, ${this.rowData.delivery_address.country}</p>
// 									<p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;">${this.rowData.delivery_address.phone || this.rowData.delivery_address.phone.number ||this.rowData.delivery_address.phone_number}</p>
// 								</td>
// 							</tr>
// 							<tr>
// 								<td colspan="3" style="height:30px;"></td>
// 							</tr>
// 							<tr>
// 								<td colspan="3" style="width: 100%;">
// 									<table cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;  border-top:3px solid #0A472E; font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; Color:#495057; text-align:left;">
// 									<tbody>
// 									<tr style="line-height:60px;font-weight: 700;font-size: 16px; color:#0A472E;">
// 										<th width="10%">SKU</th>
// 										<th width="60%">Product</th>
// 										<th width="10%">Quantity</th>
// 										<th width="10%" style="text-align:center;">Price</th>
// 										<th width="10%" style="text-align:right;">Total</th>
// 									</tr>
                                      
//                                     ${this.generateRows()}
									
// 									<tr>
// 										<td colspan="5" style="height:30px;"></td>
// 									</tr>
// 									<tr style="text-align:left; color:#000000;">
// 										<td colspan="3" rowspan="5"></td>
// 										<td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; text-align:center; padding-bottom:10px; text-align:right;">Subtotal</td>
// 										<td style="text-align:right; padding-bottom:10px;">₹${this?.rowData?.billings?.amount?.total}</td>
// 									</tr>
// 									<tr style="text-align:center; color:#000000;">
// 										<td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Discount</td>
// 										<td style="text-align:right; padding-bottom:10px;">- ₹${this?.rowData?.billings?.amount?.offer_discount }</td>
// 									</tr>
// 									<tr style="text-align:center; color:#000000;">
// 										<td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Shipping</td>
// 										<td style="text-align:right; padding-bottom:10px;">₹ ${this?.rowData?.billings?.amount?.shippingCharge }</td>
// 									</tr>
// 									<tr style="text-align:center; color:#000000;">
// 										<td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Tax</td>
// 										<td style="text-align:right; padding-bottom:10px;">₹ ${this?.rowData?.billings?.amount?.service_tax }</td>
// 									</tr>
// 									<tr style="text-align:center; color:#000000;">
// 										<td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Other Fees</td>
// 										<td style="text-align:right; padding-bottom:10px;">₹${this?.rowData?.billings?.amount?.cod_charge }</td>
// 									</tr>
// 									<tr style="text-align:center; color:#000000;">
// 										<td style="margin: 0;font-size: 15px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom:5px; line-height:24px; border-top:1px solid #e9ebec;padding-top:10px; text-align:right;">Total</td>
// 										<td style="margin: 0;font-size: 15px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom:5px; line-height:24px; border-top:1px solid #e9ebec; text-align:right; color:#000000; padding-top:10px;">₹${this?.rowData?.billings?.amount?.grand_total }</td>
// 									</tr>
									
// 									<tbody>
// 									</table>
// 									</td>
// 								</tr>
// 								<tr>
// 								<td colspan="3" style="height:30px;"></td>
// 							</tr>
// 							<tr style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; color:#495057; vertical-align: top;">
// 								<td colspan="3" >
// 									<p style="font-weight:500; color:#535D66; font-size:15px; line-height:30px; margin: 0; text-align:center; ">Thank you for your purchase.</p>
// 									<p style="font-weight:700; color:#535D66; font-size:15px; line-height:30px; margin: 0; text-align:center;">"Making healthy eating part of your lifestyle."</p>
// 								</td>
// 							</tr>
// 					</table>

// 				</td>
// 			</tr>

// 		</tbody>
// 	</table>

// </body>
// </html>
// `

//     const element = document.createElement('div');
//     element.innerHTML = formHTML;
// console.log(formHTML,"element.innerHTMLelement.innerHTML");

//     // Convert HTML to PDF
//     html2pdf()
//         .from(element)
//         .set({
//             margin: [0.5, 0.5, 0.5, 0.5],
//             filename: `Invoice-${this.rowData.order_id}.pdf`,
//             html2canvas: { scale: 2 },
//             jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
//         })
//         .save();
// }

invoice(order) {
  console.log(this.rowData,"this.rowDatathis.rowDatathis.rowData");
  this.rowData = order
  
  const now = new Date();
  // let paid 
  // let color 
  // let textColor 
  // if(this.data[0].transactions[0].type == 'COD'){
  //     paid = "Unpaid"
  //     color = "#bc0d00"
  //     textColor     = "#ffffff"
  // }else{
  //     paid = "Paid"
  //     color = "#dcf6e9"
  //     textColor     = "#13c56b"
  // }


  // invoiceNumber

  this.apiService.CommonApi(Apiconfig.invoice_number_site.method, Apiconfig.invoice_number_site.url, { _id: this.rowData._id }).subscribe(
    async (result) => {

      console.log(result.data, "invoice_number is there");
      // return
      let formHTML = `
    <!DOCTYPE html>
   <html>
   <head>
     <title>pillais - Invoice</title>
   </head>
   <body>
     <table style="margin: 0; padding: 0; color: #000; padding-top: 40px; padding-bottom: 40px; font-family: 'Montserrat', sans-serif; font-weight: 500; padding-left: 20px;padding-right: 20px; margin:0 auto; width:100%;" border="0" cellspacing="0" cellpadding="0">
       <tbody>
         <tr>
           <td>
             <table style="width: 100%;">
               <tbody>
                 <tr>
                   <td width="36%" style="vertical-align: top;">
                     <img src="assets/img/logo.png" style="width:80px;">
                     <img src="assets/img/top-logo.png" style="width:140px;vertical-align: top;">
                   </td>
                   <td width="32%" style="vertical-align: top;">
                     <p style="margin: 0;font-size: 18px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 700; text-align:left; color:#0A472E;">Pillai’s Foods IN</p>
                     <p style="margin: 0;font-size: 14px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 500; text-align:left; color:#535D66; line-height: 26px;"> #3/29, Ragava Nagar, 2nd Street, <br> Madipakkam, Chennai <br> 600091</p>
                   </td>
                   <td width="32%" style="vertical-align: middle;">
                     <p style="margin: 0;font-size: 13px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 500; text-align:left; color:#535D66;">GST No: 33AAKCR8418G1Z8</p>
                     <p style="margin: 0;font-size: 13px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 500; text-align:left; color:#535D66;"><span> +91 95660 32510</span> | <span>helpdesk@pillais.in</span></p>
                   </td>
                 </tr>
                 <tr>
                   <td colspan="3" style="height:30px;"></td>
                 </tr>
                 <tr style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; color:#495057; vertical-align: top;">
                   <td>
                     <p style="font-weight:700; color:#535D66; font-size:16px; line-height:30px; margin: 0; ">INVOICE: <span>${result.data}</span></p>
                     <p style="font-weight:700; color:#535D66; font-size:16px; line-height:30px; margin:0px;">Order No: <span># ${this.rowData.order_id}</span></p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:30px; margin: 0;"> Invoice Date: <span>${new Date(this.rowData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:30px; margin:0px;">Order Date: <span>${new Date(this.rowData.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
                     <p style="font-weight:700; color:#535D66; font-size:16px; line-height:30px; margin:0px;">Payment Method: <span>${this.rowData.transactions[0]?.type == 'COD' ? "Cash on delivery" : "Prepaid"}</span></p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:30px; margin:0px;">Shipping Method: Standard Shipping <span>(Free)</span></p>
                   </td>
                   <td>
                     <p style="font-weight:700; color:#0A472E; font-size:16px; line-height:25px; margin: 0;">Billing Address</p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin: 0; padding-top:10px;">${this.rowData.billing_address.first_name} ${this.rowData.billing_address.last_name}</p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;"> ${this.rowData.billing_address.line1} <br> ${this.rowData.billing_address.city} - ${this.rowData.billing_address.zipcode} <br> ${this.rowData.billing_address.state}, ${this.rowData.billing_address.country}</p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;">${this.rowData.delivery_address.phone || this.rowData.delivery_address.phone.number || this.rowData.delivery_address.phone_number}</p>
                   </td>
                   <td>
                     <p style="font-weight:700; color:#0A472E; font-size:16px; line-height:25px; margin: 0;">Shipping Address</p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin: 0; padding-top:10px;">${this.rowData.delivery_address.first_name} ${this.rowData.delivery_address.last_name}</p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;"> ${this.rowData.delivery_address.line1} <br> ${this.rowData.delivery_address.city} - ${this.rowData.delivery_address.zipcode} <br> ${this.rowData.delivery_address.state}, ${this.rowData.delivery_address.country}</p>
                     <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;">${this.rowData.delivery_address.phone || this.rowData.delivery_address.phone.number || this.rowData.delivery_address.phone_number}</p>
                   </td>
                 </tr>
                 <tr>
                   <td colspan="3" style="height:30px;"></td>
                 </tr>
                 <tr>
                   <td colspan="3" style="width: 100%;">
                     <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;  border-top:3px solid #0A472E; font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; Color:#495057; text-align:left;">
                     <tbody>
                     <tr style="line-height:60px;font-weight: 700;font-size: 16px; color:#0A472E;">
                       <th width="10%">SKU</th>
                       <th width="60%">Product</th>
                       <th width="10%">Quantity</th>
                       <th width="10%" style="text-align:center;">Price</th>
                       <th width="10%" style="text-align:right;">Total</th>
                     </tr>
                       
                     ${this.generateRows()}
                     
                     <tr>
                       <td colspan="5" style="height:30px;"></td>
                     </tr>
                     <tr style="text-align:left; color:#000000;">
                       <td colspan="3" rowspan="5"></td>
                       <td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; text-align:center; padding-bottom:10px; text-align:right;">Subtotal</td>
                       <td style="text-align:right; padding-bottom:10px;">₹${this?.rowData?.billings?.amount?.total}</td>
                     </tr>`

      if (this?.rowData?.billings?.amount?.offer_discount != 0) {
        formHTML += `<tr style="text-align:center; color:#000000;" *ngIf="this?.rowData?.billings?.amount?.offer_discount != 0">
                         <td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Discount</td>
                         <td style="text-align:right; padding-bottom:10px;">- ₹${this?.rowData?.billings?.amount?.offer_discount}</td>
                       </tr>`

      }

      formHTML += `<tr style="text-align:center; color:#000000;">
                       <td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Shipping</td>
                       <td style="text-align:right; padding-bottom:10px;">₹ ${this?.rowData?.billings?.amount?.shippingCharge}</td>
                     </tr>
                     <tr style="text-align:center; color:#000000;">
                       <td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">Tax</td>
                       <td style="text-align:right; padding-bottom:10px;">₹ ${this?.rowData?.billings?.amount?.service_tax}</td>
                     </tr>`

      if (this?.rowData?.billings?.amount?.cod_charge != 0) {

        formHTML += `<tr style="text-align:center; color:#000000;">
                         <td style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:0px; line-height:24px; padding-bottom:10px; text-align:right;">COD Fees</td>
                         <td style="text-align:right; padding-bottom:10px;">₹${this?.rowData?.billings?.amount?.cod_charge}</td>
                       </tr>`
      }
      formHTML += `<tr style="text-align:center; color:#000000;">
                       <td style="margin: 0;font-size: 15px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom:5px; line-height:24px; border-top:1px solid #e9ebec;padding-top:10px; text-align:right;">Total</td>
                       <td style="margin: 0;font-size: 15px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom:5px; line-height:24px; border-top:1px solid #e9ebec; text-align:right; color:#000000; padding-top:10px;">₹${this?.rowData?.billings?.amount?.grand_total}</td>
                     </tr>
                     
                     <tbody>
                     </table>
                     </td>
                   </tr>
                   <tr>
                   <td colspan="3" style="height:30px;"></td>
                 </tr>
                 <tr style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; color:#495057; vertical-align: top;">
                   <td colspan="3" >
                     <p style="font-weight:500; color:#535D66; font-size:15px; line-height:30px; margin: 0; text-align:center; ">Thank you for your purchase.</p>
                     <p style="font-weight:700; color:#535D66; font-size:15px; line-height:30px; margin: 0; text-align:center;">"Making healthy eating part of your lifestyle."</p>
                   </td>
                 </tr>
             </table>
   
           </td>
         </tr>
   
       </tbody>
     </table>
   
   </body>
   </html>
   `

      const element = document.createElement('div');
      element.innerHTML = formHTML;
      console.log(formHTML, "element.innerHTMLelement.innerHTML");

      // Convert HTML to PDF
      html2pdf()
        .from(element)
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: `PILLAI'S-${this.rowData.order_id}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
        })
        .save();
    })


}

generateRows(): string {
    let rows = '';
    console.log(this.rowData, "this.data");
    
    if (this.rowData && this.rowData && this.rowData.foods) {
        this.rowData.foods.forEach((item, index) => {
            const variation = item.variations?.[0]?.[0]?.chaild_name || '';
            const totalPrice = (item.price * item.quantity).toFixed(2);
            
            rows += `
                <tr style="font-size: 13px; border-bottom: 1px solid #e9ebec; font-weight: bold; color: #495057;">
                    <td style="padding: 10px 0;">${item.sku || `SKU${index + 1}`}</td>
                    <td style="padding: 10px 0;">
                        ${item.name}<br>
                        <span style="color: #878a99;">
                            ${variation ? `• <em style="font-weight:700; color:#000;">Weight:</em> ${variation}` : ''}
                        </span>
                    </td>
                    <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px 0; text-align: center;">₹${item.price}</td>
                    <td style="padding: 10px 0; text-align: right;">₹${totalPrice}</td>
                </tr>
            `;
        });
    }
    return rows;
}

}
