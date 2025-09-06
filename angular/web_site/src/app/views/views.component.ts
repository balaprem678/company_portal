import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { Title, Meta } from '@angular/platform-browser';
import {
  FormControl,
  FormGroup,
  Validators,
  NgForm,
  FormBuilder,
  NgModel,
} from '@angular/forms';
import { AuthenticationService } from '../_services/authentication.service';
import { PhoneNumberUtil } from 'google-libphonenumber';
const phoneNumberUtil = PhoneNumberUtil.getInstance();
import {
  SearchCountryField,
  CountryISO,
  PhoneNumberFormat,
} from '@khazii/ngx-intl-tel-input';
import { COUNTRY } from 'src/app/_services/country';
import { ModalModalServiceService } from '../_services/modal-modal-service.service';

@Component({
  selector: 'app-views',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './views.component.html',
  styleUrls: ['./views.component.scss'],
})
export class ViewsComponent implements OnInit {
  no_variant_outofstack: boolean = false;
  apiUrl: any;
  banners: any[] = [];
  @ViewChild('loginForm') form: NgForm;

  cityid: any;
  environment = environment;
  loginsubmitted: boolean = false;
  logotpRequested: boolean = false;
  submitted: boolean = false;
  loginotp1: any;
  loginotp2: any;
  loginotp3: any;
  loginotp4: any;
  testimoniallist: any[] = []
  @ViewChild('otp1') otp1: ElementRef;
  @ViewChild('otp2') otp2: ElementRef;
  @ViewChild('otp3') otp3: ElementRef;
  @ViewChild('otp4') otp4: ElementRef;
  num1: any;
  num2: any;
  num3: any;
  num4: any;
  modalRefOtp: BsModalRef;
  registerRef: BsModalRef;
  socialLogin: any;
  sociallogin: any;
  formInput: string[] = ['digit1', 'digit2', 'digit3', 'digit4'];
  userDetail: any;
  userId: any;
  featureList: any[] = [];
  categoryList: any[] = [];
  batch_id: any
  productList: any[] = [];
  postHeader: any[] = [];
  settings: any;
  registerForm: FormGroup;
  separateDialCode = false;
  SearchCountryField = SearchCountryField;
  CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  selectedCountryISO: CountryISO;
  preferredCountries: CountryISO[] = [CountryISO.India, CountryISO.India];
  preferredCountrieslogin: CountryISO[] = [CountryISO.India, CountryISO.India];
  expensive_prod: any;
  socialApp: any[] = [];
  Banners: any[] = [];
  active_slider: number = 0;
  fea_pro: any[] = [];
  tags: any[] = [];
  flavorFushion: any;
  variance: any;
  selectedIndex: any;
  selectionInfo: any = {};
  remainingProducts: any[];
  showcart: boolean = false;
  cartidstatus: boolean = false;
  selectedItemId: string | null = null;
  unmatchedObjects: any[];

  otpSent = false;
  // timer: number = 15;
  interval: any;
  otpRequested = false;
  countdown: number = 15;
  logincountdown: number = 15;
  countdownInterval: any;
  logcountdownInterval: any;

  unmatchedObjects1: any[];
  unmatchedObjects2: any[];
  unmatchedObjects3: any[];
  unmatchedObjects4: any[];
  unmatchedObjects5: any[];
  unmatchedObjects6: any[];
  unmatchedObjects7: any[];
  unmatchedObjects8: any[];
  unmatchedObjects9: any[];
  unmatchedObjects10: any[];
  @ViewChild('phoneInput', { static: false }) phoneInput: NgModel;

  cartLength: number = 0;
  loading: boolean = true;
  count: number = 0;
  cartId: any;
  matchingProducts: number;
  cartIds: any;
  matchedObjects: any[];
  product: any;
  selectedPriceDetail: any;
  showproduct: any;
  filteredBannersList: any[] = []
  filteredHeader2List: any[] = []
  filteredpostheader1List: any[] = []
  filteredpostheader2List: any[] = []
  filteredpostcategory3List: any[] = []
  filteredpostcategory6List: any[] = []
  filteredBatchsList: any[] = []
  filteredprefooterList: any[] = []
  supportEmail = 'support@example.com';
  emailSubject = 'Support Request';
  emailBody = 'Please provide details here.';

