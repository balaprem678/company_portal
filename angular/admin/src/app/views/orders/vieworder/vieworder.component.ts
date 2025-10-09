import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';
import * as html2pdf from 'html2pdf.js';
import { DatePipe } from '@angular/common';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

@Component({
	selector: 'app-vieworder',
	templateUrl: './vieworder.component.html',
	styleUrls: ['./vieworder.component.scss'],
	providers: [DatePipe]
})
export class VieworderComponent implements OnInit {
	@ViewChild('confirmModal') model: TemplateRef<any>;

	formattedDate: any;
	formattedTime: any;
	open: boolean = true;
	disabled: boolean = true;
	deliveryAddress: any
	id: any;
	data: any;
	user: any;
	transactions: any;
	food: any;
	driver: any;
	apiUrl: any;
	totalAmountInvoice: any
	TotalOrderAmounts: any;
	totalAmount: any[] = []
	scheduleTimeLable: boolean = false
	emptyArray: any[] = []
	status: any
	curreny_symbol: any
	selectedOption: string = '';
	options: string[] = ['Order Packed', 'Order Cancelled'];
	height: number | null = null;
	heightError: boolean = false;
	length: number | null = null;
	lengthError: boolean = false;
	breadth: number | null = null;
	breadthError: boolean = false;
  
	constructor(private apiService: ApiService,
		private route: ActivatedRoute,
		private notifyService: NotificationService,
		private router: Router,
		private _location: Location,
		private datePipe: DatePipe,
		private modalService: BsModalService
	) {
		this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(result => {
			this.curreny_symbol = result && result.currency_symbol != (undefined || null) && result.currency_symbol ? result.currency_symbol : "₹"
		})
	}

	ngOnInit(): void {
		this.emptyArray = []
		this.apiUrl = environment.apiUrl
		this.id = this.route.snapshot.paramMap.get('id')
		this.apiService.CommonApi(Apiconfig.getorders.method, Apiconfig.getorders.url, { id: this.id }).subscribe((result) => {
			console.log(result[0].fooods, 'this is result');



			if (result && result.length > 0 && result[0] != 0) {

				this.data = result;
				console.log(this.data, "this.datathis.datathis.data");
				console.log(this.data[0].status, "status status status");
				if(result[0].status==3){
					this.selectedOption='Order Packed'
				}
				if(result[0].status==6){
					this.selectedOption='on_going'
				}
				if(result[0].status==7){
					this.selectedOption='delivered'
				}
				this.user = result[0].user[0]
				this.status = result[0].status
				this.transactions = result[0].transactions
				this.food = result[0].foods;
				let total = 0;
				this.totalAmount = result[0].foods.forEach(food => {
					console.log('Food Item:', food);
					total += food.price * food.quantity;
				});
				this.TotalOrderAmounts = total
				this.totalAmountInvoice = this.data[0].billings.amount.grand_total;
				this.deliveryAddress = this.data[0].delivery_address
				console.log(this.data[0].delivery_address,"this.data[0].delivery_addressthis.data[0].delivery_address");
				
				console.log("foodky", this.food)
				if (this.data && this.data[0] && this.data[0].schedule_time_slot != undefined && this.data[0].schedule_time_slot != null) {
					this.scheduleTimeLable = true
				}
				console.log("foody", this.data[0].schedule_time_slot)
				this.apiService.notificationFunction({ data: { type: 'nofif' } })
			}
			else {
				this.data = []
			}

		})
	}

	validateLength(event: Event) {
		const input = (event.target as HTMLInputElement);
		if (input.value && +input.value < 0) {
		  input.value = '0';
		  this.length = 0;  // Ensures the model stays consistent
		}
	  }
	  validateBreadth(event: Event) {
		const input = (event.target as HTMLInputElement);
		if (input.value && +input.value < 0) {
		  input.value = '0';
		  this.breadth = 0;  // Ensures model consistency
		}
	  }

	  validateHeight(event: Event) {
		const input = (event.target as HTMLInputElement);
		if (input.value && +input.value < 0) {
		  input.value = '0';
		  this.height = 0;  // Ensure the model also updates to 0
		}
	  }

