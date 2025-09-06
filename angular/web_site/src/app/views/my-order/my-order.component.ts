import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import Swal from 'sweetalert2';
import { TYPE } from '../../_services/value.constant';
import { NgbRatingConfig, NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { environment } from 'src/environments/environment';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import * as html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-my-order',
  templateUrl: './my-order.component.html',
  styleUrls: ['./my-order.component.scss'],
})
export class MyOrderComponent implements OnInit {
  @ViewChild('ratingForm') form: NgForm;
  Preview_files: any = [];
  multipleFiles: any[] = [];
  userId: any;
  cancellation: any[] = [];
  rating: number = 0;
  hovered = 0;
  readonly = false;
  modalRe: BsModalRef;
  order_id: string;
  returnProduct: string;
  userDetails: any;
  search: any;
  rowData : any
  selectedReason: string;
  customComment: string = '';
  orderDetails: any[] = [];
  apiurl: any;
  currency: any;
  rattingList: any[] = [];
  product_id: any;
  viewImage: boolean = true;
  images: any[] = [];
  comment1: any;
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
  constructor(
    private route: Router,
    private notifyService: NotificationService,
    private socketService: WebsocketService,
    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private modalService: BsModalService,
    public store: DefaultStoreService,
    config: NgbRatingConfig
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

      // this.apiService.CommonApi(Apiconfig.getRattingList.method, Apiconfig.getRattingList.url, { user_id: this.userId }).subscribe(result => {
      //   if (result && result.status == 1) {
      //     this.rattingList = result && result.data ? (result.data && result.data.length > 0 ? result.data.map(i => { return i.product_id }) : []) : [];
      //   }
      // })
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
    this.route.navigate(['/products', slug], {
      relativeTo: this.activatedRoute,
      skipLocationChange: false,
      onSameUrlNavigation: "reload"
      // queryParams: {
      //   id: id,
      //   rcat: rcat,
      //   scat: scat
      // }
    })
  }

  formatNameWithVariants(name: string, variations: any[]): string {
    const variantNames = variations.flat().map(variant => variant.chaild_name);
    const formattedVariants = variantNames.join(', ');
    return `${name} (${formattedVariants})`;
  }
  checkReturn(item): boolean {
    const returnDate = new Date(item.return_days)
    const currentDate = new Date()
    return returnDate > currentDate
  }
  getOrderDetails(data) {
    data.skip = this.skip;
    data.limit = this.limit;
    this.apiService
      .CommonApi(Apiconfig.orderList.method, Apiconfig.orderList.url, data)
      .subscribe((result) => {

        if (result && result.status == 1) {
          this.orderDetails = result.data || [];
          console.log(" this.orderDetails", this.orderDetails)

          // console.log("-----------------this.orderDetails---------------------------", this.orderDetails)
          this.totalItems = result.count;
          this.showorder = true;
        } else {
          this.showorder = true;
        }
      });
  }

  getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  detectFiles(event) {
    if (event.target.files && event.target.files[0]) {
      let files = event.target.files;

      for (let file of files) {
        let file_count = this.multipleFiles.length + this.images.length;
        if (file_count <= 4) {
          let fileSize = file.size;
          let fileType = file['type'];
          let isDocument = file.name.split('.')[1];
          if (
            fileType == 'image/png' ||
            fileType == 'image/jpeg' ||
            fileType == 'image/jpg' ||
            fileType == 'application/pdf' ||
            isDocument == 'doc' ||
            isDocument == 'docx'
          ) {
            if (fileSize / 1024 > 15360) {
              return this.notifyService.showError(
                'Error!, Allowed only maximum of 15MB'
              );
            }
            this.getBase64(file).then((data: any) => {
              this.multipleFiles.push(data);
              console.log(this.multipleFiles, "this.multipleFilesthis.multipleFiles");

              this.Preview_files.push(data);
            });
          } else {
            this.notifyService.showError('Only support Pdf, Jpg, Png, Jpeg');
          }
        } else {
          this.notifyService.showError('Sorry, Allowed only 5 images');
        }
      }
    }
  }

  closeMultiImage(index: number, url) {
    if (this.multipleFiles.length > 0) {
      if (index > -1) {
        this.Preview_files.splice(index, 1);
        this.multipleFiles.splice(index, 1);
      }
    }
  }