  slideConfig = {
    dots: true,
    infinite: true,
    autoplay: true,
    arrows: false,
    speed: 300,
    autoplaySpeed: 2500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  slideConfigg = {
    dots: true,
    arrows: false,
    autoplay: true,
    infinite: true,
    speed: 300,
    autoplaySpeed: 2500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

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

  farmslider = {
    dots: true,
    infinite: false,
    autoplay: false,
    arrows: false,
    speed: 300,
    autoplaySpeed: 2500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  valupacks = {
    dots: true,
    infinite: true,
    autoplay: true,
    arrows: false,
    speed: 300,
    autoplaySpeed: 2500,
    slidesToShow: 4,
    slidesToScroll: 1,

    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  bannershop = {
    dots: true,
    infinite: true,
    autoplay: true,
    arrows: false,
    speed: 250,
    autoplaySpeed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  testimonalSlider = {
    dots: false,
    nav: true,
    infinite: true,
    autoplay: true,
    speed: 300,
    autoplaySpeed: 2000,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: false,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  slickCarouselConfig = {
    autoplay: true,
    autoplaySpeed: 5000, // Time between slide transitions in milliseconds
    // Other configuration options...
  };
  slickCarouselConfigCat = {
    slidesToShow: 4,
    autoplay: true,
    autoplaySpeed: 10000, // Time between slide transitions in milliseconds
    // Other configuration options...
  };
  slickCarouselConfigCategor = {
    slidesToShow: 4,
    slidesToScroll: 4,
    arrow: true,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  trendingWeekPod: any[] = [];
  faviroitList: any[] = [];
  cartDetails: any;
  quantity_details: any = {};
  cart_details: any[] = [];
  faviroitData: any[] = [];
  modalRef: BsModalRef;
  new_arrival: any[] = [];
  featured_categories_: any;
  catgory_avail: any;
  tagObjects = {};
  tagObjectLength = 0;
  reloadAction: number = 1;
  constructor(
    private cdr: ChangeDetectorRef,
    private metaService: Meta,
    private titleService: Title,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    config: NgbRatingConfig,
    private authenticationService: AuthenticationService,
    private modalServices: ModalModalServiceService,

  ) {
    config.max = 5;
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
    // testimonialManagementList
    this.apiService
      .CommonApi(Apiconfig.allBanners.method, Apiconfig.allBanners.url, {})
      .subscribe((result: any) => {
        // console.log(result, 'resu;ltfhaisdhfaisdhufishfiuahdf');

        if (result && result.status == 1) {
          this.banners = result.bannerlist ? result.bannerlist : [];
          this.cdr.markForCheck();

        }
      });

    this.store.generalSettings.subscribe((result) => {
      this.settings = result;
      // if(this.settings && (this.settings.meta != undefined || this.settings.meta != '' || this.settings.meta != null)){

      //   this.titleService.setTitle(this.settings.meta.meta_title);
      //   const keywordsArray = this.settings.meta.meta_keyword
      //   const keywordsString = keywordsArray.join(', ');
      //   this.metaService.addTags([
      //     { name: 'description', content: this.settings.meta.meta_description },
      //     { name: 'keywords', content: keywordsString },
      //     // { name: 'author', content: "Pillais" },
      //     { property: 'og:title', content: this.settings.meta.meta_title },
      //     { property: 'og:description', content: this.settings.meta.meta_description },
      //     // { property: 'og:type', content: this.settings.meta.meta_title },
      //   ]);
      // }

      if (this.settings && (this.settings.meta != undefined || this.settings.meta != '' || this.settings.meta != null)) {

        this.titleService.setTitle(this.settings && this.settings.meta && this.settings.meta.meta_title != (undefined || null || '') ? this.settings.meta.meta_title : '');
        const keywordsArray = this.settings && this.settings.meta && this.settings.meta.meta_keyword != (undefined || null || '') ? this.settings.meta.meta_keyword : []
        const keywordsString = keywordsArray.join(', ');
        this.metaService.addTags([
          { name: 'description', content: this.settings && this.settings.meta && this.settings.meta.meta_description != (undefined || null || '') ? this.settings.meta.meta_description : '' },
          { name: 'keywords', content: keywordsString },
          // { name: 'author', content: "Pillais" },
          { property: 'og:title', content: this.settings && this.settings.meta && this.settings.meta.meta_title != (undefined || null || '') ? this.settings.meta.meta_title : '' },
          { property: 'og:description', content: this.settings && this.settings.meta && this.settings.meta.meta_description != (undefined || null || '') ? this.settings.meta.meta_description : '' },
          // { property: 'og:type', content: this.settings.meta.meta_title },
        ]);
      }

    });

    this.store.categoryList.subscribe((result) => {
      this.categoryList = result;
    });

    this.store.expensiveProduct.subscribe((result) => {
      this.expensive_prod = result;

      // console.log(
      //   '-------------------this.expensive_prod----------------------',
      //   typeof this.expensive_prod
      // );
    });

    // this.store.mainData.subscribe(result => {
    //   if (result && result.social_2) {
    //     var social = result.social_2;
    //     var apps = social[0] ? social[0].settings.mobileapp : [];
    //     for (var i = 0; i < apps.length; i++) {
    //       if (apps[i].status == 1) {
    //         for (var j = 0; j < apps[i].url.length; j++) {
    //           var index_pos = this.socialApp.map(function (e) { return e.name; }).indexOf(apps[i].url[j].name);
    //           if (index_pos == -1) {
    //             var data = { name: apps[i].url[j].name, url: [] };
    //             apps[i].url[j].img = apps[i].img;
    //             apps[i].url[j].landingimg = apps[i].landingimg;
    //             apps[i].url[j].comming_soon_img = apps[i].comming_soon_img;
    //             data.url.push(apps[i].url[j]);
    //             this.socialApp.push(data);
    //           } else {
    //             apps[i].url[j].img = apps[i].img;
    //             apps[i].url[j].landingimg = apps[i].landingimg;
    //             apps[i].url[j].comming_soon_img = apps[i].comming_soon_img;
    //             this.socialApp[index_pos].url.push(apps[i].url[j]);
    //           }
    //         }
    //       }
    //     }
    //   }
    // })

    // if (this.cityid) {
    //   // this.getRecommended();
    // }
    // if(this.userId){
    //   this.socketService.socketCall('r2e_favourite_products',{userId: this.userId}).subscribe(result=>{
    //     if (result.err == 0) {
    //       this.faviroitList = result.favDetails
    //     }
    //   })
    // }
    this.reloadAction = 0

  }

  ngOnInit(): void {

    // console.log(this.settings, "this.settings.meta");




    if (this.reloadAction != 2) {
      window.scroll(0, 0);
    }
    // this.landingData();
    this.apiService
      .CommonApi(
        Apiconfig.getCategoryList.method,
        Apiconfig.getCategoryList.url,
        {}
      )
      .subscribe((result) => {
        if (result && result.status == 1) {
          this.categoryList = result.categoryList ? result.categoryList : [];
        }
      });
    this.getCartDetails();
    // this.getFaviroitList();
    // this.getFeatureProd();

    // this.featured_products();
    // this.getTrendingWeek();
    this.featured_categories();
    // console.log(this.productList, 'product list and product list is here');

    // getBannerTypes
    // this.apiService
    //   .CommonApi(
    //     Apiconfig.getBannerTypes.method,
    //     Apiconfig.getBannerTypes.url,
    //     {}
    //   )
    //   .subscribe((result) => {
    //     if (result && result.status) {
    //       console.log(result, 'resultresultresult');
    //       this.Banners = result.data.doc;
    //     }
    //   });
    // this.filteredBanners();
    // this.filteredHeader2();
    // this.filteredpostheader1();
    // this.filteredpostheader2();
    // this.filteredpostcategory3();
    // this.filteredpostcategory6();
    // this.filteredBatchs()
    // this.filteredprefooter()

    this.apiService
      .CommonApi(Apiconfig.getBannerTypes.method, Apiconfig.getBannerTypes.url, {})
      .subscribe((result) => {
        if (result && result.status) {
          // console.log(result, "resultresultresult");
          this.Banners = result.data.doc;
          this.cdr.markForCheck();
          // Perform all filtering once
          this.filteredBannersList = this.filterByType('header-1');
          this.filteredHeader2List = this.filterByType('header-2');
          this.filteredpostheader1List = this.filterByType('post-header-1');
          this.filteredpostheader2List = this.filterByType('post-header-2');
          this.filteredpostcategory3List = this.filterByType('post-category-3');
          this.filteredpostcategory6List = this.filterByType('post-category-6');
          this.filteredBatchsList = this.filterByType('batchs');
          this.filteredprefooterList = this.filterByType('pre-footer');
          // console.log(this.filteredpostcategory3List,"filteredpostcategory3List");

        }
      });
    // this.getTagWithProducts()
    this.loadOffers()
  }

  private filterByType(type: string): any[] {
    return this.Banners.filter((banner) => banner.type_name === type);
  }
  loadOffers(): void {
    // const data = {
    //   'skip': this.skip,
    //   'limit': this.limit,
    // };
    this.loading = true;
    // console.log("aaaaaaaaaaaaaaaaaa");

    this.apiService.CommonApi(Apiconfig.testimonialManagementList.method, Apiconfig.testimonialManagementList.url, {}).subscribe(response => {
      this.loading = false;
      if (response && response.length > 0) {
        // console.log("bbbbbbbbbbbbbbb");
        // console.log(this.loading,"this.loadingthis.loadingthis.loading");
        // console.log(response[0], "response[0]response[0]");

        this.testimoniallist = response[0];
        // console.log(this.testimoniallist, "testimoniallisttestimoniallisttestimoniallist");

        this.count = response[1];
        this.cdr.detectChanges();
        window.scrollTo(0, 0);
      }
    });
  }

  trackByFn(index: number, item: any): any {
    return item._id;
  }



  // filteredBanners() {
  //   return this.Banners.filter((banner) => banner.type_name === 'header-1');

  // }
  // filteredBatchs() {
  //   return this.Banners.filter((banner) => banner.type_name === 'batchs');
  // }
  // filteredHeader2() {
  //   return this.Banners.filter((banner) => banner.type_name === 'header-2');
  // }
  // filteredpostheader1() {
  //   return this.Banners.filter(
  //     (banner) => banner.type_name === 'post-header-1'
  //   );
  // }
  // filteredpostheader2() {
  //   return this.Banners.filter(
  //     (banner) => {
  //       banner.type_name === 'post-header-2'
  //       console.log(banner.type_name, "banner.type_namebanner.type_name");

  //     }
  //   );
  // }
  // filteredpostcategory3() {
  //   return this.Banners.filter(
  //     (banner) => {
  //       banner.type_name === 'post-category-3'
  //       // console.log(banner.type_name,"banner.type_namebanner.type_name");

  //     }
  //   );
  // }
  // filteredpostcategory6() {
  //   return this.Banners.filter(
  //     (banner) => banner.type_name === 'post-category-6'
  //   );
  // }
  // filteredprefooter() {
  //   return this.Banners.filter((banner) => banner.type_name === 'pre-footer');
  // }
  // getTrendingWeek() {
  //   let data = {} as any;
  //   if (this.userId) {
  //     data.user_id = this.userId;
  //   }
  //   this.apiService
  //     .CommonApi(
  //       Apiconfig.trendinWeekProducts.method,
  //       Apiconfig.trendinWeekProducts.url,
  //       data
  //     )
  //     .subscribe((result) => {
  //       if (result && result.status) {
  //         var finaltrendingWeekPod = result.productList
  //           ? result.productList
  //           : [];

  //         this.trendingWeekPod = finaltrendingWeekPod.filter(
  //           (x) => x.outOfStockQuantity !== 0
  //         );

  //         console.log('this.trendingWeekPod', this.trendingWeekPod);

  //         // var trending_outofstock = false
  //         // this.trendingWeekPod.map(x => {
  //         //   if (x.size_status == 2 && x.quantity > 0) {
  //         //     x.trending_outofstock = false
  //         //   } else {
  //         //     x.trending_outofstock = true
  //         //   }
  //         // })
  //       }
  //     });
  // }

  //not updated
  getFaviroitList() {
    if (this.userId) {
      // this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: this.userId }).subscribe(result => {
      //   if (result && result.status == 1) {
      //     this.faviroitList = result && result.data ? (result.data && result.data.length > 0 ? result.data.map(i => { return i.product_id }) : []) : [];
      //   }
      // })
    }
  }

  // getFeatureProd() {
  //   let data = {} as any;
  //   if (this.userId) {
  //     data.user_id = this.userId;
  //   }
  //   this.apiService
  //     .CommonApi(
  //       Apiconfig.allFeatureProduct.method,
  //       Apiconfig.allFeatureProduct.url,
  //       data
  //     )
  //     .subscribe((result) => {
  //       if (result && result.status == 4) {
  //         // console.log(result, 'this is all products');

  //         this.productList = result.productList ? result.productList : [];
  //         console.log(this.productList, 'product list is very simple');
  //       }

  //       if (result && result.status == 1) {
  //         var finalProductList = result.productList ? result.productList : [];

  //         this.new_arrival = finalProductList.filter(
  //           (x) => x.outOfStockQuantity !== 0
  //         );

  //         console.log('this.new_arrival', this.new_arrival);
  //         //

  //         // finalProductList.filter(x => x.quantity != 0)

  //         // console.log("xxxroc", this.new_arrival)
  //         // this.new_arrival.map(x => {

  //         //   if (x.size_status == 2 && x.availability == 0) {

  //         //     x.no_variance_avail = true;

  //         //   } else {
  //         //     x.no_variance_avail = false
  //         //   }

  //         //   if (x.size_status == 1 && x.variance_quantity > 0) {
  //         //     x.variance_avail = true
  //         //   } else {
  //         //     x.variance_avail = false
  //         //   }
  //         // })

  //         // console.log(
  //         //   '------------this.new_arrival--------------',
  //         //   this.new_arrival
  //         // );
  //       }
  //     });
  // }

  // getRecommended() {
  //   var data = {
  //     cityid: this.cityid,
  //     isRecommeneded: 1,
  //     limit: 30,
  //     skip: 0
  //   }
  //   this.apiService.CommonApi(Apiconfig.allProducts.method, Apiconfig.allProducts.url, data).subscribe(result => {
  //     if (result && result.status == 1) {
  //       this.productList = result.productlist ? result.productlist : [];
  //     }
  //   })
  // }

  landingData() {
    this.apiService
      .CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {})
      .subscribe((result) => {
        if (result && result.response) {
          var data = result.response[1];
          this.postHeader = data.PostHeader;
        }
      });
  }

  getproducts(mid: any, name: any) {
    var name_arr = [];
    name_arr.push(name);
    var obj = JSON.stringify({
      category: [{ rcat: mid, scat: [] }],
      category_name: name_arr,
      filter: 'latest',
    });
    this.route.navigate(['/search'], { queryParams: { filter: btoa(obj) } });
  }
  ourStory(batchs: any) {
    let slug = 'our-story'
    this.batch_id = batchs
    this.route.navigate(['/page', slug, batchs]);
  }
  getRecommendProd() { }

  productDetails(slug: any, id: any, rcat: any, scat: any) {
    // console.log('----------slug---------------------------', slug);

    this.route.navigate(['/products', slug], {
      relativeTo: this.activatedRoute,
      skipLocationChange: false,
      onSameUrlNavigation: 'reload',
      // queryParams: {
      //   id: id,
      //   rcat: rcat,
      //   scat: scat,
      // },
    });
  }

  addFavourite(id: any, childId: any) {
    // console.log(id,childId, 'sdasdasdasdasd');

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

              this.getFaviroitList();
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

              this.getFaviroitList();
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
    // this.ngOnInit();
    this.getCartDetails();

  }
  onPhoneChange(value: any) {
    const maxLength = 15;
    if (value && value.length > maxLength) {
      // this.phone = value.substring(0, maxLength);
      this.phoneInput.control.setValue(value.substring(0, maxLength));
    }
  }
  phoneNumber(event) {
    if (
      this.form.form.controls['phoneNum'].value &&
      this.form.form.controls['phoneNum'].value.number &&
      this.form.form.controls['phoneNum'].value.number.length > 3
    ) {
      let number = phoneNumberUtil.parseAndKeepRawInput(
        this.form.form.controls['phoneNum'].value.number,
        this.form.form.controls['phoneNum'].value.countryCode
      );
      this.form.form.controls['phoneNum'].setValue(
        phoneNumberUtil.formatInOriginalFormat(
          number,
          this.form.form.controls['phoneNum'].value.countryCode
        )
      );
    }
  }

  // initiateOTPRequest() {
  //   if (this.registerForm.controls['phone'].valid) {
  //     this.otpRequested = true;
  //     this.startCountdown();
  //     // Logic to send OTP
  //   }
  // }
  // loginitiateOTPRequest() {
  //   if (this.form.controls['phoneNum'].valid) {
  //     this.logotpRequested = true;
  //     this.logstartCountdown();
  //     // Logic to send OTP
  //   }
  // }
  slickInit(e) {
    // console.log('slick initialized');
  }

  breakpoint(e) { }

  afterChange(e) {
    if (e) {
      this.active_slider = e.currentSlide;
      // console.log('afterChange',e);
    }
  }

  beforeChange(e) {
    // console.log('beforeChange');
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
  //   if (action == 'increement' && this.quantity_details.noquant < 20) {
  //     this.quantity_details.noquant = ++this.quantity_details.noquant;
  //     this.changeCart(product, this.quantity_details, action);
  //   }
  //   if (action == 'decreement' && this.quantity_details.noquant >= 0) {
  //     this.quantity_details.noquant = --this.quantity_details.noquant || 0;
  //     this.changeCart(product, this.quantity_details, action);
  //   }
  // }

  // addToCart(product, variant) {
  //   var urlstr = product.avatar;
  //   var spliturl = urlstr.split(environment.apiUrl);
  //   var data = {} as any;
  //   data.apikey = 'Yes';
  //   data.foodId = product._id;
  //   data.foodname = product.name;
  //   data.rcat_id = product.rcat_id;
  //   data.scat_id = product.scat_id;
  //   data.mprice = product.base_price;
  //   data.psprice = product.sale_price;
  //   data.size_status = product.size_status;
  //   data.addons_quantity = variant.noquant;
  //   data.size =
  //     product.size_status == 1 && product.filterSize
  //       ? product.filterSize[0].size
  //       : 'None';
  //   data.image = spliturl[1];
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
  //           var datas = {
  //             page: 'register',
  //           };
  //           this.apiService.realoadFunction({ data: datas });
  //         } else {
  //           this.notifyService.showError(
  //             result.message || 'Somthing went wrong'
  //           );
  //         }
  //       });
  //   }
  // }

  // changeCart(product, variant, action) {
  //   if (action == 'decreement' || action == 'increement') {
  //     if (this.cartDetails) {
  //       var data = {} as any;
  //       data.cityid = this.cartDetails.city_id;
  //       data.foodId = product._id;
  //       data.size = product.size[0] || 'S';
  //       data.cart_id = '';
  //       this.cartDetails.cart_details.map(function (e) {
  //         if (e.varntid == variant._id && e.id == product._id) {
  //           data.cart_id = e.cart_id;
  //         }
  //       });
  //       data.varntid = variant._id;
  //       if (this.userId) {
  //         data.userId = this.userId;
  //         data.type = 'cart';
  //       } else {
  //         var serveykey = sessionStorage.getItem('serverKey');
  //         if (serveykey) {
  //           data.userId = serveykey;
  //           data.type = 'temp_cart';
  //         }
  //       }
  //       data.quantity_type = action;
  //       if (data.userId != '') {
  //         this.socketService
  //           .socketCall('r2e_change_cart_quantity', data)
  //           .subscribe((res) => {
  //             if (res && res.err == 0) {
  //               this.getCartDetails();
  //             }
  //             // else{
  //             //   this.notifyService.showError(res.message || 'Somthing went wrong')
  //             // }
  //           });
  //       }
  //     }
  //   }
  // }

  getCartDetails() {
    var data = {} as any;
    data.userId = '';
    // console.log(this.userId, "cart deeeeee");

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
    data.cityid = this.cityid || "";
    data.schedule_type = 0;
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
          this.cartId = this.cartDetails._id;
          this.cartLength = Object.keys(this.cartDetails).length;
          this.cart_details = this.cartDetails
            ? this.cartDetails.cart_details &&
              this.cartDetails.cart_details.length > 0
              ? this.cartDetails.cart_details.map((e) => {
                return e.id;
              })
              : []
            : [];
          // console.log(this.cartDetails, 'cart details...');
          this.store.cartdetails.next(this.cartDetails);
          // console.log(this.cartLength, ' this.cartLength');

          this.getTagWithProducts();
        }
      });
    }
  }

  searPage(slug) {
    // var obj = JSON.stringify({ filter: 'latest' });
    this.route.navigate(['/search'], {
      queryParams: {
        m: slug,
        s: 'latest',
      },
    });
  }

  updateQuantity(data) { }

  // featured_products() {
  //   let data = {} as any;
  //   if (this.userId) {
  //     data.user_id = this.userId;
  //   }
  //   this.apiService
  //     .CommonApi(Apiconfig.feautr_pro.method, Apiconfig.feautr_pro.url, data)
  //     .subscribe((res) => {
  //       if (res && res.status == 1) {
  //         this.fea_pro = res.feature;

  //         console.log('this.fea_pro', this.fea_pro);

  //         if (this.fea_pro && this.fea_pro.length > 0) {
  //           this.fea_pro.map((x) => {
  //             if (x.foodData && x.foodData.length > 0) {
  //               x.foodData.filter((y) => {
  //                 y.outOfStockQuantity !== 0;

  //                 // if (y.size_status == 2 && y.quantity > 0) {
  //                 //   y.catgory_avail = true
  //                 // } else {
  //                 //   y.catgory_avail = false
  //                 // }
  //               });
  //             }
  //           });
  //         }
  //         // console.log("this.fea_pro", this.fea_pro)
  //       }
  //     });
  // }

  featured_categories() {
    this.apiService
      .CommonApi(
        Apiconfig.featured_categories.method,
        Apiconfig.featured_categories.url,
        {}
      )
      .subscribe((res) => {
        // if (res && res.status == 1) {
        this.featured_categories_ = res;

        // console.log('featured_categories_', res);
        // }
      });
  }

  getcategory_product(name: any, mid: any) {
    //
    var name_arr = [];
    // console.log(name, mid, 'name and mid');
    // console.log('----------vheck---');
    name_arr.push(name);
    var obj = JSON.stringify({
      category: [{ rcat: mid, scat: [] }],
      category_name: name_arr,
      filter: 'latest',
    });
    // this.renderer.removeClass(this.dropdwn.nativeElement,'show')
    this.route.navigate(['/search'], { queryParams: { filter: btoa(obj) } });
  }

  getTagWithProducts() {
    // console.log(this.userId, 'this.userIdthis.userIdthis.userIdthis.userId');

    let data = {};
    if (this.userId) {
      data = { user_id: this.userId };
    } else {
      var serveykey = sessionStorage.getItem('serverKey');

      data = { user_id: serveykey };
    }

    this.apiService
      .CommonApi(Apiconfig.getAllTags.method, Apiconfig.getAllTags.url, data)
      .subscribe((res) => {
        this.tags = res;

        this.tags.forEach((tag, index) => {
          this.tagObjects[`tag${index + 1}`] = tag;
          this.tagObjects[`tag${index + 1}-products`] = this.productFilterList(tag.products, index + 1);

          // Restore selected variants from sessionStorage if available
          const selectionInfo = JSON.parse(sessionStorage.getItem('selectionInfo')) || {};

          tag.products.forEach(product => {
            // Check if selectedAttributeId is in the product's attributes
            const attributeMatch = product.attributes.includes(this.selectionInfo.selectedAttributeId);

            if (attributeMatch && product._id === selectionInfo.product_id && this.reloadAction !== 1) {
              const index = selectionInfo.selectedIndex || 0; // Default to 0 if index is undefined
              // Initialize selectedPriceDetail based on index
              product.selectedPriceDetail = product.price_details[index] || product.price_details[0];
            } else {
              // Fallback if no attribute match
              product.selectedPriceDetail = product.price_details[0];
            }

            // Reset isSelected for each price detail
            product.price_details.forEach(priceDetail => {
              priceDetail.isSelected = (priceDetail === product.selectedPriceDetail);
            });
          });
        });

        this.tagObjectLength = Object.keys(this.tagObjects).length;
      });
  }




  onPriceDetailChange(item: any, selectedPriceDetail: any) {
    // Update the selected index
    this.selectedIndex = item.price_details.findIndex(
      (price) => price === selectedPriceDetail
    );
    // console.log(item, "itemmmm");
    this.selectedItemId = item._id
    // Update selection info
    this.selectionInfo.selectedIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
    this.selectionInfo.selectedAttributeId = selectedPriceDetail.attribute_ids[0];
    this.selectionInfo.product_id = item._id
    item.selectedPriceDetail = selectedPriceDetail;

    // Set isSelected for each price detail
    item.price_details.forEach(priceDetail => {
      priceDetail.isSelected = (priceDetail === selectedPriceDetail);
    });
    // console.log(item);


    // Save selection info to session storage
    sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));
  }

  // Cart functionality start

  preAddCart(product, action): void {
    this.selectedItemId = product._id;
    if (
      typeof this.quantity_details.noquant === 'undefined' ||
      this.quantity_details.noquant === 0 ||
      this.quantity_details.noquant === 1
    ) {
      const noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };
      this.addToCart(product, this.quantity_details);
    }
  }