	onModelChange(){


			this.heightError = false;
			this.lengthError = false;
			this.breadthError = false;
			this.apiService.CommonApi(Apiconfig.updateOrderStatus.method, Apiconfig.updateOrderStatus.url, { order_id: this.id, status: 3 }).subscribe(result => {
				if (result && result.status == 1) {
				  this.notifyService.showSuccess(result.message || 'Updated Successfully');
				  this.ngOnInit();
				  this.apiService.CommonApi(Apiconfig.ShipRocket.method, Apiconfig.ShipRocket.url, {order_id: this.id,height:this.height,breadth:this.breadth,length:this.length}).subscribe(result => {
					console.log(result, "result111111111111111111111111111111111111");
					this.modalService.hide();
					 if(result.error){
					  this.notifyService.showError(result.message || 'Something went wrong');
					 }
				  })
				} else {
				  this.notifyService.showError(result.message || 'Something went wrong');
				}
			  })

	}
	cancelOrder(id, status) {
		if (id && status) {
		  this.apiService.CommonApi(Apiconfig.cancelOrderstatus.method, Apiconfig.cancelOrderstatus.url, { order_id: id, status: 19 }).subscribe((res) => {
			if (res && res.status === true) {
			  this.ngOnInit()
			//   this.modalService.hide();
			  this.notifyService.showSuccess('Updated Successfully');

			} else {
			  this.notifyService.showError(res.message || "Somthing went wrong")
			}
		  })
	
		}
	  }

	onChange() {
		console.log('Selected:', this.selectedOption);
		// this.model.
		if(this.selectedOption=='Order Packed'){
		this.modalService.show(this.model)
	}else if(this.selectedOption=='Order Cancelled'){
		this.cancelOrder(this.id,19)
	}
	  }

