import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { NgbTypeaheadWindow } from '@ng-bootstrap/ng-bootstrap/typeahead/typeahead-window';
// import { Options } from '@angular-slider/ngx-slider';
import { Options } from 'ngx-slider-v2';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search-product',
  templateUrl: './search-product.component.html',
  styleUrls: ['./search-product.component.scss'],
})
export class SearchProductComponent implements OnInit {
  sort_arr: any[] = [
    'New arrivals',
    'Price: Low to High',
    'Price: High to Low',
    'Ratings: High to Low',
    'Ratings: Low to High',
  ];
  sampleobj = {};
  sub: any[] = [];
  parent_list: any = [];
  allCategory_banner: any
  selectedCategory: any = {};
  all_Subs: any[] = [];
  cityid: any;
  apiUrl: any = environment.apiUrl;
  barands: any[] = [];
  category_sub: any[] = [];
  checkobx: { [key: string]: boolean } = {};
    subcheckbox = {};
  childcheckbox = {};
  variance_checkbox = {};
  brandidbox = {};
  selected_cats_children = {};
  pricebox = {};
  category: any[] = [];
  brandid: any[] = [];
  pricedtl: any[] = [];
  scat_array: any[] = [];
  queryData: any;
  pro_count: any;
  settings: any;
  filter_data: any;
  productList: any[] = [];
  final_child_arr: any[] = [];
  userId: string;
  active_slider: number = 0;
  skip: number = 0;
  limit: number = 40;

  matchedObjects: any[];
  unmatchedObjects: any[];
  selectedPriceDetail: any;
  remainingProducts: any[];
  selectedIndex: any;
  selectionInfo: any = {};
  cartIds: any;
  matchingProducts: number;
  product: any;
  cartLength: number;
  cartId: any;
  showcart: boolean = false;
  cartidstatus: boolean = false;
  selectedItemId: string | null = null;
  reloadAction: number = 1
 
  categoryStates: { [key: string]: boolean } = {};

  slideConfig = {
    slidesToShow: 5,
    slidesToScroll: 3,
    arrow: true,
    dots: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 800,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 700,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  minValue: number = 1000;
  maxValue: number = 50000;
  options: Options = {
    floor: 0,
    ceil: 53000,

    showTicks: true,
  };
  expression: boolean = false;
  filterSize: any[] = [];
  recentlyVistProd: any[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 40;
  totalItems: number;
  faviroitList: any[] = [];
  cart_details: any[] = [];
  cartDetails: any;
  quantity_details: any = {};
  sort_filter: any;
  sort_filter_val: any;
  sort_filter_obj: object = {
    latest: 'New arrivals',
    lowtohigh: 'Price: Low to High',
    hightolow: 'Price: High to Low',
    rathightolow: 'Ratings: High to Low',
    ratlowtohigh: 'Ratings: Low to High',
  };
  category_name: any[] = [];
  showproduct: boolean = false;
  id: any;
  modalRef: BsModalRef;
  name_contorl: any;
  name_contorl_params: number;
  checkfalse: any;
  parent_checkfalse: any;
  child_arr: any;
  sample_arr: any[] = [];
  tree = [];
  select_subcat: any = [];
  variance: any = {};
  rating_filter: any;
  show_arr_value: number;
  categoryDetails: any;
  sub_list: any = {};
  variants_filter_list: any = [];
  price_filter: any = [];
  env: any = environment.apiUrl;
  category_slug: any = [];
  main_slug: any = '';
  category_filt_ar: any = {};
  sub_filt_list: any;
  variant_flt_obj: any = {};
  variant_params: any;
  search: any = '';
  urlParams: any = {};
  currency_symbol: any;
  private routeSub: Subscription;
  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    private modalServices: ModalModalServiceService,

    private cdr: ChangeDetectorRef,
    config: NgbRatingConfig
  ) {

    this.apiService.reloadObservable$.subscribe((result) => {
      var useStrg = localStorage.getItem('userId');
      if (useStrg) {
        this.userId = useStrg;
      }
    });

    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }
    
    this.apiService.CommonApi(Apiconfig.siteSettign.method, Apiconfig.siteSettign.url, {}).subscribe(result => {
      this.currency_symbol = result.settings.currency_symbol
      console.log(result.settings, "result.settingsresult.settings");
      this.allCategory_banner = result.settings.allcat_banner

    })
    config.max = 5;
    this.store.generalSettings.subscribe((result) => {
      this.settings = result;
    });
   
  }

