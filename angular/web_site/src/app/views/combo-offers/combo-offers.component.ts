import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-combo-offers',
  templateUrl: './combo-offers.component.html',
  styleUrls: ['./combo-offers.component.scss']
})
export class ComboOffersComponent implements OnInit {
  userId: any;
  quantity_details: any = {};
  favoritList: any[] = [];
  removeAll: boolean = false;
  deleteWishlist = [];
  cartDetails: any;
  env_url: string = environment.apiUrl;

  cart_details: any[] = [];
  showfavourite: boolean = false;
  selectall: boolean = false;
  favitemlength: any
  skip: number = 0;
  limit: number = 40;
  variants_filter_list: any;
  price_filter: any;
  sort_filter: any;
  combolength: any;
  comboList: any[] = [];
  settings: any;
  allCategory_banner: any;
  currency_symbol: any;
  selectedIndex: any;
  selectionInfo: any;
  cartLength: number;
  unmatchedObjects: any[];
  matchedObjects: any[];
  matchingProducts: number;


  selectedItemId: string | null = null;
  reloadAction: number = 1
  product: any;
  selectedPriceDetail: any;
  remainingProducts: any[];
  cartIds: any;

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    private modalServices: ModalModalServiceService,
    config: NgbRatingConfig
    
  ) {


    this.apiService.CommonApi(Apiconfig.siteSettign.method, Apiconfig.siteSettign.url, {}).subscribe(result => {
      this.currency_symbol = result.settings.currency_symbol
      console.log(result.settings, "result.settingsresult.settings");
      this.allCategory_banner = result.settings.allcat_banner

    })
    config.max = 5;
    this.store.generalSettings.subscribe((result) => {
      this.settings = result;
    });


    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }
  }

  ngOnInit(): void {


    

    this.getCartDetails();

    //  if(this.cartDetails){
    // setTimeout(() => {
    //   console.log(this.cartDetails,"asdasdadkkkkk")
    //   this.getCombo()
      
    // }, 1);
    //  }
    
    this.initializeSelectedPriceDetails()
    // this.store.cartdetails.next(this.cartDetails)
   window.scrollTo(0,0)
  }



 getCombo(){
  let data = {
    skip: this.skip,
    limit: this.limit,
    variant_filter: this.variants_filter_list,
    price_filter: this.price_filter,
    sort_filter: this.sort_filter
  } as any;




  if (this.userId) {
    data.user_id = this.userId;
  } else {
    var serveykey = sessionStorage.getItem('serverKey');

    data.user_id = serveykey
  }



  this.apiService.CommonApi(Apiconfig.comboOfferList.method, Apiconfig.comboOfferList.url, data).subscribe(result => {
    if (result && result.status == 1) {
      console.log(result);

      this.combolength = result.response.list.length
      this.comboList = result.response.list ? result.response.list : [];
      if (this.cartDetails && this.cartDetails.cart_detail) {

        this.cartIds = this.cartDetails.cart_details.map(detail => {
          console.log(detail, 'detaillllll23');


          return detail.id;
        }
        );
      }

      this.matchingProducts = this.comboList.indexOf(product => {
        return this.cartIds.includes(product._id)
      });
      let extractedPriceDetails = [];

      this.comboList.forEach(product => {
        product.price_details.forEach(priceDetail => {
          let extractedDetail = {
            price_details: priceDetail,
            name: product.name,
            _id: product._id,
            rcat_id: product.rcat_id,
            scat_id: product.scat_id,
            size_status: product.size_status
          };
          extractedPriceDetails.push(extractedDetail);
        });
      });

      extractedPriceDetails.forEach(product => {
        product.showAddToCartButton = true;
      });


      this.matchedObjects = [];
      this.unmatchedObjects = [];



      if (this.cartDetails && this.cartDetails.cart_details) {
        console.log('hi from cart extract');
        console.log(extractedPriceDetails, 'extractedPriceDetails');


        extractedPriceDetails.forEach(obj => {
          console.log(obj, 'objjj');

          if (obj.price_details && obj.price_details.attributes && obj.price_details.attributes.length > 0) {
            let chaild_id_extractedPriceDetails = obj.price_details.attributes[0]?.chaild_id;
            console.log(chaild_id_extractedPriceDetails, 'chaild_isextraxrrrr');

            for (let i = 0; i < this.cartDetails.cart_details.length; i++) {
              if (this.cartDetails.cart_details[i]?.variations[0]?.length > 0) {
                let chaild_id_cart = this.cartDetails.cart_details[i].variations[0][0]?.chaild_id;
                console.log(obj._id, 'assssssssss123455');
                console.log(this.cartDetails.cart_details[i].id, 'this.cartDetails.cart_details.idthis.cartDetails.cart_details.idws');


                if (chaild_id_extractedPriceDetails === chaild_id_cart && obj._id === this.cartDetails.cart_details[i].id) {
                  this.matchedObjects.push({
                    extractedPriceDetails: obj,
                    cart_detail: this.cartDetails.cart_details[i]
                  });
                  break;
                }
              }
            }
            if (this.matchedObjects.every(match => match.extractedPriceDetails !== obj)) {
              this.unmatchedObjects.push(obj);
            }
          } else {
            this.unmatchedObjects.push(obj);
          }
        });
      }
      console.log(extractedPriceDetails, 'aaaaaa');
      console.log('Matched Objects:', this.matchedObjects);
      console.log('Unmatched Objects:', this.unmatchedObjects);

      this.unmatchedObjects.forEach(product => {
        product.showAddToCartButton = true;
      });

      if (this.comboList.length > 0) {
        for (let i = 0; i < this.comboList.length; i++) {
          this.product = this.comboList[i];
          if (this.product.price_details.length > 0) {
            this.selectedPriceDetail = this.product.price_details[0];
            this.product.selectedPriceDetail = this.product.price_details[0];

          }
        }
      }

      console.log("favoritList", this.favoritList)
      this.showfavourite = true;
    } else {
      this.showfavourite = true;
    }

    this.remainingProducts = this.comboList.filter(product => {
      console.log(product, 'iii product');
      // console.log(this.cartDetails.cart_details, 'llllscartttll');

      return !this.cartDetails?.cart_details?.some(cartItem => cartItem.id === product._id
        // && product.price_details[0].attribute_ids[0] == cartItem.variations[0][0].attribute_ids
      );
    });
    this.remainingProducts.forEach(product => {
      product.showAddToCartButton = true;
    });
  });
 }

  initializeSelectedPriceDetails(): void {
    this.comboList.forEach(item => {
      if (item.price_details && item.price_details.length > 0) {
        item.selectedPriceDetail = item.price_details[0];
      }
    });

  }

  onPriceDetailChange(item: any, selectedPriceDetail: any) {

    this.selectedIndex = item.price_details.findIndex(price => price === selectedPriceDetail);
    console.log(this.selectedIndex, 'ddddddselectedIndex');

    console.log(selectedPriceDetail, 'selectedPriceDetailselectedPriceDetail');
    console.log(item, 'itemmmm');
    this.selectionInfo.selectedIndex = this.selectedIndex || 0;
    this.selectionInfo.selectedAttributeId = selectedPriceDetail.attribute_ids[0];

    item.selectedPriceDetail = selectedPriceDetail;

    sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));

    item.selectedPriceDetail = selectedPriceDetail;


  }


  removeFoodFromCart(categ) {
    var data = {} as any;
    data.cartId = categ.cart_id;
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
    data.schedule_type = 0;
    if (data.userId != '') {
      this.socketService.socketCall('r2e_remove_food_from_cart', data).subscribe(respo => {
        // this.getCartDetails();
        var data = {
          page: 'register'
        }
        this.apiService.realoadFunction({ data: data });

        console.log(categ, 'categ.cart_idcateg.cart_id');
        // window.location.reload();
        // console.log(this.productList, 'here product listtt in the ');

        const removedItem = this.comboList.find(product => product._id == categ.id);


        // console.log(removedItem, 'removed productsss');

        if (removedItem) {
          this.remainingProducts.push(removedItem);
        }
        // console.log(this.remainingProducts, 'reeeeeeeeeeeeeeeeeeee');
        this.updateUIAfterRemove();
        // console.log(categ.cart_id, 'cartttt12344');

        this.showAddToCartButton(categ.cart_id);



      })
    }
  }


  trackByFn(index: number, item: any): any {
    return item._id;
  }
  updateUIAfterRemove(): void {
    this.store.cartdetails.next(this.cartDetails)
        this.ngOnInit()
    // this.productFilterList();
  }

  showAddToCartButton(itemId: string): void {
    this.unmatchedObjects.forEach(rem => {
      if (rem._id === itemId) {
        rem.showAddToCartButton = true;
      }
    });
  }


  updateAddToCartButtonVisibility(item, variant) {
    // Check if the product is in stock or if there are no size options
    if (item.no_size === 1 || variant.quantity > 0) {
      // Show the button
      item.showAddToCartButton = true;
    } else {
      // Hide the button
      item.showAddToCartButton = false;
    }
  }

  shouldShowAddToCartButton(item, priceDetail, unmatchedItem): boolean {
    const isMatchingProduct = item._id === unmatchedItem._id;
    const isMatchingVariant = priceDetail?.attributes[0]?.chaild_id === unmatchedItem.price_details.attributes[0]?.chaild_id;

    // Ensure the button shows only when the conditions are met and it's not added yet
    return isMatchingProduct && isMatchingVariant && unmatchedItem.showAddToCartButton && !unmatchedItem.addedToCart;
}


  

  addFavourite(id: any,childId:any) {
    console.log(id,childId, 'sdasdasdasdasd');

    var userid = localStorage.getItem('userId');
    if (userid) {
      var obj = {
        product_id: id,
        user_id: userid,
        child_id:childId
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

              // this.getFaviroitList();
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
        child_id:childId
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

              // this.getFaviroitList();
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
    this.reloadAction = 2;
    this.ngOnInit();
    // this.getCartDetails();

  }

  changeCart(prod, action) {
    if (action == 'decreement' || (action == 'increement' && prod.quantity < 20)) {
      console.log(prod, 'prod');

      var userId = localStorage.getItem('userId');
      console.log(userId, 'userID123');

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
                console.log("this.cartDetailsssss", this.cartDetails)
                this.getCartDetails();

                this.store.cartdetails.next(this.cartDetails)
                // this.showcart = true;
                // this.cartidstatus = true;
              } else {
                // this.showcart = true;
              }
            })
          } else {
            this.notifyService.showError(res.message || 'Somthing went wrong')
          }
        })
      }
    }
  }

  getCartDetails() {
    console.log('&&&&&&&&&&&&&&&&&&&&&&');
    var data = {} as any;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.user_id = this.userId;

      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey');
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    data.schedule_type = 0;
    console.log(data, "dadaadadata");

    if (data.userId != '') {
      data.client_offset = new Date().getTimezoneOffset();
      this.socketService
        .socketCall('r2e_cart_details', data)
        .subscribe((response) => {
          if (response.err == 0) {
            this.cartDetails = response.cartDetails;
            this.getCombo()

            console.log(this.cartDetails, "hhhhhhh");

            this.cartLength = Object.keys(this.cartDetails).length;

            this.apiService.realoadFunction({ data: data });
            this.store.cartdetails.next(this.cartDetails)


            this.cart_details = this.cartDetails
              ? this.cartDetails.cart_details &&
                this.cartDetails.cart_details.length > 0
                ? this.cartDetails.cart_details.map((e) => {
                  return e.id;
                })
                : []
              : [];
          }
        });
    }
    console.log(this.cartDetails,"this.getCombo()");
    
    // if(this.cartDetails){
    
  }


  preAddCartBtn(product, action, product_id, remId: string): void {

    console.log(product, 'producttt235');
    console.log(remId, 'remiIdssasga');


    // this.preadd = true

    this.selectedItemId = product._id;
    console.log(this.quantity_details, 'this.quantity_details.noquant');
    console.log(typeof this.quantity_details.noquant, 'this.quantity_details.noquant');
    console.log(this.quantity_details.noquant, 'this.quantity_details.noquant');




    if (typeof this.quantity_details.noquant == "undefined" || this.quantity_details.noquant == 0 || this.quantity_details.noquant == 1) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };

      console.log('hi im here in the pre ad dcart');
      this.addToCartBtn(product, this.quantity_details, product_id, remId);
    }
    this.updateAddToCartButtonVisibility(product, product.selectedPriceDetail);

  }

  addToCartBtn(product, variant, product_id, remId: string) {
    console.log(product, 'iiii');
    console.log(variant, 'avariant');


    var data = {} as any;
    let attr: any = {};
    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcat_id;
    data.scat_id = product.scat_id;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    data.size_status = product.size_status;



    attr.attribute_ids = product.selectedPriceDetail.attribute_ids;
    attr.image = product.selectedPriceDetail.image;
    attr.mprice = product.selectedPriceDetail.mprice;
    attr.sprice = product.selectedPriceDetail.sprice;
    attr.sku = product.selectedPriceDetail.sku;

    attr.quantity = product.selectedPriceDetail.quantity;


    if (product.selectedPriceDetail.attributes && product.selectedPriceDetail.attributes.length > 0) {
      attr.attri_name = product.selectedPriceDetail.attributes[0].attri_name;
      attr.chaild_id = product.selectedPriceDetail.attributes[0].chaild_id;
      attr.chaild_name = product.selectedPriceDetail.attributes[0].chaild_name;
      attr.parrent_id = product.selectedPriceDetail.attributes[0].parrent_id;
    }

    console.log(attr, 'check attrrr');



    data.variations = [[attr]]

    // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = variant.noquant;
    data.userId = '';
    if (this.userId) {
      data.user_id = this.userId;
      data.userId = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey')
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    console.log(data, 'original data');

    if (data.userId != '') {
      this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
        if (result && result.err == 0) {
          console.log(result, 'carttt resulltt');

          // this.route.navigate(['/cart']);
          this.getCartDetails();
          var data = {
            page: 'register'
          }
          this.apiService.realoadFunction({ data: data });
          this.hideAddToCartButton(product_id, remId);

          // setTimeout(() => {

          // }, 200);
        }
        // else{
        //   this.notifyService.showError(result.message || 'Somthing went wrong')
        // }
      })
    }
  }


  hideAddToCartButton(product_id, remId: string): void {
    this.unmatchedObjects.forEach(rem => {
      if (rem.price_details.attributes[0].chaild_id
        === remId && rem._id == product_id) {
        rem.showAddToCartButton = false;
      }

    });
  }

  productDetails(slug, id, rcat, scat) {
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


  preAddCart(product, action) {
    this.selectedItemId = product._id;
    if (typeof this.quantity_details.noquant == "undefined" || this.quantity_details.noquant == 0 || this.quantity_details.noquant == 1) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };
      this.addToCart(product, this.quantity_details);
      // this.isItem(product,this.cartDetails)

    }
  }



  addToCart(product, variant) {
    console.log(product, 'iiii');

    var data = {} as any;
    let attr: any = {};
    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcat_id;
    data.scat_id = product.scat_id;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    data.size_status = product.size_status;



    attr.attribute_ids = product.selectedPriceDetail.attribute_ids;
    attr.image = product.selectedPriceDetail.image;
    attr.mprice = product.selectedPriceDetail.mprice;
    attr.sprice = product.selectedPriceDetail.sprice;
    attr.sku = product.selectedPriceDetail.sku;

    attr.quantity = product.selectedPriceDetail.quantity;


    if (product.selectedPriceDetail.attributes && product.selectedPriceDetail.attributes.length > 0) {
      attr.attri_name = product.selectedPriceDetail.attributes[0].attri_name;
      attr.chaild_id = product.selectedPriceDetail.attributes[0].chaild_id;
      attr.chaild_name = product.selectedPriceDetail.attributes[0].chaild_name;
      attr.parrent_id = product.selectedPriceDetail.attributes[0].parrent_id;
    }

    console.log(attr, 'check attrrr');



    data.variations = [[attr]]

    // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = variant.noquant;
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
    console.log(data, 'dgsdgsdgsdgdgsdf');

    if (data.userId != '') {
      console.log('huyvghuvhu');

      this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {

        console.log(result, 'carttt resullcxbxcbtt');
        if (result && result.err == 0) {


          // this.route.navigate(['/cart']);
          this.getCartDetails();

          let datas = {
            page: 'register'
          }
          this.reloadAction = 2
          // if(data.type ==  "temp_cart"){
          this.ngOnInit()
          // }
          this.apiService.realoadFunction({ data: datas })

          // window.location.reload();
          // this.cartToggle = false;

          // setTimeout(() => {

          // }, 200);
        }
        else {
          this.notifyService.showError(result.message || 'Somthing went wrong')
        }
      })
    }
  }


  formatNameWithVariants(name: string, variations: any[]): string {
    const variantNames = variations.flat().map(variant => variant.chaild_name);
    const formattedVariants = variantNames.join(', ');
    return `${name} (${formattedVariants})`;
  }



  // selectAllWish(value) {
  //   if (value) {
  //     this.deleteWishlist = [];
  //     this.deleteWishlist = this.favoritList.map(i => i._id)
  //     this.removeAll = true;
  //   } else {
  //     this.deleteWishlist = [];
  //     this.removeAll = false;
  //   }
  // }
  // selectAllWish(event: Event) {
  //   const target = event.target as HTMLInputElement;
  //   if (target.checked) {
  //     this.deleteWishlist = this.favoritList.map(item => item._id);
  //     this.removeAll = true;
  //   } else {
  //     this.deleteWishlist = [];
  //     this.removeAll = false;
  //   }
  // }
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
