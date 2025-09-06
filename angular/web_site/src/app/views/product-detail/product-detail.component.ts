import {
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
  ViewChild, Renderer2
} from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ClipboardService } from 'ngx-clipboard';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';
import { Title, Meta } from '@angular/platform-browser';
@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['../views.component.scss', './product-detail.component.scss'],
})
export class ProductDetailComponent implements OnInit {
  @ViewChild('slickModalRating') slickModal: any;
  rcat: any;
  scat: any;
  productList: any[] = [];
  recommendedArray: any[] = [];
  product_id: any;
  // isZoomVisible: boolean = false;
  zoomPosition: string = '% 0%';
  zoomWidth: number = 500; // Set your desired zoomed image width
  zoomHeight: number = 450; // Set your desired zoomed image height
  backgroundSize: string = '2000px';
  productdetails: any;
  avtaractive: boolean = true;
  imageactive: any;
  settings: any;
  modalRefOtp: BsModalRef;
  productInfo: any;
  variant_details: any;
  variantParams: any;
  isOutOfStock: boolean = false;
  isOutOfStock_recentview: boolean = false;
  quantity_details: any = {};
  variants: any[] = [];
  sizeStatus: boolean;
  readonly: boolean = false;
  userId: any;
  cityid: any;
  variant1obj: any = [];
  variant1Listinitial: any = [];
  variant2Listinitial: any = [];
  a: any = [];
  variationLength: any;
  selectedArray: any = [];
  basePrice: any;
  salePrice: any;
  index: any;
  selectedVariation: any = [];
  newArray: any;
  filteredItems: any = [];
  filteredData: any = [];
  possibleFilteredData: any = [];
  chaildNames: any[];
  variant1List: any[];
  variant2List: any[];
  disabledDatas: any = [];
  filteredproductArray: any = [];
  quantity: any = 0;
  matchedObjects: any[];
  unmatchedObjects: any[];
  selectedPriceDetail: any;
  remainingProducts: any[];
  pro_count: any;
  matchingProducts: number;
  flavorFushion: any;
  tags: any;
  tagObjects = {};
  tagObjectLength = 0;
  cartLength: number = 0;

  productTemp: any;
  showcart: boolean = false;
  cartidstatus: boolean = false;
  categoryList: any[] = [];
  filteredVariants: any;
  co: any;
  matchtrue: boolean = false;
  cartbutton: boolean = false;
  productDetailss: any;
  product_Details: any;
  price_Details: any;
  priceDetails: any;
  filteredVariant: any;
  variantitem: any;
  initialarr: any;
  selectionInfo: any;
  i: any;
  cart_count: any;
  environment = environment;

  attribute: any;
  unit: any = {};
  arrayOfObjects = [
    // {
    //   image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png",
    //   name: "Whatsapp",
    // },
    {
      image: '../assets/image/Common/facebook.png',
      name: 'Facebook',
    },
    {
      image: '../assets/image/Common/whatsapp.png',
      name: 'Whatsapp',
    },
    {
      image: '../assets/image/Common/email.png',
      name: 'Email',
    },
    {
      image: '../assets/image/Common/link.png',
      name: 'Copy',
    },
  ];
  variantDetails: any[] = [];
  cartDetails: any;
  related_product: any[] = [];
  active_slider: number = 0;
  quantity_products: any;
  isActive: boolean = false;
  showproduct: boolean = false;
  user_question: any;
  showadditional_images: boolean = false;
  showadditional_images_url: any;
  storedSelectionInfo: string;
  cartIds: any[];
  activeFaq: number = 0;
  openFaqs: boolean[] = [];

  isZoomVisible = false;
  zoomX = 0;
  zoomY = 0;
  currentZoomImage: string;
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

