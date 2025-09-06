import { Component, OnInit, TemplateRef, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-card-details',
  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.scss']
})
export class CardDetailsComponent implements OnInit {
  currency_symbol: any
  cartDetails: any;
  cartidstatus: boolean = false;
  userId: any;
  totalMtotal = new BehaviorSubject(0)
  cart_details: any[] = [];
  faviroitList: any[] = [];
  ProductTaxs: any = 0;
  totalTax: number = 0;
  apiUrl: any;
  showcart: boolean = false;
  modalRef: BsModalRef;
  changeSizeRef: BsModalRef;
  select_size: any;
  old_size: any;
  sizeArray: any[] = [];
  productid: any;
  cart_id: any;
  quantity: any;
  cartId: string;
  detailsCart: any;
  cartVariation: any;
  cartVariations: any = [];
  formattedItemName: string;
  cartVariationDetails: any = [];
  cartVariationObject: any;
  varientArray: any = [];
  separateCartVarient: any;
  a: any;
  favitemlength: any
  showfavourite: boolean = false;
  favoritList: any[] = [];
  deleteWishlist = [];
  removeAll: boolean = false;
  taxDeatails: any;
  totaltax: number;
  reloadaction: number = 1;
  loading: boolean = true;

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private modalServices: ModalModalServiceService,