  imageEdit(index: number) {
    if (index > -1) {
      this.images.splice(index, 1);
    }
  }

  createReview(product, orderId, template: TemplateRef<any>, action) {
    this.Preview_files = [];
    this.multipleFiles = [];
    this.images = [];
    this.comment1 = '';
    this.rating = 0;
    if (action === 'add') {
      this.orderId = orderId;
      this.product_id = product.id;
      this.productName = product.name
      this.modalRe = this.modalService.show(template, {
        id: 1,
        class: 'review-model',
        ignoreBackdropClick: false,
      });
    } else if (action === 'edit') {
      this.apiService
        .CommonApi(
          Apiconfig.getReviewData.method,
          Apiconfig.getReviewData.url,
          {
            product_id: product.id,
            user_id: this.userId,
            order_id: orderId,
            rating_id: product.rating_id,
            productName: product.name
          }
        )
        .subscribe((result) => {
          if (result && result.status == 1) {
            this.ratingDetails = result.data;
            this.rating = result.data.rating;
            this.comment1 = result.data && result.data.comment;
            this.images = result.data && result.data.image;
            this.orderId = orderId;
            this.product_id = product.id;
            this.modalRe = this.modalService.show(template, {
              id: 1,
              class: 'review-model',
              ignoreBackdropClick: false,
            });
          }
        });
    }
  }
  createCancel(id, template: TemplateRef<any>) {
    this.order_id = id;
    this.modalRe = this.modalService.show(template, {
      id: 1,
      class: 'cancel-model',
      ignoreBackdropClick: false,
    });
  }
  createReturn(id, product_id, template: TemplateRef<any>) {
    this.order_id = id;
    this.returnProduct = product_id
    console.log(this.order_id, 'orderId');

    this.modalRe = this.modalService.show(template, {
      id: 1,
      class: 'cancel-model',
      ignoreBackdropClick: false,
    });
  }
  viewReview(id, template: TemplateRef<any>) {
    if (this.userId) {
      this.apiService
        .CommonApi(
          Apiconfig.getReviewData.method,
          Apiconfig.getReviewData.url,
          { product_id: id, user_id: this.userId }
        )
        .subscribe((result) => {
          if (result && result.status == 1) {
            this.modalRe = this.modalService.show(template, {
              id: 1,
              class: 'review-model',
              ignoreBackdropClick: false,
            });
            this.readonly = true;
            this.viewImage = false;
            // this.rating = result.data ? result.data.rating : 0;
            this.comment1 = result.data && result.data.comment;
            this.images = result.data && result.data.image;
          } else {
            this.notifyService.showError(
              result.message || 'Something went wrong'
            );
          }
        });
    }
  }
  // showAlert(typeIcon = TYPE.SUCCESS){
  //   Swal.fire({
  //     title: 'Error!',
  //     text: 'Do you want to continue',
  //     icon: typeIcon,
  //     confirmButtonText: 'Close',
  //     timer: 5000,
  //   });
  // }