  slideConfig = {
    slidesToShow: 4,
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
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  recentSlide = {
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
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  recvistId: any[] = [];
  recentlyVistProd: any;
  img: number = 0;
  product_img: any;

  cart_details: any[] = [];
  faviroitList: any[] = [];
  default_size = '';
  seeMore: boolean = false;
  modalRef: BsModalRef;
  viecart: boolean = false;
  viecheckout: boolean = false;
  cart_id: any;
  product: boolean = false;
  products: any;
  quantity_size = [];
  ratingList: any = [];
  ratingSkip: number = 0;
  ratingLimit: number = 10;
  env_url: string = environment.apiUrl;
  currentPage: number = 1;
  totalItems: number = 10;
  ratingImageList: any = [];
  selectedImage: any;
  selectedVariantId: any;
  selectedVariant: any;
  product_slug: any;
  selectedRatingData: any;
  ratingStar: any;
  ratingStarArray: any = [];
  nonRatingStarArray: any = [];
  selected_atr_ids: any = [];
  selected_attr: any = [];
  selected_parents: any = [];
  confirm_attri: boolean = false;
  buynow: boolean = false;
  filteredPossiblityData: any[];
  cartToggle: boolean;
  selectedItemId: any;
  unmatchedObjects1: any[];
  unmatchedObjects2: any[];
  unmatchedObjects3: any[];
  unmatchedObjects4: any[];
  selectedIndex: any;
  productDealList: any = null;
  slidernav: any;
  sliderfor: any;
  showDeals: boolean;
  reloadaction: number = 1;
  selectedUnitId: any;
  chalidId: any;
  favicon: boolean;
  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private clipboard: ClipboardService,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    config: NgbRatingConfig,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private modalServices: ModalModalServiceService,
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
  ) {
    this.slidernav = {
      slidesToShow: 4,
      slidesToScroll: 1,
      asNavFor: '#sliderFor',
      vertical: true,
      autoplay: true,
      infinite: false, // Ensure the carousel loops
      verticalSwiping: false,
      dots: false,
      arrows: true,
      centerMode: false,
      focusOnSelect: true,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 4,
            slidesToScroll: 1,
            // infinite: true, // Infinite scrolling at larger screen sizes
            dots: true,
          },
        },
        {
          breakpoint: 600,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1,
            vertical: false,
            verticalSwiping: false,
            // infinite: true, // Infinite scrolling on smaller screens
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1,
            arrow: true,
            vertical: false,
            verticalSwiping: false,
            // infinite: true, // Infinite scrolling on mobile screens
          },
        },
      ],
    };

    this.sliderfor = {
      dots: true,
      infinite: true,
      autoplay: true,
      arrows: false,
      speed: 300,
      autoplaySpeed: 2000,
      slidesToShow: 1,
      slidesToScroll: 1,
      fade: true,
      asNavFor: '#sliderNav',

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
          breakpoint: 600,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
      ],
    };

    console.log('hiii');
    config.max = 5;
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }
    // var storageLocal = JSON.parse(sessionStorage.getItem('searchLocation'));
    // if (storageLocal) {
    //   this.cityid = storageLocal.cityid;
    // }
    this.apiService.reloadObservable$.subscribe((result) => {
      var useStrg = localStorage.getItem('userId');

      if (useStrg) {
        this.userId = useStrg;
      }
    });

    this.store.generalSettings.subscribe((result) => {
      this.settings = result;
    });
    //     this.fetchCartDetails();

    // this.getCartDetails();
    this.apiService.viewProductObservable$.subscribe((result) => {
      if (result && result.data) {
        if (result.data.view == 'cart') {
          this.cart_id = result.data.cart_id;
          this.viecart = true;
          this.viecheckout = false;
          setTimeout(() => {
            this.default_size = result.data.size;
          }, 100);
        } else if (result.data.view == 'checkout') {
          this.cart_id = result.data.cart_id;
          this.default_size = result.data.size;
          this.viecheckout = true;
          this.viecart = false;
        }
      }
    });
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params && params['id']) {
        this.product_id = params['id'];
        this.rcat = params['rcat'];
        this.scat = params['scat'];
      }
    });

   
  }

  ngOnInit(): void {
    // this.fetchCartDetails();
    // this.getCartDetails()
       if (this.reloadaction == 1) {
      window.scrollTo(0, 0); 

    }
    this.route.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0); 
        this.cdr.detectChanges(); 
        this.reloadaction = 1
      }})
    this.store.productDetails$.subscribe((details) => {
      if (details) {
        this.ngOnInit();
      }
    });
    console.log('--------this.router');

    this.activatedRoute.queryParams.subscribe((params) => {
      console.log(params, 'PARAMS--');

      if (params && params['id']) {
        this.product_id = params['id'];
        this.rcat = params['rcat'];
        this.scat = params['scat'];
      }
    });

    // this.activatedRoute.params.subscribe((params: any) => {
    //   if (params && params.slug) {
    //     this.product_slug = params.slug;
    //   }
    // });

    this.activatedRoute.paramMap.subscribe((params) => {
      console.log('look');

      if (params.has('slug')) {
        // console.log('has slug');
        this.product_slug = params.get('slug');
        this.getProdutDetail();
        
        // this.fetchCartDetails();
        // this.getProductDetails()
        // this.getCartDetails()

        // setTimeout(() => {

        //   console.log(this.productdetails,"this.productdetailsthis.productdetailsthis.productdetails");

        //   const keywordsArray = ['home', 'website name', 'services', 'products'];
        //   const keywordsString = keywordsArray.join(', '); // Convert to comma-separated string

        //   // Set the page title
        //   this.titleService.setTitle('Home - Your Website Name');

        //   // Add meta tags
        //   this.metaService.addTags([
        //     { name: 'description', content: 'Welcome to Your Website Name. We provide the best services and products for your needs.' },
        //     { name: 'keywords', content: keywordsString }, // Use the converted string
        //     { name: 'author', content: 'Your Website Name' },
        //     { property: 'og:title', content: 'Home - Your Website Name' },
        //     { property: 'og:description', content: 'Welcome to Your Website Name. We provide the best services and products for your needs.' },
        //     { property: 'og:type', content: 'website' },
        //   ]);
        // }, 500);
      }
    });

    this.activatedRoute.queryParamMap.subscribe((params) => {
      if (params.has('variant')) {
        ('Are you hereee');
        this.selectedVariantId = params.get('variant');
      }
    });

    console.log(this.selectedVariantId, 'selectedVariantId');
    this.variant_details = null;
    // this.getProdutDetail();
  
    if (this.userId) {
    }
    // Initialize selectedVariant array based on variantParams
    if (this.variantParams) {
      this.selectedVariant = [];
      for (let i = 0; i < this.variantParams.length; i++) {
        const selectedItem = this.productdetails.variants[i].units.find(
          (unit) => unit.name === this.variantParams[i].name
        );
        if (selectedItem) {
          this.selectedVariant[i] = selectedItem._id;
        } else {
          // Handle case when variantParam doesn't match any item
          this.selectedVariant[i] = null;
        }
      }
    }

    if (
      this.productdetails &&
      this.productdetails.price_details &&
      this.productdetails.price_details.length > 0
    ) {
      const defaultAttribute =
        this.productdetails.price_details[0].attributes[0];
      this.basePrice = defaultAttribute.mprice;
      this.salePrice = defaultAttribute.sprice;
    }
    this.initializeSelectedPriceDetails();
    this.updateSliderNav();
    this.delayLoad();
  }



  
  updateSliderNav() {
    if (this.productdetails && this.productdetails.images) {
      const imageCount = this.productdetails.images.length;

      // Adjust slidesToShow dynamically based on the number of images
      this.slidernav.slidesToShow = Math.max(1, Math.min(imageCount, 4));

      // Update responsive breakpoints for side navigation
      this.slidernav.responsive[0].settings.slidesToShow = Math.max(
        1,
        Math.min(imageCount, 4)
      );
      this.slidernav.responsive[1].settings.slidesToShow = Math.max(
        1,
        Math.min(imageCount, 4)
      );
      this.slidernav.responsive[2].settings.slidesToShow = Math.max(
        1,
        Math.min(imageCount, 4)
      );

      // If there are fewer than 5 images, stop auto-scroll (infinite scroll) in the side navigation
      if (imageCount < 5) {
        // Disable infinite scroll for side navigation and remove autoplay if necessary
        this.slidernav.infinite = false;
        this.slidernav.autoplay = false;
      } else {
        // Enable infinite scroll and autoplay for side navigation if there are 5 or more images
        this.slidernav.infinite = true;
        this.slidernav.autoplay = true;
      }

      // Make sure the main slider (sliderfor) is still functional
      if (imageCount < 5) {
        this.sliderfor.autoplay = false; // Stop autoplay on the main slider if fewer than 5 images
      } else {
        this.sliderfor.autoplay = true; // Enable autoplay on the main slider if 5 or more images
      }

      // Detect changes to update the configuration
      this.cdr.detectChanges();
    }
  }

  delayLoad() {
    setTimeout(() => {
      this.showDeals = true;
    }, 1000);
  }

  updatePrice(attribute) {
    this.basePrice = attribute.mprice;
    this.salePrice = attribute.sprice;
  }

  decrementQty() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  incrementQty() {
    this.quantity++;
  }

  removeFoodFromCart(categ) {
    console.log(categ.cart_id, 'categ.cart_id');

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
          this.reloadaction = 2;
          this.getCartDetails();
          var data = {
            page: 'register',
          };
          this.apiService.realoadFunction({ data: data });

          console.log(categ, 'categ.cart_idcateg.cart_id');
          // window.location.reload();
          console.log(this.productdetails, 'here product listtt in the ');

          // const removedItem = this.productdetails.find(product => product._id == categ.id);

          // console.log(removedItem, 'removed productsss');

          // if (removedItem) {
          //   this.remainingProducts.push(removedItem);
          // }
          // console.log(this.remainingProducts, 'reeeeeeeeeeeeeeeeeeee');
          // this.updateUIAfterRemove();
          // window.location.reload()
          this.store.cartdetails.next(this.cartDetails);

          this.ngOnInit();
          console.log(categ.cart_id, 'cartttt12344');

          // this.showAddToCartButton(categ.variations[0][0].attribute_ids[0]);
        });
    }
  }
  updateUIAfterRemove(): void {
    // this.productFilterList();
  }

  processArray(input: string) {
    // this.productdetails.variants

    console.log(this.variant2Listinitial, 'vhes');

    console.log(this.selectedArray, 'selectedarray 123');

    this.index = this.selectedArray.indexOf(input);
    console.log(this.index, 'kdd');

    if (this.index === -1) {
      this.selectedArray.push(input);
      console.log(this.selectedArray, 'modified here it will work');
    } else {
      this.selectedArray.splice(this.index, 1);
      // if (this.selectedArray && this.selectedArray[0]) {

      //   this.processArray(this.selectedArray[0]);
      // }
      console.log(this.selectedArray, 'spliced array');
    }

    console.log(input, 'input');
    this.selectedVariation = input;

    const variationLength = this.variationLength;

    this.variant1obj = this.removeDuplicates(this.variant1obj);

    console.log(this.variant1obj, 'variant1objjj');
    console.log(this.selectedArray, 'initialselectedArray');

    // selecting one variant combinations(variant1)
    let allExistInVariant1 = this.selectedArray.every((item) =>
      this.variant1Listinitial.includes(item)
    );
    let allExistInVariant2 = this.selectedArray.every((item) =>
      this.variant2Listinitial.includes(item)
    );
    console.log('All exist in variant1Listinitial:', allExistInVariant1);

    if (allExistInVariant1 && this.selectedArray.length > 1) {
      console.log(this.selectedArray, 'chekkkkk1');

      this.selectedArray = this.selectedArray.slice(1);
      console.log(this.selectedArray, 'rseelectt1');
      // return this.selectedArray
    }

    console.log(this.selectedArray, 'in variant2');

    // selecting one variant combinations(variant2)
    console.log('All exist in variant2Listinitial:', allExistInVariant2);

    if (allExistInVariant2 && this.selectedArray.length > 1) {
      console.log(this.selectedArray, 'chekkkkk2');

      this.selectedArray = this.selectedArray.slice(1);
      console.log(this.selectedArray, 'rseelectt2');
      // return this.selectedArray
    }

    console.log(this.selectedArray, 'check1');

    if (this.selectedArray.length > 2) {
      if (
        this.variant1Listinitial.includes(this.selectedArray[0]) &&
        this.variant2Listinitial.includes(this.selectedArray[1]) &&
        this.variant1Listinitial.includes(this.selectedArray[2])
      ) {
        this.selectedArray = this.selectedArray.slice(1);
        console.log(this.selectedArray, 'condition1');
      } else if (
        this.variant2Listinitial.includes(this.selectedArray[0]) &&
        this.variant1Listinitial.includes(this.selectedArray[1]) &&
        this.variant2Listinitial.includes(this.selectedArray[2])
      ) {
        this.selectedArray = this.selectedArray.slice(1);
        console.log(this.selectedArray, 'condition2');
      } else if (
        this.variant1Listinitial.includes(this.selectedArray[0]) &&
        this.variant2Listinitial.includes(this.selectedArray[1]) &&
        this.variant2Listinitial.includes(this.selectedArray[2])
      ) {
        this.selectedArray.splice(1, 1);
        console.log(this.selectedArray, 'condition3');
      } else if (
        this.variant2Listinitial.includes(this.selectedArray[0]) &&
        this.variant1Listinitial.includes(this.selectedArray[1]) &&
        this.variant1Listinitial.includes(this.selectedArray[2])
      ) {
        this.selectedArray.splice(1, 1);
        console.log(this.selectedArray, 'condition4');
      }
    }

    console.log(this.variant1obj, 'variant1objjj2');

    console.log(this.selectedArray, 'seleeeectarray');
    // this.filteredItems = this.filterAndDisableByChaildName(this.variant1obj, this.selectedArray);
    this.filteredItems = this.callingFIlterFunction(
      this.variant1obj,
      this.selectedArray
    );

    console.log(this.filteredData, 'this.filteredItemsthis.filteredItems13');
    this.possibleFilteredData = this.filteredData;

    console.log(this.possibleFilteredData, 'jjjsss');

    this.chaildNames = [];

    this.possibleFilteredData.forEach((subArray) => {
      subArray.forEach((item) => {
        this.chaildNames.push(item.chaild_name);
      });
    });

    if (!this.selectedArray.every((item) => this.chaildNames.includes(item))) {
      this.selectedArray = this.selectedArray.slice(1);
      this.callingFIlterFunction(this.variant1obj, this.selectedArray);
      console.log(this.filteredData, 'fasfafasf');
      this.possibleFilteredData = this.filteredData;

      console.log(this.possibleFilteredData, 'jjjsss');

      this.chaildNames = [];

      this.possibleFilteredData.forEach((subArray) => {
        subArray.forEach((item) => {
          this.chaildNames.push(item.chaild_name);
        });
      });
    }

    console.log(this.variant1obj, 'near chaisiilldd');

    console.log(this.selectedArray, 'near childnames');

    console.log(this.chaildNames, 'chaildnameschaildnames');

    console.log(this.possibleFilteredData, 'this.possibleFilteredData');

    console.log(this.variant1Listinitial, 'this.variant1Listinitial');

    if (this.variant1Listinitial.includes(input)) {
      this.variant1List = [];
      console.log(this.variant1List, 'agg');

      for (let i = 0; i < this.productdetails.variants[0].units.length; i++) {
        this.variant1List.push(this.productdetails.variants[0].units[i].name);
      }

      for (let i = 0; i < this.productdetails.variants[0].units.length; i++) {
        if (this.variant1List[i] === input || this.selectedArray.length === 0) {
          this.productdetails.variants[0].units[i].isSelected = false;
        } else {
          this.productdetails.variants[0].units[i].isSelected = true;
        }
      }
    }

    if (this.variant2Listinitial.includes(input)) {
      this.variant2List = [];
      console.log(this.variant2List, 'agg2');

      for (let i = 0; i < this.productdetails.variants[1].units.length; i++) {
        this.variant2List.push(this.productdetails.variants[1].units[i].name);
      }

      for (let i = 0; i < this.productdetails.variants[1].units.length; i++) {
        if (this.variant2List[i] === input || this.selectedArray.length === 0) {
          this.productdetails.variants[1].units[i].isSelected = false;
        } else {
          this.productdetails.variants[1].units[i].isSelected = true;
        }
      }
    }

    // if (this.variant1Listinitial)

    console.log();

    // if(this.variant1Listinitial)
    // if(this.selectedArray)

    console.log(this.selectedArray, 'selectedArray');
    // if (this.variant1Listinitial.includes(this.selectedArray) && (this.selectedArray.length > 1)) {

    //   this.selectedArray = this.selectedArray.shift();
    //   console.log(this.selectedArray, 'rseelectt');

    //   return this.selectedArray
    // }

    // every thing is undisable
    if (this.selectedArray.length === 0) {
      this.productdetails.variants.forEach((variant) => {
        variant.units.forEach((unit) => {
          unit.isSelected = false;
        });
      });
    }

    console.log(
      this.productdetails.variants,
      'this.productdetails.variantsthis.productdetails.variants'
    );

    this.productdetails.variants.forEach((variant) => {
      variant.units.forEach((unit) => {
        if (this.chaildNames.includes(unit.name)) {
          unit.isSelected = false;
        } else {
          unit.isSelected = true;
        }
      });
    });
  }

  callingFIlterFunction(variant1obj, selectedArray) {
    this.filteredItems = this.filterAndDisableByChaildName(
      variant1obj,
      selectedArray
    );
  }

  filterAndDisableByChaildName(data, chaildNames) {
    this.filteredData = data.filter((subArray) => {
      return chaildNames.every((name) =>
        subArray.some((obj) => obj.chaild_name === name)
      );
    });

    console.log(this.filteredData, 'this.filteredDatahello');

    return this.filteredData;
  }

  removeDuplicates(arr) {
    console.log([...new Set(arr)], 'filtered items without duplicate');
    return [...new Set(arr)];
  }
  handleItemClick(item) {
    const currentURL = window.location.href;
    if (item.name == 'Copy') {
      this.clipboard.copyFromContent(currentURL);
      this.toastr.success('Link copied sucessfully');
    } else if (item.name == 'Email') {
      const subject = 'Check out this product: ' + this.productdetails.name;
      const body =
        'Hi,\n\nI wanted to share this product with you:\n\nProduct Name: ' +
        this.productdetails.name +
        '\nDescription: ' +
        this.productdetails.information +
        '\n\nYou can find more information about it at the following link: ' +
        currentURL;
      // Construct mailto URL without recipient
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      // Open default email client with pre-filled content
      window.location.href = mailtoUrl;
    } else if (item.name == 'Facebook') {
      const message = `Check out this product: ${this.productdetails.name}\n\nDescription: ${this.productdetails.information}\n\nYou can find more information about it at the following link: ${currentURL}`;

      // Construct Facebook Messenger URL
      const messengerUrl = `https://www.facebook.com/dialog/send?app_id=APP_ID&link=${encodeURIComponent(
        currentURL
      )}&redirect_uri=${encodeURIComponent(
        currentURL
      )}&display=popup&quote=${encodeURIComponent(message)}`;

      // Open Facebook Messenger with pre-filled message
      window.open(messengerUrl, '_blank');
    } else if (item.name == 'Whatsapp') {
      const message = `Check out this product: ${this.productdetails.name}%0A%0ADescription: ${this.productdetails.information}%0A%0AYou can find more information about it at the following link: ${currentURL}`;

      // Construct WhatsApp URL
      const whatsappUrl = `https://wa.me/?text=${message}`;
      // Open WhatsApp with pre-filled message
      window.open(whatsappUrl, '_blank');
    }
  }

  getVariantsById(id) {
    console.log(this.productdetails, 'DETAILS');

    const matchedObject = this.productdetails.price_details.find(
      (obj) => obj._id === id
    );
    if (matchedObject) {
      const variants = matchedObject.attributes.map((attr) => ({
        name: attr.chaild_name,
        _id: attr.parrent_id,
      }));
      return variants;
    } else {
      return null; // Or handle the case where the ID is not found
    }
  }

  getProductDetails() {
    console.log(this.product_id, 'in getproductdetaill');

    let idObj = {
      product_id: this.product_id,
    } as any;
    if (this.product_slug) {
      idObj.slug = this.product_slug;
    }
    if (this.product_id && !this.product_slug) {
      idObj.product_id = this.product_id;
    }
    if (this.userId) {
      idObj.user_id = this.userId;
      this.buynow = true;
    } else {
      let serveykey = sessionStorage.getItem('serverKey');
      idObj.user_id = serveykey;

    }
    console.log(idObj, 'idOsafffbj');
    this.apiService
      .CommonApi(
        Apiconfig.productDetailsGet.method,
        Apiconfig.productDetailsGet.url,
        idObj
      )
      .subscribe((result) => {
        console.log(result, 'this product will come hereee');

        this.product_Details = result.response;
        console.log(
          this.product_Details,
          'this.product_Detailsthis.product_Detailsthis.product_Details'
        );

        this.price_Details = result.response.price_details;
        let data = {} as any;
        data.rcat_id = this.product_Details.rcat_id;
        data._id = this.product_Details._id;
        //  this.recommendedProduct(data)
        if (result && result.status) {
          // this.apiService.CommonApi(Apiconfig.recommendProducts.method,Apiconfig.recommendProducts.url,data)
          //   .subscribe((result) => {
          //     console.log(result, "resultresultresultresultresultresultresultresult");
          //     if (result && result.data && result.data.status == true) {
          //       this.recommendedArray = result.data.doc
          //       console.log(this.recommendedArray, "this.recommendedArraythis.recommendedArraythis.recommendedArray");

          //     }

          //   })

          // session storage
          this.storedSelectionInfo = sessionStorage.getItem('selectionInfo');
          console.log(
            this.storedSelectionInfo,
            'this.storedSelectionInfothis.storedSelectionInfo'
          );

          if (this.storedSelectionInfo) {
            this.selectionInfo = JSON.parse(this.storedSelectionInfo);
            console.log(this.selectionInfo.selectedIndex, 'selectionInfo');
            console.log(this.selectionInfo.selectedAttributeId, 'uuuuuuuuuu');
          }

          if (
            this.selectionInfo &&
            this.selectionInfo.selectedAttributeId &&
            this.reloadaction !== 1
          ) {
            console.log(
              this.selectionInfo.selectedIndex,
              'selectionInsssssssfo'
            );
            console.log(
              this.selectionInfo.selectedAttributeId,
              'uuuuuuuuussssssu'
            );
            this.i = this.selectionInfo.selectedIndex;
            console.log(this.i, 'sssssssss');

            this.initialarr = {
              name: this.price_Details[this.i]?.attributes[0].chaild_name,
              attributes: this.price_Details[this.i]?.attributes,
              isSelected: true,
              _id: this.price_Details[this.i]?.attributes[0].chaild_id,
            };
          } else {
            this.initialarr = {
              name: this.price_Details[0].attributes[0].chaild_name,
              attributes: this.price_Details[0].attributes,
              isSelected: true,
              _id: this.price_Details[0].attributes[0].chaild_id,
            };
          }
          console.log(this.initialarr, '455555555555555555555');

          for (
            let i = 0;
            i < this.productdetails.variants[0].units.length;
            i++
          ) {
            console.log(
              this.productdetails.variants[0].units[i]._id,
              'this.initialarr._id'
            );
            console.log(
              this.initialarr._id,
              'this.initialarr._idthis.initialarr._id'
            );

            if (
              this.productdetails.variants[0].units[i]._id ==
              this.initialarr._id
            ) {
              console.log(
                this.productdetails.variants[0].units[i],
                'asfhafjkas'
              );

              console.log(
                this.productdetails.variants[0].units[i].isSelected,
                'safkhasfhasf'
              );

              this.productdetails.variants[0].units[i].isSelected = true;
            }
          }

          console.log(this.initialarr, 'this.initialarr');

          console.log(this.co, 'this.co in the ng onitagasg ');
          setTimeout(() => {
            this.processArray(this.priceDetails[0].attributes[0].chaild_name);
            this.onPriceDetailChange(this.initialarr);
          }, 100);

        }
      });
  }

  recommendedProduct(data: any) {
    //recommendProducts
    console.log(data, 'dataaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    this.apiService
      .CommonApi(
        Apiconfig.recommendProducts.method,
        Apiconfig.recommendProducts.url,
        data
      )
      .subscribe((result) => {
        console.log(result, 'resultresultresultresultresultresultresultresult');
        if (result && result.data && result.data.status == true) {
          this.recommendedArray = result.data.doc;
          console.log(
            this.recommendedArray,
            'this.recommendedArraythis.recommendedArraythis.recommendedArray'
          );
        }
      });
  }

  getProdutDetail() {
    // window.location.reload()
    console.log('hiii');
    console.log(this.product_slug, 'product_slug');

    var idObj = {
      product_id: this.product_id,
    } as any;
    if (this.product_slug) {
      idObj.slug = this.product_slug;
    }
    if (this.product_id && !this.product_slug) {
      idObj.product_id = this.product_id;
    }
    if (this.userId) {
      idObj.user_id = this.userId;
      this.buynow = true;
    }else {
      let serveykey = sessionStorage.getItem('serverKey');
      idObj.user_id = serveykey;

    }
    console.log(idObj, 'idObj');
    this.apiService
      .CommonApi(
        Apiconfig.productDetailsGet.method,
        Apiconfig.productDetailsGet.url,
        idObj
      )
      .subscribe((result) => {
        console.log(result, 'this is the result producttt');
        this.productDetailss = result.response;
        this.priceDetails = result.response.price_details;
        this.productInfo = result.response;
        console.log(this.productInfo, 'pricedetailss');

        if (result && result.status) {
         
          this.productdetails = result.response;

          this.favicon = this.productdetails.favourite
          this.priceDetails = result.response.price_details;
          const keywordsArray = this.productdetails.meta.meta_keyword;
          const keywordsString = keywordsArray.join(', '); // Convert to comma-separated string

          // Set the page title
          this.titleService.setTitle(this.productdetails.meta.meta_title);

          // Add meta tags
          // this.metaService.addTags([
          //   {
          //     name: 'description',
          //     content: this.productdetails.meta.meta_description,
          //   },
          //   { name: 'keywords', content: keywordsString }, // Use the converted string
          //   { name: 'author', content: 'Pillais' },
          //   {
          //     property: 'og:title',
          //     content: this.productdetails.meta.meta_title,
          //   },
          //   {
          //     property: 'og:description',
          //     content: this.productdetails.meta.meta_description,
          //   },
          //   // { property: 'og:type', content: 'website' },
          // ]);

          this.metaService.updateTag({
            name: 'description',
            content: this.productdetails.meta.meta_description,
          });
          this.metaService.updateTag({
            name: 'keywords',
            content: keywordsString, // Use the converted string
          });
          // this.metaService.updateTag({
          //   name: 'author',
          //   content: 'Pillais',
          // });
          this.metaService.updateTag({
            property: 'og:title',
            content: this.productdetails.meta.meta_title,
          });
          this.metaService.updateTag({
            property: 'og:description',
            content: this.productdetails.meta.meta_description,
          });
          this.metaService.updateTag({ property: 'og:image', content: (this.environment.apiUrl + this.productdetails.avatar.webpImg) });

          this.metaService.updateTag({ property: 'og:url', content: window.location.href });
          const product = {
            name: this.productdetails.name,
            image: this.environment.apiUrl + this.productdetails.avatar.webpImg,
            description: this.productdetails.meta.meta_description,
            price: this.productdetails.sale_price,
            currency: 'INR',
            url: window.location.href
          };
          const script = this.renderer.createElement('script');
          script.type = 'application/ld+json';
          script.text = JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": product.image,
            "description": product.description,
            "offers": {
              "@type": "Offer",
              "priceCurrency": product.currency,
              "price": product.price,
              "url": product.url,
              "itemCondition": "https://schema.org/NewCondition",
              "availability": "https://schema.org/InStock"
            }
          });

          this.renderer.appendChild(document.head, script);
          // }
          // this.productdetails.price_details.forEach(detail => {

          //   this.attribute = detail.attributes[0];
          //   console.log(this.attribute, 'aaaaaaaaaaa');

          //   this.unit = this.productdetails.variants[0].units.find(unit => unit._id === this.attribute.chaild_id);

          //   console.log('unittt', this.unit);
          //   if (this.unit) {
          //     console.log(this.attribute, 'aaaaaaaawwwwwwwwwwwaaa');
          //     this.unit.image = this.attribute && this.attribute.image;
          //     console.log(this.attribute && this.attribute != undefined && this.attribute.image, "this.unit.image");

          //     this.unit.mprice = this.attribute.mprice;
          //     this.unit.quantity = this.attribute.quantity;
          //     this.unit.sprice = this.attribute.sprice;
          //   }

          // });
          for (let i = 0; i < this.productdetails.price_details.length; i++) {
            this.attribute = this.productdetails.price_details[i].attributes[0];
            console.log('Processing attribute:', this.attribute);

            this.unit = this.productdetails.variants[0].units.find(
              (unit) => unit._id === this.attribute.chaild_id
            );
            console.log('Found unit:', this.unit);

            if (this.unit && this.attribute) {
              this.unit.attributes = this.attribute;
            }

            // this.pervariant = (this.unit.attribute.sprice / this.variantnumber);
            // console.log(this.pervariant, 'pervariant');
          }

          // this.isAttributeIncluded = this.productdetails.attributes.some(attr => attr.variations[0][0].chaild_id.includes(attr));

          // console.log(this.isAttributeIncluded,'isattributeincludeddd');

          for (
            let i = 0;
            i < this.productdetails.variants[0].units.length;
            i++
          ) {
            let unit = this.productdetails.variants[0].units[i];

            let matches = unit.name.match(/^(\d+)(\D+)$/);

            if (matches) {
              let variantnumber = parseInt(matches[1]);
              let variantunit = matches[2];

              console.log('Numeric part:', variantnumber);
              console.log('Unit:', variantunit);

              if (unit.attributes && unit.attributes.sprice) {
                let perKgValue = unit.attributes.sprice / variantnumber;
                console.log('Per kg value:', perKgValue);

                unit.perKgValue = perKgValue;
              } else {
                console.log('No sprice attribute found for unit:', unit.name);
              }

              unit.variantnumber = variantnumber;
              unit.variantunit = variantunit;
            } else {
              console.log('No match found for unit name:', unit.name);
            }
          }

          // for (let i = 0; i < this.productdetails.variants[0].units.length; i++) {
          //   let unit = this.productdetails.variants[0].units[i];

          //   let matches = unit.name.match(/^(\d+)(\D+)$/);

          //   if (matches) {
          //     let variantnumber = parseInt(matches[1]);
          //     let variantunit = matches[2];

          //     console.log("Numeric part:", variantnumber);
          //     console.log("Unit:", variantunit);

          //     unit.variantnumber = variantnumber;
          //     unit.variantunit = variantunit;
          //   } else {
          //     console.log("No match found for unit name:", unit.name);
          //   }

          // }

          console.log('productDeteials13', this.productdetails);
          this.productdetails.price_details;
          this.product_id = this.productdetails._id;
          this.rcat = this.productdetails.rcategory;
          if (this.productdetails.scategory) {
            this.scat = this.productdetails.scategory;
          }
          this.getRatingList();

          this.relatedCatProducts();
          // Initialize variantDetails array with null values
          console.log(this.variantDetails, 'this.variantDetails');
          if (this.variantDetails && this.variantDetails.length == 0) {
            if (this.productdetails.variants) {
              this.variantDetails = Array(
                this.productdetails.variants.length
              ).fill(null);
            }
          }
          this.product_img = this.productdetails.avatar;
          this.showproduct = true;
          if (
            this.productdetails.size_status == 2 &&
            this.productdetails.quantity < 1
          ) {
            this.isOutOfStock = true;
          }
          this.sizeStatus = true;
          this.quantity_products = this.productdetails.price_details.map(
            (item) => ({
              _id: item._id,
              quantity: item.quantity,
              name: item.attributes[0].chaild_name,
              attri_name: item.attributes[0].attri_name,
              image: item.image,
              mprice: item.mprice,
              sprice: item.sprice,
            })
          );

          this.variationLength =
            this.productdetails.price_details[0].attributes.length;
          // setting product price details into attributes
          for (let i = 0; i < this.productdetails.price_details.length; i++) {
            for (let j = 0; j < this.variationLength; j++) {
              // this.productdetails.price_details[i].attributes[j].push(this.productdetails.price_details[i].mprice);
              // this.productdetails.price_details[i].attributes[j].push(this.productdetails.price_details[i].sprice);
              // console.log(this.productdetails.price_details[i].mprice, 'this.productdetails.price_details[i].mprice');
              this.productdetails.price_details[i].attributes[j].mprice =
                this.productdetails.price_details[i].mprice;
              this.productdetails.price_details[i].attributes[j].sprice =
                this.productdetails.price_details[i].sprice;
              this.productdetails.price_details[i].attributes[j].image =
                this.productdetails.price_details[i].image;
              this.productdetails.price_details[i].attributes[j].quantity =
                this.productdetails.price_details[i].quantity;
              this.variant1obj.push(
                this.productdetails.price_details[i].attributes
              );
            }
          }
          console.log(this.variant1obj, 'variant1wrw');

          // // variants initial list

          // for (let i = 0; i < this.productdetails.variants[0].units.length; i++) {
          //   this.variant1Listinitial.push(this.productdetails.variants[0].units[i].name);
          // }

          // for (let i = 0; i < this.productdetails.variants[1].units.length; i++) {
          //   this.variant2Listinitial.push(this.productdetails.variants[1].units[i].name);
          // }
          // // combination select
          // for (let i = 0; i < this.productdetails.price_details.length; i++) {
          //   for (let j = 0; j < this.productdetails.price_details[i].attributes.length; j++) {
          //     const chaildName = this.productdetails.price_details[i].attributes[j].chaild_name;

          //     if (chaildName) {
          //       console.log(chaildName, 'pdpgosdn');
          //       this.a.push(chaildName);
          //     }
          //   }
          //   console.log(this.productdetails.price_details[i].attributes.length, 'this.productewtweDetailsthis.productDetails');
          // }

          // console.log(this.a, 'a value');

          //
          if (
            this.productdetails &&
            this.productdetails.size_status == 1 &&
            this.productdetails.quantity_size.length > 0
          ) {
            var orderSize = this.productdetails.quantity_size.filter((e) => {
              return e.quantity != 0;
            });
            // for (let index = 0; index < this.productdetails.size.length; index++) {
            //   const element = this.productdetails.size[index];
            //   switch (element) {
            //       case 'S':
            //       orderSize.push('S')
            //           break;
            //       case 'M':
            //       orderSize.push('M')
            //           break;
            //       case 'L':
            //       orderSize.push('L')
            //           break;
            //       case 'XL':
            //       orderSize.push('XL')
            //           break;
            //       case 'XXL':
            //       orderSize.push('XXL')
            //           break;
            //       case 'XXXL':
            //       orderSize.push('XXXL')
            //           break;

            //       default:
            //           break;
            //   }
            // }
            // this.productdetails.size = orderSize;
            this.default_size =
              orderSize && orderSize.length > 0 ? orderSize[0].size : '';
          }
          if (this.selectedVariantId) {
            const variant = this.getVariantsById(this.selectedVariantId);
            console.log(variant, 'VARIANT');
            this.variantParams = variant;
          }
          this.recentVisit();
          this.product = true;
          setTimeout(() => {
            this.chacngSize(this.productdetails._id);
          }, 200);

          // Method-params variant and quantity
          // this.priceDetails.forEach((result) => {
          //   if (result.attributes[0].chaild_name == this.variant_params) {
          //     console.log('hi its working fine');

          //     this.initialarr = {
          //       name: result.attributes[0].chaild_name,
          //       attributes: result.attributes,
          //       isSelected: true,
          //       _id: result.attributes[0].chaild_id
          //     };
          //     // this.onPriceDetailChange(this.initialarr);
          //   }
          // })

          // console.log(typeof (this.priceDetails[0].attributes[0].chaild_name), 'this.priceDetails[0].attributes[0].chaild_name');

          // // rating and reviews
          //         this.apiService
          //         .CommonApi(
          //           Apiconfig.reviewsRatingList.method,
          //           Apiconfig.reviewsRatingList.url,
          //           idObj
          //         )
          //         .subscribe((result) => {
          //         })
        }

        // console.log(this.priceDetails[0], 'this.priceDetailsthis.priceDetails');

        // console.log(this.priceDetails[0].attributes[0].chaild_name, 'this.priceDetails[0].attributes[0].chaild_name');
      });
    setTimeout(() => {

      this.fetchCartDetails()
    }, 100);
    // this.getCartDetails()
  }


  getAlternativeNames(alternativeNames: string[]): string {
    return alternativeNames.join(', ');
  }


  isSelected(variantParam: any, itemId: string): boolean {
    console.log(variantParam, 'variantParam1');
    console.log(itemId, 'itemId');
    console.log(variantParam && variantParam._id === itemId);

    return variantParam && variantParam._id === itemId;
  }



  share(template: TemplateRef<any>) {
    this.modalRefOtp = this.modalService.show(template, {
      id: 1,
      class: 'verifyotp-model',
      ignoreBackdropClick: false,
    });
  }


  relatedCatProducts() {
    var obj = {
      rcat: this.rcat,
      limit: 5,
      skip: 0,
      rand: 1,
    } as any;
    if (this.scat) {
      obj.scat = this.scat;
    }

    this.apiService
      .CommonApi(
        Apiconfig.relatedProductList.method,
        Apiconfig.relatedProductList.url,
        obj
      )
      .subscribe((res) => {
        if (res && res.status == 1) {
          this.related_product = res.productlist ? res.productlist : [];
        }
      });
  }


  rating_model(template: any, images, index, id) {
    console.log('index', index);
    if (images && Array.isArray(images) && images.length > 0) {
      this.ratingImageList = images;
    }
    this.selectedImage = index;
    if (id) {
      this.ratingList.filter((x) => {
        if (x._id == id) {
          this.selectedRatingData = x;
          this.ratingStar = x.rating;
        }
      });
      this.ratingStarArray = Array(this.ratingStar).fill(0);
      let nonrating_star = 5 - parseInt(this.ratingStar);
      this.nonRatingStarArray = Array(nonrating_star).fill(0);
      // console.log(this.selectedRatingData, this.ratingStarArray, this.nonRatingStarArray, " this.selectedRatingData")
    }
    this.modalRef = this.modalService.show(template, {
      class: 'rating-rev-mdl',
    });
    // setTimeout(() => {
    //   this.slickModal.slickGoTo(2)
    // }, 3000);
  }


  recentVisit() {
    if (this.product_id && this.productdetails) {
      var visit = {} as any;
      visit.product_id = this.product_id;
      visit.user_id = '';
      visit.type = '';
      if (this.userId) {
        visit.user_id = this.userId;
        visit.type = 'recently_visit';
      } else {
        var user_key = localStorage.getItem('user_key');
        if (user_key) {
          visit.user_id = user_key;
          visit.type = 'recent_temp_visit';
        }
      }
      if (visit.user_id != '' && visit.type != '') {
        this.apiService
          .CommonApi(
            Apiconfig.addRecentVisit.method,
            Apiconfig.addRecentVisit.url,
            visit
          )
          .subscribe((result) => {
            if (result && result.status == 1) {
              this.getRecentlyData();
            } else {
              this.getRecentlyData();
            }
          });
      }
    }
  }

  getRecentlyData() {
    var userdata = {} as any;
    if (this.userId) {
      userdata.user_id = this.userId;
      userdata.type = 'recently_visit';
      userdata.prod;
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
        if (result && result.status && result.data) {
          this.recentlyVistProd = result.data ? result.data : [];
          var dat = new Object(this.recentlyVistProd);
          console.log(this.recentlyVistProd, 'recent veiew');

          // this.recentlyVistProd.price_details.forEach((x) => {
          //   console.log(x.quantity, 'quantity000000000000000000000');

          //   if (x.quantity < 1) {
          //     this.isOutOfStock_recentview = true;
          //   }
          //   if (x.quantity > 1) {
          //     this.isOutOfStock_recentview = false;
          //   }
          // });
          this.recentlyVistProd.reverse();
        }
      });
    // var ids = idDoc;
    // var obid = new Object(ids)
    // this.apiService.CommonApi(Apiconfig.recentlyVisit.method, Apiconfig.recentlyVisit.url,{idDoc: ids.reverse()}).subscribe(result=>{
    //   if(result && result.status){
    //     this.recentlyVistProd = result.data ? result.data: [];

    //   }
    // })
  }

  chacngSize(id) {
    if (!this.viecart && !this.viecheckout) {
      if (
        this.cartDetails &&
        this.cartDetails.cart_details &&
        this.cartDetails.cart_details.length > 0
      ) {
        this.cartDetails.cart_details.forEach((cart) => {
          if (id == cart.id && !this.cart_id) {
            this.default_size = cart.size;
          }
        });
      }
    }
  }

  variant_change(parrent, chaild, index) {
    this.variant_details = chaild;
    console.log(parrent, chaild);
    console.log('parrent', 'chaild');

    //
    let selected_array = [];
    if (parrent && chaild) {
      if (
        this.productdetails &&
        Array.isArray(this.productdetails.price_details) &&
        this.productdetails.price_details.length > 0
      ) {
        let prnt_check = this.selected_parents.indexOf(parrent);
        if (prnt_check != -1) {
          this.selected_attr[prnt_check] = chaild;
        } else {
          this.selected_attr.push(chaild);
          this.selected_parents.push(parrent);
        }
        for (
          let index = 0;
          index < this.productdetails.price_details.length;
          index++
        ) {
          let check_indx =
            this.productdetails.price_details[index].attribute_ids.indexOf(
              chaild
            );
          if (check_indx != -1) {
            this.productdetails.price_details[index].attribute_ids.map((x) => {
              if (selected_array.indexOf(x) === -1) {
                selected_array.push(x);
              }
            });
          }
        }
      }
    }
    this.selected_atr_ids = selected_array;
    let check_attri = false;
    if (
      this.productdetails &&
      Array.isArray(this.productdetails.price_details) &&
      this.productdetails.price_details.length > 0
    ) {
      // for (let index = 0; index < this.selected_attr.length; index++) {
      this.productdetails.price_details.map((x) => {
        let count_attr = 0;
        for (let index = 0; index < x.attribute_ids.length; index++) {
          if (this.selected_attr.indexOf(x.attribute_ids[index]) != -1) {
            count_attr += 1;
          }
        }
        console.log('XXXXXXXXXXXXXXXXXXX', x);
        if (count_attr === x.attribute_ids.length && !check_attri) {
          check_attri = true;
          this.productdetails.base_price = x.mprice;
          this.productdetails.sale_price = x.sprice;
          this.quantity_details = x;
          this.product_img = x.image;
          this.route.navigate([`/products/${this.product_slug}`], {
            queryParams: { variant: x._id },
          });
          if (x.quantity < 1) {
            this.isOutOfStock = true;
          }
          if (x.quantity > 1) {
            this.isOutOfStock = false;
          }
        }
      });
      // }
    }
    this.confirm_attri = check_attri;
    console.log(
      this.productdetails.size_status,
      'this.productdetails.size_status'
    );

    if (
      this.productdetails.variants.length === this.selected_attr.length &&
      !this.confirm_attri &&
      this.productdetails.size_status === 1
    ) {
      this.notifyService.showError('Sorry combination not exists');
    }
    // for (let index = 0; index < this.selected_attr.length; index++) {
    //     let check_indx =
    // }
    if (this.variants.length > 0) {
      var i = 0;
      for (var iterator of this.variants) {
        if (iterator.parrent_id !== parrent) {
          i++;
        } else {
          iterator.chaild_id = chaild;
        }
      }
      if (i == this.variants.length) {
        this.variants.push({ parrent_id: parrent, chaild_id: chaild });
      }
    } else {
      this.variants.push({ parrent_id: parrent, chaild_id: chaild });
    }

    // if (this.productdetails && this.productdetails.price_details.length > 0) {
    //   var l = 0;
    //   for (var value of this.productdetails.price_details) {
    //     var k = 0;
    //     let check_atr = value.parent_ids.indexOf(parrent);
    //     if(check_atr)
    //     this.variants.forEach((e) => {
    //       if (value.attributes) {
    //         var exits = value.attributes.some(
    //           (attri) => attri.chaild_id === e.chaild_id
    //         );
    //         if (exits == true) {
    //           k++;
    //         }
    //       }
    //     });
    //     if (k === this.variants.length) {
    // this.productdetails.base_price = value.mprice;
    // this.productdetails.sale_price = value.sprice;
    // this.quantity_details = value;
    // this.product_img = value.image;
    // if (value.quantity < 1) {
    //   this.isOutOfStock = true;
    // }
    // if (value.quantity > 1) {
    //   this.isOutOfStock = false;
    // }
    //       // var quantity = parseInt(value.quantity)
    //       // this.quantity_details = {...this.quantity_details, quantity};
    //       this.readonly = false;
    //       break;
    //     } else {
    //       l++;
    //     }
    //   }
    //   if (l === this.productdetails.price_details.length) {
    //     this.notifyService.showError('Sorry combination not exists');
    //     this.readonly = true;
    //   }
    // }
  }
  preAddCarts(product, action): void {
    console.log(product, '..///////////');

    console.log(this.variantitem, 'itemsaaasasassssssssss');

    // console.log(product.variants[0].units[i].attributes.chaild_id, 'sssssscehkcc');

    this.selectedItemId = product._id;

    if (
      typeof this.quantity_details.noquant == 'undefined' ||
      this.quantity_details.noquant == 0 ||
      this.quantity_details.noquant == 1
    ) {
      console.log('16371637', this.quantity_details.noquant);

      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };

      console.log('1648 this.quantity_details 1648', this.quantity_details);

      this.addToCart(product, this.quantity_details);
    }
  }

  preAddCart(product, action) {
    // console.log(
    //   this.productdetails.size_status,
    //   'this.productdetails.size_status'
    // );
    console.log(this.productdetails, 'productdetail@#$');
    console.log(this.productdetails.price_details, 'priceDetails');
    console.log(this.productdetails.price_details.length, 'length');
    console.log(this.productdetails.size_status, 'size_status');

    if (
      this.selectedArray.length > 0 &&
      this.filteredData.length === 0 &&
      this.chaildNames.length === 0 &&
      this.possibleFilteredData.length === 0
    ) {
      return this.notifyService.showError('Sorry combination not exists');
    } else if (
      this.productdetails &&
      this.productdetails.price_details &&
      Array.isArray(this.productdetails.price_details) &&
      this.productdetails.price_details.length > 0 &&
      // this.selected_attr.length === 0 &&
      this.filteredData.length === 0 &&
      this.productdetails.size_status === 1
    ) {
      return this.notifyService.showError('Select a varient');
    } else if (this.variationLength == 2 && this.selectedArray.length === 1) {
      if (this.selectedArray.length < 2) {
        return this.notifyService.showError('Select both variants');
      }
    }

    console.log(
      this.quantity_details.noquant,
      'this.quantity_details.noquantthis.quantity_details.noquant'
    );
    // else if (
    //   this.productdetails.variants.length === this.selected_attr.length &&
    //   !this.confirm_attri &&
    //   this.productdetails.size_status === 1
    // ) {
    //   return this.notifyService.showError('Sorry combination not exists');
    // }
    if (
      typeof this.quantity_details.noquant == 'undefined' ||
      this.quantity_details.noquant == 0 ||
      this.quantity_details.noquant == 1
    ) {
      var noquant = 1;
      this.quantity_details = { ...this.quantity_details, noquant };
      this.addToCart(product, this.quantity_details);
    }
    if (action == 'increement' && this.quantity_details.noquant < 20) {
      console.log(this.quantity_details.noquant, 'check increement quantity');

      this.quantity_details.noquant = ++this.quantity_details.noquant;
      this.changeCart(product, action);
    }
    if (action == 'decreement' && this.quantity_details.noquant >= 0) {
      this.quantity_details.noquant = --this.quantity_details.noquant || 0;
      this.changeCart(product, action);
    }
  }

  addToCart(productdetails, variant) {
    console.log(this.variantitem, 'itemsaaasasassssssssss');
    console.log(productdetails, 'iiii');

    var data = {} as any;
    let attr: any = {};
    data.foodId = productdetails._id;
    data.foodname = productdetails.name;
    data.rcat_id = productdetails.rcat_id;
    data.scat_id = productdetails.scat_id;
    data.mprice = productdetails.base_price;
    data.psprice = productdetails.sale_price;
    data.size_status = productdetails.size_status;

    attr.attribute_ids = this.variantitem._id;

    attr.image = this.variantitem.attributes.image;
    attr.mprice = this.variantitem.attributes.mprice;
    attr.sprice = this.variantitem.attributes.sprice;
    attr.sku = this.filteredVariants.sku;
    attr.quantity = this.variantitem.attributes.quantity;

    console.log('1744', this.variantitem.attributes.length);
    console.log('1745', typeof this.variantitem.attributes);

    if (
      this.variantitem.attributes.length &&
      this.variantitem.attributes.length >= 1
    ) {
      this.variantitem.attributes = this.variantitem.attributes[0];
    }

    attr.attri_name = this.variantitem.attributes.attri_name;
    attr.chaild_id = this.variantitem.attributes.chaild_id;
    attr.chaild_name = this.variantitem.attributes.chaild_name;

    attr.parrent_id = this.variantitem.attributes.parrent_id;
    data.variations = [[attr]];

    // data.size = product.size_status == 1 ? product.filterSize[0].size : "None";
    data.addons_quantity = variant.noquant;
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
    console.log(data, 'hhhhhhhhhhhhar');

    if (data.userId != '') {
      this.socketService
        .socketCall('r2e_add_to_cart', data)
        .subscribe((result) => {
          console.log('1771 1771 resultresultresultresultresult', result);
          if (result && result.err == 0) {
            console.log(result, 'carttt resulltt');
            // window.location.reload();
            // // this.route.navigate(['/cart']);

            this.reloadaction = 2;
            this.getCartDetails();
            var data = {
              page: 'product',
            };
            this.apiService.realoadFunction({ data: data });
            this.cartToggle = false;
            this.store.cartdetails.next(this.cartDetails);
            this.ngOnInit();
            // this.cdr.detectChanges();
            // setTimeout(() => {

            // }, 200);
          } else {
            console.log('Something went wrong');
          }
          // else{
          //   this.notifyService.showError(result.message || 'Somthing went wrong')
          // }
        });
    }
  }
  addToCarts(product, variant) {
    var variants = [];
    console.log(this.productdetails, 'this.productdetails.size_status');

    if (
      this.selectedArray.length > 0 &&
      this.filteredData.length === 0 &&
      this.chaildNames.length === 0 &&
      this.possibleFilteredData.length === 0
    ) {
      return this.notifyService.showError('Sorry combination not exists');
    } else if (
      this.productdetails &&
      this.productdetails.price_details &&
      Array.isArray(this.productdetails.price_details) &&
      this.productdetails.price_details.length > 0 &&
      // this.selected_attr.length === 0 &&
      this.filteredData.length === 0 &&
      this.productdetails.size_status === 1
    ) {
      return this.notifyService.showError('Select a varient');
    } else if (this.variationLength == 2) {
      if (this.selectedArray.length < 2) {
        return this.notifyService.showError('Select both variants');
      }
    }

    //  else if (
    //   this.productdetails.variants.length === this.selected_attr.length &&
    //   !this.confirm_attri &&
    //   this.productdetails.size_status === 1
    // ) {
    //   return this.notifyService.showError('Sorry combination not exists');
    // }
    // if (
    //   this.variant_details == null ||
    //   this.variant_details == undefined ||
    //   this.variant_details.length < 1 ||
    //   this.variant_details == 'select varient'
    // ) {
    //   return this.notifyService.showError('Select a varient');
    // }

    // if (variant && variant.attributes.length > 0) {
    //   variant.attributes.forEach(function (value) {
    //     variants.push(value.chaild_name);
    //   });
    // }
    var data = {} as any;
    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcat_id;
    data.scat_id = product.scat_id;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    // data.variations = variants;
    data.variations = this.filteredData;
    data.size_status = product.size_status;
    data.size = product.size_status == 1 ? product.filterSize[0] : 'None';
    data.addons_quantity = variant.noquant;
    data.userId = '';

    // if (
    //   this.variant_details != null ||
    //   this.variant_details != undefined ||
    //   this.variant_details.length >= 1
    // ) {
    //   data.varientId = this.variant_details;
    // }
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
            this.route.navigate(['/cart']);
            var data = {
              page: 'register',
            };
            // this.apiService.realoadFunction({ data: data });
            // setTimeout(() => {

            //   this.getCartDetails();
            // }, 200);
          } else {
            this.notifyService.showError(
              result.message || 'Somthing went wrong'
            );
          }
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
    // console.log(product, 'iiii');
    // console.log(variant, 'avariant');

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
            this.getCartDetails();
            var data = {
              page: '',
            };
            this.apiService.realoadFunction({ data: data });
            // this.hideAddToCartButton(product_id, remId);

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

 toggleFaq(index: number): void {
  // Toggle the open state of the clicked accordion
  this.openFaqs[index] = !this.openFaqs[index];
}

  zoom(event: MouseEvent) {
    this.isZoomVisible = true;

    const img = event.target as HTMLImageElement;
    const rect = img.getBoundingClientRect();

    // Calculate the mouse position relative to the image
    const xPercent = ((event.clientX - rect.left) / img.width) * 100;
    const yPercent = ((event.clientY - rect.top) / img.height) * 100;

    // Set the zoom position based on where the mouse is hovering
    this.zoomPosition = `${xPercent}% ${yPercent}%`;
  }

  // Function to hide the zoomed image when the mouse leaves the main image
  hideZoom() {
    this.isZoomVisible = false;
  }
  addCartRecent(product, variant) {
    var data = {} as any;
    data.apikey = 'Yes';
    data.foodId = product.product_id;
    data.foodname = product.name;
    data.rcat_id = product.rcategory;
    if (product.scategory) {
      data.scat_id = product.scategory;
    }
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    data.size_status = product.size_status;
    data.size = product.size_status == 1 ? product.filterSize[0].size : 'None';
    data.addons_quantity = 1;
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
            this.route.navigate(['/cart']);
            var data = {
              page: 'register',
            };
            this.apiService.realoadFunction({ data: data });
            // setTimeout(() => {

            //   this.getCartDetails();
            // }, 200);
          }
          // else{
          //   this.notifyService.showError(result.message || 'Somthing went wrong')
          // }
        });
    }
  }

  addToProdcutCart(product, variant) {
    console.log(
      this.productdetails.size_status,
      'this.productdetails.size_status'
    );
    if (
      this.productdetails &&
      this.productdetails.price_details &&
      Array.isArray(this.productdetails.price_details) &&
      this.productdetails.price_details.length > 0 &&
      this.selected_attr.length === 0 &&
      this.productdetails.size_status === 1
    ) {
      return this.notifyService.showError('Select a varient');
    } else if (
      this.productdetails.variants.length === this.selected_attr.length &&
      !this.confirm_attri &&
      this.productdetails.size_status === 1
    ) {
      return this.notifyService.showError('Sorry combination not exists');
    }
    var variants = [];

    // if(variant && variant.attributes.length > 0){
    // 	variant.attributes.forEach(function (value) {
    // 		variants.push(value.chaild_name);
    // 	});
    // }

    var data = {} as any;
    data.apikey = 'Yes';
    data.foodId = product._id;
    data.foodname = product.name;
    data.rcat_id = product.rcat_id;
    data.scat_id = product.scat_id;
    data.mprice = product.base_price;
    data.psprice = product.sale_price;
    data.size_status = product.size_status;
    data.size =
      product.size_status == 1
        ? this.default_size
          ? this.default_size
          : this.productdetails.filterSize[0]
        : 'None';
    data.addons_quantity = 1;
    data.userId = '';

    if (
      this.default_size === '' &&
      this.productdetails.price_details.length > 0 &&
      this.productdetails.size_status === 1
    ) {
      return this.notifyService.showError('Select a varient');
    }
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
            this.route.navigate(['/cart']);
            var data = {
              page: 'register',
            };
            this.apiService.realoadFunction({ data: data });
            // setTimeout(() => {

            //   this.getCartDetails();
            // }, 200);
          }
          if (result.err === 1) {
            this.notifyService.showError(
              result.message || 'Somthing went wrong'
            );
          }
          // else{
          //   this.notifyService.showError(result.message || 'Somthing went wrong')
          // }
        });
    }
  }
  onPriceDetailChange(item: any, index?) {
    console.log('2194 :item._id 2194', item, this.productdetails);

    this.selectedUnitId = item._id;
    // this.chalidId = item.attributes[0].chaild_id
    
    // Set isSelected flag for the corresponding unit
    this.productdetails.variants[0].units.forEach((unit) => {
      unit.isSelected = unit._id === item._id;
    });

    let res;
    console.log(this.co, 'uin casds');

    if (this.co === undefined) {
      this.matchtrue = false;
      this.cartbutton = true;
    } else {
      res = this.co.filter((x) => x.variations[0][0].chaild_id === item._id);
    }

    console.log('-----------------------------------------');
    console.log(res);
    console.log('************************************');

    this.matchtrue = res && res.length > 0;
    this.cartbutton = !this.matchtrue;

    console.log(this.matchtrue, 'mmmmmm');

    this.variantitem = item;
    console.log(this.variantitem, 'this.variantitemthis.variantitem');

    // Find filtered variants based on attribute id
    this.filteredVariants = this.priceDetails.filter((variant) => {
      return variant.attribute_ids.includes(item._id);
    });

    console.log(
      this.filteredVariants,
      '*ngFor="let variant of filteredVariants"'
    );

    // Get the first matching variant
    this.filteredVariant = this.filteredVariants[0];

    console.log(
      this.filteredVariant,
      '*ngFor="let variant of filteredVariants"'
    );

    if (this.filteredVariant) {
      this.filteredVariant.product_id = this.co[0]?.id;
    }

    // Find the index of the item in priceDetails array
    const selectedIndex = this.priceDetails.findIndex((variant) =>
      variant.attribute_ids.includes(item._id)
    );

    this.selectionInfo = {
      selectedIndex: selectedIndex !== -1 ? selectedIndex : 0,
      selectedAttributeId: item._id,
    };

    // Remove and set selectionInfo in session storage
    sessionStorage.removeItem('selectionInfo');
    sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));

    this.chalidId = item.attributes[0].chaild_id
    // console.log(this.chalidId,item,"chalid");
    
  }

  onPriceDetailChanges(item: any, selectedPriceDetail: any) {
    console.log(item, 'item');

    this.selectedIndex = item.price_details.findIndex(
      (price) => price === selectedPriceDetail
    );
    this.selectionInfo.selectedIndex = this.selectedIndex || 0;
    this.selectionInfo.selectedAttributeId =
      selectedPriceDetail.attribute_ids[0];
    item.selectedPriceDetail = selectedPriceDetail;

    sessionStorage.removeItem('selectionInfo');
    sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));
    item.selectedPriceDetail = selectedPriceDetail;
  }
  // changeCart(product, variant, action) {
  //   if (action == 'decreement' || action == 'increement') {
  //     if (this.cartDetails) {
  //       var data = {} as any;
  //       data.cityid = this.cartDetails.city_id;
  //       data.foodId = product._id;
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
  //               this.route.navigate(['/cart']);
  //             }
  //             // else{
  //             //   this.notifyService.showError(res.message || 'Somthing went wrong')
  //             // }
  //           });
  //       }
  //     }
  //   }
  // }

  changeCart(prod, action) {
    if (
      action == 'decreement' ||
      (action == 'increement' && prod.quantity < 20)
    ) {
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
      console.log(data, 'datadatadata');

      if (data.userId != '') {
        this.socketService
          .socketCall('r2e_change_cart_quantity', data)
          .subscribe((res) => {
            console.log(res, 'check chnge cart');

            if (res && res.err == 0) {
              this.socketService
                .socketCall('r2e_cart_details', data)
                .subscribe((result) => {
                  if (result && result.err == 0) {
                    this.cartDetails = result.cartDetails;
                    console.log('this.cartDetailsssss', this.cartDetails);
                    this.getCartDetails();
                    var data = {
                      page: 'product',
                    };
                    this.apiService.realoadFunction({ data: data });
                    // this.cartToggle = false;
                    this.store.cartdetails.next(result);
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

  fetchCartDetails() {

    let data = {} as any;
    data.userId = '';
    if (this.userId) {
      data.userId = this.userId;
      data.user_id = this.userId;

      data.type = 'cart';
    } else {
      let serveykey = sessionStorage.getItem('serverKey');
      console.log(serveykey, 'serveykeyserveykey');

      if (serveykey) {
        data.userId = serveykey;
        data.type = 'temp_cart';
      }
    }
    data.schedule_type = 0;
    console.log(data, 'data1233 in carttt');

    if (data.userId != '') {
      console.log('data.userId');

      data.client_offset = new Date().getTimezoneOffset();
      this.socketService
        .socketCall('r2e_cart_details', data)
        .subscribe((response) => {
          if (response.err == 0) {
            this.cartDetails = response.cartDetails;
            console.log(
              this.cartDetails,
              'this.cartDetailsthis.cartDetailsthis.cartDetails'
            );

            this.cart_details = this.cartDetails
              ? this.cartDetails.cart_details &&
                this.cartDetails.cart_details.length > 0
                ? this.cartDetails.cart_details.map((e) => {
                  return e.id;
                })
                : []
              : [];
            console.log(response, 'in ng ont it cart detailssss');

            const objectLength = Object.keys(response.cartDetails).length;
            console.log(objectLength, 'objectLength');

            if (objectLength > 0) {
              if (this.cartDetails && Array.isArray(this.cartDetails.cart_details)) {
                this.cart_count = this.cartDetails.cart_details.filter(
                  (item) => item.id == this.productdetails._id
                ).length;

                this.co = this.cartDetails.cart_details.filter(
                  (item) => item.id == this.productdetails._id
                );
              } else {
                // Handle the case where cartDetails is undefined or not an array
                this.cart_count = 0;
                this.co = [];
              }
            } else {
              this.cart_count = 0;
              this.co = [];

            }
            console.log(this.cart_count, 'cartcounttt');

            console.log(this.co, 'this.co in the ng onitssss');
            console.log(this.cartDetails);

            this.getProductDetails();
            this.getRecentlyData();
          }
        });
    }
  }

  changeSize(value, id) {
    var findId;
    if (this.cartDetails.cart_details != undefined) {
      this.cartDetails.cart_details.map(function (e: {
        id: any;
        cart_id: any;
      }) {
        if (e.id == id) {
          findId = e.cart_id;
          pricedetail = e;
        }
      });
    }
    this.default_size = value;

    if (this.cartDetails && findId) {
      var data = {} as any;
      var pricedetail = {} as any;
      data.foodId = id;
      data.cart_id = '';
      data.size = value;
      this.cartDetails.cart_details.map(function (e) {
        if (e.id == id) {
          data.cart_id = e.cart_id;
          pricedetail = e;
        }
      });
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
      data.quantity_type = 'size';
      if (this.cartDetails && this.cartDetails.type_status == 0) {
        data.type_status = 0;
        data.psprice = pricedetail.price;
        data.mprice = pricedetail.mprice;
        data.addons_quantity = pricedetail.quantity;
        data.rcat_id = pricedetail.rcat_id;
        data.scat_id = pricedetail.scat_id;
        data.size_status = pricedetail.size_status;
      }
      if (data.userId != '' && data.cart_id != '') {
        this.socketService
          .socketCall('r2e_change_cart_quantity', data)
          .subscribe((res) => {
            if (res && res.err == 0) {
              this.getCartDetails();
              if (this.viecart) {
                // this.route.navigate(['/cart']);
              } else if (this.viecheckout) {
                this.route.navigate(['/checkout']);
              }
            } else {
              this.notifyService.showError(
                res.message || 'Somthing went wrong'
              );
            }
          });
      }
    }
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
          console.log(response, 'redddddddddddddd');

          if (response.err == 0) {
            this.cartDetails = response.cartDetails;
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
          }
        });
    }
    // this.getTagWithProducts();
  }

  goCheckout(product, template: any) {
    console.log(
      this.productdetails.size_status,
      'this.productdetails.size_status'
    );

    if (
      this.selectedArray.length > 0 &&
      this.filteredData.length === 0 &&
      this.chaildNames.length === 0 &&
      this.possibleFilteredData.length === 0
    ) {
      return this.notifyService.showError('Sorry combination not exists');
    } else if (
      this.productdetails &&
      this.productdetails.price_details &&
      Array.isArray(this.productdetails.price_details) &&
      this.productdetails.price_details.length > 0 &&
      this.filteredData.length === 0 &&
      this.productdetails.size_status === 1
    ) {
      return this.notifyService.showError('Select a varient');
    } else if (this.variationLength == 2) {
      if (this.selectedArray.length < 2) {
        return this.notifyService.showError('Select both variants');
      }
    }

    // else if (
    //   this.productdetails.variants.length === this.selected_attr.length &&
    //   !this.confirm_attri &&
    //   this.productdetails.size_status === 1
    // ) {
    //   return this.notifyService.showError('Sorry combination not exists');
    // }
    if (this.userId) {
      // product.type_order = 'bynow';
      var obk = {
        type: 'bynow',
      };

      var variants = [];
      // if(this.variant_details==null || this.variant_details==undefined || this.variant_details.length<1 || this.variant_details=='select varient' || this.productdetails.price_details.length>0 ){
      //   return this.notifyService.showError('Select a varient');
      // }

      // if (
      //   this.productdetails.price_details.length > 0 &&
      //   (this.variant_details == null ||
      //     this.variant_details == undefined ||
      //     this.variant_details.length < 1 ||
      //     this.variant_details == 'select varient')
      // ) {
      //   return this.notifyService.showError('Select a varient');
      // }
      // const variant = this.quantity_details;
      // if (variant.attributes) {
      //   if (variant.attributes.length > 0) {
      //     variant.attributes.forEach(function (value) {
      //       variants.push(value.chaild_name);
      //     });
      //   }
      // }

      // this.route.navigate(['/checkout']);
      var data = {} as any;
      data.apikey = 'Yes';
      data.foodId = product._id;
      data.foodname = product.name;
      data.rcat_id = product.rcat_id;
      data.scat_id = product.scat_id;
      data.mprice = product.base_price;
      data.variations = this.filteredData;
      data.psprice = product.sale_price;
      data.size_status = product.size_status;
      data.size =
        product.size_status == 1
          ? this.default_size
            ? this.default_size
            : this.productdetails.filterSize[0]
          : 'None';
      // data.size = product.size_status == 1 ? this.default_size? this.default_size : this.productdetails.filterSize[0].size : "None";
      data.addons_quantity = 1;
      data.userId = this.userId;

      // if (this.productdetails.price_details.length > 0) {
      //   if (
      //     this.variant_details != null ||
      //     this.variant_details != undefined ||
      //     (this.variant_details && this.variant_details.length >= 1)
      //   ) {
      //     data.varientId = this.variant_details;
      //   }
      // }

      data.type = 'cart';
      data.type_status = 1;
      this.socketService
        .socketCall('r2e_buy_to_cart', data)
        .subscribe((result) => {
          if (result && result.err == 0) {
            this.route.navigate(['/checkout'], {
              relativeTo: this.activatedRoute,
              skipLocationChange: false,
              queryParams: {
                pay: 'buynow',
              },
            });
            // this.apiService.buynowFunction({data: obk});
          }
        });
    } else {
      this.modalRef = this.modalService.show(template, {
        id: 1,
        class: 'login-model',
        ignoreBackdropClick: false,
      });
      // this.notifyService.showError('Please login..');
      // return false;
    }
  }
  productDetails(slug, id, rcat, scat) {
    this.route.navigate(['/products', slug], {
      // relativeTo: this.activatedRoute,
      skipLocationChange: false,
      // queryParams: {
      //   id: id,
      //   rcat: rcat,
      //   scat: scat
      // }
    });
    this.ngOnInit;
  }

  addFavourite(id: any, childId: any) {
    console.log(id,childId, 'sdasdasdasdasd');

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

              // this.getFaviroitList();
              setTimeout(() => {

                this.notifyService.showSuccess(result.message);
              }, 100);
              this.getProdutDetail()
               
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
                      this.getProdutDetail()

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

              // this.getFaviroitList();
              setTimeout(() => {

                this.notifyService.showSuccess(result.message);
              }, 100);
              this.getProdutDetail()

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
                      this.getProdutDetail()

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
    this.reloadaction = 2;
    // this.ngOnInit();
    // this.getCartDetails();
    this.cdr.detectChanges()
  }

  slickInit(e) { }

  breakpoint(e) { }

  afterChange(e) {
    if (e) {
      this.active_slider = e.currentSlide;
    }
  }

  beforeChange(e) { }
  viewMore() {
    this.route.navigate(['/products']);
  }
  mousEnter(url, index) {
    this.img = index;
    this.product_img = url;
  }
  mouseLeave(value) {
    // this.productdetails
    // if(this.productdetails){
    //   if(this.productdetails.multiImage && this.productdetails.multiImage.length == value){
    //     this.productdetails
    //     this.product_img = this.productdetails.avatar;
    //   }
    // }
  }

  updateQuantity(cartDetails) {
    if (this.productdetails) {
      var newobj;
      this.productdetails.price_details.forEach(function (variant) {
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

  isReadMore = true;

  showText() {
    this.isReadMore = !this.isReadMore;
  }

  getRatingList() {
    let data = {
      skip: this.ratingSkip,
      limit: this.ratingLimit,
      product_id: this.product_id,
    };
    this.apiService
      .CommonApi(
        Apiconfig.ratingProductList.method,
        Apiconfig.ratingProductList.url,
        data
      )
      .subscribe((result) => {
        if (result && result.status === 1) {
          this.ratingList = result.data;

          this.totalItems = result.totalCount;
        } else {
          this.ratingList = [];
        }
      });
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.ratingSkip = page * this.ratingLimit - this.ratingLimit;
      // this.getRatingList();
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
    return Math.ceil(this.totalItems / this.ratingLimit);
  }
  // post_question() {
  //   var data = {
  //     question: this.user_question,
  //     user_id: this.userId,
  //     product_id: this.product_id
  //   }
  //   this.apiService.CommonApi(Apiconfig.post_question.method, Apiconfig.post_question.url, data).subscribe(res => {
  //     console.log("post question works", res)
  //     if (res && res.status == 1) {
  //       this.toastr.success(res.message)
  //     } else {
  //       this.toastr.error(res.message)
  //     }

  //   })

  // }
  changeimage(url, show) {
    this.showadditional_images_url = url;
    this.showadditional_images = show;
  }

  // onPriceDetailChange(item: any, selectedPriceDetail: any) {

  //   this.selectedIndex = item.price_details.findIndex(price => price === selectedPriceDetail);
  //   console.log(this.selectedIndex, 'ddddddselectedIndex');

  //   console.log(selectedPriceDetail, 'selectedPriceDetailselectedPriceDetail');
  //   console.log(item, 'itemmmm');
  //   this.selectionInfo.selectedIndex = this.selectedIndex || 0;
  //   this.selectionInfo.selectedAttributeId = selectedPriceDetail.attribute_ids[0];

  //   item.selectedPriceDetail = selectedPriceDetail;

  //   sessionStorage.setItem('selectionInfo', JSON.stringify(this.selectionInfo));

  //   item.selectedPriceDetail = selectedPriceDetail;

  // }

  initializeSelectedPriceDetails(): void {
    this.productList.forEach((item) => {
      if (item.price_details && item.price_details.length > 0) {
        item.selectedPriceDetail = item.price_details[0];
      }
    });
  }

  productFilterList() {
    this.pro_count = this.recommendedArray.length;
    this.totalItems = this.recommendedArray.length;
    this.productList = this.recommendedArray;
    console.log(this.productList, 'productttttt');
    console.log(
      this.cartDetails.cart_detail,
      'this.cartDetails.cart_detailthis.cartDetails.cart_detail'
    );

    if (this.cartDetails && this.cartDetails.cart_detail) {
      this.cartIds = this.cartDetails.cart_details.map((detail) => {
        console.log(detail, 'detaillllll23');

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

    console.log(extractedPriceDetails, 'extractedPriceDetails');

    // filter out the extractedPRice

    this.matchedObjects = [];
    this.unmatchedObjects = [];

    console.log(this.cartDetails.cart_details, 'cartDetailaa24scartDetails');

    if (this.cartDetails && this.cartDetails.cart_details) {
      console.log('hi from cart extract');
      console.log(extractedPriceDetails, 'extractedPriceDetails');

      extractedPriceDetails.forEach((obj) => {
        console.log(obj, 'objjj');

        if (
          obj.price_details &&
          obj.price_details.attributes &&
          obj.price_details.attributes.length > 0
        ) {
          let chaild_id_extractedPriceDetails =
            obj.price_details.attributes[0]?.chaild_id;
          console.log(chaild_id_extractedPriceDetails, 'chaild_isextraxrrrr');

          for (let i = 0; i < this.cartDetails.cart_details.length; i++) {
            if (this.cartDetails.cart_details[i]?.variations[0]?.length > 0) {
              let chaild_id_cart =
                this.cartDetails.cart_details[i].variations[0][0]?.chaild_id;
              console.log(obj._id, 'assssssssss123455');
              console.log(
                this.cartDetails.cart_details[i].id,
                'this.cartDetails.cart_details.idthis.cartDetails.cart_details.idws'
              );

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
    console.log(extractedPriceDetails, 'aaaaaa');
    console.log('Matched Objects:', this.matchedObjects);
    console.log('Unmatched Objects:', this.unmatchedObjects);

    this.unmatchedObjects.forEach((product) => {
      product.showAddToCartButton = true;
    });

    console.log(this.productList, 'product listt 1244454');
    if (this.productList.length > 0) {
      for (let i = 0; i < this.productList.length; i++) {
        this.productTemp = this.productList[i];
        if (this.productTemp.price_details.length > 0) {
          this.selectedPriceDetail = this.productTemp.price_details[0];
          this.productTemp.selectedPriceDetail =
            this.productTemp.price_details[0];
        }
      }
    }

    console.log(this.selectedPriceDetail, 'selectedprice 1235');

    console.log(this.product, 'poejfodfondfdnf');

    this.remainingProducts = this.productList.filter((product) => {
      console.log(product, 'iii product');
      console.log(this.cartDetails.cart_details, 'llllscartttll');

      return !this.cartDetails?.cart_details?.some(
        (cartItem) => cartItem.id === product._id
        // && product.price_details[0].attribute_ids[0] == cartItem.variations[0][0].attribute_ids
      );
    });
    this.remainingProducts.forEach((product) => {
      product.showAddToCartButton = true;
    });

    console.log(this.remainingProducts, 'remaining items');

    setTimeout(() => {
      console.log('matchingProducts', this.matchingProducts);
      console.log('this.remainingProducts', this.remainingProducts);
    }, 500);

    this.showproduct = true;
    window.scroll(0, 0);
  }

  // getTagWithProducts() {
  //   this.apiService
  //     .CommonApi(Apiconfig.getAllDeals.method, Apiconfig.getAllDeals.url, {})
  //     .subscribe((res) => {
  //       console.log('this is all deals',res.filter((ele)=>ele.dealName == "people_selected_products"));
  //       this.tags = res.filter((ele)=>ele.dealName == "people_selected_products");
  //       // this.flavorFushion = res[2];
  //       // this.productFilterList(this.flavorFushion.products);
  //       let productList = [];
  //       this.tags.forEach(tag=>{
  //         tag.products.forEach(product=>{
  //           productList.push(product)
  //         })
  //       })

  //     console.log(productList,"this is all deals");
  //     this.productDealList = productList
  //       // this.productFilterList(productList);
  //       this.tags.forEach((tag, index) => {
  //         this.tagObjects[`tag${index + 1}`] = tag;
  //         this.tagObjects[`tag${index + 1}-products`] = this.productFilterListfortag(
  //           tag.products,
  //           index + 1
  //         );
  //       });
  //       // console.log(this.tagObjects, 'after having variance...');

  //       this.tagObjectLength = Object.keys(this.tagObjects).length;
  //       console.log(this.tagObjects, 'these are tags');
  //     });
  // }

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
              let chaild_id_cart =
                this.cartDetails.cart_details[i].variations[0][0]?.chaild_id;
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
      for (let i = 0; i < this.productList.length; i++) {
        this.product = this.productList[i];
        console.log(this.product, 'asdasdasdsd');

        if (this.products?.price_details?.length > 0) {
          this.selectedPriceDetail = this.products.price_details[0];
          this.products.selectedPriceDetail = this.products.price_details[0];
        }
      }
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

      return !this.cartDetails?.cart_details?.some(
        (cartItem) => cartItem.id === product._id
        // && product.price_details[0].attribute_ids[0] == cartItem.variations[0][0].attribute_ids
      );
    });
    this.remainingProducts.forEach((product) => {
      product.showAddToCartButton = true;
    });

    console.log(this.remainingProducts, 'remaining items');

    setTimeout(() => {
      // console.log("matchingProducts", this.matchingProducts)
      // console.log("this.remainingProducts", this.remainingProducts)
      console.log('matching completed');
    }, 500);

    this.showproduct = true;
    // window.scroll(0, 0);
    // this.queryParamsUpdate();
  }
  // getCategoryFilter(category) {
  //   let data = {} as any;
  //   if (this.category) {
  //     data.category = category;
  //   };
  //   if (this.category_slug && Array.isArray(this.category_slug) && this.category_slug.length > 0) {
  //     data.sub_cat = this.category_slug;
  //   }
  //   this.apiService.CommonApi(Apiconfig.category_filter_get.method, Apiconfig.category_filter_get.url, data).subscribe(res => {
  //     if (res && res.status == 1 && res.response && res.response.categoryDetails) {
  //       console.log(this.categoryDetails,"this.categoryDetails = res.response.categoryDetails");

  //       this.categoryDetails = res.response.categoryDetails;
  //       this.category.push(this.categoryDetails._id);
  //       this.sub_list = res.response.sub_list;
  //       this.checkobx[this.categoryDetails._id] = true;
  //       this.variance = res.response.attributes;
  //       this.sub_filt_list = res.response.sub_det;
  //       if (res.response.subIds && Array.isArray(res.response.subIds) && res.response.subIds.length > 0) {
  //         this.category.push(...res.response.subIds);
  //       };
  //       if (this.variant_params) {
  //         let mainSplit = this.variant_params.split("|");
  //         for (let index = 0; index < mainSplit.length; index++) {
  //           let split_val = mainSplit[index].split(":");
  //           if (split_val && Array.isArray(split_val) && split_val.length > 0) {
  //             this.variant_flt_obj[split_val[0]] = split_val[1].split(",");
  //             let find_vrt = this.variance.find(x => x.slug === split_val[0]);
  //             if (find_vrt) {
  //               for (let i = 0; i < find_vrt.units.length; i++) {
  //                 let indx_vrt = this.variant_flt_obj[split_val[0]].indexOf(find_vrt.units[i].name);
  //                 if (indx_vrt != -1) {
  //                   this.variants_filter_list.push(find_vrt.units[i]._id);
  //                 }
  //               };
  //             }
  //           }
  //         };
  //       }
  //       this.filterCatSet();
  //       this.productFilterList();
  //     }
  //   })
  // };
}
