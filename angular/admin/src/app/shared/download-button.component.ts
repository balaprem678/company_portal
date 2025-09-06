import { Component, Input, Output, EventEmitter } from '@angular/core';
import * as html2pdf from 'html2pdf.js';
import { log } from 'util';
import { Apiconfig } from '../_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';

@Component({
	selector: 'app-download-button',
	template: `<button (click)="onDownload()">Download</button>`,
})
export class DownloadButtonComponent {
	@Input() rowData: any;
	@Output() download = new EventEmitter<any>();
	data: any
	// apiService: any;
	//   onDownload() {
	//     console.log("onDownload()onDownload()");

	//    this.download.emit(this.rowData);

	// console.log(this.rowData,"this.datathis.datathis.datathis.data");



	//   }

	constructor(private apiService: ApiService,) {

	}


	onDownload() {
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

		this.download.emit(this.rowData);
		console.log(this.rowData, "this.rowDatathis.rowData");

		// invoiceNumber
// return
		this.apiService.CommonApi(Apiconfig.invoiceNumber.method, Apiconfig.invoiceNumber.url, { _id: this.rowData._id }).subscribe(
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


// <tr style="border-bottom:1px solid #e9ebec; font-size: 13px;">
// 										<td style="font-weight:600;padding-bottom:10px; padding-top:5px;">INRRP585</td>
// 										<td style="padding-bottom:10px; padding-top:5px;">Karunkuruvai Rice Flour - 500g <br><span style="color:#878a99;">• <em style="font-weight:700; color:#000;">Weight:</em> 500g</span></td>
// 										<td style="padding-bottom:10px; padding-top:5px;">3</td>
// 										<td style="text-align:center; padding-bottom:10px; padding-top:5px;"> ₹140</td>
// 										<td style="text-align:right; padding-bottom:10px; padding-top:5px;">₹420</td>
// 									</tr>
// 									<tr style="border-bottom:1px solid #e9ebec; font-size: 13px;">
// 										<td style="font-weight:600;padding-bottom:10px; padding-top:5px;">INRRP585</td>
// 										<td style="padding-bottom:10px;padding-top:5px;">Karunkuruvai Rice Flour - 500g <br><span style="color:#878a99;">• <em style="font-weight:700; color:#000;">Weight:</em> 500g</span></td>
// 										<td style="padding-bottom:10px;padding-top:5px;">3</td>
// 										<td style="text-align:center; padding-bottom:10px;padding-top:5px;"> ₹140</td>
// 										<td style="text-align:right; padding-bottom:10px;padding-top:5px;">₹420</td>
// 									</tr>