	getOrderStatus(orderId){
		this.apiService.CommonApi(Apiconfig.shiprocketOrdersStatus.method, Apiconfig.shiprocketOrdersStatus.url, { order_id: orderId }).subscribe(
			(result) => {
				console.log(result)
				if (result.status == 1) {
				  this.ngOnInit()
				}
			}
		)
	
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
	downloadPage() {
		const now = new Date();
		this.formattedDate = this.datePipe.transform(now, 'dd MMM, yyyy');
		this.formattedTime = this.datePipe.transform(now, 'hh:mm a');
		let paid 
		let color 
		let textColor 
		if(this.data[0].transactions[0].type == 'COD'){
            paid = "Unpaid"
			color = "#bc0d00"
			textColor     = "#ffffff"
		}else{
			paid = "Paid"
			color = "#dcf6e9"
			textColor     = "#13c56b"
		}
		let formHTML = `
       <!DOCTYPE html>
<html>
<head>
	<title>clickkart - Invoice</title>
</head>
<body>
	<table style="margin: 0; padding: 0; color: #000; padding-top: 40px; padding-bottom: 40px; font-family: 'Montserrat', sans-serif; font-weight: 500; padding-left: 20px;padding-right: 20px; margin:0 auto; width:100%" border="0" cellspacing="0" cellpadding="0">
		<tbody>
			<tr>
				<td>
					<table style="width: 100%;">
						<tbody>
							<tr>
								<td style="vertical-align: top;"><img src="assets/image/Pillais-Foods-logo.png" style="width:100px;"></td>
								<td colspan="2">
									<p style="margin: 0;font-size: 13px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 700; text-align:right; color:#495057;"><i style=" font-style: normal; font-family: 'Montserrat', sans-serif; font-weight: 500; color:#878a99;">Email :</i> <span>helpdesk@pillais.in</span></p>
									<p style="margin: 0;font-size: 13px;margin-bottom: 5px; font-family: 'Montserrat', sans-serif; font-weight: 700; text-align:right; color:#495057;"><i style=" font-style: normal; font-family: 'Montserrat', sans-serif; font-weight: 500; color:#878a99;">Website :</i> <span>www.pillais.in</span></p>
									<p style="margin: 0;font-size: 13px;font-family: 'Montserrat', sans-serif; font-weight: 700; text-align:right; color:#495057;"><i style=" font-style: normal; font-family: 'Montserrat', sans-serif; font-weight: 500; color:#878a99;">Contact No :</i> <span>+91 95660 32510</span></p>
								</td>
							</tr>
							<tr>
								<td style="width: 45%;text-align: left;">
									<p style="margin: 0;font-size: 13px; font-family: 'Montserrat', sans-serif; font-weight: 500; line-height:20px; color:#495057; font-weight:700;">ADDRESS</p>
									<p style="margin: 0;font-size: 13px; font-family: 'Montserrat', sans-serif; font-weight: 500; line-height:20px; color:#878a99;">No 3/29, Ragava Nagar, 2nd Street, Madipakkam, Chennai</p>
									<p style="margin: 0;font-size: 13px; font-family: 'Montserrat', sans-serif; font-weight: 500; line-height:20px; color:#878a99;">Zip-code: 600091</p>
									<p style="margin: 0;font-size: 13px; font-family: 'Montserrat', sans-serif; font-weight: 500;">&nbsp;</p>
								</td>
							</tr>
							<tr>
								<td colspan="2" style="width: 100%;">
									<table cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; border-top:1px dashed #e9ebec; border-bottom:1px dashed #e9ebec;">
									<tbody>
										<tr>
											<td colspan="4" style="height:5px;"></td>
										</tr>
										<tr style="margin: 0;font-size: 12px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 600; margin-bottom:5px; line-height:18px; color:#878a99">
											<td width="25%" style="vertical-align:top;">ORDER ID</td>
											<td width="25%" style="vertical-align:top;">INVOICE NO</td>
											<td width="25%" style="vertical-align:top;">DATE</td>
											<td width="25%" style="vertical-align:top;">PAYMENT STATUS</td>
											<td width="25%" style="vertical-align:top;">TOTAL AMOUNT</td>
										</tr>
										<tr style="margin: 0;font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 600; margin-bottom:5px; line-height:18px; color:#495057">
											<td style="vertical-align:top;">${this.data[0].order_id}</td>
											<td style="vertical-align:top;">#VL25000355</td>
											<td style="vertical-align:top;">${this.formattedDate}<span style="font-size:12px; color:#878a99 ;">${this.formattedTime}</span></td>
											<td style="vertical-align:top;"><i style="background:${color}; padding:4px 10px; color:${textColor}; font-size:11px; font-style:normal; border-radius: 5px;">${paid}</i></td>
											<td style="vertical-align:top;">${this.curreny_symbol}  ${this.totalAmountInvoice}</td>
										</tr>
										<tr>
											<td colspan="4" style="height:5px;"></td>
										</tr>
										</tbody>
									</table>
								</td>
							</tr>
							<tr>
								<td colspan="2" style="width: 100%;">
									<table cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; ">
									<tbody>
										<tr style="margin: 0;  font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; color:#495057">
														<td style="text-align: left;">
															<span style="font-weight:600; padding-bottom:10px;">BILLING ADDRESS</span>
															<p style="font-weight:600; color:#495057; margin:0px; height:5px;"></p>
															<p style="font-weight:600; color:#495057; margin:0px;">${this.data[0].user[0].first_name}${this.data[0].user[0].last_name && this.data[0].user[0].last_name != (undefined || null) ? this.data[0].user[0].last_name : ''}</p>
															<p style="font-weight:500; color:#878a99; margin:0px;">${this.data[0] && this.data[0].delivery_address && this.data[0].delivery_address.line1 && this.data[0].delivery_address.line1 != (undefined || null || '') ? this.data[0].delivery_address.line1 : ''}</p>
															<p style="font-weight:500; color:#878a99; margin:0px;">Phone: ${this.data[0].delivery_address.phone_number}</p>
														</td>
														<td style="text-align: left;">
															<span style="font-weight:600; padding-bottom:10px;">SHIPPING ADDRESS</span>
															<p style="font-weight:600; color:#495057; margin:0px; height:5px;"></p>
															<p style="font-weight:600; color:#495057; margin:0px;">${this.data[0].user[0].first_name}${this.data[0].user[0].last_name && this.data[0].user[0].last_name != (undefined || null) ? this.data[0].user[0].last_name : ''}</p>
															<p style="font-weight:500; color:#878a99; margin:0px;">${this.data[0] && this.data[0].billing_address && this.data[0].billing_address.line1 != (undefined || null || '') && this.data[0].billing_address.line1  ? this.data[0].billing_address.line1 : this.data[0].delivery_address.line1}</p>
															<p style="font-weight:500; color:#878a99; margin:0px;">Phone: ${this.data[0]?.billing_address?.phone_number}</p>
														</td>
													</tr>
										</tbody>
									</table>
								</td>
							</tr> 
							
							
							
							
							<tr>
								<td colspan="2" style="width: 100%;">
									<table cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; border-bottom:1px dashed #e9ebec; border-top:1px dashed #e9ebec; font-size: 13px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 500; margin-bottom:5px; line-height:24px; Color:#495057; text-align:left;">
									<tbody>
									<tr style="border-bottom:1px dashed #e9ebec;background:#f6f6f7;">
										<th>#</th>
										<th>Product Details</th>
										<th>Price</th>
										<th style="text-align:center;">Quantity</th>
										<th style="text-align:right;">Amount</th>
									</tr>
									
							
 									${this.generateRows()}
									
									<tr style="text-align:left;">
										<td colspan="3" rowspan="5">
											<span style="font-weight:600; padding-bottom:10px;">PAYMENT DETAILS</span>
											<p style="font-weight:500; color:#495057; margin:0px; height:5px;"></p>
											<p style="font-weight:500; color:#878a99; margin:0px;">Payment Method: ${this.data[0].transactions[0].type ? this.data[0].transactions[0].type : "COD"}</p>
											<p style="font-weight:500; color:#878a99; margin:0px;">Transaction Id: ${this.data[0].stripechargeid ? this.data[0].stripechargeid : this.data[0].razorpaypayment_id ? this.data[0].razorpaypayment_id : "Not Applicable"}</p>											
											<p style="font-weight:500; color:#878a99; margin:0px;">Total Amount: ${this.data[0].transactions[0].amount ? this.data[0].transactions[0].amount : this.data[0].billings.amount.grand_total}</p>
										</td>
									</tr>
									<tr style="text-align:center;">
									<td>TAX</td>
									<td>0</td>
										
									</tr>
									<tr>
									<td style="margin: 0;font-size: 15px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom:5px; line-height:15px; border-top:1px dashed #e9ebec;">Total Amount</td>
										<td style="margin: 0;font-size: 15px; font-weight:bold; font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom:5px; line-height:15px; border-top:1px dashed #e9ebec; text-align:right;">₹${this.data[0].transactions[0].amount ? this.data[0].transactions[0].amount : this.data[0].billings.amount.grand_total}</td>
									</tr>
									
									<tbody>
									</table>
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

		// Convert HTML to PDF
		html2pdf()
			.from(element)
			.set({
				margin: 0,
				filename: 'invoice.pdf',
				html2canvas: { scale: 1 },
				jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
			})
			.save();
	}



	generateRows(): string {
		let rows = '';
         console.log(this.data,"this.datathis.datathis.datathis.datathis.data");
		 
		 this.data && this.data[0] != (undefined || null) && this.data[0].foods.forEach((item, index) => {
			rows += `
				<tr style="font-size: 13px; font-weight: bold; color: #495057;">
					<td>${index + 1}</td>
					<td>${item.name}<br><span style="color: #878a99;">${item.variations && item.variations[0] && item.variations[0][0] && item.variations[0][0].chaild_name != (undefined || null) && item.variations[0][0].chaild_name? item.variations[0][0].chaild_name : ''}</span></td>
					<td>₹${item.price}</td>
					<td style="text-align: center;">${item.quantity}</td>
					<td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
				</tr>
			`;
		});

		return rows;
	}

	calculatePositiveValue(): number {		
		const result = this.data[0].billings.amount.total - (this.data[0].cart_details.doc?.coupon_discount || 0) - (this.data[0].billings.amount.grand_total !== this.data[0].billings.amount.total?this.data[0].billings.amount.grand_total:0);
		console.log(result,this.data[0].billings.amount.grand_total,this.data[0].billings.amount.total,"llllllllll");
		
		return Math.abs(result);
	  }

}