  ngOnInit(): void {
    // Subscribe to queryParams and params to watch for changes
    this.routeSub = this.activatedRoute.queryParams.subscribe((params: any) => {
      if (params) {
        if (params.m) {
          this.main_slug = params.m;
        }
        if (params.c) {
          let decode_val = decodeURIComponent(params.c);
          this.category_slug = decode_val.split(',');
        }
        if (params.v) {
          this.variant_params = decodeURIComponent(params.v);
        }
        if (params.p) {
          this.price_filter = decodeURIComponent(params.p).split(',');
        }
        if (params.r) {
          this.rating_filter = parseInt(params.r, 10);
        }
        if (params.s) {
          this.sort_filter = params.s;
          this.sort_filter_val = this.sort_filter_obj[this.sort_filter];
        } else {
          this.sort_filter_val = this.sort_filter_obj[this.sort_filter];
        }
        if (params.se) {
          this.search = params.se;
        }
        // Trigger change detection manually after the parameters are updated
        this.cdr.detectChanges();
      }
    });

    // Optional: Subscribe to route changes if you want to reset state on navigation
    this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Do something on route change
        console.log('Navigation ended');
        this.getCartDetails();
        this.getRecentlyData();
        setTimeout(() => {
          this.getCategoryFilter(this.main_slug);
        }, 100);
        this.initializeSelectedPriceDetails();
      }
    });

    // Initial setup for other parameters
    this.getCartDetails();
    this.getRecentlyData();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.getCategoryFilter(this.main_slug);
    }, 100);
    this.initializeSelectedPriceDetails();
  } //end


  ngOnDestroy() {
    // Unsubscribe to avoid memory leaks
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }




  isActive(scatSlug: string): boolean {
    return this.category_slug.includes(scatSlug);
}


  getRecentlyData() {
    var userdata = {} as any;
    if (this.userId) {
      userdata.user_id = this.userId;
      userdata.type = 'recently_visit';
    } else {
      var serveykey = localStorage.getItem('user_key');
      if (serveykey) {
        userdata.user_id = serveykey;
        userdata.type = 'recent_temp_visit';
      }
    }
    this.apiService
      .CommonApi(
        Apiconfig.recentlyVisit.method,
        Apiconfig.recentlyVisit.url,
        userdata
      )
      .subscribe((result) => {
        if (result && result.status) {
          this.recentlyVistProd = result.data ? result.data : [];
          var dat = new Object(this.recentlyVistProd);
          this.recentlyVistProd.reverse();
        }
      });
  }

  changeSort(filter) {
    this.sort_filter = filter;
    // this.queryData.filter = filter;
    // var value = JSON.stringify(this.queryData);
    // this.route.navigate([], { queryParams: { filter: btoa(value) } });
    // this.queryData.skip = this.skip;
    // this.queryData.limit = this.limit;
    this.sort_filter_val = this.sort_filter_obj[this.sort_filter];
    this.skip = 0;
    this.productFilterList();
  }

  ngAfterViewInit(): void { }
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get paginatedItems(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.productList.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.skip = page * this.limit - this.limit;
    this.ngOnInit();
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

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.skip = page * this.limit - this.limit;
      this.ngOnInit();
    }
  }
  un_check(mcat) {
    let uncheck_id = this.category_sub.map((x) => {
      if (x._id == mcat) {
        this.checkobx[mcat] = true;
      } else {
        this.checkobx[x._id] = false;
      }
    });
  }
  getproductfilter(mcat) {
    var obj = { rcat: mcat, scat: [] };
    this.category = [];
    this.category.push(obj);
    this.subcheckbox = {};
    this.selectedCategory = {};
    this.childcheckbox = {};
    this.sub = [];
    this.variance_checkbox = {};
    this.filterSize = [];
    delete this.queryData.category;
    if (this.category.length > 0) {
      this.queryData.category = this.category;
    }
    delete this.queryData.psearch;
    delete this.queryData.size_filter;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    delete this.queryData.psearch;
    this.productFilterList();
    this.cdr.detectChanges();
  }

  getproductfilters(mcat, scat, istop, hold) {
    if (!this.sampleobj[mcat]) {
      this.sampleobj[mcat] = [];
    }

    if (hold == true) {
      if (this.subcheckbox[scat] == true) {
        console.log(
          '--------------this.sampleobj-----comming into subcheckbox-----------subcheckbox------',
          this.sampleobj[mcat]
        );

        this.remove_parent_cat(mcat);
        this.sub.push(scat);
        if (this.childcheckbox[scat] == false) {
          this.childcheckbox[scat] = undefined;
        }
      }
      if (this.subcheckbox[scat] == false && this.childcheckbox[scat] != true) {
        this.remove_parent_cat(scat);

        let allchilds = this.selectedCategory[scat].map((x) => x._id);

        console.log('-------allchilds-----------------------', allchilds);
        this.sub = this.sub.filter((ele) => !allchilds.includes(ele));

        console.log('------------this.sub-----------', this.sub);
        this.buildTrees(scat);
      }
    }
    if (hold == false) {
      if (this.childcheckbox[scat] == true) {
        this.sampleobj[mcat].push(scat);
        if (this.sub && this.sub.length > 0) {
          this.sub.push(scat);
          this.remove_parent_cat(mcat);
        } else {
          this.sub.push(scat);
        }
      }
      if (this.childcheckbox[scat] == false) {
        this.remove_parent_cat(scat);

        this.buildTrees(scat);
        this.sampleobj[mcat] = this.sampleobj[mcat].filter((i) => i != scat);

        if (this.sampleobj[mcat] && this.sampleobj[mcat].length == 0) {
          this.sub.push(mcat);
        }
      }
    }
    var ract = [];
    ract.push(mcat);
    this.category = [];
    this.category.push({ rcat: mcat, scat: this.sub });
    if (this.category.length > 0) {
      this.queryData.category = this.category;
    } else {
      delete this.queryData.category;
    }

    delete this.queryData.psearch;

    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.productFilterList();
    this.cdr.detectChanges();
  }
  remove_parent_cat(par) {
    this.sub = this.sub.filter((item) => item != par);
  }
  buildTrees(parent) {
    // console.log(parent, this.all_Subs);

    let tree = [];
    this.parent_list.push(parent);
    // console.log(i, this.selectedCategory)
    for (let item of this.all_Subs) {
      if (item.rcategory == parent) {
        // console.log("item.rcategory == parent", item);

        let children = this.buildTrees(item._id);

        // console.log("--------------------children---------------------", children)
        if (children.length) {
          children.filter((x) => {
            // console.log("xxxxxxxxxxxxxxxxx-------xxxxxxxxxxxxxxxxxxx", x._id)
            this.final_child_arr.push(item._id, x._id);

            // if (this.final_child_arr.length > 0) {
            //   this.final_child_arr.forEach(y => {
            //     if (y != x._id) {
            //       this.final_child_arr.push(x._id)
            //     }
            //   })
            // } else {
            //   this.final_child_arr.push(x._id)
            // }
          });

          console.log(
            '---------------this.final_child_arr-------------------',
            this.final_child_arr
          );

          this.sub = this.sub.filter((x) => !this.final_child_arr.includes(x));

          console.log(
            '--------------t this.sub--------- this.sub---------',
            this.sub
          );
        }

        if (children.length) {
          item.children = children;
        }
        tree.push(item);
      }
    }

    this.selected_cats_children[parent] = tree;
    // console.log("-------------------- this.selected_cats_children['aaaaaaaaaaaaa']---------------------------", this.selected_cats_children[parent])
    // console.log(this.selectedCategory)

    return tree;
  }

  variance_filter(id, variance, unit_name) {
    if (id) {
      let indx_val = this.variants_filter_list.indexOf(id);
      if (indx_val === -1) {
        this.variants_filter_list.push(id);
        if (
          this.variant_flt_obj[variance] &&
          Array.isArray(this.variant_flt_obj[variance]) &&
          this.variant_flt_obj[variance].length > 0
        ) {
          this.variant_flt_obj[variance].push(unit_name);
        } else {
          this.variant_flt_obj[variance] = [unit_name];
        }
      } else {
        this.variants_filter_list.splice(indx_val, 1);
        if (this.variant_flt_obj[variance]) {
          this.variant_flt_obj[variance] = this.variant_flt_obj[
            variance
          ].filter((x) => x != unit_name);
        }
      }
    }
    // this.queryParamsUpdate();
    // if (this.variance_checkbox[id] == true) {
    //   this.filterSize.push(id)
    // }
    // if (this.variance_checkbox[id] == false) {
    //   this.filterSize = this.filterSize.filter(x => x != id);
    // };
    // delete this.queryData.filter;
    // delete this.queryData.psearch;
    // this.queryData.size_filter = this.filterSize;
    // this.queryData.skip = this.skip;
    // this.queryData.limit = this.limit;
    this.productFilterList();
  }
  getpricefilters(minprice, maxprice) {
    // if(minprice && maxprice){
    let priceVal = minprice + ':' + maxprice;
    let indx_val = this.price_filter.indexOf(priceVal);
    if (indx_val === -1) {
      this.price_filter.push(priceVal);
    } else {
      this.price_filter.splice(indx_val, 1);
    }
    // }
    // var find = this.pricedtl.find(e => {
    //   return e.minprice == minprice
    // })
    // if (find == undefined) {
    //   var obj = { minprice: minprice || 0, maxprice: maxprice || 10000 };
    //   this.pricedtl.push(obj);
    // } else {
    //   this.pricedtl = JSON.parse(JSON.stringify(this.pricedtl)).filter(function (item) {
    //     return item.minprice !== minprice;
    //   });
    // }
    // if (this.pricedtl.length > 0) {
    //   this.queryData.pricedtl = this.pricedtl;
    // } else {
    //   delete this.queryData.pricedtl
    // }
    // delete this.queryData.psearch;
    // var value = JSON.stringify(this.queryData);
    // this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.productFilterList();
  }

  getFilterDetails(filter) {
    this.filter_data = filter || 'default';
    this.queryData['filter'] = filter || 'default';
    var value = JSON.stringify(this.queryData);
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    delete this.queryData.psearch;
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.productFilterList();
  }

  getFilterSize(size) {
    var index = this.filterSize.indexOf(size);
    if (index == -1) {
      this.filterSize.push(size);
    } else {
      this.filterSize.splice(index, 1);
    }
    delete this.queryData.filter;
    delete this.queryData.psearch;
    this.queryData.size_filter = this.filterSize;
    var value = JSON.stringify(this.queryData);
    this.route.navigate([], { queryParams: { filter: btoa(value) } });
    this.queryData.skip = this.skip;
    this.queryData.limit = this.limit;
    this.productFilterList();
  }

  clearFilter() {
    // this.name_contorl = 0
    this.category_slug = [];
    this.variant_flt_obj = {};
    this.category_filt_ar = {};
    this.category = [];
    this.variants_filter_list = [];
    this.price_filter = [];
    this.rating_filter = null;
    this.categoryDetails = null;
    this.search = '';
    this.variant_params = '';
    this.productFilterList();
    this.queryParamsUpdate();
    // delete this.queryData.category;
    // delete this.queryData.psearch;
    // delete this.queryData.size_filter;
    // delete this.queryData.pricedtl;
    // this.checkobx = {};
    // this.subcheckbox = {};
    // this.childcheckbox = {};
    // this.selectedCategory = {};
    // this.sub = []
    // this.sampleobj = {}
    // this.variance_checkbox = {}
    // this.queryData = { filter: 'latest' };

    // this.queryData.skip = this.skip;
    // this.queryData.limit = this.limit;
    // var value = JSON.stringify(this.queryData);
    // this.route.navigate([], { queryParams: { filter: btoa(value) } });
    // this.productFilterList()
  }

  onSliderChange(num) {
    console.log('num ++++++++++++++++++++', num);
    // var obj = { minprice: this.minValue || 0, maxprice: this.maxValue || 100 };
    // var value = [];
    // value.push(obj)
    // this.queryData.pricedtl = value;
    // var data = JSON.stringify(this.queryData);
    // this.route.navigate([], { queryParams: { filter: btoa(data) } });
    // this.apiService.CommonApi(Apiconfig.allmProductList.method, Apiconfig.allmProductList.url, this.queryData).subscribe(res => {
    //   if (res && res.status == 1) {
    //     this.pro_count = res.count;
    //     this.productList = res.productlist || []
    //   }
    // })
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
    console.log(data,"dadaadadata");
    
    if (data.userId != '') {
      data.client_offset = new Date().getTimezoneOffset();
      this.socketService
        .socketCall('r2e_cart_details', data)
        .subscribe((response) => {
          if (response.err == 0) {
            this.cartDetails = response.cartDetails;
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
  }




  isItem(item: any, cart: any): boolean {

    console.log(item, 'kkkk');
    console.log(cart, 'kkkk');


    let istrue = false
    cart.cart_details.forEach(element => {

      if (element.id == item._id) istrue = true
    });
    return istrue
  }
  // preAddCart(product, action) {
  //   if (
  //     typeof this.quantity_details.noquant == 'undefined' ||
  //     this.quantity_details.noquant == 0
  //   ) {
  //     var noquant = 1;
  //     this.quantity_details = { ...this.quantity_details, noquant };
  //     this.addToCart(product, this.quantity_details);
  //   }
  // }
  // addToCart(product, variant) {
  //   var data = {} as any;
  //   data.apikey = 'Yes';
  //   data.foodId = product._id;
  //   data.foodname = product.name;
  //   data.rcat_id = product.rcat_id;
  //   data.scat_id = product.scat_id;
  //   data.mprice = product.base_price;
  //   data.psprice = product.sale_price;
  //   data.size_status = product.size_status;
  //   data.size = product.size_status == 1 ? product.filterSize[0].size : 'None';
  //   data.addons_quantity = variant.noquant;
  //   data.userId = '';
  //   if (this.userId) {
  //     data.userId = this.userId;
  //     data.type = 'cart';
  //   } else {
  //     var serveykey = sessionStorage.getItem('serverKey');
  //     if (serveykey) {
  //       data.userId = serveykey;
  //       data.type = 'temp_cart';
  //     }
  //   }

  //   if (data.userId != '') {
  //     this.socketService
  //       .socketCall('r2e_add_to_cart', data)
  //       .subscribe((result) => {
  //         if (result && result.err == 0) {
  //           this.route.navigate(['/cart']);
  //           this.getCartDetails();
  //           var data = {
  //             page: 'register',
  //           };
  //           this.apiService.realoadFunction({ data: data });
  //           // setTimeout(() => {

  //           // }, 200);
  //         }
  //         // else{
  //         //   this.notifyService.showError(result.message || 'Somthing went wrong')
  //         // }
  //       });
  //   }
  // }


  // change

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

  initializeSelectedPriceDetails(): void {
    this.productList.forEach(item => {
      if (item.price_details && item.price_details.length > 0) {
        item.selectedPriceDetail = item.price_details[0];
      }
    });
  }


  productFilterList() {
    let data = {
      skip: this.skip,
      limit: this.limit,
      variant_filter: this.variants_filter_list,
      price_filter: this.price_filter,
      sort_filter: this.sort_filter,
      search : this.search !=="" ?this.search:''
    } as any;
    if (this.userId) {
      data.user_id = this.userId;
    }else{
      var serveykey = sessionStorage.getItem('serverKey');

      data.user_id=serveykey
    }
    if (this.category_filt_ar) {
      data.category = this.category_filt_ar;
    };
    if (this.categoryDetails && this.categoryDetails._id) {
      data.mainCat = this.categoryDetails._id;
    };
    if (this.rating_filter) {
      data.rating_filter = this.rating_filter;
    }
    this.apiService.CommonApi(Apiconfig.product_all_list.method, Apiconfig.product_all_list.url, data).subscribe(res => {
      if (res && res.status == 1) {
        this.pro_count = res.response.count;
        this.totalItems = res.response.count;
        this.productList = res.response.list;
        console.log(this.productList, 'productttttt');
        console.log(this.cartDetails, 'this.cartDetails.cart_detailthis.cartDetails.cart_detail');

        if (this.cartDetails && this.cartDetails.cart_detail) {

          this.cartIds = this.cartDetails.cart_details.map(detail => {
            console.log(detail, 'detaillllll23');


            return detail.id;
          }
          );
        }
        this.matchingProducts = this.productList.indexOf(product => {
          return this.cartIds.includes(product._id)
        });
        let extractedPriceDetails = [];

        this.productList.forEach(product => {
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


        console.log(extractedPriceDetails, 'extractedPriceDetails');


        // filter out the extractedPRice

        this.matchedObjects = [];
        this.unmatchedObjects = [];

        console.log(this.cartDetails.cart_details, 'cartDetailaa24scartDetails');


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

        console.log(this.productList, 'product listt 1244454');
        if (this.productList.length > 0) {
          for (let i = 0; i < this.productList.length; i++) {
            this.product = this.productList[i];
            if (this.product.price_details.length > 0) {
              this.selectedPriceDetail = this.product.price_details[0];
              this.product.selectedPriceDetail = this.product.price_details[0];

            }
          }
        }

        console.log(this.selectedPriceDetail, 'selectedprice 1235');

        console.log(this.product, 'poejfodfondfdnf');


        this.remainingProducts = this.productList.filter(product => {
          console.log(product, 'iii product');
          console.log(this.cartDetails.cart_details, 'llllscartttll');

          return !this.cartDetails?.cart_details?.some(cartItem => cartItem.id === product._id
            // && product.price_details[0].attribute_ids[0] == cartItem.variations[0][0].attribute_ids
          );
        });
        this.remainingProducts.forEach(product => {
          product.showAddToCartButton = true;
        });

        console.log(this.remainingProducts, 'remaining items');

        // setTimeout(() => {
        //   console.log("matchingProducts", this.matchingProducts)
        //   console.log("this.remainingProducts", this.remainingProducts)

        // }, 500);








        this.showproduct = true;
        // window.scroll(0, 0);
        this.queryParamsUpdate();
      }
    })
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
        this.getCartDetails();
        var data = {
          page: 'register'
        }
        this.apiService.realoadFunction({ data: data });

        console.log(categ, 'categ.cart_idcateg.cart_id');
        // window.location.reload();
        console.log(this.productList, 'here product listtt in the ');

        const removedItem = this.productList.find(product => product._id == categ.id);


        console.log(removedItem, 'removed productsss');

        if (removedItem) {
          this.remainingProducts.push(removedItem);
        }
        console.log(this.remainingProducts, 'reeeeeeeeeeeeeeeeeeee');
        this.updateUIAfterRemove();
        console.log(categ.cart_id, 'cartttt12344');

        this.showAddToCartButton(categ.cart_id);



      })
    }
  }

  updateUIAfterRemove(): void {
    this.store.cartdetails.next(this.cartDetails)

    this.productFilterList();
  }

  showAddToCartButton(itemId: string): void {
    this.unmatchedObjects.forEach(rem => {
      if (rem._id === itemId) {
        rem.showAddToCartButton = true;
      }
    });
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


  // addToCart(product, variant) {
  //   var data = {} as any;
  //   data.apikey = 'Yes';
  //   data.foodId = product._id;
  //   data.foodname = product.name;
  //   data.rcat_id = product.rcat_id;
  //   data.scat_id = product.scat_id;
  //   data.mprice = product.base_price;
  //   data.psprice = product.sale_price;
  //   data.size_status = product.size_status;
  //   // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
  //   data.addons_quantity = variant.noquant;
  //   data.userId = '';
  //   if (this.userId) {
  //     data.userId = this.userId;
  //     data.type = 'cart';
  //   } else {
  //     var serveykey = sessionStorage.getItem('serverKey')
  //     if (serveykey) {
  //       data.userId = serveykey;
  //       data.type = 'temp_cart';
  //     }
  //   }

  //   if (data.userId != '') {
  //     this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
  //       if (result && result.err == 0) {
  //         this.route.navigate(['/cart']);
  //         this.getCartDetails();
  //         var data = {
  //           page: 'register'
  //         }
  //         this.apiService.realoadFunction({ data: data });
  //         // setTimeout(() => {

  //         // }, 200);
  //       }
  //       // else{
  //       //   this.notifyService.showError(result.message || 'Somthing went wrong')
  //       // }
  //     })
  //   }
  // }

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

  getFaviroitList() {
    if (this.userId) {
      // this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: this.userId }).subscribe(result => {
      //   if (result && result.status == 1) {
      //     this.faviroitList = result && result.data ? (result.data && result.data.length > 0 ? result.data.map(i => { return i.product_id }) : []) : [];
      //   }
      // })
    }
  }
  addFavourite(id: any,childId:any) {
    console.log(id,childId, 'sdasdasdasdasd');
    this.reloadAction = 2;

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

              this.getFaviroitList();
              setTimeout(() => {

                this.notifyService.showSuccess(result.message);
              }, 100);
              this.getCartDetails();
              this.productFilterList();
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
                      this.getCartDetails();
                      this.productFilterList();

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

              this.getFaviroitList();
              setTimeout(() => {

                this.notifyService.showSuccess(result.message);
              }, 100);

              this.getCartDetails();
              this.productFilterList();
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
                      this.getCartDetails();
                      this.productFilterList();

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
  
    // this.ngOnInit();
    


  }

  

  productDetails(slug, id, rcat, scat) {
    console.log('slug', slug);
    this.route.navigate(['/products', slug], {
      relativeTo: this.activatedRoute,
      skipLocationChange: false,
      onSameUrlNavigation: 'reload',
      // queryParams: {
      //   id: id,
      //   rcat: rcat,
      //   scat: scat
      // }
    });
  }

  menu_click(value) {
    if (value == 'add') {
      document.getElementById('product-filter-sec').className =
        'product-filter-sec active';
    } else {
      document.getElementById('product-filter-sec').className =
        'product-filter-sec';
    }
  }

  slickInit(e) {
    console.log('slick initialized');
  }

  breakpoint(e) { }

  afterChange(e) {
    if (e) {
      this.active_slider = e.currentSlide;
      console.log('afterChange', e);
    }
  }

  beforeChange(e) {
    console.log('beforeChange');
  }
  viewMore() {
    this.route.navigate(['/products']);
  }
  preious(i) { }
  nextpage(i) { }

  buildTree(parent, i?, istop?) {
    for (let item of this.all_Subs) {
      if (item.rcategory == parent) {
        if (istop && this.subcheckbox[parent]) {
          this.tree.push(item);
        }
        if (!istop && this.childcheckbox[parent]) {
          this.tree.push(item);
        }
      }
    }
    this.selectedCategory[parent] = this.tree;
    console.log(this.category_sub, ' this.category_sub');
    if (
      (this.subcheckbox[parent] == false || !istop) &&
      !this.childcheckbox[parent]
    ) {
      this.removesublevels(parent);
    }
  }

  hover_value(i) {
    console.log('mousevalue', i);
    this.show_arr_value = i;
  }

  removesublevels(id) {
    this.selectedCategory[id] = [];
    this.childcheckbox[id] = false;
    let subexists: any = this.all_Subs.filter((e) => e.rcategory == id);

    if (subexists && subexists.length > 0) {
      subexists.forEach((e) => {
        this.removesublevels(e._id);
      });
    }
  }
  prod_click() {
    console.log('-------------i------------------------');
  }
  ratingFilterUpdate(rating) {
    if (rating) {
      // this.queryData.rating_filter = rating;
      this.rating_filter = rating;
      this.productFilterList();
    }
  }

  // productFilterList() {
  //   let data = {
  //     skip: this.skip,
  //     limit: this.limit,
  //     variant_filter: this.variants_filter_list,
  //     price_filter: this.price_filter,
  //     sort_filter: this.sort_filter,
  //   } as any;
  //   if (this.search) {
  //     data.search = this.search;
  //   }
  //   if (this.userId) {
  //     data.user_id = this.userId;
  //   }
  //   if (this.category_filt_ar) {
  //     data.category = this.category_filt_ar;
  //   }
  //   if (this.categoryDetails && this.categoryDetails._id) {
  //     data.mainCat = this.categoryDetails._id;
  //   }
  //   if (this.rating_filter) {
  //     data.rating_filter = this.rating_filter;
  //   }
  //   this.apiService
  //     .CommonApi(
  //       Apiconfig.product_all_list.method,
  //       Apiconfig.product_all_list.url,
  //       data
  //     )
  //     .subscribe((res) => {
  //       if (res && res.status == 1) {
  //         this.pro_count = res.response.count;
  //         this.totalItems = res.response.count;
  //         this.productList = res.response.list;
  //         this.showproduct = true;
  //         // window.scroll(0, 0);
  //         this.queryParamsUpdate();
  //       }
  //     });
  // }

  getCategoryFilter(category = null, mainCat = {} as any) {
    console.log('this is search form me maincat', mainCat);
    console.log('this is search form me category', mainCat);

    let data = {} as any;
    if (category) {
      data.category = category;
    }
    if (
      this.category_slug &&
      Array.isArray(this.category_slug) &&
      this.category_slug.length > 0
    ) {
      data.sub_cat = this.category_slug;
    }
    if (this.categoryDetails && this.categoryDetails._id) {
      this.checkobx[this.categoryDetails._id] = false;
      let indxOf = this.category.indexOf(this.categoryDetails._id);
      if (indxOf != -1) {
        this.category.splice(indxOf, 1);
      }
    }
    if (this.categoryDetails && mainCat && this.sub_list[mainCat._id]) {
      this.categoryDetails = mainCat;
      this.checkobx[this.categoryDetails._id] = true;
      this.filterCatSet();
      this.productFilterList();
      return;
    }
    this.category_filt_ar = {};
    this.apiService
      .CommonApi(
        Apiconfig.category_filter_get.method,
        Apiconfig.category_filter_get.url,
        data
      )
      .subscribe((res) => {
        if (
          res &&
          res.status == 1 &&
          res.response &&
          res.response.categoryDetails
        ) {
          this.categoryDetails = res.response.categoryDetails;
          this.category.push(this.categoryDetails._id);
          this.sub_list = { ...this.sub_list, ...res.response.sub_list };
          console.log(this.sub_list, "this.sub_listthis.sub_listthis.sub_list");

          this.checkobx[this.categoryDetails._id] = true;
          this.variance[this.categoryDetails._id] = res.response.attributes;
          this.sub_filt_list = res.response.sub_det;
          if (
            res.response.subIds &&
            Array.isArray(res.response.subIds) &&
            res.response.subIds.length > 0
          ) {
            this.category.push(...res.response.subIds);
          }
          if (this.variant_params) {
            let mainSplit = this.variant_params.split('|');
            for (let index = 0; index < mainSplit.length; index++) {
              let split_val = mainSplit[index].split(':');
              if (
                split_val &&
                Array.isArray(split_val) &&
                split_val.length > 0
              ) {
                this.variant_flt_obj[split_val[0]] = split_val[1].split(',');
                let find_vrt = this.variance[this.categoryDetails._id].find(
                  (x) => x.slug === split_val[0]
                );
                if (find_vrt) {
                  for (let i = 0; i < find_vrt.units.length; i++) {
                    let indx_vrt = this.variant_flt_obj[split_val[0]].indexOf(
                      find_vrt.units[i].name
                    );
                    if (indx_vrt != -1) {
                      this.variants_filter_list.push(find_vrt.units[i]._id);
                    }
                  }
                }
              }
            }
          }
          this.filterCatSet();
          this.productFilterList();
        } else if (
          res &&
          res.status == 1 &&
          res.response &&
          res.response.sub_list &&
          res.response.sub_list
        ) {
          this.sub_list = res.response.sub_list;
          this.filterCatSet();
          this.productFilterList();
        }
      });
  }

  getSubCatFlit(category) {
    if (category) {
      let data = {
        category: category,
      } as any;
      this.apiService
        .CommonApi(
          Apiconfig.sub_cat_filter_get.method,
          Apiconfig.category_filter_get.url,
          data
        )
        .subscribe((result) => {
          if (result && result.response) {
            this.sub_list[category] = result.response;
          }
        });
    }
  }

  filterCatSet() {
    let obj_ent = {};
    // this.category.map(x => {
    //   if (this.sub_list[x] && Array.isArray(this.sub_list[x]) && this.sub_list[x].length > 0) {
    //     let list = this.sub_list[x].filter(y => this.category.indexOf(y._id) != -1);
    //     list.map(z => {
    //       if (!this.category_filt_ar[z._id] || this.category_filt_ar.length === 0) {
    //         if (this.category_filt_ar[this.sub_filt_list[z._id]] && Array.isArray(this.category_filt_ar[this.sub_filt_list[z._id]]) && this.category_filt_ar[this.sub_filt_list[z._id]].length > 0) {
    //           this.category_filt_ar[this.sub_filt_list[z._id]] = this.category_filt_ar[this.sub_filt_list[z._id]].filter(sl => sl != z._id);
    //           console.log("this.category_filt_ar[this.sub_filt_list[z._id]]", this.category_filt_ar[this.sub_filt_list[z._id]])
    //         };
    //         if (this.category_filt_ar && this.category_filt_ar[x] && Array.isArray(this.category_filt_ar[x]) && this.category_filt_ar[x].length > 0) {
    //           this.category_filt_ar[x].push(z._id)
    //         } else {
    //           this.category_filt_ar[x] = [z._id];
    //         }
    //       }
    //     });
    //   }
    // });
    for (let index = 0; index < this.category.length; index++) {
      if (
        this.sub_list[this.category[index]] &&
        Array.isArray(this.sub_list[this.category[index]]) &&
        this.sub_list[this.category[index]].length > 0
      ) {
        let list = this.sub_list[this.category[index]].filter(
          (y) => this.category.indexOf(y._id) != -1
        );
        for (let i = 0; i < list.length; i++) {
          if (
            !this.category_filt_ar[list[i]._id] ||
            this.category_filt_ar.length === 0
          ) {
            if (
              this.category_filt_ar[this.sub_filt_list[this.category[index]]] &&
              Array.isArray(
                this.category_filt_ar[this.sub_filt_list[this.category[index]]]
              ) &&
              this.category_filt_ar[this.sub_filt_list[this.category[index]]]
                .length > 0
            ) {
              let ind_val = this.category_filt_ar[
                this.sub_filt_list[this.category[index]]
              ].indexOf(this.category[index]);
              if (ind_val != -1) {
                this.category_filt_ar[
                  this.sub_filt_list[this.category[index]]
                ].splice(ind_val, 1);
              }
              this.category_filt_ar[this.sub_filt_list[this.category[index]]] =
                this.category_filt_ar[
                  this.sub_filt_list[this.category[index]]
                ].filter((sl) => sl != this.category[index]);
            }

            if (
              this.category_filt_ar &&
              this.category_filt_ar[this.category[index]] &&
              Array.isArray(this.category_filt_ar[this.category[index]]) &&
              this.category_filt_ar[this.category[index]].length > 0
            ) {
              this.category_filt_ar[this.category[index]].push(list[i]._id);
            } else {
              this.category_filt_ar[this.category[index]] = [list[i]._id];
            }
          }
        }
      }
    }
  }

  selectMainCategory(mainCatId: string, slug: string) {

    if (this.categoryStates[mainCatId]) {
      // If the category is already open, close it
      this.categoryStates[mainCatId] = false;
    } else {
      // If the category is not open, close all other categories and open the clicked one
      for (let key in this.categoryStates) {
        this.categoryStates[key] = false;  // Close all categories
      }
      this.categoryStates[mainCatId] = true;  // Open the clicked category
    }
    // Clear previous selections if needed
    this.search =''
    this.category_slug = [];
    this.category = [];

    // Add the main category ID to the selection
    this.category.push(mainCatId);
    this.category_slug.push(slug);

    // Call the function to filter based on the selected main category
    this.getCategoryFilter(slug, mainCatId);
}

  getSubCategoryFilter(category) {
    let data = {} as any;
    if (this.category) {
      data.category_id = category;
    }

    this.apiService
      .CommonApi(
        Apiconfig.sub_category_filter_get.method,
        Apiconfig.sub_category_filter_get.url,
        data
      )
      .subscribe((res) => {
        if (res && res.status == 1 && res.response) {
          this.sub_list[category] = res.response;
        }
      });
  }

  subCategorySelect(subCat, slug, indx, parentId, grandParentId) {
    if (subCat) {
        // If the subcategory is already selected
        this.search = ''
        let indx_val = this.category.indexOf(subCat);
        if (indx_val != -1) {
            // Unselecting the checkbox
            this.category_slug.splice(this.category_slug.indexOf(slug), 1);
            this.category.splice(indx_val, 1);
            this.checkobx[subCat] = false;

            // Remove from the filter array
            if (this.category_filt_ar[parentId]) {
                let rm_indx = this.category_filt_ar[parentId].indexOf(subCat);
                if (rm_indx != -1) {
                    this.category_filt_ar[parentId].splice(rm_indx, 1);
                }
            }
            this.clearChecked(subCat);
        } else {
            // Clear previous selections in the same parent category
            this.clearAllSelectionsInParent(parentId);

            // Selecting the checkbox
            this.category_slug.push(slug);
            this.category.push(subCat);
            this.checkobx[subCat] = true;

            // Fetch subcategory data if needed
            if (!this.sub_list[subCat]) {
                this.getSubCategoryFilter(subCat);
            }

            // Update filter array
            if (!this.category_filt_ar[parentId]) {
                this.category_filt_ar[parentId] = [];
            }
            this.category_filt_ar[parentId].push(subCat);

            // Handle grandparent filtering logic
            if (grandParentId && this.category_filt_ar[grandParentId]) {
                let filt_indx = this.category_filt_ar[grandParentId].indexOf(parentId);
                if (filt_indx != -1) {
                    this.category_filt_ar[grandParentId].splice(filt_indx, 1);
                }
            }
        }

        // Update the sub_list object
        let cat_obj = {
            mainCat: this.sub_list['mainCat'],
        };
        for (let index = 0; index < this.category.length; index++) {
            cat_obj[this.category[index]] = this.sub_list[this.category[index]];
        }
        this.sub_list = cat_obj;

        // Apply filters
        this.productFilterList();
    }
}

// New function to clear all selections in a parent category
clearAllSelectionsInParent(parentId) {
    if (this.category_filt_ar[parentId]) {
        this.category_filt_ar[parentId].forEach(selectedSubCat => {
            this.checkobx[selectedSubCat] = false;
            this.category.splice(this.category.indexOf(selectedSubCat), 1);
            this.category_slug.splice(this.category_slug.indexOf(this.sub_list[selectedSubCat]?.slug), 1);
        });
        // Clear the selected subcategories in the parent
        this.category_filt_ar[parentId] = [];
    }
}



  clearChecked(subCat) {
    if (
      this.sub_list[subCat] &&
      Array.isArray(this.sub_list[subCat]) &&
      this.sub_list[subCat].length > 0
    ) {
      this.sub_list[subCat].map((list) => {
        if (this.category_filt_ar[list._id]) {
          this.category_filt_ar[list._id] = [];
        }
        let index_val = this.category.indexOf(list._id);
        if (index_val != -1) {
          this.category.splice(index_val, 1);
        }
        let slug_indx = this.category_slug.indexOf(list.slug);
        if (slug_indx != -1) {
          this.category_slug.splice(slug_indx, 1);
        }
        this.checkobx[list._id] = false;
        if (this.sub_list[list._id]) {
          this.clearChecked(list._id);
        }
      });
    }
  }

  isAnySubCategoryActive(mainCatId: string): boolean {
    const subcategories = this.sub_list[mainCatId];
    
    // Check if any subcategory is selected or if the main category is selected
    return (
        subcategories ? subcategories.some(scat => this.category.includes(scat._id)) : false
    ) || this.category.includes(mainCatId);
}

  queryParamsUpdate() {
    let query_obj = {} as any;
    if (this.categoryDetails && this.categoryDetails._id) {
      query_obj.m = this.categoryDetails.slug;
    }
    if (
      this.category_slug &&
      Array.isArray(this.category_slug) &&
      this.category_slug.length > 0
    ) {
      let cat_qu = [...this.category_slug];
      // cat_qu.splice(0, 1);
      query_obj.c = encodeURIComponent(cat_qu.reduce((a, b) => a + ',' + b));
    }
    if (this.variant_flt_obj) {
      let var_ent = Object.entries(this.variant_flt_obj);
      if (var_ent && Array.isArray(var_ent) && var_ent.length > 0) {
        let val_obj = '';
        for (let index = 0; index < var_ent.length; index++) {
          let ar_v = var_ent[index][1] as any;
          if (ar_v && Array.isArray(ar_v) && ar_v.length > 0) {
            if (var_ent.length - 1 === index) {
              val_obj += var_ent[index][0];
              val_obj += ':';
              val_obj += ar_v.reduce((a, b) => a + ',' + b);
            } else {
              val_obj += var_ent[index][0];
              val_obj += ':';
              val_obj += ar_v.reduce((a, b) => a + ',' + b);
              val_obj += '|';
            }
          }
        }
        if (val_obj) {
          query_obj['v'] = encodeURIComponent(val_obj);
        }
      }
    }
    if (
      this.price_filter &&
      Array.isArray(this.price_filter) &&
      this.price_filter.length > 0
    ) {
      query_obj.p = encodeURIComponent(
        this.price_filter.reduce((a, b) => a + ',' + b)
      );
    }
    if (this.rating_filter) {
      query_obj.r = this.rating_filter;
    }
    if (this.sort_filter) {
      query_obj.s = this.sort_filter;
    }
    if (this.search) {
      query_obj.se = this.search;
    }
    this.route.navigate([], { queryParams: query_obj });
  }
}