  // invoice_number_site
  downloadInvoice(order) {
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
											 <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;"> ${this.rowData.billing_address.line1} <br> ${this.rowData.billing_address.city} - ${this.rowData.billing_address.pincode} <br> ${this.rowData.billing_address.state}, ${this.rowData.billing_address.country}</p>
											 <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;">${this.rowData.delivery_address.phone || this.rowData.delivery_address.phone.number || this.rowData.delivery_address.phone_number}</p>
										 </td>
										 <td>
											 <p style="font-weight:700; color:#0A472E; font-size:16px; line-height:25px; margin: 0;">Shipping Address</p>
											 <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin: 0; padding-top:10px;">${this.rowData.delivery_address.first_name} ${this.rowData.delivery_address.last_name}</p>
											 <p style="font-weight:500; color:#535D66; font-size:14px; line-height:25px; margin:0px;"> ${this.rowData.delivery_address.line1} <br> ${this.rowData.delivery_address.city} - ${this.rowData.delivery_address.pincode} <br> ${this.rowData.delivery_address.state}, ${this.rowData.delivery_address.country}</p>
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
						filename: `Invoice-${this.rowData.order_id}.pdf`,
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

  // downloadInvoice(order) {
  //   if (this.userId) {
  //     this.apiService
  //       .CommonApi(Apiconfig.printOrders.method, Apiconfig.printOrders.url, {
  //         order_id: order.order_id,
  //       })
  //       .subscribe((result) => {
  //         if (result.status == 1) {
  //           var a = document.createElement('a');
  //           a.href = result.filepath;
  //           a.download = result.filename;
  //           var event = document.createEvent('MouseEvents');
  //           event.initMouseEvent(
  //             'click',
  //             true,
  //             true,
  //             window,
  //             1,
  //             0,
  //             0,
  //             0,
  //             0,
  //             false,
  //             false,
  //             false,
  //             false,
  //             0,
  //             null
  //           );
  //           a.dispatchEvent(event);
  //         }
  //       });
  //   } else {
  //     this.notifyService.showError('Please login.....');
  //   }
  // }

  onFormSubmit(ngform: NgForm) {
    if (ngform.valid) {
      if (this.rating == 0) {
        return this.notifyService.showError(
          'Please select rating atlease 1 rating'
        );
      }
      var data = {
        rating: this.rating,
        comment: ngform.value.comment,
        user_id: this.userId,
        product_id: this.product_id,
        multiBase64: this.multipleFiles.length > 0 ? this.multipleFiles : [],
        username: this.userDetails.user_name,
        order_id: this.orderId,
        productName: this.productName
      } as any;
      if (this.ratingDetails && this.ratingDetails._id) {
        data.rating_id = this.ratingDetails._id;
      }
      if (this.images && Array.isArray(this.images) && this.images.length > 0) {
        data.image = this.images;
      }
      this.apiService
        .CommonApi(
          Apiconfig.ratingProduct.method,
          Apiconfig.ratingProduct.url,
          data
        )
        .subscribe((result) => {
          if (result && result.status == 1) {
            this.modalRe.hide();
            this.getOrderDetails({ user_id: this.userId });
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
        });
    } else {
      this.notifyService.showError('Please enter all the mandatory field');
    }
  }

  cancelFormSubmit(ngform: NgForm) {
    if (ngform.valid) {
      console.log(
        this.customComment,
        'this.customComment',
        this.selectedReason,
        'this.selectedReason'
      );

      if (this.selectedReason == 'notListed' && this.customComment == '') {
        return this.notifyService.showError('Add comment');
      }
      var data = {
        id: this.order_id,
        reason: '',
      };
      if (this.selectedReason === 'notListed') {
        data.reason = this.customComment;
      } else {
        data.reason = this.selectedReason;
      }

      this.apiService
        .CommonApi(
          Apiconfig.cancelOrder.method,
          Apiconfig.cancelOrder.url,
          data
        )
        .subscribe((result) => {
          console.log(result, 'result');
          if (result && result.status == 1) {
            this.modalRe.hide();
            this.notifyService.showSuccess(result.message);
            this.ngOnInit();
          } else {
            this.notifyService.showError(result.message);
          }
        });
    } else {
      this.notifyService.showError('Please enter all the mandatory field');
    }
  }
  returnFormSubmit(ngform: NgForm) {
    if (ngform.valid) {
      console.log(
        this.customComment,
        'this.customComment',
        this.selectedReason,
        'this.selectedReason'
      );

      if (this.selectedReason == 'notListed' && this.customComment == '') {
        return this.notifyService.showError('Add comment');
      }
      var data = {
        id: this.order_id,
        product_id: this.returnProduct,
        reason: '',
      };
      if (this.selectedReason === 'notListed') {
        data.reason = this.customComment;
      } else {
        data.reason = this.selectedReason;
      }

      this.apiService
        .CommonApi(
          Apiconfig.returnProduct.method,
          Apiconfig.returnProduct.url,
          data
        )
        .subscribe((result) => {
          console.log(result, 'result');
          if (result && result.status == 1) {
            this.modalRe.hide();
            this.notifyService.showSuccess(result.message);
            this.ngOnInit();
          } else {
            this.notifyService.showError(result.message);
          }
        });
    } else {
      this.notifyService.showError('Please enter all the mandatory field');
    }
  }

  destroy() {
    this.ratingDetails = null;
    this.modalRe.hide();
  }

  searchProduct() {
    if (this.search && this.userId) {
      var valur = {
        user_id: this.userId,
        search: this.search,
      };
      this.getOrderDetails(valur);
    } else {
      this.ngOnInit();
      this.notifyService.showError('Please enter search');
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
      window.scrollTo(0, 0); //this is used to scroll to top when we click next page number
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
}
