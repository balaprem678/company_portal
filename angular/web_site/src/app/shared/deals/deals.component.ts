import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';

@Component({
  selector: 'app-deals',
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.scss'],
})
export class DealsComponent implements OnInit {
  tags: any[]= [];
  productDealList: any;
  product_img: any;
  img: any;
  active_slider: number = 0;
  environment = environment;
  productsslider = {
    dots: false,
    infinite: true,
    arrows: false,
    autoplay: true,
    speed: 300,
    autoplaySpeed: 2500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };
  selectedIndex: any;
  selectionInfo: any = {};
  cartLength: number = 0;
  variantitem: any;
  tagObjects = {};
  tagObjectLength = 0;
  productList: any;
  cartDetails: any;
  cartIds: any;
  matchingProducts: number;
  matchedObjects: any;
  unmatchedObjects: any;
  product: any;
  products: any;
  selectedPriceDetail: any;
  unmatchedObjects1: any;
  unmatchedObjects2: any;
  unmatchedObjects3: any;
  unmatchedObjects4: any;
  remainingProducts: any;
  showproduct: boolean;
  userId: any;
  cart_details: any[] = [];
  productdetails: any;
  quantity_details: any = {};
  variant_details: any;
  selectedItemId: string | null = null;
  showcart: boolean;
  cartidstatus: boolean;
  @Input() listName: string;
  @Input() color: string;

  apiUrl: string;
  initalload: number = 1 ;