    private notifyService: NotificationService,
  ) {
    this.apiUrl = environment.apiUrl;
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
      console.log(this.userId,"8888888888")
    }else{
      // let userid = sessionStorage.getItem('serverKey');
      // this.userId = userid;

    }
    this.apiService.reloadObservable$.subscribe(result => {
      if (result) {
        var useStrg = localStorage.getItem('userId');
        if (useStrg) {
          this.userId = useStrg;
        }
        this.getCardDetails();
        
      }
    })
  }

  ngOnInit(): void {
    this.getCardDetails();
    if (this.reloadaction === 1) {

      window.scroll(0, 0);
    }


    if (this.userId) {
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: this.userId }).subscribe(result => {

        if (result && result.status == 1) {
          this.faviroitList = result && result.data ? (result.data && result.data.length > 0 ? result.data.map(i => { return i.product_id }) : []) : [];
        }
      })
    }else{
      let userid = sessionStorage.getItem('serverKey');
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id:userid,not_login:true  }).subscribe(result => {

        if (result && result.status == 1) {
          this.faviroitList = result && result.data ? (result.data && result.data.length > 0 ? result.data.map(i => { return i.product_id }) : []) : [];
        }
      })
    }
    this.apiService.CommonApi(Apiconfig.siteSettign.method, Apiconfig.siteSettign.url, {}).subscribe(result => {

      console.log(result, "resulttttttttttttttttttttttttt");
      this.currency_symbol = result.settings.currency_symbol
    })
    // siteSettign

    if (this.userId) {
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: this.userId }).subscribe(result => {
        if (result && result.status == 1) {
          this.favitemlength = result.data.length
          this.favoritList = result.data ? result.data : [];

          console.log("favoritList", this.favoritList)
          this.showfavourite = true;
        } else {
          this.showfavourite = true;
        }
      });
    }else{
      let userid = sessionStorage.getItem('serverKey');
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id:userid,not_login:true  }).subscribe(result => {

        if (result && result.status == 1) {
          this.favitemlength = result.data.length
          this.favoritList = result.data ? result.data : [];

          console.log("favoritList", this.favoritList)
          this.showfavourite = true;
        } else {
          this.showfavourite = true;
        }
      })
    }

    setTimeout(() => {
      this.updatecart()
    }, 100);
  }

  getCardDetails() {
    console.log('**************')
    var userId = localStorage.getItem('userId');
    var data = {} as any;
    if (userId) {
      data.userId = userId;
      data.user_id = userId;
      data.type = 'cart'
    } else {
      var apikey = sessionStorage.getItem('serverKey');
      if (apikey) {
        data.userId = apikey;
        data.type = 'temp_cart'

      }
    }
    data.client_offset = (new Date).getTimezoneOffset();
    data.schedule_type = 0;
    if (data.userId != '') {
      this.cartDetails = {};
      console.log(data, 'dataaaaaaaaaa');

      this.socketService.socketCall('r2e_cart_details', data).subscribe(result => {

        if (result && result.err == 0) {
          this.cartDetails = result.cartDetails;
          this.updateTotalTax(this.cartDetails)
          console.log(this.cartDetails, 'cartDetails');

          // if (this.cartDetails.cart_details && this.cartDetails.cart_details.length > 0) {
          //   this.cartDetails.cart_details.forEach((item) => {
          //     // Check if the variations array is empty for this item
          //     if (item.variations && item.variations.length == 0) {
          //       // Create the 'attr' object as described
          //       let attr = {};
          //       let product = item; // assuming product is in the item object
          //       console.log(product, 'prosaaaaaaaaaaaaaa');

          //       if (product && product.price_details && product.price_details.length > 0) {
          //         let priceDetail = product.price_details[0];

          //         console.log(priceDetail, 'priceDetails');

          //         // attr.attribute_ids = priceDetail.attribute_ids;
          //         // attr.image = priceDetail.image;
          //         // attr.mprice = priceDetail.mprice;
          //         // attr.sprice = priceDetail.sprice;
          //         // attr.quantity = 1;

          //         // if (priceDetail.attributes && priceDetail.attributes.length > 0) {
          //         //     let attribute = priceDetail.attributes[0];
          //         //     attr.attri_name = attribute.attri_name;
          //         //     attr.chaild_id = attribute.chaild_id;
          //         //     attr.chaild_name = attribute.chaild_name;
          //         //     attr.parrent_id = attribute.parrent_id;
          //         // }

          //         // Assign the variations array with the new object
          //         item.variations = [[attr]];
          //         console.log(item, 'Updated item with variations');
          //       }
          //     }
          //   })
          // }
          this.store.cartdetails.next(this.cartDetails);
          setTimeout(() => {
            this.loading = false; // Set loading to false after the delay
          }, 100);

          console.log(this.cartDetails.cart_details, 'this.cartDetailsthis.cartDetails');
          let myTemp = this.cartDetails.cart_details.reduce((accumulator, element) => {
            return accumulator + (element.mtotal - (element.price * element.quantity));
          }, 0); // Initial value is 0
          console.log(myTemp, 'this is my temp')
          this.totalMtotal.next(myTemp);
          console.log(this.totalMtotal, "Total mtotal after subtraction");
          this.cart_details = this.cartDetails ? (this.cartDetails.cart_details && this.cartDetails.cart_details.length > 0 ? this.cartDetails.cart_details.map(e => { return e.id }) : []) : [];


          // let cartLength = result.cartDetails.cart_details.length;
          // console.log(cartLength, 'cartLengthcartLength');

          // this.cartVariationDetails = result.cartDetails.cart_details;

          // for (let i = 0; i < cartLength; i++) {

          //   console.log(this.cartVariationDetails[i], 'cartVariationDetailscartVariationDetails');

          //   this.cartVariationObject = this.cartVariationDetails[i];


          //   this.varientArray.push(this.cartVariationObject.variations[0]);
          //   for (let j = 0; j < this.cartVariationObject.variations[0].length; j++) {
          //     this.separateCartVarient = this.cartVariationObject.variations[0];

          //   }

          //   console.log(this.separateCartVarient, 'separateCartVarient');

          //   for (let k = 0; k < this.separateCartVarient.length; k++) {
          //     this.a = this.separateCartVarient[k];
          //     console.log(this.a, 'aaaaaaa');

          //   }


          //   console.log(this.cartVariationObject, 'cartVariationObjectcartVariationObject');
          //   console.log(this.varientArray, 'varientObject');


          // this.cartDetails = result.cartDetails.cart_details[i];
          // console.log(this.cartDetails, 'all the carts');
          // this.detailsCart = result.cartDetails.cart_details[i];
          // this.cartVariations = result.cartDetails.cart_details[i].variations[0];

          // console.log(this.detailsCart, 'this.detailsCart');
          // console.log(this.cartVariations, 'this.cartVariations');

          // this.formattedItemName = this.formatItemName(this.detailsCart, this.cartVariations);

          // return this.detailsCart;


          // return this.cartDetails;
          // }


          // this.detailsCart = result.cartDetails.cart_details[1];
          // this.cartVariations = result.cartDetails.cart_details[0].variations[0];
          // this.cartVariation = result.cartDetails.cart_details[0].variations[0][0];
          this.cartId = this.cartDetails._id
          console.log("this.cartDetails=====================", this.cartDetails)
          this.getTaxForCart(this.cartDetails)
          this.getTotalTax(this.cartDetails)
          this.showcart = true;
          this.cartidstatus = true;
        } else {
          this.showcart = true;
        }
      })
    }
    // this.getTotalTax()
    
  }



  updatecart() {
    var userId = localStorage.getItem('userId');

    var data = {} as any;
    if (userId) {
      data.userId = userId;
      data.user_id = userId;
      data.type = 'cart'
    } else {
      var apikey = sessionStorage.getItem('serverKey');
      if (apikey) {
        data.userId = apikey;
        data.type = 'temp_cart'
      }
    }
    data.client_offset = (new Date).getTimezoneOffset();
    data.schedule_type = 0;
    this.cartDetails = {};
    this.socketService.socketCall('r2e_cart_details', data).subscribe(result => {

      if (result && result.err == 0) {
        this.cartDetails = result.cartDetails;
        this.getTotalTax(this.cartDetails)
        setTimeout(() => {
          this.loading = false
        }, 100);
        // this.store.cartdetails.next(this.cartDetails);

        // console.log(this.cartDetails.cart_details, 'this.cartDetailsthis.cartDetails');
        // let myTemp  = this.cartDetails.cart_details.reduce((accumulator, element) => {
        //   return accumulator + (element.mtotal - (element.price * element.quantity));
        // }, 0); // Initial value is 0
        // console.log(myTemp,'this is my temp')
        // this.totalMtotal.next(myTemp);
        // console.log(this.totalMtotal, "Total mtotal after subtraction");
        // this.cart_details = this.cartDetails ? (this.cartDetails.cart_details && this.cartDetails.cart_details.length > 0 ? this.cartDetails.cart_details.map(e => { return e.id }) : []) : [];


        // this.getTaxForCart(this.cartDetails)
      }
    })
  }



  // getTotalTax(cartDetails : any) {
  //   let totalTax = 0;
  //   console.log("DDDDDDDDDDDDDDDDDDDDD");

  //   // this.ProductTaxs = 0;
  //   console.log(cartDetails);
  //   if (cartDetails.cart_details) {
  //     cartDetails.cart_details.forEach(item => {
  //       const quantity = item.quantity;
  //       const price = item.price;
  //       const taxPercentage = item && item.tax != (undefined || null) ? item.tax : 0; // Assuming this is a percentage like 10 for 10%

  //       // Calculate tax for this item
  //       const taxAmount = (quantity * price) * (taxPercentage / 100);

  //       // Add tax for this item to total tax
  //       this.ProductTaxs += taxAmount;


  //     });
  //   }

  //   console.log(totalTax, 'totalTax');

  //   return totalTax;
  // }

  getTotalTax(cartDetails: any): number {
    let totalTax = 0;

    if (cartDetails && cartDetails.cart_details) {
      cartDetails.cart_details.forEach((item: any) => {
        const quantity = item.quantity || 0; // Default to 0 if undefined
        const price = item.price || 0; // Default to 0 if undefined
        const taxPercentage = item && item.tax != null ? item.tax : 0; // Default to 0 if tax is null/undefined

        // Calculate tax for this item
        const taxAmount = (quantity * price) * (taxPercentage / 100);

        // Add tax for this item to total tax
        totalTax += taxAmount;
      });
    }

    console.log(totalTax, 'totalTax');
    return totalTax; // Return the total tax amount
  }
  updateTotalTax(cartDetails: any) {
    this.totalTax = this.getTotalTax(cartDetails);
  }
  getTaxForCart(cartdetail: any) {
    let data = {
      cartDetails: cartdetail.cart_details
    }
    this.apiService
      .CommonApi(
        Apiconfig.getTaxForCart.method,
        Apiconfig.getTaxForCart.url,
        data
      )
      .subscribe((result) => {
        console.log(result, 'taxtaxtax');

        if (result && result.success == true) {
          this.taxDeatails = result;
          // this.totaltax = parseInt(result.totalTaxAmount)
          this.totaltax = parseFloat(result.totalTaxAmount)
          console.log(this.totaltax, "taxtaxtax123456789");

        }
      });
  }
  formatNameWithVariants(name: string, variations: any[]): string {
    const variantNames = variations.flat().map(variant => variant.chaild_name);
    const formattedVariants = variantNames.join(', ');
    return `${name} (${formattedVariants})`;
  }

  // formatItemName(item: any, variations: any[]): string {
  //   if (item?.variations[0]?.length > 0 && variations.length > 0) {
  //     const variationNames = variations.map(variation => variation.chaild_name).join(', ');
  //     return `${item.name} (${variationNames})`;
  //   }
  //   return item.name;
  // }

  changeCart(prod, action) {




    if (action == 'decreement' || (action == 'increement' && prod.quantity < 20)) {
      console.log(prod, 'prod');

      var userId = localStorage.getItem('userId');
      var data = {} as any;
      data.foodId = prod.id;
      data.cart_id = prod.cart_id;
      data.size = prod.size;
      data.quantity_type = action;
      data.type_status = this.cartDetails.type_status;
      if (prod.variations.length > 0) {
        data.variations = prod.variations
      }
      if (userId) {
        data.userId = userId;
        data.user_id = userId;
        data.type = 'cart'
      } else {
        var apikey = sessionStorage.getItem('serverKey');
        if (apikey) {
          data.userId = apikey;
          data.type = 'temp_cart'
        }
      }
      console.log(data, 'datadatadata');

      if (data.userId != '') {
        this.socketService.socketCall('r2e_change_cart_quantity', data).subscribe(res => {
          console.log(res, 'check chnge cart');

          if (res && res.err == 0) {
            this.socketService.socketCall('r2e_cart_details', data).subscribe(result => {
              if (result && result.err == 0) {
                this.cartDetails = result.cartDetails;
                let myTemp = this.cartDetails.cart_details.reduce((accumulator, element) => {
                  return accumulator + (element.mtotal - (element.price * element.quantity));
                }, 0); // Initial value is 0
                console.log(myTemp, 'this is my temp')
                this.totalMtotal.next(myTemp);
                console.log(this.cartDetails, "456789");

                this.store.cartdetails.next(this.cartDetails);
                this.getTaxForCart(this.cartDetails)
                // this.getTotalTax(this.cartDetails)
                this.updateTotalTax(this.cartDetails)
                console.log("this.cartDetailsssss", this.cartDetails)
                this.showcart = true;
                this.cartidstatus = true;
              } else {
                this.showcart = true;
              }
            })
          } else {
            this.notifyService.showError(res.message || 'Somthing went wrong')
          }
        })
      }
    }
  }
  removeCoupon(couponCode: String) {
    console.log(couponCode, 'this is the coupon code');
    let data = {
      couponCode: couponCode,
      user_id: this.userId,
      cart_id: this.cartId,
      type: 'cart'
    }
    this.apiService.CommonApi(Apiconfig.removeCoupon.method, Apiconfig.removeCoupon.url, data).subscribe(result => {
      console.log(result, 'this is the result_____-------------____________-----------_________-----------_________----');
      if (result && result.error == false) {
        this.notifyService.showSuccess(result.message || 'Coupon removed');
        this.getCardDetails()
      } else {
        this.notifyService.showError(result.message || 'Somthing went wrong')

      }
    })
  }
  applyCoupon(couponCode: string) {
    console.log(this.cartId, 'cart idddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd');
    if (couponCode == '') {
      return this.notifyService.showError('Enter a valid coupon code');
    }
    let data = {
      couponCode: couponCode,
      user_id: this.userId,
      cart_id: this.cartId,
      type: 'cart',
    }
    this.apiService.CommonApi(Apiconfig.applayCoupon.method, Apiconfig.applayCoupon.url, data).subscribe(result => {
      console.log(result, 'this is the result_____-------------____________-----------_________-----------_________----');
      if (result && result.error == false) {
        this.notifyService.showSuccess(result.message || 'Coupon added');
        this.getCardDetails()
      } else {
        this.notifyService.showError(result.message || 'Somthing went wrong')

      }
    })
  }
  removeFoodFromCart(categ) {
    var data = {} as any;
    data.cartId = categ.cart_id;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.user_id = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey')
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    data.schedule_type = 0;
    if (data.userId != '') {
      this.socketService.socketCall('r2e_remove_food_from_cart', data).subscribe(respo => {
        this.getCardDetails();
        setTimeout(() => {
          this.loading = false; // Set loading to false after the delay
        }, 100);
        this.loading = true; // Set loading to false after the delay

        var data = {
          page: 'register'
        }
        this.apiService.realoadFunction({ data: data });
      })
    }
  }

  addFavourite(id: any, childId: any) {
    console.log(id, childId, 'sdasdasdasdasd');

    var userid = localStorage.getItem('userId');
    if (userid) {
      var obj = {
        product_id: id,
        user_id: userid,
        child_id: childId
      };
      this.apiService
        .CommonApi(
          Apiconfig.addFavourite.method,
          Apiconfig.addFavourite.url,
          obj
        )
        .subscribe((result) => {
          if (result) {
            if (result.status == 1) {

              setTimeout(() => {

                this.notifyService.showSuccess(result.message);
              }, 100);

              // this.getFeatureProd();

              // this.featured_products();
              // this.getTrendingWeek();
            } else {
              if (
                result.status === 0 &&
                result.errors == 'Product already exists'
              ) {
                this.apiService
                  .CommonApi(
                    Apiconfig.delteFavourite.method,
                    Apiconfig.delteFavourite.url,
                    { fav_id: result.favorite_id }
                  )
                  .subscribe((res) => {
                    if (res && res.status === 1) {

                      this.notifyService.showSuccess(res.message);
                      // this.getFaviroitList();
                      // this.getFeatureProd();

                      // this.featured_products();
                      // this.getTrendingWeek();
                      // this.getRecommended();
                    } else {
                      this.notifyService.showError(
                        res.message || 'Something went wrong!'
                      );
                    }
                  });
              } else {
                this.notifyService.showError(result.message);
              }
            }
          } else {
            // this.notifyService.showError('Please try again..');
            this.modalServices.triggerOpenLoginModal();

          }
        });
    } else {
      let userid = sessionStorage.getItem('serverKey');
      let obj = {
        product_id: id,
        not_login: true,
        user_id: userid,
        child_id: childId
      };
      this.apiService
        .CommonApi(
          Apiconfig.addFavourite.method,
          Apiconfig.addFavourite.url,
          obj
        )
        .subscribe((result) => {
          if (result) {
            if (result.status == 1) {

              setTimeout(() => {

                this.notifyService.showSuccess(result.message);
              }, 100);

              // this.getFeatureProd();

              // this.featured_products();
              // this.getTrendingWeek();
            } else {
              if (
                result.status === 0 &&
                result.errors == 'Product already exists'
              ) {
                this.apiService
                  .CommonApi(
                    Apiconfig.delteFavourite.method,
                    Apiconfig.delteFavourite.url,
                    { fav_id: result.favorite_id }
                  )
                  .subscribe((res) => {
                    if (res && res.status === 1) {

                      this.notifyService.showSuccess(res.message);
                      // this.getFaviroitList();
                      // this.getFeatureProd();

                      // this.featured_products();
                      // this.getTrendingWeek();
                      // this.getRecommended();
                    } else {
                      this.notifyService.showError(
                        res.message || 'Something went wrong!'
                      );
                    }
                  });
              } else {
                this.notifyService.showError(result.message);
              }
            }
          } else {
            // this.notifyService.showError('Please try again..');
            this.modalServices.triggerOpenLoginModal();

          }
        });
      // var userid = sessionStorage.getItem('serverKey');

      // this.modalRef = this.modalService.show(template, {
      //   id: 1,
      //   class: 'login-model ',
      //   ignoreBackdropClick: false,
      // });
      // this.notifyService.showError('please login...');
      // this.modalServices.triggerOpenLoginModal();


    }
    this.reloadaction = 2
    // this.getCardDetails()


    setTimeout(() => {

      this.updatecart()
    }, 100);

    // setTimeout(() => {
    //   this.loading = false; // Set loading to false after the delay
    // }, 100);
    // this.loading = true; // Set loading to false after the delay

    // var data = {
    //   page: 'register'
    // }
    // this.apiService.realoadFunction({ data: data });

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

  placeOrder(template: any) {
    if (this.userId) {
      this.route.navigate(['/checkout']);
      this.getCardDetails()
    } else {
      // this.modalRef = this.modalService.show(template, { id: 1, class: 'login_signup_modal login-model', ignoreBackdropClick: false });
      // this.notifyService.showError('please login...');
      this.modalServices.triggerOpenLoginModal();
    }
  }
  shopUrl() {
    this.route.navigate(['/search']);
  }

  sizePopup(id, size, arraySize, cart_id, qunt, template: any) {
    console.log(this.cartDetails, 'cart details of the cart details');
    let filter = this.cartDetails.cart_details.filter((el) => {
      return el.id === id && el.size != size
    })
    console.log(filter, 'this is filter');
    let sizesToIncludeValues = filter.map(obj => obj.size);

    let filteredArray = arraySize.filter(obj => !sizesToIncludeValues.includes(obj.size));
    filteredArray.push(size)
    console.log(filteredArray, 'this is filtered array');
    this.sizeArray = filteredArray || [];
    this.select_size = size;
    this.old_size = size;
    this.productid = id;
    this.cart_id = cart_id;
    this.quantity = qunt;
    this.changeSizeRef = this.modalService.show(template, { id: 1, class: 'changesize-model', ignoreBackdropClick: false });
  }

  destroyModel() {
    this.changeSizeRef.hide();
  }

  change_size(size) {
    this.select_size = size;
  }

  changeSize(value) {
    var filterSize = this.sizeArray.filter(e => { return e.size == value && e.quantity == 0 });
    if (filterSize && filterSize.length > 0) {

      return this.notifyService.showError('This product is out of stock');
    }
    if (this.cart_id && this.productid && value) {
      var data = {} as any;
      data.foodId = this.productid;
      data.cart_id = this.cart_id;
      data.size = value;
      data.old_size = this.old_size;
      if (this.userId) {
        data.userId = this.userId;
        data.type = 'cart';
      } else {
        var serveykey = sessionStorage.getItem('serverKey')
        if (serveykey) {
          data.userId = serveykey;
          data.type = 'temp_cart';
        }
      }
      data.quantity_type = 'size';
      console.log(data, 'datadatadata');

      if (data.userId != '' && data.cart_id != '') {
        this.socketService.socketCall('r2e_change_cart_quantity', data).subscribe(res => {
          if (res && res.err == 0) {
            this.getCardDetails();
            this.changeSizeRef.hide();
          } else {
            this.notifyService.showError(res.message || 'Somthing went wrong')
          }
        })
      }
    } else {
      this.notifyService.showError('Something went wrong')
    }
  }



  productDetailwish(slug, id, rcat, scat) {
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


  addToCart(product) {

    console.log(product, 'this is the add to cart product')
    var data = {} as any;
    let attr: any = {};
    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcategory;
    data.scat_id = product.scategory;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    data.size_status = product.size_status;
    attr.attribute_ids = product.price_details[0].attribute_ids;
    attr.image = product.price_details[0].image;
    attr.mprice = product.price_details[0].mprice;
    attr.sprice = product.price_details[0].sprice;
    attr.quantity = 1;
    if (product.price_details[0].attributes && product.price_details[0].attributes.length > 0) {
      attr.attri_name = product.price_details[0].attributes[0].attri_name;
      attr.chaild_id = product.price_details[0].attributes[0].chaild_id;
      attr.chaild_name = product.price_details[0].attributes[0].chaild_name;
      attr.parrent_id = product.price_details[0].attributes[0].parrent_id;
    }
    // console.log(attr, 'check attrrr');
    data.variations = [[attr]]
    // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = 1;


    // console.log("product ^^^^^^^^^^^^^^^", product)
    // var data = {} as any;
    // data.foodId = product._id;
    // data.foodname = product.name;
    // data.rcat_id = product.rcategory;
    // data.scat_id = product.scategory;
    // data.mprice = product.base_price;
    // data.psprice = product.sale_price; ``
    // data.size_status = product.size_status;
    // console.log
    // data.size = product && product.size_status == 1 ? product && product.filterSize.length > 0 && product.filterSize[0] && product.filterSize[0].size : "None";
    // data.addons_quantity = 1;

    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey')
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    console.log(data, 'favv data');
    const deleteId = data.foodId

    if (data.userId != '') {

      this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
        console.log(result, 'add to cart resuktl');

        if (result && result.err == 0) {
          // this.singleDelete(deleteId)          
          this.route.navigate(['/cart']);
          var data = {
            page: 'register'
          }
          this.apiService.realoadFunction({ data: data });
        }
      })
    }
  }


  selectAllWish(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.deleteWishlist = this.favoritList.map(item => item._id);
    } else {
      this.deleteWishlist = [];
    }
  }


  selectSignle(id, event) {
    if (this.deleteWishlist.length > 0) {
      const findIndex = this.deleteWishlist.indexOf(id);
      if (findIndex == -1) {
        this.deleteWishlist.push(id);
        this.removeAll = true;
      } else {
        this.removeAll = true;
        this.deleteWishlist.splice(findIndex, 1);
        if (this.deleteWishlist.length == 0) {
          this.removeAll = false;
        }
      }
    } else {
      if (id) {
        const findIndex = this.deleteWishlist.indexOf(id);
        if (findIndex == -1) {
          this.deleteWishlist.push(id);
          this.removeAll = true;
        } else {
          this.removeAll = true;
          this.deleteWishlist.splice(findIndex, 1);
          if (this.deleteWishlist.length == 0) {
            this.removeAll = false;
          }
        }
      } else {
        this.deleteWishlist = [];
        this.removeAll = false;
      }
    }
  }

  removeAllWish() {
    if (this.deleteWishlist.length > 0) {
      this.apiService.CommonApi(Apiconfig.multipleDeleteFavo.method, Apiconfig.multipleDeleteFavo.url, { docId: this.deleteWishlist }).subscribe(res => {
        if (res && res.status == 1) {
          this.notifyService.showSuccess('Removed from favourite');
          this.deleteWishlist = []//after removing from the wishlist we want to empty it 
          this.ngOnInit();
        } else {
          this.notifyService.showError(res.errors || 'Something went wrong')
        }
      })
    } else {
      this.notifyService.showError('Please select any one favourite');
      this.removeAll = false;
    }
  }

  singleDelete(id) {
    console.log('single detelet id', id);
    if (id) {
      this.apiService.CommonApi(Apiconfig.delteFavourite.method, Apiconfig.delteFavourite.url, { fav_id: id }).subscribe(res => {
        if (res && res.status == 1) {
          this.ngOnInit();
          this.notifyService.showSuccess('Removed from favourite');
        } else {
          this.notifyService.showError(res.errors || 'something went wrong');
        }
      })
    }
  }

}
