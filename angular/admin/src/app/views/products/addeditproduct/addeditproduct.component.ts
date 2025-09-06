import { Component, OnInit, HostListener, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef, TemplateRef } from '@angular/core';

import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import privilagedata, { PrivilagesData } from 'src/app/menu/privilages';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { environment } from 'src/environments/environment';
// import { ImageCroppedEvent, LoadedImage, base64ToFile } from 'ngx-image-cropper';
import { __asyncValues } from 'tslib';
import { add } from 'ngx-bootstrap/chronos';
import { log } from 'console';
import { isBoolean } from 'ngx-bootstrap/chronos/utils/type-checks';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import mongoose from 'mongoose';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { stringify } from 'querystring';
import { apis } from 'src/app/interface/interface';


interface subCategoryInterface {
  createdAt: string;
  img: string;
  rcategory: string;
  scatname: string;
  slug: string;
  status: number;
  updatedAt: string;
  _id: string;
}
@Component({

  selector: 'app-addeditproduct',
  templateUrl: './addeditproduct.component.html',
  styleUrls: ['./addeditproduct.component.scss'],

})
export class AddeditproductComponent implements OnInit, AfterViewInit {
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const dropdown = document.querySelector('ng-dropdown-panel');
    if (dropdown) {
      // Logic to keep dropdown open or adjust its position
      dropdown.classList.add('keep-open'); // Custom class to prevent closing
    }
  }
  imageChangedEvent: Event | null = null;
  croppedImage: SafeUrl = '';
  // imageChangedEvent: any = '';
  // imageChangedEvent1: any = '';
  productDesc: any

  combo: boolean = false
  isOn: boolean = false;
  description: string = '';
  charCount: number = 0;
  charCountprod: number = 0;
  att_arr: any[] = []
  @ViewChild('productForm') form: NgForm;
  @ViewChild('imageEditor')
  categorylist: any = [];
  rcategorylist: any = [];
  sub_category_id: any
  vegOptions = [
    // { name: 'Select Options', id: '' },
    { name: 'Vegetarian', id: 1 },
    { name: 'Non-Vegetarian', id: 2 }
  ];


  selectedVeg: any;
  sublvl: any = 0
  cat: any = 0
  submitted: Boolean = false
  subcategorylist: any = [];
  brandsList: any = [];
  view: boolean;
  viewimage: boolean = true
  imageAlt: any;
  cityList: any = [];
  attributesdata: any = [];
  productDetails: any;
  pageTitle: string = 'Product Add Page';
  selectedValues: any;
  selectedValuesEdit: any;
  selectedSubcategory: any;
  submitebtn: boolean = false;
  viewpage: boolean = false;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  previewImage: any;
  inputFile: any;
  id: any;
  all_subcategory: subCategoryInterface[][] = [];
  attri: any = [];
  scategory: string;
  attributes: any = [];
  avtar: any;
  sizeStatus: boolean = false
  foodImage: any;
  price_details = [];
  imgChangeEvt: any = '';
  cropImgPreview: any = '';
  formdata: any = {};
  rcat_list: any = [];
  scat_list: any = [];
  viewPage: boolean = false;
  split: any;
  error: any;
  product_details: any[] = [
    { title: '', content: '' }
  ];
  faq_details: any[] = [{ title: '', content: '' }];
  offer_check = 0;
  Preview_files: any = [];
  multipleFiles: any[] = [];
  documentFiles: any[] = [];
  hoverImage: any;
  attributimage: any;
  childcats: any[] = []
  avatarImg: any;
  hoverimg: any;
  sizeCategory = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  statusOptions = [
    // { label: 'Select variant', value: '' },
    { label: 'Active', id: 1 },
    { label: 'Inactive', id: 2 }
  ];

  selectedStatus: any = 1;
  dropdownBorderRadius: number = 5;

  varienceStatusOptions = [
    { label: 'Select variant', value: '' },
    { label: 'Yes', value: 1 },
    { label: 'No', value: 2 }
  ];
  selectedSizeStatus: string;
  dropdownBorderRadius1 = 5;
  // @ViewChild('additionlimage') addimg;
  @ViewChild('addimg', { static: false }) addimg: ElementRef;
  productName: any;
  productSlug: any = "";
  quantity_size: any[] = [
    { size: 'S', quantity: 1, status: '' },
    { size: 'M', quantity: 1, status: '' },
    { size: 'L', quantity: 1, status: '' },
    { size: 'XL', quantity: 1, status: '' },
    { size: 'XXL', quantity: 1, status: '' },
    { size: 'XXXL', quantity: 1, status: '' },
  ]
  varienttableshow: boolean = true;
  varinetshow: boolean = true
  varientsnames: any;
  varience_staus_value: any = 2;
  selected_attribute: any = [];
  selected_size_status: any;
  attributes_ar: any = [];
  offerAmount: any;
  edits: boolean
  formvalue: boolean;
  isImageSelected: boolean;
  scategoryId: string | mongoose.Types.ObjectId;
  imageChangedEvent_hover: Event | null = null;
  croppedImage_hover: string;
  isImageChangedEvent: boolean;
  isImageChangedEvent_hover: boolean;
  modalLogoutRef: BsModalRef;
  tagname: string = '';
  Receipe_name: any
  receipesname: string = '';
  alternativeName: string = '';
  healthBenefits: string = '';
  recipe_ingred: string = '';
  cooking_instruc: string = '';
  metakeyname: string = '';
  receipeNme: any
  tagsList: any[] = [];
  receipeList: any[] = [];
  alternativeList: any[] = [];
  HealthBenefitList: any[] = [];
  receipeIngList: any[] = [];
  cookingInsList: any[] = [];
  metakeyList: any[] = [];

  // selectedValuesEdit: { [key: number]: string } = {};
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private modalService: BsModalService,

  ) {
    this.curentUser = this.authService.currentUserValue;
    this.split = this.router.url.split('/');
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/products/add' || (this.split.length > 0 && this.split[2] == 'products')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'products');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };
    this.viewPage = this.split[3] == 'view' ? true : false;
    this.view = this.split[3] == 'view' ? true : false;
    this.edits = this.split[3] == 'edit' ? true : false;
    if (this.edits == true && this.viewPage == false) {
      this.pageTitle = "Product Edit Page";
    }
    if (this.edits == false && this.viewPage == true) {
      this.pageTitle = "Product View Page";
    }
  }
  // faq_details: { title: string, content: string }[] = [];

  addfaqContent() {
    this.faq_details.push({ title: '', content: '' });
  }

  updateCharCount(text: string) {
    this.charCount = text.length;
  }
  updateCharCountprod(text: string) {
    this.charCountprod = text.length;
  }

  removefaqContent(index: number) {
    this.faq_details.splice(index, 1);
  }
  toggleStatus(): void {
    this.isOn = !this.isOn;
    console.log(this.isOn, "this.isOnthis.isOnthis.isOn");
    this.combo = this.isOn
    // if (this.combo) {
    //   this.selected_size_status = 2;
    // } else {
    //   this.selected_size_status = ""
    // }
  }

  // saveDetails() {
  //   console.log(this.faqDetails); // You can save this array to your backend or perform further operations
  // }
  ngOnInit(): void {

    console.log(this.metakeyList.length, 'kk');

    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');


    // if (this.edits == true && this.viewPage == false) {
    //   this.pageTitle = "Product Edit";
    // }
    // if (this.edits == false && this.viewPage == true) {
    //   this.pageTitle = "Product View Page";
    // }
    this.apiService.CommonApi(Apiconfig.productcatgory.method, Apiconfig.productcatgory.url, {}).subscribe(
      (result) => {
        if (result && result.status == 1) {

          this.store.categoryList.next(result.list ? result.list : []);
          this.categorylist = result.list ? result.list : [];
          this.rcategorylist = result.list ? result.list : [];
          console.log(this.rcategorylist, 'rcategoryy');


          this.cd.detectChanges();


        }
      },
      (error) => {
        console.log("error", error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productbrandns.method, Apiconfig.productbrandns.url, {}).subscribe(
      (result) => {
        if (result && result.length == 1) {
          this.store.brandsList.next(result[0].length > 0 ? result[0] : []);
          this.brandsList = result[0].length ? result[0] : [];
          this.cd.detectChanges();
        };
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productcity.method, Apiconfig.productcity.url, {}).subscribe(
      (result) => {
        if (result && result.length > 0) {
          this.store.cityList.next(result[0].length > 0 ? result[0] : []);
          this.cityList = result[0].length > 0 ? result[0] : [];
          this.cd.detectChanges();
        }
      },
      (error) => {
        console.log(error);
      }
    );

  }

  onSalePriceChange(index: number): void {
    const salePrice = this.price_details[index].sprice;
    const basePrice = this.price_details[index].mprice;


    if (basePrice !== null && basePrice !== undefined && salePrice >= basePrice) {
      this.price_details[index].sprice = null;
    }
  }
  onBasePriceChange(index: number): void {
    const salePrice = this.price_details[index].sprice;
    const basePrice = this.price_details[index].mprice;


    if (salePrice !== null && salePrice !== undefined && salePrice >= basePrice) {
      this.price_details[index].sprice = null;
    }
  }
  addTag(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.tagsList.push(event.target.value);
      this.tagname = '';
    }
  }
  addmetamanage(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.metakeyList.push(event.target.value);
      this.metakeyname = '';
    }
  }
  addCookingmanage(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.cookingInsList.push(event.target.value);
      this.cooking_instruc = '';
    }
  }

  addreceipeTag(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.receipeIngList.push(event.target.value);
      this.recipe_ingred = '';
    }
  }


  addTagmanage(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.receipeList.push(event.target.value);
      this.receipesname = '';

    }
  }


  addAlternativeTag(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.alternativeList.push(event.target.value);
      this.alternativeName = '';

    }
  }
  addHealthTag(event) {
    const input = (event.target as HTMLInputElement).value.trim();
    if (event.which == 13 && input) {
      this.HealthBenefitList.push(event.target.value);
      this.healthBenefits = '';

    }
  }

  removeHealthTag(index) {
    this.HealthBenefitList.splice(index, 1);

  }
  removealternativeTag(index) {
    this.alternativeList.splice(index, 1);

  }
  removemetaTag(index) {
    this.metakeyList.splice(index, 1);
    console.log(this.metakeyList, "this.metakeyList");


  }
  removeTag(index) {
    this.tagsList.splice(index, 1);
    console.log(this.tagsList, "this.tagsList");

  }
  removeReceipeIngTag(index) {
    this.receipeIngList.splice(index, 1);

  }
  removereceipeTag(index) {
    this.receipeList.splice(index, 1);
  }
  removecookingTag(index) {
    this.cookingInsList.splice(index, 1);
  }
  onStatusChange(event: any) {
    console.log('selectedVeg Changed: ', event);
    this.selectedVeg = event;
  }

  // imageLoaded(image: LoadedImage) {
  //     // show cropper
  // }
  // cropperReady() {
  //     // cropper ready
  // }
  // loadImageFailed() {
  //     // show message
  // }



  checkimages() {
    for (let obj of this.price_details) {
      if (obj.image === "" || obj.image === undefined) {
        return false;
      }
    }
    return true;

  }
  checkprice() {
    for (let obj of this.price_details) {
      if (obj.mprice < obj.sprice) {
        return false;
      }
    }
    return true;

  }
  checkattributes() {

    for (let obj of this.price_details) {
      for (let att of obj.attributes) {
        if (att.chaild_name === "" || att.chaild_name === undefined) {
          return false;
        }
      }

    }
    return true;


  }
  allowOnlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
        event.preventDefault(); // Prevent non-numeric input
    }
}
  public onFormSubmit(categoryForm: UntypedFormGroup) {
    console.log(this.faq_details, "faq_detailsfaq_detailsfaq_details");

    console.log(categoryForm.value, "categoryForm===========================");
    console.log(categoryForm, 'cattteee');
    console.log(this.croppedImage, 'CROPED Image');
    this.submitted = true
    // return
    var isFormValid = this.checkimages()
    var isAttributevalid = this.checkattributes()

    var isPriceValid = this.checkprice()

    // if (!isFormValid) {
    //   this.notifyService.showError("Select Images for all varient")
    //   return;
    // }

    if (!isAttributevalid) {
      this.notifyService.showError("Select Attributes for all varient")
      return;
    }

    // if (!isPriceValid) {
    //   this.notifyService.showError("Base price must be greater than sale price in all varients")
    //   return;
    // }
    var details = categoryForm.value

    // console.log("attri", this.price_details)



    this.error = 'VALID';
    // this.price_details.forEach(element => {
    //   if (element.mprice < element.sprice) {
    //     this.error = "INVALID"
    //   }
    //   if (typeof element.image == 'undefined') {
    //     this.error = "INVALID"
    //   }
    // });




    console.log(categoryForm, (this.sublvl == 1 || this.cat == 1), isFormValid == true, isAttributevalid == true, isPriceValid == true);
    console.log(categoryForm.value.scategory, "categoryForm.value.scategory");


    console.log(categoryForm.valid, (this.sublvl == 1 || this.cat == 1), isAttributevalid == true, "categoryForm.valid && (this.sublvl == 1 || this.cat == 1) && isAttributevalid == true");

      
    if (categoryForm.valid && (this.sublvl == 1 || this.cat == 1) && isAttributevalid == true) {
      // if (details['size_status'] == 1) {
      //   for (var item of this.quantity_size) {
      //     if (item.quantity == '' && item.status == '') {
      //       return this.notifyService.showError("Please enter size quantity and status")
      //     }
      //     if (item.quantity < 0) {
      //       return this.notifyService.showError("Please enter size quantity")
      //     }
      //     if (item.status == '') {
      //       return this.notifyService.showError("Please enter size status")
      //     }
      //   }
      // }
      if (!categoryForm.value.scategory || categoryForm.value.scategory == "undefined" || categoryForm.value.scategory == undefined) {
        return this.notifyService.showError("Please add sub-category")
        // return;
      }
      console.log("it came here and there and shit happened")


      if (details['product_sale_price'] && details['product_sale_price'] > details['product_base_price']) {
        return this.notifyService.showError("Base price it should be above the sale price")
      }
      if (details['offer_status'] == 1) {
        if (details['offer_amount'] < 0) {
          return this.notifyService.showError("Please enter offer amount must be positive value ")
        }
        const maxOfferAmount = (details['product_base_price'] * details['offer_amount']) / 100;
        this.offerAmount = details['product_base_price'] - maxOfferAmount


        if (this.offerAmount > details['product_sale_price']) {


          return this.notifyService.showError("Offer amount cannot be higher than the sale price.");
        }
        // if(this.offerAmount < 0){
        //   return this.notifyService.showError("Please enter offer amount must be positive value ")
        // }
        if (details['offer_amount'] > 100) {
          return this.notifyService.showError("Please enter offer Percent less than or equal to 100 ")
        }
      }

      // for (var value of this.product_details) {

      //   if (value.content == '' && value.title == '') {
      //     return this.notifyService.showError("Please enter product detail content and title")
      //   }
      //   if (value.content == '') {
      //     return this.notifyService.showError("Please enter product detail content")
      //   }
      //   if (value.title == '') {
      //     return this.notifyService.showError("Please enter available status")
      //   }
      // }

      if (this.attributes_ar && Array.isArray(this.attributes_ar) && this.attributes_ar.length > 0) {
        let ar_vl = this.attributes_ar.map(x => x.join(''));
        let nw_arr_vl = [...new Set(ar_vl)]
        if (nw_arr_vl.length != ar_vl.length) {
          return this.notifyService.showError('Duplicates varients found! Please check and try again')
        }
      }

      if (!this.id && !this.avatarImg) {
        return this.notifyService.showError('Please upload product image')
      }
      // if (!this.id && !this.hoverImage) {
      //   return this.notifyService.showError('Please upload product hover image')
      // }

      let formData = new FormData();


      this.quantity_size.forEach(valu => {
        valu.status = parseInt(valu.status);
      })




      // this.scategory = this.scategory.split(':')[1];

      // console.log(this.scategory, 'CHECKK SCATEGORYY')


      // console.log("scategory------------------------------------------")
      // // const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(this.scategory);
      // // console.log(isValidObjectId, 'isvalidobjectid');


      // // if (isValidObjectId) {
      // //   this.scategoryId = this.scategory ? new mongoose.Types.ObjectId(this.scategory) : '';
      // // }

      // const scategory = this.scategory ? new mongoose.Types.ObjectId(this.scategory) : '';
      // console.log(scategory, 'scategory123');
      // console.log(categoryForm.value.scategory[0], "categoryForm===========================ADa");
      // this.scategory = this.scategory ? this.scategory.split(':')[1] : '';

      // // Check if this.scategory is a valid ObjectId string
      // const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(this.scategory);
      // console.log(isValidObjectId, 'isvalidobjectid');

      // let scategoryObjectId;

      // if (isValidObjectId) {
      //   // Create a new ObjectId instance
      //   scategoryObjectId = new mongoose.Types.ObjectId(this.scategory);
      // } else {
      //   // Handle case where this.scategory is not a valid ObjectId
      // console.error('Invalid ObjectId:', this.scategory);
      //   // You might want to decide how to handle this case, e.g., set scategoryObjectId to null or ''
      //   scategoryObjectId = ''; // or null, or handle differently based on your application logic
      // }

      // // Assign scategoryObjectId to this.formdata.scategory
      // this.formdata.scategory = categoryForm.value.scategory[0];

      // Log scategoryObjectId for debugging purposes
      // console.log(scategoryObjectId, 'scategoryObjectId');

      console.log(categoryForm.value.scategory, this.scategory, 'scategoryyyyy');
      this.formdata.attributes = this.att_arr
      this.formdata.base_price = details['product_base_price'];
      this.formdata.sale_price = details['product_sale_price'] ? details['product_sale_price'] : details['product_base_price'];
      this.formdata.name = details['food_name'];
      this.formdata.return_days = details['food_return']
      this.formdata.recommended = details['recommended'] ? details['recommended'] : false;
      this.formdata.rcategory = details['rcatname']._id;
      this.formdata.scategory = categoryForm.value.scategory != (undefined || null) && categoryForm.value.scategory ? categoryForm.value.scategory : this.sub_category_id;
      this.formdata.status = this.selectedStatus;
      this.formdata.size_status = this.selected_size_status
      // details['size_status'];
      this.formdata.offer_status = details['offer_status'] ? 1 : 0;
      this.formdata.tax = details && details.tax ? details.tax : 0;
      this.formdata.offer_amount = details['offer_amount'];
      this.formdata.information = details['information'];
      this.formdata.quantity = details['quantity'];
      this.formdata.price_details = this.price_details;
      this.formdata.size = details['size'] ? details['size'] : [];
      this.formdata.product_details = this.product_details;
      this.formdata.product_description = this.productDesc;
      this.formdata.combo = this.combo;
      this.formdata.quantity_size = this.quantity_size;
      this.formdata.slug = this.productSlug;
      this.formdata.child_cat_array = this.childcats;
      this.formdata.multiBase64 = this.multipleFiles;
      this.formdata.meta_title = details.meta_title;
      this.formdata.meta_keyword = this.metakeyList;
      this.formdata.meta_description = details.meta_description;
      this.formdata.sku = details.sku;
      this.formdata.alternativeList = this.alternativeList;
      this.formdata.Product_ingredients = this.tagsList;
      this.formdata.receipe_list = this.receipeList;
      this.formdata.HealthBenefit_List = this.HealthBenefitList;
      this.formdata.vegOptions = this.selectedVeg
      this.formdata.receipe_name = this.receipeNme
      this.formdata.receipe_ingredients = this.receipeIngList
      this.formdata.cooking_instrctions = this.cookingInsList
      this.formdata.faq_details = this.faq_details
      this.formdata.image_alt = this.imageAlt

      if (this.documentFiles) {
        this.formdata.documentFiles = this.documentFiles;
      }
      this.formdata.avatarBase64 = this.croppedImage;
      // if (this.avatarImg) {
      //   // formData.append('avatar', this.avatarImg);
      // }
      this.formdata.hoverImageBas64 = this.croppedImage_hover;
      // if (this.hoverimg) {
      // }

      // formData.append('base_price', details['product_base_price']);
      // formData.append('name', details['food_name']);
      // formData.append('recommended',details['recommended'] ? details['recommended'] : false );
      // formData.append('rcategory', details['rcatname']._id);
      // formData.append('scategory', details['scategory'] ? details['scategory']._id : null);
      // formData.append('status', details['status']);
      // formData.append('offer_status', details['offer_status']);
      // formData.append('offer_amount', details['offer_amount']);
      // formData.append('information', details['information']);
      // formData.append('quantity', details['quantity']);
      // formData.append('slug', details['food_name'].replace(/ /g, '-'));
      // formData.append('avatarBase64', this.cropImgPreview);
      // formData.append('file', this.hoverImage);
      // this.formdata.itmcat = details['itmcat'];

      // for (let index = 0; index < this.multipleFiles.length; index++) {
      //   formData.append(`file${index}`, this.multipleFiles[index]);
      // };

      if (this.split[3] != 'food-clone' && this.id) {
        this.formdata._id = this.productDetails._id ? this.productDetails._id : this.id
        // formData.append('_id', this.productDetails._id);
      }
      // return
      this.apiService.CommonApi(Apiconfig.foodAdd.method, Apiconfig.foodAdd.url, this.formdata).subscribe(
        (result) => {
          // if (result && result.code && result.code == 11000) {
          //   this.notifyService.showError("Please check! Duplicate name error.");
          //   return;
          // }
          // else 
          if (result && result.status === 1) {

            console.log(result, 'Dataaa producttt');

            this.router.navigate(['/app/products/list']);
            if (this.id) {
              this.notifyService.showSuccess("Successfully updated.");
              // this.submitebtn = false;
            } else {
              this.notifyService.showSuccess("Successfully Added.");
            }
          } else {
            this.notifyService.showError(result.message);
          }
        }
      )

    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

  fileUpload(event) {
    this.inputFile = event.target.files[0];
    this.imgChangeEvt = event
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result as string;

    }
    reader.readAsDataURL(this.inputFile)
  }




  truncateToFiveDigits(event: any) {


    const inputValue = event.target.value;
    const maxLength = 5;

    if (inputValue.length > maxLength) {
      event.target.value = inputValue.slice(0, maxLength);
    }
  }
  changeSizeStatus(data) {
    console.log(data, 'csss');

    console.log(data.value, 'changesize statuss');

    this.varience_staus_value = data.value
    if (data.value == 1) {
      this.sizeStatus = true;
      this.varienttableshow = true

      this.form.controls['attributes'].setValue(this.varientsnames)

    } else {
      this.varienttableshow = false
      this.sizeStatus = false;
    }
  }
  changeSort(event) {

  }


  isSalePriceGreaterThanMRP(i: number): boolean {
    return this.price_details[i].sprice > this.price_details[i].mprice;
  }

  async getSubCategoryAsync(value: any, index: number): Promise<void> {
    try {


      const result = await this.apiService.CommonApi("post", "scategory/get_all_sub", { id: value }).toPromise();


      if (result && result.length > 0) {

        // Populate the dropdown options for the corresponding category
        this.all_subcategory[index] = result;
        console.log(this.all_subcategory[index], "this.all_subcategory[index]this.all_subcategory[index]");

      }
    } catch (error) {
      // Handle error if the request fails
      this.notifyService.showError(error.message);
    }
  }

  getsubcategory(value, index, status) {


    if (status === 2) {

      this.all_subcategory = this.all_subcategory.splice(0, index + 1);

      console.log(this.all_subcategory, 'check sub catt');

    }
    if (value) {
      if (!this.viewPage) {
        // this.form.controls['brandname'].setValue([])
        // this.form.controls['scategory'].setValue([])
      }
      // this.apiService.CommonApi(Apiconfig.productCatbrandns.method, Apiconfig.productCatbrandns.url, { cat_id: value._id }).subscribe(
      //   (result) => {
      //     if (result && result.length == 1) {
      //       this.brandsList = result[0].length ? result[0] : [];
      //       if (this.id && !this.viewPage) {
      //         this.form.controls['brandname'].setValue(this.productDetails.brandname ? this.brandsList.filter(x => x._id == this.productDetails.brandname)[0] : []);
      //         this.cd.detectChanges();
      //       }
      //     };
      //   },
      //   (error) => {
      //     console.log(error);
      //   }
      // );
      if (!value._id) {

      }
      this.apiService.CommonApi("post", "scategory/get_all_sub", { id: value._id }).subscribe(
        (result) => {
          console.log("ididi", result)
          if (result && result.length > 0) {
            // this.subcategorylist = result;
            // result.unshift({ _id: "" })
            this.all_subcategory[index] = result;
            // this.all_subcategory.splice(index+1);
            console.log("ididi2", this.all_subcategory[index])

            this.cat = 0
            if (this.id && !this.viewPage) {
              // this.form.controls['scategory'].setValue(this.productDetails.scategory ? this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0] : '');
              this.cd.detectChanges();
            }
          } else {


            this.all_subcategory[index] = []
            this.cat = 1


          }
        },
        (error) => {
          this.notifyService.showError(error.message);
        }
      )


      this.apiService.CommonApi(Apiconfig.productattributes.method, Apiconfig.productattributes.url, { "mcat": value._id }).subscribe(
        (result) => {


          if (result && result.length > 0) {
            this.attributesdata = result[0].length > 0 ? result[0] : [];
            if (result[0].length <= 0) {

              this.varinetshow = false
            } else {
              this.varinetshow = true
            }



            this.cd.detectChanges();
          }
        },
        (error) => {
          console.log(error);
        }
      );



    } //end
  }
  validateInput(event: any) {
    // Remove any non-digit characters, including the minus sign

    let inputValue = event.target.value.replace(/[^0-9]/g, '');
    // Ensure the input length does not exceed 6 characters
    if (inputValue.length > 6) {
      inputValue = inputValue.slice(0, 6);
    }
    // Update the input value with the sanitized value
    event.target.value = inputValue;
  }

  // storeattributes(value) {

  //   const ids = this.attributesdata.map(item => item._id);

  //   const removeid = ids.find(id => !value.some(obj => obj._id === id));
  //   this.attri = value;


  checkUniqueSku(sku: string, index: number): boolean {
    for (let i = 0; i < this.price_details.length; i++) {
      // Don't compare the current SKU with itself
      if (i !== index && this.price_details[i].sku === sku) {
        return false; // Not unique
      }
    }
    return true; // Unique
  }

  // Triggered when SKU value changes
  onSkuChange(sku: string, index: number) {
    // You can add your form validation logic here if needed
    if (!this.checkUniqueSku(sku, index)) {
      // SKU is not unique, set an error flag or handle the error
      this.price_details[index].skuError = true;

    } else {
      this.price_details[index].skuError = false;
    }
  }






  storeattributes(value) {
    if (value.length > 2) {
      this.notifyService.showError('You can only select up to 2 Variants.')

      this.varientsnames = value.slice(0, 2);
    }
    console.log(this.varientsnames, 'valueeeee');

    const ids = this.attributesdata.map(item => item._id);
    console.log(ids);

    const removeid = ids.find(id => !this.varientsnames.some(obj => obj._id === id));
    this.attri = this.varientsnames;

    //this for loop is used to remove the attribure item that we we romoved from the varient select input tag
    for (let index = 0; index < this.price_details.length; index++) {
      for (let j = 0; j < this.price_details[index].attributes.length; j++) {
        // Use filter to remove attributes with matching parent_id
        this.price_details[index].attributes = this.price_details[index].attributes.filter(item => item.parrent_id !== removeid);
      }
    }

    // for (let j = 0; j < this.price_details.length; j++) {
    //   for (let index = 0; index < value.length; index++) {
    //     if (this.price_details[j].attributes[index] && typeof this.price_details[j].attributes[index].parrent_id != "undefined") {
    //     } else {
    //       this.price_details[j].attributes[index] = { chaild_id: [], attri_name: value[index].name, chaild_name: '', parrent_id: value[index]._id }
    //     }
    //   }
    // }
    for (let j = 0; j < this.price_details.length; j++) {
      for (let index = 0; index < this.varientsnames.length; index++) {

        this.price_details[j].attributes[index] = { chaild_id: [], attri_name: this.varientsnames[index].name, chaild_name: '', parrent_id: this.varientsnames[index]._id }

      }
    }
    this.add_variation()
    this.cd.detectChanges()
  }
  // getsubscategory_edit(value, index) {



  //   console.log("indexindex", index)
  //   const objectId = (value.target as HTMLSelectElement).value;
  //   // value.target.value


  //   this.selectedValues = this.selectedValues.slice(0, index)

  //   this.selectedValues.push(this.selectedValuesEdit[0])
  //   let vale_pos = index - 1
  //   const id = this.selectedValuesEdit[0]
  //   this.scategory = id

  //   this.childcats[vale_pos] = this.selectedValuesEdit[0];

  //   this.all_subcategory.splice(index, this.all_subcategory.length - index);


  //   this.apiService.CommonApi("post", "scategory/get_all_sub", { id: this.selectedValuesEdit[0] }).subscribe(
  //     (result) => {
  //       console.log("this.all_subcategory resu;t", result);

  //       if (result && result.length > 0) {
  //         // this.subcategorylist = result;
  //         this.all_subcategory = result;


  //         console.log("ididi second all catehory", this.all_subcategory)
  //         this.sublvl = 0

  //         if (this.id && !this.viewPage) {


  //           // this.form.controls['scategory'].setValue(this.productDetails.scategory ? this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0] : '');
  //           this.cd.detectChanges();
  //         }
  //       } else {
  //         this.sublvl = 1
  //       }
  //     },
  //     (error) => {
  //       this.notifyService.showError(error.message);
  //     }
  //   )

  // }

  getsubscategory_edit(value, index) {
    const objectId = value.target.value
    this.selectedValues = this.selectedValues.slice(0, index)
    this.selectedValues.push(value.target.value)
    let vale_pos = index - 1
    // console.log(this.all_subcategory, 'all_subcategory all_subcategory');
    // console.log(typeof (value), 'This is the type of the value');
    // const id = JSON.parse((value.target.value).split(":")[1].trim())
    const id = value.target.value
    this.scategory = id
    // console.log(this.scategory, 'this is changing or not');
    // console.log(value.target.value, 'this is the value');
    // console.log(value, 'this is the index of the');
    this.childcats[vale_pos] = ((value.target.value).split(":")[1].trim()).replace(/^'|'$/g, "");
    console.log(this.childcats[vale_pos], "this.childcats[vale_pos]this.childcats[vale_pos]");

    // this.childcats[vale_pos] = value.target.value;
    this.all_subcategory.splice(index, this.all_subcategory.length - index);
    this.apiService.CommonApi("post", "scategory/get_all_sub", { id: objectId }).subscribe(
      (result) => {
        console.log(result, 'ozzzzzzzzzzzzzzzzz');
        // console.log(result, 'this is the result of the getcategory list***___***');
        if (result && result.length > 0) {
          // this.subcategorylist = result;
          this.all_subcategory[index] = result;
          console.log(this.all_subcategory[index], "this.all_subcategory[index]this.all_subcategory[index]this.all_subcategory[index]");

          // console.log(this.all_subcategory, 'this are the all sub category 1');
          this.sublvl = 0
          // console.log(this.all_subcategory, 'this are the all sub category');
          if (this.id && !this.viewPage) {
            // this.form.controls['scategory'].setValue(this.productDetails.scategory ? this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0] : '');
            this.cd.detectChanges();
          }
        } else {
          this.sublvl = 1
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )
  }



  getsubscategory(value, index) {


    // const objectId = value.target.value.split("'")[1]; 


    console.log(value, "valuevaluevaluevaluevalue");

    let vale_pos = index - 1

    // const id = JSON.parse((value.target.value).split(":")[1].trim())
    const id = value.target.value
    this.scategory = id
    // this.childcats[vale_pos] = value.target.value;
    this.childcats[vale_pos] = ((value.target.value).split(":")[1].trim()).replace(/^'|'$/g, "");
    console.log(this.childcats[vale_pos], "this.childcats[vale_pos]this.childcats[vale_pos]this.childcats[vale_pos]");

    // this.childcats[vale_pos] = JSON.parse((value.target.value).split(":")[1].trim());
    // const idFromConsole = this.childcats[vale_pos].split(":")[1].trim();
    // console.log(idFromConsole,"idFromConsoleidFromConsoleidFromConsoleidFromConsole");

    console.log(this.childcats[vale_pos], "childcats[vale_pos]");
    console.log(this.scategory, "this.scategorythis.scategorythis.scategory");




    this.all_subcategory.splice(index, this.all_subcategory.length - index);
    console.log(this.all_subcategory, "this.all_subcategorythis.all_subcategorythis.all_subcategorythis.all_subcategory");

    this.apiService.CommonApi("post", "scategory/get_all_sub", { id: id }).subscribe(
      (result) => {
        console.log(result, 'subbbbb');


        if (result && result.length > 0) {
          // this.subcategorylist = result;
          this.all_subcategory[index] = result;
          this.sublvl = 0

          if (this.id && !this.viewPage) {
            this.form.controls['scategory'].setValue(this.productDetails.scategory ? this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0] : '');
            this.cd.detectChanges();
          }
        } else {
          this.sublvl = 1
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )

  }
  removeimage(i) {
    this.price_details[i].image = ''
    this.price_details[i].preview = ''
  }
  ngAfterViewInit(): void {
    if (this.id) {
      this.sublvl = 1
      // this.pageTitle = "Product Edit";
      this.apiService.CommonApi(Apiconfig.foodEdit.method, Apiconfig.foodEdit.url, { id: this.id }).subscribe(
        (result) => {
          console.log(result.foodDetails,"result.foodDetailsresult.foodDetails");
          
          this.sub_category_id = result.foodDetails.scategory
          this.HealthBenefitList = result.foodDetails.HealthBenefit_List
          this.alternativeList = result.foodDetails.alternative_name
          this.tagsList = result.foodDetails.Product_ingredients
          this.receipeList = result.foodDetails.receipes_cook
          this.selectedVeg = result.foodDetails.vegOptions
          this.receipeIngList = result.foodDetails.recipe_ingredients
          this.cookingInsList = result.foodDetails.cooking_instructions
          this.faq_details = result.foodDetails.faq_details
          this.combo = result.foodDetails.combo
          this.isOn = result.foodDetails.combo
          this.imageAlt = result.foodDetails.image_alt ? result.foodDetails.image_alt : ''
          console.log(result.foodDetails.image_alt, "result.foodDetails.image_alt");

          this.childcats = result && result.foodDetails && result.foodDetails.child_cat_array && Array.isArray(result.foodDetails.child_cat_array) && result.foodDetails.child_cat_array.length > 0 ? result.foodDetails.child_cat_array : [];
          if (!result.errors && result.status == 1 && this.attributesdata && result.foodDetails && result.foodDetails._id) {
            var attriDetails = []
            this.productDetails = result.foodDetails;
            console.log(this.productDetails, "this.productDetailsthis.productDetailsthis.productDetails");

            this.varience_staus_value = this.productDetails.size_status
            let id = result.scatId
            if (id && Array.isArray(id) && id.length > 0) {
              id.pop();
              id.reverse()
              this.selectedValues = id

              for (let i = 0; i <= id.length - 1; i++) {

                this.getSubCategoryAsync(id[i], i)
              }            // Extract unique attri_name values
            }
            const uniqueAttriNames = new Set();
            this.productDetails.price_details.forEach((item, index) => {
              this.attributes_ar[index] = item.attribute_ids;
              item.attributes.forEach(attribute => {
                uniqueAttriNames.add(attribute.attri_name);
              });
            });

            // Convert the Set to an array if needed
            const uniqueAttriNamesArray = Array.from(uniqueAttriNames);



            this.cropImgPreview = environment.apiUrl + (this.productDetails.avatar.fallback || this.productDetails.avatar);
            this.hoverImage = environment.apiUrl + (this.productDetails.trade_mark_image.fallback || this.productDetails.trade_mark_image);
            this.attributimage = environment.apiUrl
            this.avtar = this.productDetails.avatar
            this.price_details = this.productDetails.price_details;
            for (let index = 0; index < uniqueAttriNamesArray.length; index++) {
              attriDetails.push(this.attributesdata.filter(x => uniqueAttriNamesArray[index] == x.name)[0])
            }
            if (this.productDetails.images && this.productDetails.images.length > 0) {
              this.productDetails.images.forEach(file => this.Preview_files.push(environment.apiUrl + file));
              this.documentFiles = this.productDetails.images;
            }

            this.selected_size_status = this.productDetails.size_status;
            console.log(this.selected_size_status, 'selected size status');


            if (this.productDetails.size_status == 1) {
              this.sizeStatus = true
            }
            if (this.productDetails.size_status == 2) {
              this.sizeStatus = false
            }

            // this.attri = attriDetails;

            if (this.productDetails.product_details) {
              this.product_details = this.productDetails.product_details;
            }
            console.log(this.productDetails, 'checkk productt detailsss 123');
            console.log(this.productDetails.scategory, "categoryForm.value.scategory.valid");
            console.log(this.all_subcategory, 'xxxxxvvvvvvvvvvvv');

            console.log(this.all_subcategory.length, 'allsc');

            let a = this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0];
            console.log(a, 'chelllll');


            // this.form.controls['scategory'].setValue(this.productDetails.scategory ? this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0] : '');

            // var rmct = this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0];
            // console.log("check", rmct)
            // this.rcat_list = rmct.rcatname
            if (!this.viewPage) {
              console.log(this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0], "this.productDetails.rcategory");
              console.log(this.productDetails.rcategory, "this.productDetails.rcategory");
              this.form.controls['rcatname'].setValue(this.productDetails.rcategory ? this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0] : [])

              // this.form.controls['main_city'].setValue(this.productDetails.main_city[0] ? this.cityList.filter(x => this.productDetails.main_city.indexOf(x._id) >= 0 ? true : false) : [])
              if (this.productDetails.size_status == 1) {
                setTimeout(() => {
                  this.varientsnames = uniqueAttriNamesArray;
                  console.log(this.varientsnames, "this.varientsnamesthis.varientsnames");

                  this.form.controls['attributes'].setValue(uniqueAttriNamesArray);
                }, 100)
              }
              this.form.controls['food_name'].setValue(this.productDetails.name ? this.productDetails.name : '')
              this.form.controls['tax'].setValue(this.productDetails.tax ? this.productDetails.tax : 0)
              // this.form.controls['food_return'].setValue(this.productDetails.return_days ? this.productDetails.return_days : '')
              this.productName = this.productDetails.name ? this.productDetails.name : '';
              this.changeSlug();
              // this.form.controls['itmcat'].setValue(this.productDetails.itmcat ? this.productDetails.itmcat : '')
              if (this.productDetails.size_status === 2) {
                setTimeout(() => {
                  this.form.controls['product_base_price'].setValue(this.productDetails.base_price ? this.productDetails.base_price : '')
                  this.form.controls['product_sale_price'].setValue(this.productDetails.sale_price ? this.productDetails.sale_price : '')
                })
              }
              console.log(this.productDetails.status);
              this.selectedStatus = this.productDetails.status
              // this.form?.controls['status'].setValue(this.productDetails.status == 1 ? 'Active' : 'Inactive')
              // this.form.controls['recommended'].setValue(this.productDetails.isRecommeneded == 1 ? true : false);
              // this.form.controls['offer_status'].setValue(this.productDetails.offer_status == 1 ? true : false);
              this.form.controls['information'].setValue(this.productDetails.information ? this.productDetails.information : '');
              // this.form.controls['size_status'].setValue(this.productDetails.size_status == 1 ? 'Yes' : 'No');
              this.selected_size_status = this.productDetails.size_status
              // this.form.controls.size_status.setValue(this.selected_size_status )
              this.form.controls['sku'].setValue(this.productDetails.sku ? this.productDetails.sku : '');
              // this.form.controls['productDetails'].setValue(this.productDetails.product_descriptions ? this.productDetails.product_descriptions : '');
              this.productDesc = this.productDetails.product_descriptions
              console.log(this.productDesc, "this.productDetails.product_descriptions");

              this.receipeNme = this.productDetails.recipe_name
              this.selected_size_status = this.productDetails.size_status;
              // if (this.productDetails.size_status == 2) {
              //   setTimeout(() => {
              //     this.form.controls['quantity'].setValue(this.productDetails.quantity ? this.productDetails.quantity : 0);
              //   })
              // }
              // this.form.controls['size'].setValue(this.productDetails.size? this.productDetails.size : '');
              // if (this.productDetails.offer_status) {
              //   this.offer_check = this.productDetails.offer_status;
              //   if (this.offer_check == 1) {
              //     setTimeout(() => {
              //       this.form.controls['offer_amount'].setValue(this.productDetails.offer_amount ? this.productDetails.offer_amount : '');
              //     }, 100);
              //   }
              // }
              // if (this.productDetails.size_status) {
              //   // this.form.controls['size_status'].setValue(this.productDetails.size_status == 1 ? 'Yes' : 'No');
              //   this.selected_size_status = this.productDetails.size_status
              //   if (this.productDetails.size_status == 1 && this.productDetails.quantity_size) {
              //     setTimeout(() => {
              //       this.quantity_size = this.productDetails.quantity_size;
              //     }, 100);
              //   }
              //   if (this.productDetails.size_status == 2) {

              //     // setTimeout(() => {
              //     //   this.form.controls['quantity'].setValue(this.productDetails.quantity ? this.productDetails.quantity : '');
              //     // }, 100);
              //   }
              // }
              this.metakeyList = this.productDetails && this.productDetails.meta && this.productDetails.meta.meta_keyword ? this.productDetails.meta.meta_keyword : ''

              this.form.controls['meta_title'].setValue(this.productDetails.meta.meta_title ? this.productDetails.meta.meta_title : '');
              // this.form.controls['meta_keyword'].setValue(this.productDetails.meta.meta_keyword ? this.productDetails.meta.meta_keyword : '');
              this.form.controls['meta_description'].setValue(this.productDetails.meta.meta_description ? this.productDetails.meta.meta_description : '');
              // this.form.controls['scategory'].setValue(this.productDetails.scategory ? this.subcategorylist.filter(x => x._id == this.productDetails.scategory)[0] : '');


            }



            if (this.viewPage) {
              this.form.controls['rcatname'].setValue(this.productDetails.rcategory ? this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0] : [])
              this.productDesc = this.productDetails.product_descriptions
              this.receipeNme = this.productDetails.recipe_name
              if (this.productDetails.size_status == 1) {
                setTimeout(() => {
                  this.varientsnames = uniqueAttriNamesArray;
                  console.log(this.varientsnames, "this.varientsnamesthis.varientsnames");

                  this.form.controls['attributes'].setValue(uniqueAttriNamesArray);
                }, 100)
              }
              // this.form.controls['main_city'].setValue(this.productDetails.main_city[0] ? this.cityList.filter(x => this.productDetails.main_city.indexOf(x._id) >= 0 ? true : false) : [])
              // if (this.productDetails.size_status == 1) {
              //   setTimeout(() => {
              //     this.form.controls['attributes'].setValue(uniqueAttriNamesArray)
              //   }, 100)
              // }
              this.selectedStatus = this.productDetails.status
              this.form.controls['food_name'].setValue(this.productDetails.name ? this.productDetails.name : '')
              // this.form.controls['food_return'].setValue(this.productDetails.return_days ? this.productDetails.return_days : '')
              // this.form.controls['itmcat'].setValue(this.productDetails.itmcat ? this.productDetails.itmcat : '')
              // setTimeout(() => {
              this.form.controls['product_base_price'].setValue(this.productDetails.base_price ? this.productDetails.base_price : '')
              this.form.controls['product_sale_price'].setValue(this.productDetails && this.productDetails.sale_price ? this.productDetails.sale_price : '')
              // },100)
              // this.form?.controls['status'].setValue(this.productDetails.status == 1 ? 'Active' : 'Inactive')
              // this.form.controls['recommended'].setValue(this.productDetails.isRecommeneded == 1 ? true : false);
              // this.form.controls['offer_status'].setValue(this.productDetails.offer_status == 1 ? true : false);
              this.form.controls['information'].setValue(this.productDetails.information ? this.productDetails.information : '');
              // this.form.controls['size_status'].setValue(this.productDetails.size_status == 1 ? 'Yes' : 'No');
              this.form.controls['sku'].setValue(this.productDetails.sku ? this.productDetails.sku : '');
              // if (this.productDetails.size_status == 2) {
              //   setTimeout(() => {
              //     this.form.controls['quantity'].setValue(this.productDetails.quantity);
              //   })
              // }
              // this.form.controls['size'].setValue(this.productDetails.size? this.productDetails.size : '');
              // if (this.productDetails.offer_status) {
              //   this.offer_check = this.productDetails.offer_status;
              //   if (this.offer_check == 1) {
              //     setTimeout(() => {
              //       this.form.controls['offer_amount'].setValue(this.productDetails.offer_amount ? this.productDetails.offer_amount : '');
              //     }, 100);
              //   }
              // }
              // if (this.productDetails.size_status) {
              //   this.form.controls['size_status'].setValue(this.productDetails.size_status == 1 ? 'Yes' : 'No');
              //   if (this.productDetails.size_status == 1 && this.productDetails.quantity_size) {
              //     setTimeout(() => {
              //       this.quantity_size = this.productDetails.quantity_size;
              //     }, 100);
              //   }
              //   if (this.productDetails.size_status == 2) {
              //     setTimeout(() => {
              //       this.form.controls['quantity'].setValue(this.productDetails.quantity ? this.productDetails.quantity : '');
              //     }, 100);
              //   }
              // }
              this.form.controls['meta_title'].setValue(this.productDetails.meta.meta_title ? this.productDetails.meta.meta_title : '');
              this.form.controls['meta_keyword'].setValue(this.productDetails.meta.meta_keyword ? this.productDetails.meta.meta_keyword : '');
              this.form.controls['meta_description'].setValue(this.productDetails.meta.meta_description ? this.productDetails.meta.meta_description : '');
              this.form.controls['sku'].setValue(this.productDetails.sku ? this.productDetails.sku : '');

            }
            if (this.categorylist.length > 0) {


              // setTimeout(() => {
              this.getsubcategory(this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0], 0, 1)
              // }, 100);
            }

            setTimeout(() => {
              result?.foodDetails?.price_details.forEach((data) => {
                data.attributes.forEach((datas) => {
                  let rs = this.attributesdata.find(obj => obj._id === datas.parrent_id);
                  if (rs) {
                    let isPresent = this.attri.some(item => item._id === rs._id)
                    if (rs && !isPresent) {
                      this.attri.push(rs)
                    }
                  };
                })

                this.price_details = this.productDetails.price_details
              })
            }, 1000)


            this.cd.detectChanges();
          } else {
            this.notifyService.showError("Product Details not found");
            this.router.navigate(['/app/products/list'])
          }
        }
      )
    }
  };



  // ngAfterViewInit(): void {
  //   if (this.id) {
  //     this.sublvl = 1
  //     // this.pageTitle = "Product Edit";
  //     this.apiService.CommonApi(Apiconfig.foodEdit.method, Apiconfig.foodEdit.url, { id: this.id }).subscribe(
  //       (result) => {

  //         this.childcats = result && result.foodDetails && result.foodDetails.child_cat_array && Array.isArray(result.foodDetails.child_cat_array) && result.foodDetails.child_cat_array.length > 0 ? result.foodDetails.child_cat_array : [];
  //         if (!result.errors && result.status == 1 && this.attributesdata && result.foodDetails && result.foodDetails._id) {
  //           var attriDetails = []
  //           this.productDetails = result.foodDetails;
  //           this.varience_staus_value = this.productDetails.size_status
  //           let id = result.scatId
  //           if (id && Array.isArray(id) && id.length > 0) {
  //             i  d.pop();
  //             id.reverse()
  //             this.selectedValues = id

  //             for (let i = 0; i <= id.length - 1; i++) {

  //               this.getSubCategoryAsync(id[i], i)
  //             }            // Extract unique attri_name values
  //           }
  //           const uniqueAttriNames = new Set();
  //           this.productDetails.price_details.forEach((item, index) => {
  //             this.attributes_ar[index] = item.attribute_ids;
  //             item.attributes.forEach(attribute => {
  //               uniqueAttriNames.add(attribute.attri_name);
  //             });
  //           });

  //           // Convert the Set to an array if needed
  //           const uniqueAttriNamesArray = Array.from(uniqueAttriNames);



  //           this.cropImgPreview = environment.apiUrl + this.productDetails.avatar;
  //           this.hoverImage = environment.apiUrl + this.productDetails.hover_image;
  //           this.attributimage = environment.apiUrl
  //           this.avtar = this.productDetails.avatar
  //           this.price_details = this.productDetails.price_details;
  //           for (let index = 0; index < uniqueAttriNamesArray.length; index++) {
  //             attriDetails.push(this.attributesdata.filter(x => uniqueAttriNamesArray[index] == x.name)[0])
  //           }
  //           if (this.productDetails.images && this.productDetails.images.length > 0) {
  //             this.productDetails.images.forEach(file => this.Preview_files.push(environment.apiUrl + file));
  //             this.documentFiles = this.productDetails.images;
  //           }

  //           this.selected_size_status = this.productDetails.size_status;
  //           console.log(this.selected_size_status, 'selected size status');


  //           if (this.productDetails.size_status == 1) {
  //             this.sizeStatus = true
  //           }
  //           if (this.productDetails.size_status == 2) {
  //             this.sizeStatus = false
  //           }

  //           // this.attri = attriDetails;

  //           if (this.productDetails.product_details) {
  //             this.product_details = this.productDetails.product_details;
  //           }
  //           console.log(this.productDetails, 'checkk productt detailsss 123');

  //           // var rmct = this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0];
  //           // console.log("check", rmct)
  //           // this.rcat_list = rmct.rcatname
  //           if (!this.viewPage) {
  //             this.form.controls['rcatname'].setValue(this.productDetails.rcategory ? this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0] : [])
  //             // this.form.controls['main_city'].setValue(this.productDetails.main_city[0] ? this.cityList.filter(x => this.productDetails.main_city.indexOf(x._id) >= 0 ? true : false) : [])
  //             if (this.productDetails.size_status == 1) {
  //               setTimeout(() => {
  //                 this.varientsnames = uniqueAttriNamesArray;
  //                 this.form.controls['attributes'].setValue(uniqueAttriNamesArray);
  //               }, 100)
  //             }
  //             this.form.controls['food_name'].setValue(this.productDetails.name ? this.productDetails.name : '')
  //             this.form.controls['food_return'].setValue(this.productDetails.return_days ? this.productDetails.return_days : '')
  //             this.productName = this.productDetails.name ? this.productDetails.name : '';
  //             this.changeSlug();
  //             // this.form.controls['itmcat'].setValue(this.productDetails.itmcat ? this.productDetails.itmcat : '')
  //             if (this.productDetails.size_status === 2) {
  //               setTimeout(() => {
  //                 this.form.controls['product_base_price'].setValue(this.productDetails.base_price ? this.productDetails.base_price : '')
  //                 this.form.controls['product_sale_price'].setValue(this.productDetails.sale_price ? this.productDetails.sale_price : '')
  //               })
  //             }
  //             console.log("hrei am ---------------------------------------------------------")
  //             console.log(this.productDetails.status);

  //             this.form?.controls['status'].setValue(this.productDetails.status == 1 ? 'Active' : 'Inactive')
  //             // this.form.controls['recommended'].setValue(this.productDetails.isRecommeneded == 1 ? true : false);
  //             this.form.controls['offer_status'].setValue(this.productDetails.offer_status == 1 ? true : false);
  //             this.form.controls['information'].setValue(this.productDetails.information ? this.productDetails.information : '');
  //             this.form.controls['size_status'].setValue(this.productDetails.size_status === 1 ? 'Yes' : 'No');
  //             this.form.controls['sku'].setValue(this.productDetails.sku ? this.productDetails.sku : '');

  //             if (this.productDetails.size_status == 2) {
  //               setTimeout(() => {
  //                 this.form.controls['quantity'].setValue(this.productDetails.quantity ? this.productDetails.quantity : 0);
  //               })
  //             }
  //             // this.form.controls['size'].setValue(this.productDetails.size? this.productDetails.size : '');
  //             if (this.productDetails.offer_status) {
  //               this.offer_check = this.productDetails.offer_status;
  //               if (this.offer_check == 1) {
  //                 setTimeout(() => {
  //                   this.form.controls['offer_amount'].setValue(this.productDetails.offer_amount ? this.productDetails.offer_amount : '');
  //                 }, 100);
  //               }
  //             }
  //             if (this.productDetails.size_status) {
  //               this.form.controls['size_status'].setValue(this.productDetails.size_status === 1 ? 'Yes' : 'No');
  //               if (this.productDetails.size_status == 1 && this.productDetails.quantity_size) {
  //                 setTimeout(() => {
  //                   this.quantity_size = this.productDetails.quantity_size;
  //                 }, 100);
  //               }
  //               if (this.productDetails.size_status == 2) {

  //                 setTimeout(() => {
  //                   this.form.controls['quantity'].setValue(this.productDetails.quantity ? this.productDetails.quantity : '');
  //                 }, 100);
  //               }
  //             }
  //             this.form.controls['meta_title'].setValue(this.productDetails.meta.meta_title ? this.productDetails.meta.meta_title : '');
  //             this.form.controls['meta_keyword'].setValue(this.productDetails.meta.meta_keyword ? this.productDetails.meta.meta_keyword : '');
  //             this.form.controls['meta_description'].setValue(this.productDetails.meta.meta_description ? this.productDetails.meta.meta_description : '');


  //           }



  //           if (this.viewPage) {
  //             // this.form.controls['rcatname'].setValue(this.productDetails.rcategory ? this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0] : [])
  //             // this.form.controls['main_city'].setValue(this.productDetails.main_city[0] ? this.cityList.filter(x => this.productDetails.main_city.indexOf(x._id) >= 0 ? true : false) : [])
  //             if (this.productDetails.size_status == 1) {
  //               setTimeout(() => {
  //                 this.form.controls['attributes'].setValue(uniqueAttriNamesArray)
  //               }, 100)
  //             }
  //             this.form.controls['food_name'].setValue(this.productDetails.name ? this.productDetails.name : '')
  //             this.form.controls['food_return'].setValue(this.productDetails.return_days ? this.productDetails.return_days : '')
  //             // this.form.controls['itmcat'].setValue(this.productDetails.itmcat ? this.productDetails.itmcat : '')
  //             setTimeout(() => {
  //               this.form.controls['product_base_price'].setValue(this.productDetails.base_price ? this.productDetails.base_price : '')
  //               this.form.controls['product_sale_price'].setValue(this.productDetails.sale_price ? this.productDetails.sale_price : '')
  //             })
  //             this.form?.controls['status'].setValue(this.productDetails.status == 1 ? 'Active' : 'Inactive')
  //             // this.form.controls['recommended'].setValue(this.productDetails.isRecommeneded == 1 ? true : false);
  //             this.form.controls['offer_status'].setValue(this.productDetails.offer_status == 1 ? true : false);
  //             this.form.controls['information'].setValue(this.productDetails.information ? this.productDetails.information : '');
  //             this.form.controls['size_status'].setValue(this.productDetails.size_status === 1 ? 'Yes' : 'No');
  //             if (this.productDetails.size_status == 2) {
  //               setTimeout(() => {
  //                 this.form.controls['quantity'].setValue(this.productDetails.quantity);
  //               })
  //             }
  //             // this.form.controls['size'].setValue(this.productDetails.size? this.productDetails.size : '');
  //             if (this.productDetails.offer_status) {
  //               this.offer_check = this.productDetails.offer_status;
  //               if (this.offer_check == 1) {
  //                 setTimeout(() => {
  //                   this.form.controls['offer_amount'].setValue(this.productDetails.offer_amount ? this.productDetails.offer_amount : '');
  //                 }, 100);
  //               }
  //             }
  //             if (this.productDetails.size_status) {
  //               this.form.controls['size_status'].setValue(this.productDetails.size_status == 1 ? 'Yes' : 'No');
  //               if (this.productDetails.size_status == 1 && this.productDetails.quantity_size) {
  //                 setTimeout(() => {
  //                   this.quantity_size = this.productDetails.quantity_size;
  //                 }, 100);
  //               }
  //               if (this.productDetails.size_status == 2) {
  //                 setTimeout(() => {
  //                   this.form.controls['quantity'].setValue(this.productDetails.quantity ? this.productDetails.quantity : '');
  //                 }, 100);
  //               }
  //             }
  //             this.form.controls['meta_title'].setValue(this.productDetails.meta.meta_title ? this.productDetails.meta.meta_title : '');
  //             this.form.controls['meta_keyword'].setValue(this.productDetails.meta.meta_keyword ? this.productDetails.meta.meta_keyword : '');
  //             this.form.controls['meta_description'].setValue(this.productDetails.meta.meta_description ? this.productDetails.meta.meta_description : '');
  //             this.form.controls['sku'].setValue(this.productDetails.sku ? this.productDetails.sku : '');

  //           }
  //           if (this.categorylist.length > 0) {


  //             // setTimeout(() => {
  //             this.getsubcategory(this.categorylist.filter(x => x._id == this.productDetails.rcategory)[0], 0, 1)
  //             // }, 10);
  //           }

  //           setTimeout(() => {
  //             result?.foodDetails?.price_details.forEach((data) => {
  //               data.attributes.forEach((datas) => {
  //                 let rs = this.attributesdata.find(obj => obj._id === datas.parrent_id);
  //                 if (rs) {
  //                   let isPresent = this.attri.some(item => item._id === rs._id)
  //                   if (rs && !isPresent) {
  //                     this.attri.push(rs)
  //                   }
  //                 };
  //               })

  //               this.price_details = this.productDetails.price_details
  //             })
  //           }, 1000)


  //           this.cd.detectChanges();
  //         } else {
  //           this.notifyService.showError("Product Details not found");
  //           this.router.navigate(['/app/products/list'])
  //         }
  //       }
  //     )
  //   }
  // };

  add_variation() {
    var add_variants = [];
    for (let index = 0; index < this.attri.length; index++) {
      add_variants[index] = { chaild_id: [], attri_name: this.attri[index].name, chaild_name: '', parrent_id: this.attri[index]._id }
    }
    this.price_details.push({ attributes: add_variants, quantity: '', mprice: '', sprice: '', image: '' });
  }

  remove(index) {
    this.price_details.splice(index, 1)
  }

  fileUploads(event, index) {
    this.viewimage = false
    var file = event.target.files[0]
    var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/JPG', 'image/JPEG', 'image/PNG'];
    if (image_valid.indexOf(file.type) == -1) {
      this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG,webp.');
      return;
    }

    this.getBase64(event.target.files[0]).then(
      (data: any) => {
        this.price_details[index].image = data
        this.price_details[index].preview = data
      }
    );
  }

  multiAttributes(event, varient, index, j) {

    if (this.attributes_ar && this.attributes_ar[index] && Array.isArray(this.attributes_ar[`${index}`]) && this.attributes_ar[`${index}`].length > 0) {
      this.attributes_ar[`${index}`][j] = event._id;

    } else {
      this.attributes_ar[index] = [];
      this.attributes_ar[index][j] = event._id
    };

    this.att_arr.push(event ? event._id : '');

    console.log(this.att_arr, 'attr_att');

    this.price_details[index].attributes[j] = {
      chaild_id: event ? event._id : '',
      chaild_name: event ? event.name : '',
      attri_name: varient ? varient.name : '',
      parrent_id: varient ? varient._id : '',
    };
  }


  getBase64(file) {

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // fileChangeEvent(event: Event): void {
  //   this.imageChangedEvent = event;
  // }


  // onFileChange(event: any): void {
  //   this.isImageChangedEvent = true;
  //   this.imageChangedEvent = event
  //   this.inputFile = event.target.files[0];
  //   console.log(this.inputFile, 'input file image');

  //   var file = event.target.files[0];
  //   if (file && file.size < 50000000) {
  //     var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
  //     if (image_valid.indexOf(file.type) == -1) {
  //       this.form.controls['cimage'].setValue('')
  //       this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG,webp.');
  //       return;
  //     }
  //     // const reader = new FileReader();
  //     // reader.onload = () => {
  //     //   this.cropImgPreview = reader.result as string;
  //     // }
  //     // reader.readAsDataURL(this.inputFile)
  //     this.getBase64(event.target.files[0]).then(
  //       (data: any) => {
  //         console.log(data, 'data123');

  //         this.cropImgPreview = data;
  //         this.avatarImg = data;

  //       }
  //     );
  //   } else {
  //     this.notifyService.showError('Max file size less than 50Mb ');
  //   }

  // }



  imageCropped(event: ImageCroppedEvent) {
    console.log(event, "eventeventevent");
    this.cropImgPreview = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    this.croppedImage = event.base64;
    console.log(this.croppedImage, 'cropped');

    console.log(this.cropImgPreview, 'iiiasfsfsf');

    // const file = new File([event.blob], this.inputFile.name, { type: this.inputFile.type });
    // console.log(file, 'Converted File');
    // this.avatarImg = file;
  }


  onFileChange(event: any): void {
    this.isImageChangedEvent = true;
    this.imageChangedEvent = event
    this.inputFile = event.target.files[0];
    console.log(this.inputFile, 'input file image');

    const file = event.target.files[0];
    if (file && file.size < 50000000) {
      const imageValid = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/JPG', 'image/JPEG', 'image/PNG', 'image/WEBP'];
      if (!imageValid.includes(file.type)) {
        this.form.controls['cimage'].setValue('');
        this.notifyService.showError('Only image formats allowed! Please select file types of jpg, jpeg, png, JPG, JPEG, PNG, webp.');
        return;
      }

      this.getBase64(file).then((data: any) => {
        console.log(data, 'data123');
        this.cropImgPreview = data;
        this.avatarImg = data;
      });
    } else {
      this.notifyService.showError('Max file size less than 50MB.');
    }
  }

  // imageCropped(event: ImageCroppedEvent) {
  //   console.log(event, "eventeventevent");

  //   // Convert the cropped image to WebP format
  //   // this.convertToWebP(event.base64).then((webpDataUrl: string) => {
  //     this.cropImgPreview = this.sanitizer.bypassSecurityTrustUrl(event.base64);
  //     this.croppedImage = event.base64;
  //     console.log(this.croppedImage, 'cropped WebP image');
  //   // });
  // }

  convertToWebP(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const webpDataUrl = canvas.toDataURL('image/webp');
          resolve(webpDataUrl);
        }
      };
    });
  }

  imageCropped_hover(event: ImageCroppedEvent) {
    console.log(event, "eventeventevent");
    this.hoverImage = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    this.croppedImage_hover = event.base64;
    // console.log(this.croppedImage, 'cropped');

    // console.log(this.cropImgPreview, 'iiiasfsfsf');

    const file = new File([event.blob], this.inputFile.name, { type: this.inputFile.type });
    console.log(file, 'Converted File');
    // this.hoverImage = file;
  }
  // cropImage() {
  //   if (this.avatarImg) {
  //     this.avatarImg = this.cropImgPreview;
  //     console.log(this.avatarImg, 'in crop submitt');

  //     this.notifyService.showSuccess('Image cropped and saved successfully.');
  //   } else {
  //     this.notifyService.showError('Please select and crop an image first.');
  //   }
  // }



  // var file = event.target.files[0]
  // var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];
  // if (image_valid.indexOf(file.type) == -1) {
  //   this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
  //   return;
  // }

  // if (file && file.size < 50000000) {
  //   this.imgChangeEvt = event;
  // } else {
  //   this.notifyService.showError('Max file size less than 50Mb ');
  // }



  onHoverFileChange(event: any): void {
    this.isImageChangedEvent_hover = true;
    this.imageChangedEvent_hover = event
    this.inputFile = event.target.files[0];
    var file = event.target.files[0];
    console.log(file, 'file hover');

    if (file && file.size < 50000000) {
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/webp', 'image/JPEG', 'image/PNG'];
      if (image_valid.indexOf(file.type) == -1) {
        this.form.controls['cimage'].setValue('')
        this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG,webp');
        return;
      }


      this.getBase64(event.target.files[0]).then(
        (data: any) => {

          this.hoverImage = data;
          // this.hoverimg = data;
        }
      );
      // const reader = new FileReader();
      // reader.onload = () => {
      //   this.hoverImage = reader.result as string;
      // }
      // reader.readAsDataURL(this.inputFile)
    } else {
      this.notifyService.showError('Max file size less than 50Mb ');
    }
  }
  closeProductCrop() {
    // this.imageChangedEvent = null
    this.modalLogoutRef.hide();
  }
  // closeProductCrop() {
  //   this.isImageChangedEvent = false;
  //   this.imageChangedEvent = null;
  //   this.inputFile = null;
  //   this.cropImgPreview = null;
  //   this.avatarImg = null;
  // }
  // }

  closeHoverCrop() {
    // this.imageChangedEvent_hover = null
    this.modalLogoutRef.hide();
  }

  cropImg(e: ImageCroppedEvent) {
    this.cropImgPreview = this.sanitizer.bypassSecurityTrustUrl(e.base64);
    this.avatarImg = e.base64
  }

  cropImg2(e: ImageCroppedEvent) {
    this.hoverImage = this.sanitizer.bypassSecurityTrustUrl(e.base64);
    this.hoverimg = e.base64
  }


  imageCropPopout(template: TemplateRef<any>) {
    this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: false })
  }
  // base64ToFile(data, filename) {

  //   const arr = data.split(',');
  //   const mime = arr[0].match(/:(.*?);/)[1];
  //   const bstr = atob(arr[1]);
  //   let n = bstr.length;
  //   let u8arr = new Uint8Array(n);

  //   while(n--){
  //       u8arr[n] = bstr.charCodeAt(n);
  //   }

  //   return new File([u8arr], filename, { type: mime });
  // }


  imageLoaded(image: LoadedImage) {
    // display cropper tool
  }
  cropperReady() {
    /* cropper ready */
  }
  loadImageFailed() {
    /* show message */
  }

  remove_attri(id) {



    for (let j = 0; j < this.price_details.length; j++) {
      for (let index = 0; index < this.price_details[j].attributes.length; index++) {
        if (this.price_details[j].attributes[index].parrent_id == id) {
          this.price_details[j].attributes.splice(index, 1)
          this.attri = this.attri.filter(x => x._id != id)
        }
      }
    }
    this.form.controls['attributes'].setValue(this.attri)
    this.cd.detectChanges()

  }
  addContent() {
    this.product_details.push({ title: '', content: '' })
  }
  removeContent(i) {
    this.product_details.splice(i, 1)
  }

  detectFiles(event) {
    if (event.target.files && event.target.files[0]) {
      let files = event.target.files;
      for (let index = 0; index < files.length; index++) {
        if (this.multipleFiles.length <= 9) {

          let fileSize = files[index].size;
          let fileType = files[index].type;
          let isDocument = files[index].name.split('.')[1];
          if (fileType == "image/png" || fileType == "image/jpeg" || fileType == "image/jpg" || fileType == "image/webp" || fileType == "application/pdf" || isDocument == "doc" || isDocument == "docx") {
            if (fileSize / 1024 > 15360) {
              return this.notifyService.showError('Error!, Allowed only maximum of 15MB');
            }
            this.getBase64(files[index]).then(
              (data: any) => {

                this.multipleFiles.push(data);
                this.Preview_files.push(data);
                this.isImageSelected = true;
              }
            );
            // this.multipleFiles.push(file)
            // var reader = new FileReader();
            // reader.onload = (event:any) => {
            //   this.Preview_files.push((event.target.result)); 
            // }            
            // reader.readAsDataURL(file);         
          } else {
            this.notifyService.showError('Only support Pdf, Jpg, Png, Jpeg,webp');
          }
        } else {
          this.notifyService.showError('Sorry, Allowed only 10 images');
        }
      }
      // for (let file of files) {         
      //   let fileSize = file.size;
      //   let fileType = file['type'];
      //   let isDocument = file.name.split('.')[1];
      //   if (fileType == "image/png" || fileType == "image/jpeg" || fileType == "image/jpg" || fileType == "application/pdf" || isDocument == "doc" || isDocument == "docx") {
      //     if (fileSize / 1024 > 15360) {
      //       return this.notifyService.showError('Error!, Allowed only maximum of 15MB');
      //     }
      //     this.getBase64(file).then(
      //       (data: any) =>
      //       {
      //         this.multipleFiles.push(data);
      //         this.Preview_files.push(data); 
      //       }
      //     );
      //     // this.multipleFiles.push(file)
      //     // var reader = new FileReader();
      //     // reader.onload = (event:any) => {
      //     //   this.Preview_files.push((event.target.result)); 
      //     // }            
      //     // reader.readAsDataURL(file);         
      //   } else {
      //     this.notifyService.showError('Only support Pdf, Jpg, Png, Jpeg');
      //   }  

      // }

    }
  }


  closeMultiImage(index: number, url) {
    if (this.multipleFiles.length > 0) {
      if (index > -1) {
        this.Preview_files.splice(index, 1);
        var findIndex = this.multipleFiles.indexOf(url);
        if (findIndex != -1) {
          this.multipleFiles.splice(findIndex, 1);
        }
        if (this.documentFiles) {
          var find_Index = this.documentFiles.indexOf(url);
          if (find_Index != -1) {
            this.documentFiles.splice(find_Index, 1);
          }
        }
        if (this.multipleFiles.length == 0) {
          this.addimg.nativeElement.value = ''
          this.isImageSelected = false;
        }
      }
    } else {
      if (index > -1) {
        this.Preview_files.splice(index, 1);
        if (this.documentFiles) {
          this.documentFiles.splice(index, 1);
        }
      }
    }
  }

  changeSlug() {
    if (this.productName) {
      this.productSlug = this.productName.trim().toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
    } else {
      this.productSlug = "";
    }
  }

  attri_filter_get(parent_id) {
    if (parent_id) {
      return this.attributesdata.find(x => x._id === parent_id);
    } else {
      return [];
    }
  }


}