  constructor(
    private route: Router,
    private apiService: ApiService,
    private socketService: WebsocketService,
    public store: DefaultStoreService,
    private notifyService: NotificationService,
    private modalServices: ModalModalServiceService,
    private cd:ChangeDetectorRef,

  ) {
    this.apiService.reloadObservable$.subscribe((result) => {
      var useStrg = localStorage.getItem('userId');
      if (useStrg) {
        this.userId = useStrg;
      }
      // this.getFaviroitList();
    });

    this.apiUrl = environment.apiUrl;

    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }
  }

  ngOnInit(): void {
    this.getCartDetails();
    // console.log(`Initializing deals for list: ${this.listName}`);

    // this.getTagWithProducts(this.listName);
  }

  productDetails(slug, id, rcat, scat) {
    // this.route.navigate(['/products', slug], {
    //   // relativeTo: this.activatedRoute,
    //   skipLocationChange: false,
    //   // queryParams: {
    //   //   id: id,
    //   //   rcat: rcat,
    //   //   scat: scat
    //   // }
    // });
    // // this.route.navigateByUrl('/products'+ slug );
    // this.ngOnInit;
    // // window.location.reload()
    return `/products/${slug}`

  }

  slickInit(e) {}

  breakpoint(e) {}

  afterChange(e) {
    if (e) {
      this.active_slider = e.currentSlide;
    }
  }

  beforeChange(e) {}
  viewMore() {
    this.route.navigate(['/products']);
  }
  mousEnter(url, index) {
    this.img = index;
    this.product_img = url;
  }

  onPriceDetailChanges(item: any, selectedPriceDetail: any) {
    
    // console.log(item,selectedPriceDetail, 'checkkkkkk');

    this.selectedIndex = item.price_details.findIndex(
      (price) => price === selectedPriceDetail);
    // console.log(this.selectedIndex, 'checkkkkkk', this.listName);

    this.selectionInfo.selectedIndex = this.selectedIndex || 0;
    this.selectionInfo.selectedAttributeId = selectedPriceDetail.attribute_ids[0];
    this.selectionInfo.product_id = item._id
    item.selectedPriceDetail = selectedPriceDetail;
    sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));
    item.selectedPriceDetail = selectedPriceDetail;
  }

  getTagWithProducts(listName: string) {
    let list = listName;
    let data
    if(this.userId){
      data = {
        user_id: this.userId,
      };
  
    }else{
      var serveykey = sessionStorage.getItem('serverKey');
      if (serveykey) {
        data = {
          userid: serveykey,
        }
      }
      
    }
   
    this.apiService
      .CommonApi(Apiconfig.getAllDeals.method, Apiconfig.getAllDeals.url, data)
      .subscribe((res) => {
        this.tags = res.filter((ele) => ele.dealName == list);
        
        let productList = [];
        this.tags.forEach((tag) => {
          tag.products.forEach((product) => {
            productList.push(product);
          });
        });

        this.productDealList = productList;

        // Set initial selectedPriceDetail for all products
        const selectionInfo = JSON.parse(sessionStorage.getItem('selectionInfo')) || {};

        this.productDealList.forEach((product) => {
          if (product.price_details && product.price_details.length > 0) {
            const attributeMatch = product.attributes.includes(this.selectionInfo.selectedAttributeId);

            if (attributeMatch && product._id === selectionInfo.product_id) {
              const index = selectionInfo.selectedIndex || 0; // Default to 0 if index is undefined
              if (index < product.price_details.length) {
                product.selectedPriceDetail = product.price_details[index];
              } else {
                product.selectedPriceDetail = product.price_details[0]; // Fallback to first element if index is out of bounds
              }
            } else {
              // If no attribute match or product ID doesn't match, select the first price detail
              product.selectedPriceDetail = product.price_details[0];
            }

            // Update isSelected for each price detail
            product.price_details.forEach((priceDetail) => {
              priceDetail.isSelected = (priceDetail === product.selectedPriceDetail);
            });
          }
        });

        this.tags.forEach((tag, index) => {
          this.tagObjects[`tag${index + 1}`] = tag;
          this.tagObjects[`tag${index + 1}-products`] = this.productFilterListfortag(tag.products, index + 1);
        });

        this.tagObjectLength = Object.keys(this.tagObjects).length;
      });
}


  productFilterListfortag(products: any, identity: number) {
    // let data = {
    //   skip: this.skip,
    //   limit: this.limit,
    //   variant_filter: this.variants_filter_list,
    //   price_filter: this.price_filter,
    //   sort_filter: this.sort_filter
    // } as any;
    // if (this.userId) {
    //   data.user_id = this.userId;
    // }
    // if (this.category_filt_ar) {
    //   data.category = this.category_filt_ar;
    // };
    // if (this.categoryDetails && this.categoryDetails._id) {
    //   data.mainCat = this.categoryDetails._id;
    // };
    // if (this.rating_filter) {
    //   data.rating_filter = this.rating_filter;
    // }

    this.productList = products;
    // console.log(this.productList, 'productttttt');
    // console.log(this.cartDetails.cart_detail, 'this.cartDetails.cart_detailthis.cartDetails.cart_detail');

    if (this.cartDetails && this.cartDetails.cart_detail) {
      this.cartIds = this.cartDetails.cart_details.map((detail) => {
        // console.log(detail, 'detaillllll23');

        return detail.id;
      });
    }
    this.matchingProducts = this.productList.indexOf((product) => {
      return this.cartIds.includes(product._id);
    });
    let extractedPriceDetails = [];

    this.productList.forEach((product) => {
      product.price_details.forEach((priceDetail) => {
        let extractedDetail = {
          price_details: priceDetail,
          name: product.name,
          _id: product._id,
          rcat_id: product.rcat_id,
          scat_id: product.scat_id,
          size_status: product.size_status,
        };
        extractedPriceDetails.push(extractedDetail);
      });
    });

    extractedPriceDetails.forEach((product) => {
      product.showAddToCartButton = true;
    });

    // console.log(extractedPriceDetails, 'extractedPriceDetails');

    // filter out the extractedPRice

    this.matchedObjects = [];
    this.unmatchedObjects = [];

    // console.log(this.cartDetails.
    //   cart_details, 'cartDetailaa24scartDetails');

    if (this.cartDetails && this.cartDetails.cart_details) {
      // console.log('hi from cart extract');
      // console.log(extractedPriceDetails, 'extractedPriceDetails');

      extractedPriceDetails.forEach((obj) => {
        // console.log(obj, 'objjj');

        if (
          obj.price_details &&
          obj.price_details.attributes &&
          obj.price_details.attributes.length > 0
        ) {
          let chaild_id_extractedPriceDetails =
            obj.price_details.attributes[0]?.chaild_id;
          // console.log(chaild_id_extractedPriceDetails, 'chaild_isextraxrrrr');

          for (let i = 0; i < this.cartDetails.cart_details.length; i++) {
            if (this.cartDetails.cart_details[i]?.variations[0]?.length > 0) {
              let chaild_id_cart =this.cartDetails.cart_details[i].variations[0][0]?.chaild_id;
              // console.log(obj._id, 'assssssssss123455');
              // console.log(this.cartDetails.cart_details[i].id, 'this.cartDetails.cart_details.idthis.cartDetails.cart_details.idws');

              if (
                chaild_id_extractedPriceDetails === chaild_id_cart &&
                obj._id === this.cartDetails.cart_details[i].id
              ) {
                this.matchedObjects.push({
                  extractedPriceDetails: obj,
                  cart_detail: this.cartDetails.cart_details[i],
                });
                break;
              }
            }
          }
          if (
            this.matchedObjects.every(
              (match) => match.extractedPriceDetails !== obj
            )
          ) {
            this.unmatchedObjects.push(obj);
          }
        } else {
          this.unmatchedObjects.push(obj);
        }
      });
    }
    // console.log(extractedPriceDetails, 'aaaaaa');
    // console.log('Matched Objects:', this.matchedObjects);
    // console.log('Unmatched Objects:', this.unmatchedObjects);

    this.unmatchedObjects.forEach((product) => {
      product.showAddToCartButton = true;
    });

    // console.log(this.productList, 'product listt 1244454');
    if (this.productList.length > 0) {
      this.productList.forEach(product => {
          if (product.price_details.length > 0) {
              // Determine the selected price detail based on conditions
              let selectedDetail;
              const defaultIndex = 0; // Default to first index if no specific index is set
              
              // If reloadAction is not 1, check for the selectedAttributeId and index
              if (this.initalload !== 1) {
                  const index = this.selectionInfo?.selectedIndex || defaultIndex;
                  console.log(index, 'Selected index');
                  
                  // Find if the selected attribute ID matches any in the product attributes
                  const attributeMatch = product.attributes.includes(this.selectionInfo.selectedAttributeId);
                  console.log(product._id, this.selectionInfo.product_id, 'Attribute check for match');
                  
                  // Check if the index is within bounds and attribute matches, and set the detail accordingly
                  if (attributeMatch && index < product.price_details.length && product._id === this.selectionInfo.product_id) {
                      selectedDetail = product.price_details[index];
                  } else {
                      selectedDetail = product.price_details[defaultIndex]; // Fallback to first element if no match
                  }
              } else {
                  // Reload case defaults to the first price detail
                  selectedDetail = product.price_details[defaultIndex];
              }
    
              // Assign the selected price detail
              product.selectedPriceDetail = selectedDetail;
    
              // Set isSelected on each price detail
              product.price_details.forEach(priceDetail => {
                  priceDetail.isSelected = (priceDetail === product.selectedPriceDetail);
              });
          }
      });
    }

    switch (identity) {
      case 1:
        this.unmatchedObjects1 = this.unmatchedObjects;
        break;
      case 2:
        this.unmatchedObjects2 = this.unmatchedObjects;
        break;
      case 3:
        this.unmatchedObjects3 = this.unmatchedObjects;
        break;
      case 4:
        this.unmatchedObjects4 = this.unmatchedObjects;
        break;
    }

    // console.log(this.selectedPriceDetail, 'selectedprice 1235');

    // console.log(this.product, 'poejfodfondfdnf');

    this.remainingProducts = this.productList.filter((product) => {
      // console.log(product, 'iii product');
      // console.log(this.cartDetails.cart_details, 'llllscartttll');

      return !this.cartDetails?.cart_details?.some((cartItem) => cartItem.id === product._id && product.price_details[0].attribute_ids[0] == cartItem.variations[0][0].attribute_ids);
    });
    this.remainingProducts.forEach((product) => {
      product.showAddToCartButton = true;
    });

    // console.log(this.remainingProducts, 'remaining items');

    // setTimeout(() => {
    //   // console.log("matchingProducts", this.matchingProducts)
    //   // console.log("this.remainingProducts", this.remainingProducts)
    //   console.log('matching completed');
    // }, 500);

    this.showproduct = true;
    // window.scroll(0, 0);
    // this.queryParamsUpdate();
  }

  getCartDetails() {
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
    if (data.userId != '') {
      data.client_offset = new Date().getTimezoneOffset();
      this.socketService
        .socketCall('r2e_cart_details', data)
        .subscribe((response) => {
          if (response.err == 0) {
            this.cartDetails = response.cartDetails;
            this.cartLength = Object.keys(this.cartDetails).length;
            this.apiService.realoadFunction({ data: data });

            this.store.cartdetails.next(this.cartDetails);
            this.cart_details = this.cartDetails
              ? this.cartDetails.cart_details &&
                this.cartDetails.cart_details.length > 0
                ? this.cartDetails.cart_details.map((e) => {
                    return e.id;
                  })
                : []
              : [];
            this.updateQuantity(this.cartDetails);
            this.getTagWithProducts(this.listName);
          }
        });
    }
  }


  updateQuantity(cartDetails) {
    if (this.productDealList) {
      console.log(this.productDealList,
        'gjhgjgjhgjgjgjghgjg'
      );
      
      var newobj;
      this.productDealList.price_details?.forEach(function (variant) {
        variant.noquant = 0;
        if (cartDetails && cartDetails._id) {
          cartDetails.cart_details.map(function (e) {
            if (e.varntid == variant._id) {
              variant.noquant = e.quantity;
              newobj = variant;
            }
          });
        }
      });

      if (newobj) {
        this.quantity_details = newobj;
        this.variant_details = newobj.attributes[0].chaild_id;
      }
    }
  }

  preAddCart(product, action): void {
    // this.preadd = true
     
    this.selectedItemId = product._id;
    // console.log(product,"heloooooo");
    
    if (
      typeof this.quantity_details.noquant == 'undefined' ||
      this.quantity_details.noquant == 0 ||
      this.quantity_details.noquant == 1
    ) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };
      this.addToCart(product, this.quantity_details);
    }
  }

  addToCart(product, variant) {
    console.log(product, 'iiii');
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
    attr.attribute_ids = product.selectedPriceDetail.attribute_ids[0];
    attr.image = product.selectedPriceDetail.image;
    attr.mprice = product.selectedPriceDetail.mprice;
    attr.sprice = product.selectedPriceDetail.sprice;
    attr.sku = product.selectedPriceDetail.sku;
    attr.quantity = product.selectedPriceDetail.quantity;
    if (
      product.selectedPriceDetail.attributes &&
      product.selectedPriceDetail.attributes.length > 0
    ) {
      attr.attri_name = product.selectedPriceDetail.attributes[0].attri_name;
      attr.chaild_id = product.selectedPriceDetail.attributes[0].chaild_id;
      attr.chaild_name = product.selectedPriceDetail.attributes[0].chaild_name;
      attr.parrent_id = product.selectedPriceDetail.attributes[0].parrent_id;
    }
    // console.log(attr, 'check attrrr');
    data.variations = [[attr]];
    // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = variant.noquant;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey');

      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    if (data.userId != '') {
      this.socketService
        .socketCall('r2e_add_to_cart', data)
        .subscribe((result) => {
          if (result && result.err == 0) {
            // console.log(result, 'carttt resulltt');
            // this.route.navigate(['/cart']);
            this.initalload = 2
            this.getCartDetails();
            let  datas = {
              page: '',
            };
            this.apiService.realoadFunction({ data: datas });

            this.cd.detectChanges()
            // window.location.reload();
            // this.cartToggle = false;
            // setTimeout(() => {
            // }, 200);
          }
          // else{
          //   this.notifyService.showError(result.message || 'Somthing went wrong')
          // }
        });
    }
  }

  preAddCartBtn(product, action, product_id, remId: string): void {
    // console.log(product, 'producttt235');
    // console.log(remId, 'remiIdssasga');

    // this.preadd = true

    this.selectedItemId = product._id;
    // console.log(this.quantity_details, 'this.quantity_details.noquant');
    // console.log(typeof this.quantity_details.noquant, 'this.quantity_details.noquant');
    // console.log(this.quantity_details.noquant, 'this.quantity_details.noquant');

    if (
      typeof this.quantity_details.noquant == 'undefined' ||
      this.quantity_details.noquant == 0 ||
      this.quantity_details.noquant == 1
    ) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };

      // console.log('hi im here in the pre ad dcart');
      this.addToCartBtn(product, this.quantity_details, product_id, remId);
    }
  }

  addToCartBtn(product, variant, product_id, remId: string) {
    console.log(product, 'iiii');
    // console.log(variant, 'avariant');

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

    attr.attribute_ids = product.selectedPriceDetail.attribute_ids;
    attr.image = product.selectedPriceDetail.image;
    attr.mprice = product.selectedPriceDetail.mprice;
    attr.sprice = product.selectedPriceDetail.sprice;
    attr.sku = product.selectedPriceDetail.sku;
    attr.quantity = product.selectedPriceDetail.quantity;

    if (
      product.selectedPriceDetail.attributes &&
      product.selectedPriceDetail.attributes.length > 0
    ) {
      attr.attri_name = product.selectedPriceDetail.attributes[0].attri_name;
      attr.chaild_id = product.selectedPriceDetail.attributes[0].chaild_id;
      attr.chaild_name = product.selectedPriceDetail.attributes[0].chaild_name;
      attr.parrent_id = product.selectedPriceDetail.attributes[0].parrent_id;
    }

    // console.log(attr, 'check attrrr');

    data.variations = [[attr]];

    // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = variant.noquant;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey');
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    // console.log(data, 'original data');

    if (data.userId != '') {
      this.socketService
        .socketCall('r2e_add_to_cart', data)
        .subscribe((result) => {
          if (result && result.err == 0) {
            // console.log(result, 'carttt resulltt');

            // this.route.navigate(['/cart']);
            this.initalload = 2
            this.getCartDetails();
            var data = {
              page: '',
            };
            this.apiService.realoadFunction({ data: data });
            this.hideAddToCartButton(product_id, remId);

            // setTimeout(() => {

            // }, 200);
          }
          // else{
          //   this.notifyService.showError(result.message || 'Somthing went wrong')
          // }
        });
    }
    // this.getCartDetails();
  }

  hideAddToCartButton(product_id, remId: string): void {
    this.unmatchedObjects.forEach((rem) => {
      if (
        rem.price_details.attributes[0].chaild_id === remId &&
        rem._id == product_id
      ) {
        rem.showAddToCartButton = false;
      }
    });
  }

  removeFoodFromCart(categ) {
    var data = {} as any;
    data.cartId = categ.cart_id;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.type = 'cart';
    } else {
      var serveykey = sessionStorage.getItem('serverKey');
      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    data.schedule_type = 0;
    if (data.userId != '') {
      this.socketService
        .socketCall('r2e_remove_food_from_cart', data)
        .subscribe((respo) => {
          this.getCartDetails();
          var data = {
            page: '',
          };
          this.apiService.realoadFunction({ data: data });

          // console.log(categ, 'categ.cart_idcateg.cart_id');
          // window.location.reload();
          // console.log(this.productList, 'here product listtt in the ');

          const removedItem = this.productList.find(
            (product) => product._id == categ.id
          );

          // console.log(removedItem, 'removed productsss');

          if (removedItem) {
            this.remainingProducts.push(removedItem);
          }
          this.initalload = 2
          this.getCartDetails();
            var data = {
              page: '',
            };
      this.apiService.realoadFunction({ data: data });
          // console.log(this.remainingProducts, 'reeeeeeeeeeeeeeeeeeee');
          // this.updateUIAfterRemove();
          // console.log(categ.cart_id, 'cartttt12344');

          this.showAddToCartButton(categ.cart_id);
        });
    }
  }

  showAddToCartButton(itemId: string): void {
    this.unmatchedObjects.forEach((rem) => {
      if (rem._id === itemId) {
        rem.showAddToCartButton = true;
      }
    });
    
  }

  // addFavourite(id) {
  //   var userid = localStorage.getItem('userId');
  //   if (userid) {
  //     var obj = {
  //       product_id: id,
  //       user_id: userid,
  //     };
  //     this.apiService
  //       .CommonApi(
  //         Apiconfig.addFavourite.method,
  //         Apiconfig.addFavourite.url,
  //         obj
  //       )
  //       .subscribe((result) => {
  //         if (result) {
  //           if (result.status == 1) {
  //             this.notifyService.showSuccess(result.message);
  //             this.ngOnInit();
  //           } else {
  //             if (
  //               result.status === 0 &&
  //               result.errors == 'Product already exists'
  //             ) {
  //               this.apiService
  //                 .CommonApi(
  //                   Apiconfig.delteFavourite.method,
  //                   Apiconfig.delteFavourite.url,
  //                   { fav_id: result.favorite_id }
  //                 )
  //                 .subscribe((res) => {
  //                   if (res && res.status === 1) {
  //                     this.notifyService.showSuccess(res.message);
  //                     this.ngOnInit();
  //                   } else {
  //                     this.notifyService.showError(
  //                       res.message || 'Something went wrong!'
  //                     );
  //                   }
  //                 });
  //             } else {
  //               this.notifyService.showError(result.message);
  //             }
  //           }
  //         } else {
  //           // this.notifyService.showError('Please try again..');
  //           this.modalServices.triggerOpenLoginModal();

  //         }
  //       });
  //   } else {
  //     // this.modalRef = this.modalService.show(template, { id: 1, class: 'login-model', ignoreBackdropClick: false });
  //     // this.notifyService.showError('please login...');
  //     this.modalServices.triggerOpenLoginModal();

  //   }
  // }




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
                      this.ngOnInit();
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
                      this.ngOnInit();
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
    // this.reloadAction = 2;
    // this.ngOnInit();
    this.getCartDetails();

  }

  changeCart(prod, action) {
    if (
      action == 'decreement' ||
      (action == 'increement' && prod.quantity < 20)
    ) {
      // console.log(prod, 'prod');

      var userId = localStorage.getItem('userId');
      // console.log(userId, 'userID123');

      var data = {} as any;
      data.foodId = prod.id;
      data.cart_id = prod.cart_id;
      data.size = prod.size;
      data.quantity_type = action;
      data.type_status = this.cartDetails.type_status;
      if (prod.variations.length > 0) {
        data.variations = prod.variations;
      }
      if (userId) {
        data.userId = userId;
        data.type = 'cart';
      } else {
        var apikey = sessionStorage.getItem('serverKey');
        if (apikey) {
          data.userId = apikey;
          data.type = 'temp_cart';
        }
      }
      // console.log(data, 'datadatadata');

      if (data.userId != '') {
        this.socketService
          .socketCall('r2e_change_cart_quantity', data)
          .subscribe((res) => {
            // console.log(res, 'check chnge cart');

            if (res && res.err == 0) {
              this.socketService
                .socketCall('r2e_cart_details', data)
                .subscribe((result) => {
                  if (result && result.err == 0) {
                    this.cartDetails = result.cartDetails;
                    this.initalload = 2
                    this.getCartDetails();

                    // console.log("this.cartDetailsssss", this.cartDetails)
                    this.showcart = true;
                    this.cartidstatus = true;
                  } else {
                    this.showcart = true;
                  }
                });
            } else {
              this.notifyService.showError(
                res.message || 'Somthing went wrong'
              );
            }
          });
      }
    }
  }
}