  addToCart(product, variant) {
    // console.log(product, 'iiii');
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
            this.reloadAction = 2
            this.getCartDetails();
            let datas = {
              page: '',
            };
            this.apiService.realoadFunction({ data: datas });


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




  // boundary

  preAddCartBtn(product, action, product_id, remId: string): void {

    // console.log(product, 'producttt235');
    // console.log(remId, 'remiIdssasga');


    // this.preadd = true

    this.selectedItemId = product._id;
    // console.log(this.quantity_details, 'this.quantity_details.noquant');
    // console.log(typeof this.quantity_details.noquant, 'this.quantity_details.noquant');
    // console.log(this.quantity_details.noquant, 'this.quantity_details.noquant');




    if (typeof this.quantity_details.noquant == "undefined" || this.quantity_details.noquant == 0 || this.quantity_details.noquant == 1) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };

      // console.log('hi im here in the pre ad dcart');
      this.addToCartBtn(product, this.quantity_details, product_id, remId);
    }


  }



  addToCartBtn(product, variant, product_id, remId: string) {
    // console.log(product, 'iiii');
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


    if (product.selectedPriceDetail.attributes && product.selectedPriceDetail.attributes.length > 0) {
      attr.attri_name = product.selectedPriceDetail.attributes[0].attri_name;
      attr.chaild_id = product.selectedPriceDetail.attributes[0].chaild_id;
      attr.chaild_name = product.selectedPriceDetail.attributes[0].chaild_name;
      attr.parrent_id = product.selectedPriceDetail.attributes[0].parrent_id;
    }

    // console.log(attr, 'check attrrr');



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
    // console.log(data, 'original data');

    if (data.userId != '') {
      this.socketService.socketCall('r2e_add_to_cart', data).subscribe(result => {
        if (result && result.err == 0) {
          // console.log(result, 'carttt resulltt');

          // this.route.navigate(['/cart']);
          this.reloadAction = 2
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
    this.unmatchedObjects.forEach((rem) => {
      if (
        rem.price_details.attributes[0].chaild_id === remId &&
        rem._id == product_id
      ) {
        rem.showAddToCartButton = false;
      }
    });
  }



  productFilterList(products: any, identity: number) {
    this.productList = products;
    // console.log(this.productList, 'productttttt');

    // Initialize cart IDs
    if (this.cartDetails && this.cartDetails.cart_details) {
      this.cartIds = this.cartDetails.cart_details.map(detail => detail.id);
    }

    // Extract price details
    let extractedPriceDetails = [];
    this.productList.forEach(product => {
      product.price_details.forEach(priceDetail => {
        let extractedDetail = {
          price_details: priceDetail,
          name: product.name,
          _id: product._id,
          rcat_id: product.rcategory,
          scat_id: product.scategory,
          size_status: product.size_status,
        };
        extractedPriceDetails.push(extractedDetail);
      });
    });

    // Set showAddToCartButton for extracted details
    extractedPriceDetails.forEach(product => {
      product.showAddToCartButton = true;
    });

    // Initialize matched and unmatched objects
    this.matchedObjects = [];
    this.unmatchedObjects = [];

    // Match extracted price details with cart items
    if (this.cartDetails && this.cartDetails.cart_details) {
      extractedPriceDetails.forEach(obj => {
        if (obj.price_details && obj.price_details.attributes && obj.price_details.attributes.length > 0) {
          let chaild_id_extractedPriceDetails = obj.price_details.attributes[0]?.chaild_id;

          for (let cartDetail of this.cartDetails.cart_details) {
            if (cartDetail?.variations[0]?.length > 0) {
              let chaild_id_cart = cartDetail.variations[0][0]?.chaild_id;

              if (chaild_id_extractedPriceDetails === chaild_id_cart && obj._id === cartDetail.id) {
                this.matchedObjects.push({
                  extractedPriceDetails: obj,
                  cart_detail: cartDetail,
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

    // Set selectedPriceDetail based on reloadAction and selectionInfo

    if (this.productList.length > 0) {
      this.productList.forEach(product => {
        if (product.price_details.length > 0) {
          // Default selection logic
          let selectedDetail;
          if (this.reloadAction !== 1) {
            const index = this.selectionInfo.selectedIndex || 0; // Default to 0 if index is undefined
            // console.log(index, 'index1');

            // Check if the selectedAttributeId is in the product's attributes
            const attributeMatch = product.attributes.includes(this.selectionInfo.selectedAttributeId);
            // console.log(product._id, this.selectionInfo.product_id, "attttttt");

            if (attributeMatch && index < product.price_details.length && product._id === this.selectionInfo.product_id) {
              selectedDetail = product.price_details[index];
            } else {
              // console.log('index3');

              selectedDetail = product.price_details[0]; // Fallback to first element if no match or index is out of bounds
            }
          } else {
            // console.log('index2');
            selectedDetail = product.price_details[0]; // Default selection if not reloading
          }

          // Assign selectedPriceDetail
          product.selectedPriceDetail = selectedDetail;

          // Set isSelected for each price detail
          product.price_details.forEach(priceDetail => {
            priceDetail.isSelected = (priceDetail === product.selectedPriceDetail);
          });
        }
      });
    }

    // Handle unmatched objects based on identity
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
      case 5:
        this.unmatchedObjects5 = this.unmatchedObjects;
        break;
      case 6:
        this.unmatchedObjects6 = this.unmatchedObjects;
        break;
      case 7:
        this.unmatchedObjects7 = this.unmatchedObjects;
        break;
      case 8:
        this.unmatchedObjects8 = this.unmatchedObjects;
        break;
      case 9:
        this.unmatchedObjects9 = this.unmatchedObjects;
        break;
      case 10:
        this.unmatchedObjects10 = this.unmatchedObjects;
        break;
    }

    // Filter out remaining products not in the cart
    this.remainingProducts = this.productList.filter(product => {
      return !this.cartDetails?.cart_details?.some(cartItem => cartItem.id === product._id);
    });

    // Set showAddToCartButton for remaining products
    this.remainingProducts.forEach(product => {
      product.showAddToCartButton = true;
    });
    // console.log(this.remainingProducts, 'remaining items');

    this.showproduct = true;
    // window.scroll(0, 0);
    // this.queryParamsUpdate();
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
          // console.log(this.remainingProducts, 'reeeeeeeeeeeeeeeeeeee');
          // this.updateUIAfterRemove();
          // console.log(categ.cart_id, 'cartttt12344');

          this.showAddToCartButton(categ.cart_id);
        });
    }
  }

  // updateUIAfterRemove(): void {

  //   this.productFilterList();
  // }

  showAddToCartButton(itemId: string): void {
    this.unmatchedObjects.forEach((rem) => {
      if (rem._id === itemId) {
        rem.showAddToCartButton = true;
      }
    });
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

  phoneNumberChange(event: Event) {
    const phoneControl = this.registerForm.get('phone');

    if (
      phoneControl &&
      phoneControl.value &&
      phoneControl.value.number &&
      phoneControl.value.number.length > 3
    ) {
      const number = phoneNumberUtil.parseAndKeepRawInput(
        phoneControl.value.number,
        phoneControl.value.countryCode
      );
      phoneControl.setValue(
        phoneNumberUtil.formatInOriginalFormat(
          number,
          phoneControl.value.countryCode
        )
      );
    }
  }
  footerRouter() {
    this.route.navigate(['/page/privacy-policy']);
    window.scrollTo(0, 0);
  }
  onFormSubmit(loginForm: NgForm) {
    // console.log(loginForm.valid);
    this.loginsubmitted = true;
    if (loginForm.valid) {
      // if (loginForm.value.phone == null) {
      //   this.notifyService.showError('Please fill the phone number');
      //   return false;
      // }
      // console.log(loginForm.value.phoneNum.number,"loginFormloginFormloginForm");
      if (!this.logotpRequested) {
        return this.notifyService.showError('Otp is required');
      }
      // return
      // code: this.registerForm.value.phone.dialCode,
      // number: this.registerForm.value.phone.number.replace(/\s/g, "")
      // var otp = this
      var object = {
        phone_number: loginForm.value.phoneNum.number.replace(/\s/g, ''),
        password: '1234',
      };
      // this.loginObject = {};
      // this.loginObject.country_code = loginForm.value.phone.dialCode;
      // this.loginObject.phone_number = loginForm.value.phone.number.replace(/\s/g, "");
      // this.loginObject.phone = {
      //   code: loginForm.value.phone.dialCode,
      //   number: loginForm.value.phone.number.replace(/\s/g, "")
      // };

      // this.apiService.CommonApi(Apiconfig.userLogin.method, Apiconfig.userLogin.url, object).subscribe(result => {

      //   if (result && result.status == 1) {
      //     // this.num1 = result.data.otp.toString().substr(0, 1);
      //     // this.num2 = result.data.otp.toString().substr(1, 1);
      //     // this.num3 = result.data.otp.toString().substr(2, 1);
      //     // this.num4 = result.data.otp.toString().substr(3, 1);
      //     this.notifyService.showSuccess(result.data.message);
      //     this.modalRef.hide()
      //     // this.modalRefOtp = this.modalService.show(template, { id: 1, class: 'verifyotp-model', ignoreBackdropClick: false });
      //   }
      // })
      // console.log(object, 'object');

      this.authenticationService.login(object).subscribe((result) => {
        if (result && result.data) {
          this.notifyService.showSuccess(result.data.message);
          // this.modalRefOtp.hide();
          // if(template){

          //   this.modalRef.hide()
          // }
          this.route.navigate(['/']);

          var data = {
            page: 'login',
          };
          this.apiService.realoadFunction({ data: data });
          setTimeout(() => {
            this.updateRecentVisit();
            this.tempcartToCart();
          }, 200);
          this.destroyModel();
        } else {
          this.notifyService.showError(
            result.message ? result.message.message : 'Something went wrong'
          );
          loginForm.reset();
        }
      });
    } else {
      if (!loginForm.value.phoneNum.number) {
        this.notifyService.showError('Phone number is required');
      } else if (!this.loginotp1 && this.loginotp1 == undefined) {
        this.notifyService.showError('Otp is required');
      } else {
        this.notifyService.showError('Please enter all the mandatory field!');
      }
      setTimeout(() => { }, 1000);
    }
  }

  destroyModel() {
    this.modalService.hide();
  }

  setCurrentCountryFlag() {
    if (typeof this.selectedCountryISO == 'undefined') {
      this.apiService.getIPAddress().subscribe((res: any) => {
        if (res && typeof res.country != 'undefined') {
          let selected = COUNTRY.filter((x) => {
            if (x.iso2 == res.country) {
              return x;
            }
          });
          let val = selected.length > 0 ? selected[0].name : 'India';
          if (typeof CountryISO[val] != 'undefined') {
            this.selectedCountryISO = CountryISO[val];
          } else {
            this.selectedCountryISO = CountryISO['India'];
          }
        }
      });
    }
  }
  tempcartToCart() {
    var user_id = sessionStorage.getItem('serverKey');
    var userId = localStorage.getItem('userId');
    if (user_id && userId) {
      this.socketService
        .socketCall('tempcart_to_cart', { user_id: user_id, userId: userId })
        .subscribe((result) => {
          if (result && result.err == 0) {
            var data = {
              page: 'login',
            };
            this.apiService.realoadFunction({ data: data });
          }
        });
    }
  }

  onregFormSubmit() {
    // console.log(registerForm.valid);
    // console.log(this.registerForm.value);
    // return
    this.submitted = true;
    // console.log(this.otp1, 'this.otp1this.otp1this.otp1this.otp1');
    if (this.registerForm.valid) {
      if (
        !this.otp1 ||
        this.otp1 == (null || undefined) ||
        !this.otp2 ||
        !this.otp3 ||
        !this.otp4
      ) {
        return this.notifyService.showError('Otp is required');
      }
      // if (!this.socialLogin && registerForm.value.password != registerForm.value.confirmpassword) {
      //   this.notifyService.showError('Password and Confirm Password is not matching.');
      //   return false;
      // }
      // if (registerForm.value.phone == null) {
      //   this.notifyService.showError('Please fill the phone number');
      //   return false;
      // }

      // if (!this.gender) {
      //   this.notifyService.showError('Please select gender');
      //   return false;
      // }

      // var object = {
      //   first_name: registerForm.value.first_name,
      //   country_code: registerForm.value.phone.dialCode,
      //   phone_number: registerForm.value.phone.number.replace(/\s/g, ""),
      //   email: registerForm.value.email
      // } as any;

      this.userDetail = {};
      (this.userDetail.first_name = this.registerForm.value.first_name),
        (this.userDetail.last_name = this.registerForm.value.last_name),
        (this.userDetail.username =
          this.registerForm.value.first_name.trim().toLowerCase() +
          this.registerForm.value.last_name.trim().toLowerCase());
      // console.log('+++++++++++++++++++++');
      // console.log(this.userDetail.username);
      // this.userDetail.country_code = registerForm.value.phone.dialCode,
      // this.userDetail.phone_number = registerForm.value.phone.number.replace(/\s/g, ""),
      this.userDetail.email = this.registerForm.value.email;

      // this.userDetail.password = this.registerForm.value.password;
      this.userDetail.phone = {
        code: this.registerForm.value.phone.dialCode,
        number: this.registerForm.value.phone.number.replace(/\s/g, ''),
      };
      if (this.socialLogin && typeof this.socialLogin.id != 'undefined') {
        this.userDetail.social_id = this.socialLogin.id;
        this.userDetail.social_login = this.socialLogin.social_login;
      }

      // console.log(
      //   this.userDetail,
      //   'this.userDetailthis.userDetailthis.userDetail'
      // );

      //  else {
      //   this.userDetail.password = this.registerForm.value.password;
      // }
      // return
      this.apiService
        .CommonApi(
          Apiconfig.siteRegister.method,
          Apiconfig.siteRegister.url,
          this.userDetail
        )
        .subscribe((result) => {
          if (result && result.data) {
            localStorage.removeItem('userDetails');
            localStorage.removeItem('userId');
            setTimeout(() => {
              localStorage.setItem('userDetails', JSON.stringify(result.data));
              localStorage.setItem('userId', result.data.user_id);
              this.authenticationService.currentUserSubject.next({
                username: result.data.user_name,
                role: result.data.role,
              });
              this.route.navigate(['/']);
              var data = {
                page: 'register',
              };
              this.apiService.realoadFunction({ data: data });
            }, 100);
            setTimeout(() => {
              this.updateRecentVisit();
              this.tempcartToCart();
            }, 200);
            this.registerRef.hide();
            this.notifyService.showSuccess(result.data.message);

            this.destroyModel();
          } else {
            this.notifyService.showError(
              result.message.message || result.message || 'Something went wrong'
            );
          }
        });
      // this.socketService.socketCall('r2e_send_otp', object).subscribe(result => {

      //   if (result && typeof result.err != 'undefined' && result.err == 0) {
      //     this.userDetail.otp_status = result.otp_status;
      //     this.userDetail.otp = result.otp;
      //     this.num1 = result.otp.toString().substr(0, 1);
      //     this.num2 = result.otp.toString().substr(1, 1);
      //     this.num3 = result.otp.toString().substr(2, 1);
      //     this.num4 = result.otp.toString().substr(3, 1);
      //     this.modalRefOtp = this.modalService.show(template, { id: 1, class: 'verifyotp-model', ignoreBackdropClick: false });
      //     this.registerRef.hide();
      //   }
      // })
    } else {
      if (!this.otp1 && this.otp1 == undefined) {
        this.notifyService.showError('Otp is required');
      } else {
        this.notifyService.showError('Please enter all the mandatory fields!');
      }
    }
  }
  updateRecentVisit() {
    var user_key = localStorage.getItem('user_key');
    var userId = localStorage.getItem('userId');
    if (userId && user_key) {
      this.socketService
        .socketCall('update_temp_vist', { user_id: user_key, userId: userId })
        .subscribe((result) => {
          if (result && result.status == 0) {
            // localStorage.removeItem('user_key');
          }
        });
    }
  }
  // preAddCart(product, action) {
  //   this.selectedItemId = product._id;
  //   if (typeof this.quantity_details.noquant == "undefined" || this.quantity_details.noquant == 0 || this.quantity_details.noquant == 1) {
  //     var noquant = 1;
  //     this.quantity_details = { ...this.quantity_details, noquant };
  //     this.addToCart(product, this.quantity_details);
  //   }
  // }

  getMailToLink(): string {
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent(
      this.emailSubject
    )}&body=${encodeURIComponent(this.emailBody)}`;
  }

  getFormattedImagePath(path: string): string {
    return path.replace(/\\+/g, '/'); // Replace backslashes with forward slashes
  }
  //subscribeData

  initiateOTPRequest() {
    if (this.registerForm.controls['phone'].valid) {
      this.otpRequested = true;
      this.startCountdown();
      // Logic to send OTP
    }
  }
  loginitiateOTPRequest() {
    if (this.form.controls['phoneNum'].valid) {
      this.logotpRequested = true;
      this.logstartCountdown();
      // Logic to send OTP
    }
  }

  onOtpInput(event: any, index: number) {
    const input = event.target.value;
    if (input.length === 1 && index < 4) {
      this[`otp${index + 1}`].nativeElement.focus();
    }
  }
  // logonOtpInput(event: any, index: number) {
  //   const input = event.target.value;
  //   if (input.length === 1 && index < 4) {
  //     this[`loginotp${index + 1}`].nativeElement.focus();
  //   }
  // }
  logonOtpInput(event: any, index: number) {
    const input = event.target.value;
    const nextInputIndex = index + 1;
    if (input.length === 1 && nextInputIndex <= 4) {
      const nextInput = document.getElementById(`loginotp${nextInputIndex}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  }

  restartOTPRequest() {
    if (this.countdown === 0) {
      this.countdown = 15;
      this.startCountdown();
      // Logic to resend OTP
    }
  }
  logrestartOTPRequest() {
    if (this.logincountdown === 0) {
      this.logincountdown = 15;
      this.logstartCountdown();
      // Logic to resend OTP
    }
  }

  startCountdown() {
    clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }
  logstartCountdown() {
    clearInterval(this.logcountdownInterval);
    this.logcountdownInterval = setInterval(() => {
      if (this.logincountdown > 0) {
        this.logincountdown--;
      } else {
        clearInterval(this.logcountdownInterval);
      }
    }, 1000);
  }
}
