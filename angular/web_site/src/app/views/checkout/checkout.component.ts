import {
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild,
  Renderer2,
  numberAttribute,
  ChangeDetectorRef,
} from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { AbstractControl, NgForm } from '@angular/forms';
import * as moment from 'moment';
// import { load } from "@cashfreepayments/cashfree-js";
import { PincodeService } from 'src/app/_services/pincode.service';

// import { MapsAPILoader } from '@agm/core';
import { COUNTRY } from 'src/app/_services/country';
import { PhoneNumberUtil } from 'google-libphonenumber';
import {
  SearchCountryField,
  CountryISO,
  PhoneNumberFormat,
} from '@khazii/ngx-intl-tel-input';
const phoneNumberUtil = PhoneNumberUtil.getInstance();

import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { map, Subscription } from 'rxjs';
import { parse } from 'querystring';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';

declare const Cashfree: any;
declare const Razorpay: any;






export function noWhitespaceValidator(control: AbstractControl) {
  const isWhitespace = (control.value || '').trim().length === 0;
  const isValid = !isWhitespace;
  return isValid ? null : { whitespace: true };
}


// const Razorpay = require('')
@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  @ViewChild('addressForm') form: NgForm;
  @ViewChild('billingForm') BillForm: NgForm;
  couponCode: any = "";
  // private geoCoder: google.maps.Geocoder;
  shippingvalues: any
  pincode: string = '';
  pincodeDetails: any;

  totalWeight: any;
  useSameAddress: boolean = true;
  flowcart: any;
  flowdelivery: any;
  shippingCharge: any = 0;
  firstname: any
  lastname: any
  addresses: any
  countries: any
  pincodes: any
  states: any
  totalTax: number = 0;
  cities: any
  phone_numberss: any
  emailExistsError = false; 
  mockAddress:any;
  emails: any
  currency_symbol: any;
  flowpayment: any;
  flowcart_show: boolean = true;
  totalMtotal: any
  flowdelivery_show: boolean = false;
  flowpayment_show: boolean = false;
  cartDetails: any;
  settings: any;
  selectedOption: string = '';
  codCharge: Number = 50;
  userId: any;
  cityid: any;
  stripepublihser_key: any;
  submitted: Boolean = false;
  billsubmitted: Boolean = false;
  timeslot: any[] = [];
  timedata = [];
  day = new Date();
  day1: Date;
  day2: Date;
  day3: Date;
  day4: Date;
  day5: Date;
  day6: Date;
  day7: Date;

  time_schedule_date: any;
  schedule_time_slot: any;
  delivery_charge: any;
  lat: any;
  long: any;
  billindatas: any;
  order_address: any;
  deliveryAddress: any;
  userDetail: any;
  appiledCouponCode: any = {
    coupon_code: '',
    coupon_discount: '',
    coupon_price: ''
  };
  couponModelRef: BsModalRef;
  addrsModelRef: BsModalRef;
  couponData: any[] = [];
  IsVisible: boolean = false;
  tislot: any;
  AddressType = [
    { value: 'home', id: 'HOME', selected: false },
    { value: 'work', id: 'WORK', selected: false },
    { value: 'other', id: 'OTHERS', selected: false },
  ];
  @ViewChild('searchmap') public searchElementRef: ElementRef;
  @ViewChild('addresspage') public addresRef: ElementRef;
  @ViewChild('ariaExpan') public ariaExpan: ElementRef;
  orderAddress: any[] = [];
  address: any;
  deliveryDate: any;
  terms_and: boolean = false;
  terms_and_cod: boolean = false;
  userDetails: any;
  CountryISO = CountryISO;
  SearchCountryField = SearchCountryField;
  PhoneNumberFormat = PhoneNumberFormat;
  preferredCountries: CountryISO[] = [
    CountryISO.UnitedStates,
    CountryISO.UnitedKingdom,
  ];
  selectedCountryISO: CountryISO;
  separateDialCode = false;
  checkpassword: any;
  mapsearch = {} as any;
  showpayout: boolean = false;
  editEmail: boolean = false;
  showContinue: boolean = false;
  user_email: any;
  showcontion: boolean = false;
  showCodCondition: boolean = false;
  apiUrl: any;
  check_time_slot: boolean;
  shippingPage: Boolean = false;
  paymentPage: Boolean = false;
  informationPage: Boolean = false;
  productDetail: any;
  bynow: boolean = false;
  changeSizeRef: BsModalRef;
  select_size: any;
  sizeArray: any[] = [];
  productid: any;
  cart_id: any;
  cartpage: boolean = false;
  checkoutpage: boolean = true;
  old_size: any;
  cashfree: any;
  paymentmethods: any;
  paymentHandler: any;
  start_time: void;
  slot_end_time: void;
  slot_start_time: void;
  shipping_banner: any;
  new_timeSlots: any[];
  today: any;
  slot_time: any;
  cartCount: number;
  shippingAddress: any;
  selectedAddressId: string | null = null;
  shipform: boolean = false
  billingAddress: any;
  valupacks = {
    dots: false,
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
  isShowDiv = false;
  isHiddenDiv = true;
  selectedCoupon: any;
  guestLogin:boolean=false;
  nearestCoupon: any;
  taxDeatails: any;
  totaltax: any;
  cartDetailsSubscription: Subscription;
  shipformNew: boolean = false
  toggleDisplayDiv() {
    this.isShowDiv = !this.isShowDiv;
    this.isHiddenDiv = !this.isHiddenDiv;
  }
  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    // private mapsAPILoader: MapsAPILoader,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone,
    private render: Renderer2,
    private http: HttpClient,
    private pincodeService: PincodeService
  ) {
    this.apiUrl = environment.apiUrl;
    const getGuest= localStorage.getItem('guest_login')
    if(getGuest=='true'){
      this.guestLogin=true;
    }
    this.apiService
      .CommonApi(Apiconfig.siteSettign.method, Apiconfig.siteSettign.url, {})
      .subscribe((result) => {
        console.log(result.settings, 'resulttttttttttttttttttttttttt');
        this.currency_symbol = result.settings.currency_symbol;
        this.shipping_banner = result.settings.shipping_banner
      });
    this.apiService.CommonApi(Apiconfig.getshippingManagement.method, Apiconfig.getshippingManagement.url, {}).subscribe(result => {
      if (result && result.data && result.data.docdata && result.data.docdata.status == true) {
        console.log(result.data.docdata.doc, "result.data.docdata.doc");
        this.shippingvalues = result.data.docdata.doc


        // this.profPrice = result.data.docdata.doc.price
        //  this.shipping_id = result.data.docdata.doc._id
        //  this.kilos = result.data.docdata.doc.kilogram
      }
    });
    this.store.generalSettings.subscribe(async (result) => {
      this.settings = result;
      if (this.settings.time_slot == 'disable') {
        const days = this.settings.delivery_days;
        const thisDate = new Date();
        const deliveryDate = moment(thisDate).add(days, 'days');
        const formatDate = moment(deliveryDate).format('MMM DD YYYY');
        console.log(formatDate, 'this is the format dataaa');
        this.deliveryDate = formatDate;

        console.log('deliver date 1', this.deliveryDate);
      }
      console.log(result, 'result');
    });

    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    console.log(this.userDetails, 'this.userDetailsthis.userDetails');

    if (this.userDetails && this.userDetails.email) {
      this.loadmap();
    }
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }

    // this.getCardDetails();
    var dat = new Date();
    dat.setDate(this.day.getDate() + 5);
    let unformattedDate = new Date(dat);
    this.deliveryDate = moment(this.deliveryDate).format(
      'ddd MMM DD YYYY, h: mm a'
    );
    console.log('deliver date 2', this.deliveryDate);

    this.getOrderAddress();
    // this.apiService.CommonApi(Apiconfig.shipManagement.method, Apiconfig.shipManagement.url, {}).subscribe(res => {
    //   if(res && res.data && res.data.docdata &&  res.data.docdata.status == true){
    //     console.log(res,"suryaaaaaaaaaaaaaaaa");

    //   }

    // })
  }

  fetchPincodeDetails(): void {
    console.log("sssssssssssssssssssssssssssssssss");
    
    if (this.pincodes) {
      this.pincodeService.getPincodeDetails(this.pincodes).subscribe(
        (data) => {
          this.pincodeDetails = data;
          console.log(this.pincodeDetails,"sssssssssssssssssssssssssssssssss");

        },
        (error) => {
          console.error('Error fetching pincode details:', error);
        }
      );
    }
  }

  limitInputLength(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 15) {
      input.value = input.value.slice(0, 15);
    }
  }

  billlimitInputLength(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 15) {
      input.value = input.value.slice(0, 15);
    }
  }
  ngOnInit(): void {
    this.informationPage = true;
    console.log(
      this.selectedOption,
      'selectedOptionselectedOptionselectedOption'
    );

    this.checkTimeSlot();
    window.scroll(0, 0);
    this.cartDetails = {};
    this.cartDetails.CartLoader = false;
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params && params['pay']) {
        this.bynow = true;
        this.getCardDetails();
        this.getpaymentmethods();
      } else {
        this.getCardDetails();
        this.getpaymentmethods();
      }
    });


    this.cartDetailsSubscription = this.store.cartdetails.subscribe((result) => {
      this.cartDetails = result;
      console.log(this.cartDetails,"cacaacacacacacac");
      
      this.getCardDetails(); // Call your function whenever cart details change
    });

    this.apiService
      .CommonApi(Apiconfig.stripedata.method, Apiconfig.stripedata.url, {})
      .subscribe((res) => {
        let data = res;
        this.stripepublihser_key = res.settings.publisher_key;
        this.invokeStrip();
      });
    // this.invokeStrip()
    if (this.userId) {
      // time slot
      this.apiService
        .CommonApi(
          Apiconfig.timeSlotData.method,
          Apiconfig.timeSlotData.url,
          {}
        )
        .subscribe((result) => {
          if (result && result.status == 1) {
            this.timeslot = result.timeslots ? result.timeslots : [];
            console.log(
              'this is the result++++++++++++++++++++++++++++ggg+++++++++++++++++++',
              result
            );

            this.getcurrentdayslots(this.day1);
            // this.newTimeData()
          }
        });

      this.socketService
        .socketCall('r2e_get_user_details', { userId: this.userId })
        .subscribe((result) => {
          console.log(result, 'this is the user details');

          if (result && result.err == 0 && result.userDetails) {
            this.userDetail = result.userDetails;
            this.user_email = this.userDetail.sample_email
              ? this.userDetail.sample_email
              : this.userDetail.email;
            if (!this.user_email) {
              this.showContinue = true;
            }
          }
        });
      this.getAddress();
    }
    this.setCurrentCountryFlag();
    if (this.userId) {
      this.apiService
        .CommonApi(
          Apiconfig.getShippingAddress.method,
          Apiconfig.getShippingAddress.url,
          { id: this.userId }
        )
        .subscribe((res) => {
          console.log('ressssssssssssssssssssssssssssssssssss', res);
          if (
            typeof (res && res.data && res.data.status) != 'undefined' &&
            (res && res.data && res.data.status) == '1'
          ) {
            this.shippingAddress = res.data;
            console.log(
              this.shippingAddress,
              'this.shippingAddressthis.shippingAddress'
            );
            // setTimeout(() => {



            this.emails = this.shippingAddress.email
            this.firstname = this.shippingAddress.first_name
            this.lastname = this.shippingAddress.last_name
            this.addresses = this.shippingAddress.line1
            this.countries = this.shippingAddress.country
            this.pincodes = this.shippingAddress.zipcode
            this.states = this.shippingAddress.state
            this.cities = this.shippingAddress.city
            this.phone_numberss = this.shippingAddress.phone.number





            const defaultAddress = this.shippingAddress.addressList.find(address => address.isDefault === 2);
            this.selectedAddressId = defaultAddress ? defaultAddress._id : null;
            console.log(this.selectedAddressId, "selected");

            // this.form.controls['first_name'].setValue(
            //   this.shippingAddress.first_name
            // );
            // this.form.controls['last_name'].setValue(
            //   this.shippingAddress.last_name
            // );
            // this.form.controls['country'].setValue(
            //   this.shippingAddress.country
            // );
            // this.form.controls['address'].setValue(this.shippingAddress.line1);
            // this.form.controls['city'].setValue(this.shippingAddress.city);
            // this.form.controls['state'].setValue(this.shippingAddress.state);
            // this.form.controls['pincode'].setValue(
            //   this.shippingAddress.zipcode
            // );
            // this.form.controls['phone_number'].setValue(
            //   this.shippingAddress.phone.number
            // );
            // this.form.controls['email'].setValue(this.shippingAddress.email);
            // }, 500);
          }
          // else {
          //   if (typeof res.errors != 'undefined') {
          //     this.notifyService.showError(res.errors);
          //   }

          // }
        });

      this.apiService
        .CommonApi(
          Apiconfig.getBillingAddress.method,
          Apiconfig.getBillingAddress.url,
          { id: this.userId }
        )
        .subscribe((res) => {
          console.log('ressssssssssssssssssssssssssssssssssss', res);
          if (
            typeof (res && res.data && res.data.status) != 'undefined' &&
            (res && res.data && res.data.status) == '1'
          ) {
            this.billingAddress = res.data;
            this.BillForm.controls['first_name'].setValue(
              this.billingAddress.first_name
            );
            this.BillForm.controls['last_name'].setValue(
              this.billingAddress.last_name
            );
            this.BillForm.controls['country'].setValue(
              this.billingAddress.country
            );
            this.BillForm.controls['address'].setValue(
              this.billingAddress.line1
            );
            this.BillForm.controls['city'].setValue(this.billingAddress.city);
            this.BillForm.controls['state'].setValue(this.billingAddress.state);
            this.BillForm.controls['pincode'].setValue(
              this.billingAddress.zipcode
            );
            this.BillForm.controls['phone_number'].setValue(
              this.billingAddress.phone_number
            );
            //  this.BillForm.controls['email'].setValue(this.billingAddress.email)
          }
          // else {
          //   if (typeof res.errors != 'undefined') {
          //     this.notifyService.showError(res.errors);
          //   }

          // }
        });
    }
  } //

  onPincodeChange(): void {
    console.log(this.pincodes,"locationlocationlocationlocation");
    
    if (this.pincodes.length >= 4) {
this.apiService.CommonApi(Apiconfig.emailRegisterCheck.method, Apiconfig.emailRegisterCheck.url, { email: this.emails })
        .subscribe({
          next: (result) => {
            if (result.status) {
              console.log('Email is available');
              this.emailExistsError = false;
            } else {
              console.log('Email already exists');
              this.emailExistsError = true;
            }
          },
          error: () => {
            console.error('API call failed');
            this.emailExistsError = true; // Show error if the request fails
          }
        });

      // this.apiService.getPostalData(this.pincodes).subscribe(
      //   (res: any) => {
      //     console.log(location,res,"locationlocationlocationlocation");
      //     if (res && res.status === 'success' && res.data) {
      //       const location = res.data; // Assuming API response structure
            
      //       this.cities = location.city || ''; // Update city
      //       this.states = location.state || ''; // Update state
      //       this.countries = location.country || 'India'; // Update country
      //     } else {
      //       console.error('Invalid pincode or data unavailable.');
      //     }
      //   },
      //   (error) => {
      //     console.error('Error fetching location data:', error);
      //   }
      // );
    }
  }
  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.cartDetailsSubscription) {
      this.cartDetailsSubscription.unsubscribe();
    }
  }


  newAddress() {
    if (this.shipformNew) {
      this.emails = ""
      this.firstname = ""
      this.lastname = ""
      this.addresses = ""
      this.countries = ""
      this.pincodes = ""
      this.states = ""
      this.cities = ""
      this.phone_numberss = ""
      this.selectedAddressId=''
    }
  }
  checkVerifyEmail() {
    console.log('Triggered email verification');
    if(this.guestLogin){
      const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  
      console.log("HIIIIIII");
    
      // Check if email matches the pattern
      if (emailPattern.test(this.emails)) {
  
      this.apiService.CommonApi(Apiconfig.emailRegisterCheck.method, Apiconfig.emailRegisterCheck.url, { email: this.emails })
        .subscribe({
          next: (result) => {
            if (result.status) {
              console.log('Email is available');
              this.emailExistsError = false;
            } else {
              console.log('Email already exists');
              this.emailExistsError = true;
            }
          },
          error: () => {
            console.error('API call failed');
            this.emailExistsError = true; // Show error if the request fails
          }
        });
        }
    }
  }
  editAddress(id) {
    if (this.userId) {
      let data = {
        user_id: this.userId,
        address_id: id,
      }
      this.apiService.CommonApi(Apiconfig.editShippingAddress.method, Apiconfig.editShippingAddress.url, data).subscribe(res => {
        console.log("ressssssssssssssssssssssssssssssssssss", res);
        if (typeof (res && res.data) != 'undefined') {
          this.shippingAddress = res.data;
          //  this.form.controls['first_name'].setValue(this.shippingAddress.first_name)
          //  this.form.controls['last_name'].setValue(this.shippingAddress.last_name)
          //  this.form.controls['country'].setValue(this.shippingAddress.country)
          //  this.form.controls['address'].setValue(this.shippingAddress.line1)
          //  this.form.controls['city'].setValue(this.shippingAddress.city)
          //  this.form.controls['state'].setValue(this.shippingAddress.state)
          //  this.form.controls['pincode'].setValue(this.shippingAddress.zipcode)
          //  this.form.controls['phone_number'].setValue(this.shippingAddress.phone.number)
          //  this.form.controls['email'].setValue(this.shippingAddress.email)
          //  this.form.controls['choose_location'].setValue(this.shippingAddress && (this.shippingAddress.choose_location != (undefined || null || '')) &&  this.shippingAddress.choose_location ? this.shippingAddress.choose_location: "home")


        }
        // else {
        //   if (typeof res.errors != 'undefined') {
        //     this.notifyService.showError(res.errors);
        //   }

        // }
      })
    }


    if (this.shipform) {
      this.emails = this.shippingAddress.email
      this.firstname = this.shippingAddress.first_name
      this.lastname = this.shippingAddress.last_name
      this.addresses = this.shippingAddress.line1
      this.countries = this.shippingAddress.country
      this.pincodes = this.shippingAddress.zipcode
      this.states = this.shippingAddress.state
      this.cities = this.shippingAddress.city
      this.phone_numberss = this.shippingAddress.phone.number

    }
    this.cd.detectChanges()
  }



  setDefaultAddress(addressId: string) {
    let data = {
      address_id: addressId,
      user_id: this.userId
    }
    // Call your service to update the default address in the backend
    this.apiService.CommonApi(Apiconfig.setAsDefaultShippingAddress.method, Apiconfig.setAsDefaultShippingAddress.url, data).subscribe(response => {
      // Handle response
      console.log("Default address updated", response);
      if (this.userId) {
        this.apiService
          .CommonApi(
            Apiconfig.getShippingAddress.method,
            Apiconfig.getShippingAddress.url,
            { id: this.userId }
          )
          .subscribe((res) => {
            console.log('ressssssssssssssssssssssssssssssssssss', res);
            if (
              typeof (res && res.data && res.data.status) != 'undefined' &&
              (res && res.data && res.data.status) == '1'
            ) {
              this.shippingAddress = res.data;
              console.log(
                this.shippingAddress,
                'this.shippingAddressthis.shippingAddress'
              );
              // setTimeout(() => {



              this.emails = this.shippingAddress.email
              this.firstname = this.shippingAddress.first_name
              this.lastname = this.shippingAddress.last_name
              this.addresses = this.shippingAddress.line1
              this.countries = this.shippingAddress.country
              this.pincodes = this.shippingAddress.zipcode
              this.states = this.shippingAddress.state
              this.cities = this.shippingAddress.city
              this.phone_numberss = this.shippingAddress.phone.number





              const defaultAddress = this.shippingAddress.addressList.find(address => address.isDefault === 2);
              this.selectedAddressId = defaultAddress ? defaultAddress._id : null;
              // this.form.controls['first_name'].setValue(
              //   this.shippingAddress.first_name
              // );
              // this.form.controls['last_name'].setValue(
              //   this.shippingAddress.last_name
              // );
              // this.form.controls['country'].setValue(
              //   this.shippingAddress.country
              // );
              // this.form.controls['address'].setValue(this.shippingAddress.line1);
              // this.form.controls['city'].setValue(this.shippingAddress.city);
              // this.form.controls['state'].setValue(this.shippingAddress.state);
              // this.form.controls['pincode'].setValue(
              //   this.shippingAddress.zipcode
              // );
              // this.form.controls['phone_number'].setValue(
              //   this.shippingAddress.phone.number
              // );
              // this.form.controls['email'].setValue(this.shippingAddress.email);
              // }, 500);
            }
            // else {
            //   if (typeof res.errors != 'undefined') {
            //     this.notifyService.showError(res.errors);
            //   }

            // }
          });
      }


    });
  }

  deleteAddress(addressId: string) {
    let data = {
      address_id: addressId,
      user_id: this.userId
    }
    this.apiService.CommonApi(Apiconfig.deleteShippingAddress.method, Apiconfig.deleteShippingAddress.url, data).subscribe(response => {
      if (response.status === 1) {
        // Optionally, refresh the address list or remove the deleted address from the local state
        this.shippingAddress.addressList = this.shippingAddress.addressList.filter(address => address._id !== addressId);
        this.notifyService.showSuccess('Address deleted successfuly');

      } else {
        // Handle the error scenario
        this.notifyService.showError(response.message || 'Error deleting address');
      }
    }, error => {
      console.error('Error:', error);
      this.notifyService.showError('An error occurred while deleting the address.');
    });
  }













  checkTimeSlot() {
    try {
      this.apiService
        .CommonApi(
          Apiconfig.checkTimeSlot.method,
          Apiconfig.checkTimeSlot.url,
          {}
        )
        .subscribe((res) => {
          if (res.length > 0) {
            this.check_time_slot = true;
          } else {
            this.check_time_slot = false;
          }
        });
    } catch (error) { }
  }
  invokeStrip() {
    if (!window.document.getElementById('stripe-script')) {
      const script = window.document.createElement('script');
      script.id = 'stripe-script';
      script.type = 'text/javascript';
      script.src = 'https://checkout.stripe.com/checkout.js';
      script.onload = () => {
        this.paymentHandler = (<any>window).StripeCheckout.configure({
          key: this.stripepublihser_key,
          locale: 'auto',
          token: function (stripeToken: any) {
            console.log('stripeToken', stripeToken);
          },
        });
      };
      window.document.body.appendChild(script);
    }
  }
  getpaymentmethods() {
    this.apiService
      .CommonApi(
        Apiconfig.getPaymentMethode.method,
        Apiconfig.getPaymentMethode.url,
        {}
      )
      .subscribe((res) => {
        this.paymentmethods = res;
        console.log(
          res,
          'this is the getpayment methode response data will be shown here'
        );
      });
  }

  getDayOfWeek(date) {
    const dayOfWeek = new Date(date).getDay();
    return isNaN(dayOfWeek)
      ? null
      : [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ][dayOfWeek];
  }

  getcurrentdayslots(value) {
    console.log(
      this.schedule_time_slot,
      'schedule_time_slot schedule_time_slot'
    );

    console.log(value, 'this is the value+================================');
    this.schedule_time_slot = undefined;
    this.timedata = [];
    this.time_schedule_date = value;
    var currentday = this.getDayOfWeek(value);
    console.log(this.timeslot, 'what about this');

    var slottimes = this.timeslot.filter((e) => e.weekday == currentday) as any;
    console.log(slottimes, 'this is the slot times');
    var currenttime = 0 as any;
    this.IsVisible = true;
    var settime = value;
    if (slottimes && Array.isArray(slottimes) && slottimes.length > 0) {
      if (value == this.day) {
        settime.setMinutes(settime.getMinutes() + 10);
        currenttime = moment(settime).format('hh:mm a');
        // settime.setMinutes(settime.getMinutes() - 10);

        this.slot_start_time = slottimes[0].time_start;

        this.slot_end_time = slottimes[0].time_end;
        this.today = true;
      } else {
        this.slot_start_time = slottimes[0].time_start;
        this.slot_end_time = slottimes[0].time_end;

        this.today = false;
      }
      // console.log("slottimes", slottimes[0].time_end)

      // console.log("starrtuio", slottimes[0].slottime)
      this.slot_time = slottimes[0].slottime;
      this.generateTimeSlots(
        this.slot_start_time,
        this.slot_end_time,
        this.slot_time,
        this.today
      );

      if (this.new_timeSlots && this.new_timeSlots.length > 0) {
        for (let i = 0; i < this.new_timeSlots.length; i++) {
          if (this.new_timeSlots[i + 1] != undefined) {
            this.timedata.push(
              this.new_timeSlots[i] + '-' + this.new_timeSlots[i + 1]
            );
          }
        }
      }
    }
  }
  getAddress() {
    console.log(this.userId, 'this is the user id');
    if(this.guestLogin){
      console.log(this.mockAddress,'Mock Address');
      // this.shippingAddress=this.mockAddress
      // data.first_name = shippingForm.value.first_name;
      // data.last_name = shippingForm.value.last_name;
      // data.country = shippingForm.value.country;
      // data.line1 = shippingForm.value.address;
      // data.city = shippingForm.value.city;
      // data.state = shippingForm.value.state;
      // data.pincode = shippingForm.value.pincode;
      // data.phone_number = shippingForm.value.phone_number;
      // data.email = shippingForm.value.email;
      this.shippingAddress = {
        first_name:this.mockAddress.first_name,
        last_name:this.mockAddress.last_name,
        phone:{
          code:"+91",
          number:this.mockAddress.phone_number
        },
        line1:this.mockAddress.address,
        country:this.mockAddress.country,
        city:this.mockAddress.city,
        state:this.mockAddress.state,
        email:this.mockAddress.email,
        zipcode:this.mockAddress.pincode
      }
      this.address = {
        first_name:this.mockAddress.first_name,
        last_name:this.mockAddress.last_name,
        phone:{
          code:"+91",
          number:this.mockAddress.phone_number
        },
        line1:this.mockAddress.address,
        country:this.mockAddress.country,
        city:this.mockAddress.city,
        state:this.mockAddress.state,
        email:this.mockAddress.email,
        zipcode:this.mockAddress.pincode
      }
    }else{

      this.apiService
        .CommonApi(
          Apiconfig.getDeliveryAddress.method,
          Apiconfig.getDeliveryAddress.url,
          { user_id: this.userId }
        )
        .subscribe((result) => {
          console.log(result, 'this is the adress which fetch');
  
          if (result && result.status == 1) {
            this.address = result.data[0];
            this.shippingAddress = result.data[0];
          }
        });
    }
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
          let val = 'Mauritius';
          // let val = selected.length > 0 ? selected[0].name : 'Mauritius';
          if (typeof CountryISO[val] != 'undefined') {
            this.selectedCountryISO = CountryISO[val];
          } else {
            this.selectedCountryISO = CountryISO['Mauritius'];
          }
        }
      });
    }
  }
  phoneNumberChange(event: any) {
    if (
      this.form.form.controls['phone'].value &&
      this.form.form.controls['phone'].value.number &&
      this.form.form.controls['phone'].value.number.length > 3
    ) {
      let number = phoneNumberUtil.parseAndKeepRawInput(
        this.form.form.controls['phone'].value.number,
        this.form.form.controls['phone'].value.countryCode
      );
      this.form.form.controls['phone'].setValue(
        phoneNumberUtil.formatInOriginalFormat(
          number,
          this.form.form.controls['phone'].value.countryCode
        )
      );
    }
  }
  formatNameWithVariants(name: string, variations: any[]): string {
    const variantNames = variations
      .flat()
      .map((variant) => variant.chaild_name);
    const formattedVariants = variantNames.join(', ');
    return `${name} (${formattedVariants})`;
  }


  getCardDetails() {
    this.day1 = new Date(this.day);
    this.day1.setDate(this.day.getDate() + 1);
    this.day2 = new Date(this.day1);
    this.day2.setDate(this.day1.getDate() + 1);
    this.day3 = new Date(this.day2);
    this.day3.setDate(this.day2.getDate() + 1);
    this.day4 = new Date(this.day3);
    this.day4.setDate(this.day3.getDate() + 1);
    this.day5 = new Date(this.day4);
    this.day5.setDate(this.day4.getDate() + 1);
    this.day6 = new Date(this.day5);
    this.day6.setDate(this.day5.getDate() + 1);
    this.day7 = new Date(this.day6);
    this.day7.setDate(this.day6.getDate() + 1);
    var userId = localStorage.getItem('userId');
    var data = {} as any;
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
    data.client_offset = new Date().getTimezoneOffset();
    data.schedule_type = 0;
    if (this.bynow) {
      data.cart_value = 1;
    }

    if (data.userId != '') {
      this.cartDetails = {};
      console.log('&+++data in checkoutpage', data);
      this.socketService
        .socketCall('r2e_checkout_cart_details', data)
        .subscribe((result) => {
          console.log('+++result of the cart details', result);
          const weight = [];
          if (result && result.err == 0) {
            this.cartDetails = result.cartDetails;
            this.updateTotalTax(this.cartDetails)
            // redirect to cart if the cart is empty
            if (this.userId) {
              if (
                (!this.cartDetails?.cart_details?.length)
                //  ||
                // this.cartDetails 
              ) {
                this.route.navigate(['/cart'])
              }
            }


            this.totalMtotal = this.cartDetails.cart_details.reduce((accumulator, element) => {
              return accumulator + (element.mtotal - (element.price * element.quantity));
            }, 0); // Initial value is 0


            // let myTemp  = this.cartDetails.cart_details.reduce((accumulator, element) => {
            //   return accumulator + (element.mtotal - (element.price * element.quantity));
            // }, 0);
            console.log(this.totalMtotal, "Total mtotal after subtraction");
            console.log('+++this is the cart details', this.cartDetails);
            for (let item of this.cartDetails.cart_details) {
              weight.push({ weight: item.variations[0][0].chaild_name, quantity: item.quantity });
            }
            console.log(weight, 'weightweight');
            this.appiledCouponCode = {
              coupon_code: this.cartDetails.coupon_code,
              coupon_discount: this.cartDetails.coupon_discount,
              coupon_price: this.cartDetails.coupon_price
            }
            console.log('+++this is the weight details', weight);
            this.totalWeight = this.calculateTotalWeight(weight);
            console.log(this.totalWeight, "this.totalWeightthis.totalWeightthis.totalWeight");

            this.getTaxForCart(this.cartDetails)
            this.calculateShippingCharge(this.cartDetails, this.shippingvalues);
            this.fetchCoupon(this.cartDetails)


          }
        });
    }
  }








  cartchange() { }

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
          this.totaltax = parseInt(result.totalTaxAmount)
          console.log(this.totaltax, "taxtaxtax123456789");

        }
      });
  }




  // calculateTotalWeight(weights) {
  //   // Convert weight strings to kilograms
  //   const totalWeightKg = weights.reduce((total, weight) => {
  //     const match = weight.match(/^(\d+(\.\d+)?)\s*(g|kg)$/i);

  //     if (match) {
  //       const value = parseFloat(match[1]);
  //       const unit = match[3].toLowerCase();

  //       // Convert grams to kilograms if necessary
  //       if (unit === 'g') {
  //         return total + (value / 1000);
  //       } else if (unit === 'kg') {
  //         return total + value;
  //       }
  //     }

  //     // Handle invalid weight formats if needed
  //     console.warn(`Invalid weight format: ${weight}`);
  //     return total;
  //   }, 0);

  //   return totalWeightKg;
  // }

  calculateTotalWeight(weights) {
    const densityKgPerL = 1;

    const totalWeightKg = weights.reduce((total, weight) => {
      const match = weight.weight.match(/^(\d+(\.\d+)?)\s*(g|kg|ml|l)$/i);

      if (match) {
        const value = parseFloat(match[1]) * weight.quantity;
        const unit = match[3].toLowerCase();

        if (unit === 'g') {
          return total + value / 1000;
        } else if (unit === 'kg') {
          return total + value;
        } else if (unit === 'ml') {
          return total + (value / 1000) * densityKgPerL;
        } else if (unit === 'l') {
          return total + value * densityKgPerL;
        }
      }

      console.warn(`Invalid weight format: ${weight}`);
      return total;
    }, 0);

    return totalWeightKg;
  }

  gettimeslot(value: any) {
    console.log(value, 'sheduled time value');

    this.schedule_time_slot = value;
    console.log(
      this.schedule_time_slot,
      'sheduled time  this.schedule_time_slot  this.schedule_time_slot'
    );
  }

  getOrderAddress() {
    this.socketService
      .socketCall('r2e_get_order_address', {
        lat: this.lat,
        lon: this.long,
        userId: this.userId,
      })
      .subscribe((res) => {
        if (res && res.err == 0) {
          if (
            typeof res.Document != 'undefined' &&
            typeof res.Document.order_address != 'undefined'
          ) {
            this.orderAddress = res.Document.order_address;
            this.order_address = this.orderAddress
              .filter((e) => e.is_available == '1')
              .slice(0, 2);
            this.order_address.forEach((value: { selected: boolean }) => {
              value.selected = false;
            });
            if (
              this.deliveryAddress &&
              typeof this.deliveryAddress.address != 'undefined' &&
              typeof this.deliveryAddress.address._id != 'undefined'
            ) {
              var is_address_available = false;
              this.order_address.forEach(
                (value: {
                  _id: any;
                  selected: boolean;
                  is_available: any;
                  loc: { lat: any; lng: any };
                }) => {
                  if (value._id == this.deliveryAddress.address._id) {
                    is_address_available = true;
                    value.selected = true;
                    this.deliveryAddress.selected = true;
                    this.deliveryAddress.address = value;
                    this.deliveryAddress.is_available = value.is_available;
                    var search = { lat: value.loc.lat, long: value.loc.lng };
                    // this.getEstimatedDeliveryTime(search);
                  }
                }
              );
              var order_address = [];
              if (is_address_available == false) {
                this.orderAddress.forEach((value) => {
                  if (value._id == this.deliveryAddress.address._id) {
                    value.selected = true;
                    this.deliveryAddress.selected = true;
                    this.deliveryAddress.address = value;
                    this.deliveryAddress.is_available = value.is_available;
                    var search = { lat: value.loc.lat, long: value.loc.lng };
                    // this.getEstimatedDeliveryTime(search);
                    order_address.push(value);
                  }
                });
                order_address = order_address.concat(this.order_address);
                this.order_address = order_address.slice(0, 2);
              }
            }
          }
        }
      });
  }

  loadmap() {
    console.log('this is load map and it returns true');

    /* this.mapsAPILoader.load().then(() => {
      this.geoCoder = new google.maps.Geocoder;
      let searchEl: any | HTMLInputElement = document.getElementById('searchmap');
      let options = {
        types: ['geocode']
      }
      let autocomplete = new google.maps.places.Autocomplete(searchEl);

      // const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();

          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          let addrComp: any = place.address_components;
          for (var i = 0; i < addrComp.length; i++) {
            for (var j = 0; j < addrComp[i].types.length; j++) {
              if (addrComp[i].types[j] == 'sublocality_level_1') {
                this.mapsearch.line1 = addrComp[i].long_name;
              }
              if (addrComp[i].types[j] == 'route') {
                this.mapsearch.street = addrComp[i].long_name;
              }
              if (addrComp[i].types[j] == 'street_number') {
                this.mapsearch.street_number = addrComp[i].long_name;
              }
              if (addrComp[i].types[j] == 'locality') {
                this.mapsearch.city = addrComp[i].long_name;
              }
              if (addrComp[i].types[j] == 'country') {
                this.mapsearch.country = addrComp[i].long_name;
              }
              if (addrComp[i].types[j] == 'postal_code') {

                this.mapsearch.zipcode = addrComp[i].long_name;
              }
              if (addrComp[i].types[j] == 'administrative_area_level_1' || addrComp[i].types[j] == 'administrative_area_level_2') {
                this.mapsearch.state = addrComp[i].long_name;
              }

            }
          }
          //set latitude, longitude and zoom
          this.mapsearch.street = this.mapsearch.street + ' ' + (this.mapsearch.street_number ? this.mapsearch.street_number : '');
          this.mapsearch.fulladres = place.formatted_address;
          this.mapsearch.line1 = place.formatted_address;

          this.mapsearch.loader = 1;
          this.mapsearch.count = 0;
          this.mapsearch.lat = place.geometry.location.lat();
          this.mapsearch.long = place.geometry.location.lng();
          this.lat = place.geometry.location.lat();
          this.long = place.geometry.location.lng();
          // this.addressGet(lat, long)
        });
      });
    }); */
  }

  AddNewAddress(address: any) {
    this.mapsearch = address;
  }

  updateDeliveryAddress(address: any, event: any) { }

  checkout() {
    this.flowcart_show = true;
    this.flowdelivery_show = false;
    this.flowpayment_show = false;
  }
  deliverychange() { }
  paymentchange() { }

  // calculateShippingCharge(carddetails: any) {
  //   this.shippingCharge = carddetails.pay_total > 399 ? 0 : 75;
  //   console.log(
  //     this.shippingCharge,
  //     this.cartDetails.pay_total,
  //     'this.shippingCharge'
  //   );
  //   return {
  //     pay_total: this.cartDetails.pay_total,
  //     shipping_charge: this.shippingCharge,
  //     total_amount: this.cartDetails.pay_total + this.shippingCharge,
  //   };
  // }

  calculateShippingCharge(cartDetails: any, shippingData: any) {
    this.shippingCharge = 0;

    // Always check if totalWeight exceeds the kilogram threshold
    if (this.totalWeight > shippingData.kilogram) {
      // If the weight exceeds the `kilogram` threshold, set shipping charge to static 75
      this.shippingCharge = this.shippingvalues.constAmount;
    } else {
      // If totalWeight is less than or equal to `kilogram`, calculate based on weight range and pay total

      // First, check if pay_total exceeds the max value of any price range
      const priceRange = shippingData.price.find((range: any) => {
        return cartDetails.pay_total <= parseFloat(range.max);
      });

      if (priceRange) {
        // If pay_total is greater than the max value in any price range, set shipping charge to 0
        if (cartDetails.pay_total > parseFloat(priceRange.max)) {
          this.shippingCharge = 0;
        } else {
          // Otherwise, set the shipping charge to the corresponding amount
          this.shippingCharge = parseFloat(priceRange.amount);
        }
      }
    }

    console.log('Shipping Charge:', this.shippingCharge);
    console.log("Shipping Data:", shippingData);
    console.log('Cart Total Weight:', this.totalWeight);
    console.log('Cart Pay Total:', cartDetails.pay_total);

    // Calculate the total amount with the final shipping charge
    return {
      pay_total: cartDetails.pay_total,
      shipping_charge: this.shippingCharge,
      total_amount: cartDetails.pay_total + this.shippingCharge,
    };
  }


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
  updateTotalTax(cartDetails : any) {
    this.totalTax = this.getTotalTax(cartDetails);
  }




  placeOrderCODPayment() {
    // if (this.settings.time_slot == "enable" && this.schedule_time_slot == undefined) {
    //   return this.notifyService.showError('Please select a time which is preffered')
    // };
    if (!this.address) {
      this.notifyService.showError('Please add your delivery address');
      return false;
    }

    if (!this.emails) {
      this.notifyService.showError('Please enter the email');
      return false;
    }

    if (this.useSameAddress == false) {
      console.log('this has to work...');
      this.billsubmitted = true;
      if (!this.BillForm.valid) {
        console.log(this.BillForm, 'this is billform');
        console.log(this.BillForm.errors, 'billform errors');
        this.notifyService.showError(
          'Please fill the all the mandatory fields'
        );
        return false;
      }
    }
    // if (!this.terms_and_cod) {
    //   this.notifyService.showError('Please accept the terms and conditions')
    //   return false;
    // }
    if (this.address) {
      if (this.address) {
        var data = {} as any;
        data.userId = '';
        if (this.userId) {
          data.userId = this.userId;
          data.type = 'cart';
        }
        if(this.guestLogin){
          data.guestLogin=true;
          const getGuestId= localStorage.getItem('guestId')
          var serveykey = sessionStorage.getItem('serverKey');
          if (serveykey) {
            data.userId = serveykey;
            data.type = 'temp_cart';
          }
          data.guestId=getGuestId
          data.type = 'temp_cart';
        }
        if (this.useSameAddress == false) {
          data.billingAddress = this.billingAddress;
          // this.billingAddress = this.BillForm.value;

          console.log(data, 'this is the data to test for billing');
        }
        // data.cityid = this.cityid;
        data.schedule_type = 0;
        if (data.userId != '' || this.guestLogin) {
          data.client_offset = new Date().getTimezoneOffset();
          if (this.bynow) {
            this.socketService
              .socketCall('r2e_cart_details', data)
              .subscribe((result) => {
                if (result && result.err == 0) {
                  // if (typeof result.cartDetails != 'undefined' && typeof result.cartDetails._id != 'undefined') {
                  result.cartDetails.pay_total = parseFloat(
                    result.cartDetails.pay_total
                  );
                  // console.log(result.cartDetails.pay_total, 'result.cartDetails.pay_totalresult.cartDetails.pay_total');
                  // console.log(this.cartDetails, 'this is the cart details payload');
                  this.cartDetails.shipping_address = {};
                  this.cartDetails.billing_address = {};
                  this.cartDetails.shipping_address = this.shippingAddress
                    ? this.shippingAddress
                    : {};
                  this.cartDetails.billing_address = this.billingAddress
                    ? this.billingAddress
                    : {};
                  if (this.cartDetails.pay_total) {
                    // this.cartDetails = result.cartDetails;
                    this.cartDetails.user_id = data.userId;
                    // this.cartDetails.delivery_charge = this.delivery_charge;
                    this.cartDetails.delivery_address = this.address;
                    // this.cartDetails.billing_address =  data.billingAddress;
                    console.log(
                      this.cartDetails,
                      'this is the delivery address+++++++++++++++++++++'
                    );

                    this.cartDetails.schedule_type = 0;
                    // if (result.cartDetails.refer_offer) {
                    //   this.cartDetails.refer_offer = result.cartDetails.refer_offer;
                    // }
                    if (this.settings.time_slot != 'enable') {
                      const days = this.settings.delivery_days;
                      const thisDate = new Date();
                      const deliveryDate = moment(thisDate).add(days, 'days');
                      const formatDate =
                        moment(deliveryDate).format('DD/MM/yyyy');
                      this.cartDetails.schedule_date = formatDate;
                    } else {
                      this.cartDetails.schedule_date = moment(
                        this.time_schedule_date
                      ).format('DD/MM/yyyy');
                      this.cartDetails.schedule_time_slot =
                        this.schedule_time_slot;
                    }
                    if (this.cartDetails) {
                      this.cartDetails.client_offset =
                        new Date().getTimezoneOffset();
                      this.cartDetails.buyNow = true;
                      this.apiService
                        .CommonApi(
                          Apiconfig.codPayment.method,
                          Apiconfig.codPayment.url,
                          this.cartDetails
                        )
                        .subscribe((resp) => {
                          if (resp.status == '1') {
                            // console.log("+++++++++++++++++++++++622+++++++++++++++++++++++++++++++++")
                            // this.route.navigate(['/payment-success']);
                            // this.route.navigate(['/cod-success']).then(() => {
                            //   window.location.reload()
                            // })
                          } else {
                            this.route.navigate(['/payment-failure']);
                          }
                        });
                    } else {
                      if (
                        this.cartDetails.status != 1 ||
                        this.cartDetails.availability != 1 ||
                        this.cartDetails.is_available != 1
                      ) {
                        this.notifyService.showError(
                          'Sorry, this restaurant is not available for checkout'
                        );
                      } else if (this.cartDetails.is_coupon_err != '') {
                        this.notifyService.showError(
                          'Sorry, you have applied invalid coupon code'
                        );
                      } else if (
                        this.cartDetails.is_food_deleted == 1 ||
                        this.cartDetails.food_not_available == 1
                      ) {
                        this.notifyService.showError(
                          'Sorry, the selected food item is unavailable'
                        );
                      } else if (this.cartDetails.is_addons_deleted == 1) {
                        this.notifyService.showError(
                          'Sorry, the selected add-on is unavailable'
                        );
                      } else {
                        this.notifyService.showError(
                          'Something went to wrong. Please try again 1'
                        );
                      }
                    }
                  } else {
                    this.notifyService.showError(
                      'Something went to wrong. Please try again 2'
                    );
                    // window.location.reload();
                  }
                  // } else {
                  //   this.notifyService.showError('Something went to wrong. Please try again 3');
                  //   // window.location.reload();
                  // }
                } else {
                  this.notifyService.showError(
                    'Something went to wrong. Please try again 4'
                  );
                  // window.location.reload();
                }
              });
          } else {
            this.socketService
              .socketCall('r2e_cart_details', data)
              .subscribe((result) => {
                console.log(result,'this is the result in the result+++++++++++++++++++++++++++++++++++');

                if (result && result.err == 0) {
                  if (
                    typeof result.cartDetails != 'undefined' &&
                    typeof result.cartDetails._id != 'undefined'
                  ) {
                    result.cartDetails.pay_total = parseFloat(
                      result.cartDetails.pay_total
                    );
                    // console.log(result.cartDetails.pay_total, 'result.cartDetails.pay_totalresult.cartDetails.pay_total');
                    // console.log(this.cartDetails, 'this is the cart details payload');

                    if (
                      this.cartDetails.pay_total == result.cartDetails.pay_total
                    ) {
                      this.cartDetails = result.cartDetails;
                      this.cartDetails.user_id = data.userId;
                      this.cartDetails.pay_total = parseFloat(result.cartDetails.pay_total) + this.shippingCharge + this.totalTax + (this.selectedOption === 'cashOnDelivery' ? this.codCharge : 0)
                      // this.cartDetails.delivery_charge = this.delivery_charge;
                      console.log(this.address, 'this is what i want ');
                      this.cartDetails.shippingCharge = this.shippingCharge
                      this.cartDetails.service_tax = this.totalTax.toFixed(2)
                      this.cartDetails.total_weight = this.totalWeight
                      this.cartDetails.cod_charge = this.selectedOption === 'cashOnDelivery' ? this.codCharge : 0
                      this.cartDetails.delivery_address = {};
                      this.cartDetails.delivery_address = this.address;
                      this.cartDetails.shipping_address = this.shippingAddress
                        ? this.shippingAddress
                        : {};
                        this.cartDetails.guestLogin=this.guestLogin===true?this.guestLogin:false;
                      this.cartDetails.billing_address = this.billingAddress
                        ? this.billingAddress
                        : this.address;
                      if (this.useSameAddress) {
                        this.cartDetails.billing_address = this.address;
                      } else {
                        this.cartDetails.billing_address = this.billingAddress
                          ? this.billingAddress
                          : this.address;
                      }
                      console.log(
                        this.cartDetails,
                        'this is the delivery address+++++++++++++++++++++'
                      );

                      this.cartDetails.schedule_type = 0;
                      if (result.cartDetails.refer_offer) {
                        this.cartDetails.refer_offer =
                          result.cartDetails.refer_offer;
                      }
                      if (this.settings.time_slot != 'enable') {
                        const days = this.settings.delivery_days;
                        const thisDate = new Date();
                        const deliveryDate = moment(thisDate).add(days, 'days');
                        const formatDate =
                          moment(deliveryDate).format('DD/MM/yyyy');
                        this.cartDetails.schedule_date = formatDate;
                      } else {
                        this.cartDetails.schedule_date = moment(
                          this.time_schedule_date
                        ).format('DD/MM/yyyy');
                        this.cartDetails.schedule_time_slot =
                          this.schedule_time_slot;
                      }
                      if (this.cartDetails) {
                        this.cartDetails.client_offset =
                          new Date().getTimezoneOffset();
                        console.log('hi how are you entered in thesee');

                        this.apiService
                          .CommonApi(
                            Apiconfig.codPayment.method,
                            Apiconfig.codPayment.url,
                            this.cartDetails
                          )
                          .subscribe((resp) => {
                            console.log(
                              resp,
                              'this is the resp---------------------------------------------------'
                            );

                            if (resp.status == '1') {
                              // console.log("+++++++++++++++++++++++693+++++++++++++++++++++++++++++++++")
                              // this.getCardDetails()
                              this.route.navigateByUrl('/cod-success', { state: { order_id: resp.order_id } }).then(() => {
                                window.location.reload();
                                localStorage.removeItem('guest_login');
                                localStorage.removeItem('guestId');
                              });
                            } else {
                              this.route.navigate(['/payment-failure']);
                            }
                          });
                      } else {
                        if (
                          this.cartDetails.status != 1 ||
                          this.cartDetails.availability != 1 ||
                          this.cartDetails.is_available != 1
                        ) {
                          this.notifyService.showError(
                            'Sorry, this restaurant is not available for checkout'
                          );
                        } else if (this.cartDetails.is_coupon_err != '') {
                          this.notifyService.showError(
                            'Sorry, you have applied invalid coupon code'
                          );
                        } else if (
                          this.cartDetails.is_food_deleted == 1 ||
                          this.cartDetails.food_not_available == 1
                        ) {
                          this.notifyService.showError(
                            'Sorry, the selected food item is unavailable'
                          );
                        } else if (this.cartDetails.is_addons_deleted == 1) {
                          this.notifyService.showError(
                            'Sorry, the selected add-on is unavailable'
                          );
                        } else {
                          this.notifyService.showError(
                            'Something went to wrong. Please try again 1'
                          );
                        }
                      }
                    } else {
                      this.notifyService.showError(
                        'Something went to wrong. Please try again 2'
                      );
                      // window.location.reload();
                    }
                  } else {
                    this.notifyService.showError(
                      'Something went to wrong. Please try again 3'
                    );
                    // window.location.reload();
                  }
                } else {
                  this.notifyService.showError(
                    'Something went to wrong. Please try again 4'
                  );
                  // window.location.reload();
                }
              });
          }
        } else {
          this.notifyService.showError(
            'Something went to wrong. Please try again'
          );
          // window.location.reload();
        }
      } else {
        this.notifyService.showError(
          'Something went to wrong. Please try again 5'
        );
        // window.location.reload();
      }
    } else {
      this.notifyService.showError(
        'Sorry, but we are unable to continue without a delivery address'
      );
    }
  }

  placeOrderZero() {
    // if (this.settings.time_slot == "enable" && this.schedule_time_slot == undefined) {
    //   return this.notifyService.showError('Please select a time which is preffered')
    // }
    if (!this.address) {
      this.notifyService.showError('Please add your delivery address');
      return false;
    }
    if (!this.terms_and_cod) {
      this.notifyService.showError('Please agree the condition');
      return false;
    }
    if (this.address) {
      if (this.address) {
        var data = {} as any;
        data.userId = '';
        if (this.userId) {
          data.userId = this.userId;
          data.type = 'cart';
        }
        // data.cityid = this.cityid;
        data.schedule_type = 0;
        if (data.userId != '') {
          data.client_offset = new Date().getTimezoneOffset();
          if (this.bynow) {
            console.log(data, 'this are data');
            this.socketService
              .socketCall('r2e_cart_details', data)
              .subscribe((result) => {
                // console.log(result,'this is the result in the result+++++++++++++++++++++++++++++++++++');
                console.log(
                  this.cartDetails,
                  'this are cart details-------------------------'
                );
                console.log(result, 'this is the result+++++++++++++++++++++');
                if (result && result.err == 0) {
                  // if (typeof result.cartDetails != 'undefined' && typeof result.cartDetails._id != 'undefined') {
                  result.cartDetails.pay_total = parseFloat(
                    result.cartDetails.pay_total
                  );
                  // console.log(result.cartDetails.pay_total, 'result.cartDetails.pay_totalresult.cartDetails.pay_total');
                  // console.log(this.cartDetails, 'this is the cart details payload');

                  if (this.cartDetails.pay_total) {
                    // this.cartDetails = result.cartDetails;
                    this.cartDetails.user_id = data.userId;
                    // this.cartDetails.delivery_charge = this.delivery_charge;
                    this.cartDetails.delivery_address = this.address;
                    console.log(
                      this.cartDetails,
                      'this is the delivery address+++++++++++++++++++++'
                    );

                    this.cartDetails.schedule_type = 0;
                    // if (result.cartDetails.refer_offer) {
                    //   this.cartDetails.refer_offer = result.cartDetails.refer_offer;
                    // }
                    if (this.settings.time_slot != 'enable') {
                      const days = this.settings.delivery_days;
                      const thisDate = new Date();
                      const deliveryDate = moment(thisDate).add(days, 'days');
                      const formatDate =
                        moment(deliveryDate).format('DD/MM/yyyy');
                      this.cartDetails.schedule_date = formatDate;
                    } else {
                      this.cartDetails.schedule_date = moment(
                        this.time_schedule_date
                      ).format('DD/MM/yyyy');
                      this.cartDetails.schedule_time_slot =
                        this.schedule_time_slot;
                    }
                    // this.cartDetails.schedule_date = moment(this.time_schedule_date).format('DD/MM/yyyy');
                    // this.cartDetails.schedule_time_slot = this.schedule_time_slot;
                    if (this.cartDetails) {
                      this.cartDetails.client_offset =
                        new Date().getTimezoneOffset();
                      console.log('hi how are you entered in thesee');

                      console.log(
                        this.cartDetails,
                        'this are cart details___________________'
                      );
                      this.cartDetails.buyNow = true;

                      this.apiService
                        .CommonApi(
                          Apiconfig.codPayment.method,
                          Apiconfig.codPayment.url,
                          this.cartDetails
                        )
                        .subscribe((resp) => {
                          console.log(
                            resp,
                            'this is the resp---------------------------------------------------'
                          );

                          if (resp.status == '1') {
                            // this.route.navigate(['/payment-success']);
                            this.route
                              .navigate(['/payment-success'])
                              .then(() => {
                                window.location.reload();
                              });
                            console.log(
                              '+++++++++++++++++++++++812+++++++++++++++++++++++++++++++++'
                            );
                          } else {
                            this.route.navigate(['/payment-failure']);
                          }
                        });
                    } else {
                      if (
                        this.cartDetails.status != 1 ||
                        this.cartDetails.availability != 1 ||
                        this.cartDetails.is_available != 1
                      ) {
                        this.notifyService.showError(
                          'Sorry, this restaurant is not available for checkout'
                        );
                      } else if (this.cartDetails.is_coupon_err != '') {
                        this.notifyService.showError(
                          'Sorry, you have applied invalid coupon code'
                        );
                      } else if (
                        this.cartDetails.is_food_deleted == 1 ||
                        this.cartDetails.food_not_available == 1
                      ) {
                        this.notifyService.showError(
                          'Sorry, the selected food item is unavailable'
                        );
                      } else if (this.cartDetails.is_addons_deleted == 1) {
                        this.notifyService.showError(
                          'Sorry, the selected add-on is unavailable'
                        );
                      } else {
                        this.notifyService.showError(
                          'Something went to wrong. Please try again 1'
                        );
                      }
                    }
                  } else {
                    this.notifyService.showError(
                      'Something went to wrong. Please try again 2'
                    );
                    // window.location.reload();
                  }
                  // } else {
                  //   this.notifyService.showError('Something went to wrong. Please try again 3');
                  //   // window.location.reload();
                  // }
                } else {
                  this.notifyService.showError(
                    'Something went to wrong. Please try again 4'
                  );
                  // window.location.reload();
                }
              });
          } else {
            this.socketService
              .socketCall('r2e_cart_details', data)
              .subscribe((result) => {
                // console.log(result,'this is the result in the result+++++++++++++++++++++++++++++++++++');

                if (result && result.err == 0) {
                  if (
                    typeof result.cartDetails != 'undefined' &&
                    typeof result.cartDetails._id != 'undefined'
                  ) {
                    result.cartDetails.pay_total = parseFloat(
                      result.cartDetails.pay_total
                    );
                    // console.log(result.cartDetails.pay_total, 'result.cartDetails.pay_totalresult.cartDetails.pay_total');
                    // console.log(this.cartDetails, 'this is the cart details payload');

                    if (
                      this.cartDetails.pay_total == result.cartDetails.pay_total
                    ) {
                      this.cartDetails = result.cartDetails;
                      this.cartDetails.user_id = data.userId;
                      // this.cartDetails.delivery_charge = this.delivery_charge;
                      this.cartDetails.shippingCharge = this.shippingCharge
                      this.cartDetails.service_tax = this.totalTax.toFixed(2)
                      this.cartDetails.total_weight = this.totalWeight
                      this.cartDetails.cod_charge = this.selectedOption === 'cashOnDelivery' ? this.codCharge : 0
                      this.cartDetails.delivery_address = this.address;
                      console.log(
                        this.cartDetails,
                        'this is the delivery address+++++++++++++++++++++'
                      );

                      this.cartDetails.schedule_type = 0;
                      if (result.cartDetails.refer_offer) {
                        this.cartDetails.refer_offer =
                          result.cartDetails.refer_offer;
                      }
                      if (this.settings.time_slot != 'enable') {
                        const days = this.settings.delivery_days;
                        const thisDate = new Date();
                        const deliveryDate = moment(thisDate).add(days, 'days');
                        const formatDate =
                          moment(deliveryDate).format('DD/MM/yyyy');
                        this.cartDetails.schedule_date = formatDate;
                      } else {
                        this.cartDetails.schedule_date = moment(
                          this.time_schedule_date
                        ).format('DD/MM/yyyy');
                        this.cartDetails.schedule_time_slot =
                          this.schedule_time_slot;
                      }
                      // this.cartDetails.schedule_time_slot = this.schedule_time_slot;
                      if (this.cartDetails) {
                        this.cartDetails.client_offset =
                          new Date().getTimezoneOffset();
                        console.log('hi how are you entered in thesee');

                        console.log(
                          this.cartDetails,
                          'this is the cart detailZZZZZZZZZZZZZZZZZZZZZZZzzzzzzzzzzzzZZZZZZZZZZZZ'
                        );

                        this.apiService
                          .CommonApi(
                            Apiconfig.codPayment.method,
                            Apiconfig.codPayment.url,
                            this.cartDetails
                          )
                          .subscribe((resp) => {
                            console.log(
                              resp,
                              'this is the resp---------------------------------------------------'
                            );

                            if (resp.status == '1') {
                              console.log(
                                '++++++++++++++++++++++888+++++++++++++++++++++++++++++++++'
                              );

                              // this.route.navigate(['/payment-success']);
                              this.route
                                .navigate(['/payment-success'])
                                .then(() => {
                                  window.location.reload();
                                });
                            } else {
                              this.route.navigate(['/payment-failure']);
                            }
                          });
                      } else {
                        if (
                          this.cartDetails.status != 1 ||
                          this.cartDetails.availability != 1 ||
                          this.cartDetails.is_available != 1
                        ) {
                          this.notifyService.showError(
                            'Sorry, this restaurant is not available for checkout'
                          );
                        } else if (this.cartDetails.is_coupon_err != '') {
                          this.notifyService.showError(
                            'Sorry, you have applied invalid coupon code'
                          );
                        } else if (
                          this.cartDetails.is_food_deleted == 1 ||
                          this.cartDetails.food_not_available == 1
                        ) {
                          this.notifyService.showError(
                            'Sorry, the selected food item is unavailable'
                          );
                        } else if (this.cartDetails.is_addons_deleted == 1) {
                          this.notifyService.showError(
                            'Sorry, the selected add-on is unavailable'
                          );
                        } else {
                          this.notifyService.showError(
                            'Something went to wrong. Please try again 1'
                          );
                        }
                      }
                    } else {
                      this.notifyService.showError(
                        'Something went to wrong. Please try again 2'
                      );
                      // window.location.reload();
                    }
                  } else {
                    this.notifyService.showError(
                      'Something went to wrong. Please try again 3'
                    );
                    // window.location.reload();
                  }
                } else {
                  this.notifyService.showError(
                    'Something went to wrong. Please try again 4'
                  );
                  // window.location.reload();
                }
              });
          }
        } else {
          this.notifyService.showError(
            'Something went to wrong. Please try again'
          );
          // window.location.reload();
        }
      } else {
        this.notifyService.showError(
          'Something went to wrong. Please try again 5'
        );
        // window.location.reload();
      }
    } else {
      this.notifyService.showError(
        'Sorry, but we are unable to continue without a delivery address'
      );
    }
  }

  chooseLocation(location: any) {
    this.mapsearch.choose_location = location;
  }

  changeCart(prod, action) {
    if (
      action == 'decreement' ||
      (action == 'increement' && prod.quantity < 20)
    ) {
      var userId = localStorage.getItem('userId');
      var data = {} as any;
      data.foodId = prod.id;
      data.cart_id = prod.cart_id;
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
      if (this.bynow) {
        data.cart_value = 1;
      }

      if (data.userId != '') {
        this.socketService
          .socketCall('r2e_change_cart_quantity', data)
          .subscribe((res) => {
            if (res && res.err == 0) {
              this.socketService
                .socketCall('r2e_checkout_cart_details', data)
                .subscribe((result) => {
                  console.log(result, 'result of the cart details');

                  if (result && result.err == 0) {
                    this.cartDetails = result.cartDetails;
                    this.store.cartdetails.next(this.cartDetails);
                    this.updateTotalTax(this.cartDetails)
                    const weight = [];

                    for (let item of this.cartDetails.cart_details) {
                      weight.push({ weight: item.variations[0][0].chaild_name, quantity: item.quantity });
                    }
                    // var data = {
                    //   page: 'profile',
                    // };
                    // this.apiService.realoadFunction({ data: data });
                    // this.getCardDetails();


                    this.totalWeight = this.calculateTotalWeight(weight);

                    this.calculateShippingCharge(this.cartDetails, this.shippingvalues);
                    this.getTaxForCart(this.cartDetails)
                    console.log(this.cartDetails, 'this is the cart details');
                    this.fetchCoupon(this.cartDetails)
                    if (this.userId) {
                      if (
                        (this.cartDetails && !this.cartDetails.cart_details) ||
                        this.cartDetails
                      ) {
                        // this.route.navigate(['/'])
                      }
                    }
                  }
                });

              // var data = {
              //   page: 'register'
              // }
              // this.apiService.realoadFunction({data: data});
            } else {
              this.notifyService.showError(
                res.message || 'Somthing went wrong'
              );
            }
          });
      }
    }

  }
  removeFoodFromCart(food: { cart_id: any }) {
    var data = {} as any;
    data.cartId = food.cart_id;
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
    var local = localStorage.getItem('buynow');
    if (local || this.bynow) {
      data.type_status = 1;
    }
    data.schedule_type = 0;
    if (data.userId != '') {
      this.socketService
        .socketCall('r2e_remove_food_from_cart', data)
        .subscribe((respo) => {
          var data = {
            page: 'profile',
          };
          this.apiService.realoadFunction({ data: data });
          this.getCardDetails();
        });
    }
  }

  // onFormSubmit(addressForm: NgForm) {
  //   console.log(addressForm);

  //   if (addressForm.valid) {
  //     if (addressForm.value.phone == null) {
  //       this.notifyService.showError('Please fill the phone number');
  //       return false;
  //     }
  //     this.mapsearch.phone = {
  //       code: addressForm.value.phone.dialCode,
  //       number: addressForm.value.phone.number.replace(/\s/g, ""),
  //     }
  //     this.mapsearch.name = addressForm.value.full_name

  //     if (!this.mapsearch.line1) {
  //       this.mapsearch.line1 = addressForm.value.fulladres
  //     }
  //     if (!this.mapsearch.fulladres) {
  //       this.mapsearch.fulladres = addressForm.value.fulladres
  //     }
  //     if (this.userId) {
  //       this.mapsearch.user_id = this.userId;
  //       this.apiService.CommonApi(Apiconfig.saveNewAddres.method, Apiconfig.saveNewAddres.url, this.mapsearch).subscribe(res => {
  //         if (typeof res.status != 'undefined' && res.status == '1') {
  //           this.notifyService.showSuccess(res.response);
  //           // this.ngOnInit();
  //           this.getAddress()
  //           // this.getCardDetails();
  //         } else {
  //           if (typeof res.errors != 'undefined') {
  //             this.notifyService.showError(res.errors);
  //           }

  //         }
  //       })
  //     }
  //   } else {
  //     this.notifyService.showError('Please fill all the mandatory fields');
  //   }
  // }

  cancelAddressEdit(event: any) {
    this.render.removeClass(this.addresRef.nativeElement, 'show');
    this.ariaExpan.nativeElement.setAttribute('aria-expanded', false);
  }

  editEml() {
    this.editEmail = true;
    this.showContinue = true;
  }
  continueOrder() {
    if (this.userId) {
      if (!this.emails) {
        this.notifyService.showError('Please enter the email');
        return false;
      }
      const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      var result = expression.test(this.emails);
      if (!result) {
        this.notifyService.showError('Enter valid email');
        return false;
      }
      this.showContinue = false;
      this.editEmail = false;
      this.http
        .post(`${environment.apiUrl}site/user/order-email`, {
          sample_email: this.emails,
          userId: this.userId,
        })
        .subscribe((response: any) => {
          if (response && response.status == 1) {
            this.socketService
              .socketCall('r2e_get_user_details', { userId: this.userId })
              .subscribe((result) => {
                console.log(result, 'this is the user details result');

                if (result && result.err == 0 && result.userDetails) {
                  this.userDetail = result.userDetails;
                  this.notifyService.showSuccess('Email updated successfully');
                }
              });
          }
        });
    }
  }
  clickCheck() {
    this.showcontion = false;
  }


  payoutCheck(amount: any) {
    console.log(amount, "amount amount");

    console.log(this.selectedOption, 'hi here is arived 1');
    console.log(this.cartDetails, 'this is the cart details');
    console.log(
      this.schedule_time_slot,
      'this.schedule_time_slot this.schedule_time_slot '
    );
    // if (this.settings.time_slot == "enable" && this.schedule_time_slot == undefined && this.check_time_slot) {
    //   return this.notifyService.showError('Please select a time which is preffered')
    // }
    console.log(this.address, "this.address");

    if (!this.address) {
      this.notifyService.showError('Please add your delivery address');
      return false;
    }


    if (this.useSameAddress == false) {
      console.log('this has to work...');
      this.billsubmitted = true;
      
      if (!this.BillForm.valid) {
        console.log(this.BillForm, 'this is billform');
        console.log(this.BillForm.errors, 'billform errors');
        this.notifyService.showError(
          'Please fill the all the mandatory fields'
        );
        return false;
      }
    }


    if (!this.emails) {
      this.notifyService.showError('Please enter the email');
      return false;
    }
    // if (!this.terms_and) {
    //   this.showcontion = true;
    //   this.notifyService.showError('Please accept the terms and conditions');
    //   return false;
    // }

    var cartdetail = {} as any;
    if (this.address) {
      var userId = localStorage.getItem('userId');
      var data = {} as any;
      data.userId = '';
      var guest_login= localStorage.getItem('guest_login');
    var apikey = sessionStorage.getItem('serverKey');
    var guestId= localStorage.getItem('guestId');
      if (userId) {
        data.userId = userId;
        data.type = 'cart';
      }
      if(guest_login=='true'){
        data.userId = apikey;
        data.type = 'temp_cart';
        data.guestLogin=true;
      }
      data.client_offset = new Date().getTimezoneOffset();
      data.schedule_type = 0;
      if (this.bynow) {
        data.cart_value = 1;
      }

      if (this.useSameAddress == false) {
        data.billingAddress = this.billingAddress;
        // this.billingAddress = this.BillForm.value;
      }
      data.type_status = this.cartDetails.type_status;
      if (data.userId != '') {
        localStorage.setItem('order_email', this.emails);
        this.socketService
          .socketCall('r2e_checkout_cart_details', data)
          .subscribe((result) => {
            console.log(result, 'result of the check box');
            if (result && result.err == 0) {
              cartdetail = result.cartDetails;
              let outofS = false;
              cartdetail.cart_details.forEach((el) => {
                const matchingSize = el.quantity_size.find(
                  (fil) => fil.size === el.size
                );

                console.log(matchingSize, ',matching sizeeeee');

                if (matchingSize && Number(matchingSize.quantity) <= 0) {
                  outofS = true;
                  return this.notifyService.showError(
                    'Please remove the Out of stock products'
                  );
                }
              });
              console.log(outofS, 'outofSoutofS');

              if (!outofS) {
                console.log('111111111111');

                cartdetail.delivery_address = this.address;
                cartdetail.billing_address=this.address
                if (this.useSameAddress = false) {
                  // this.billingAddress =  this.BillForm.value
                  console.log(this.billingAddress, "this.billingAddress1234");

                  cartdetail.billing_address = this.billingAddress;

                }
                cartdetail.shippingCharge = this.shippingCharge ? this.shippingCharge : 0
                cartdetail.service_tax = this.totalTax.toFixed(2) ? this.totalTax.toFixed(2) : 0
                cartdetail.total_weight = this.totalWeight ? this.totalWeight : 0
                cartdetail.cod_charge = this.selectedOption === 'cashOnDelivery' ? this.codCharge : 0
                // cartdetail.billing_address = this.billingAddress
                //   ? this.billingAddress
                //   : {};
                cartdetail.email = this.emails;
                cartdetail.client_offset = new Date().getTimezoneOffset();
                if (this.settings.time_slot != 'enable') {
                  console.log('hi are you here');

                  const days = this.settings.delivery_days;
                  const thisDate = new Date();
                  const deliveryDate = moment(thisDate).add(days, 'days');
                  const formatDate = moment(deliveryDate).format('DD/MM/yyyy');
                  cartdetail.schedule_date = formatDate;
                } else {
                  cartdetail.schedule_date = moment(
                    this.time_schedule_date
                  ).format('DD/MM/yyyy');
                  cartdetail.schedule_time_slot = this.schedule_time_slot;
                }
                if (this.emails && this.address && data.userId != '') {
                  // console.log(cartdetail,'cartdetail cartdetail cartdetail cartdetail ');
                  cartdetail.paymenttype = this.selectedOption;
                  cartdetail.guestLogin=true;

                  cartdetail.pay_total = cartdetail.pay_total + this.totalTax + this.shippingCharge;
                  console.log(cartdetail);
                  console.log('cartdetail', this.selectedOption);

                  this.apiService
                    .CommonApi(
                      Apiconfig.createTempOrder.method,
                      Apiconfig.createTempOrder.url,
                      cartdetail
                    )
                    .subscribe((result) => {
                      console.log(
                        result,
                        'this is the result from youuu_______________'
                      );

                      if (
                        result &&
                        result.status == 1 &&
                        result.message === 'Order created'
                      ) {
                        console.log(result, 'result.res.payment_session_id');
                        const cashfree = Cashfree({
                          mode: 'sandbox',
                        });
                        //   var initializeSDK = async function () {
                        //     let cashfree = await load({
                        //         mode: "sandbox"
                        //     });
                        //     console.log(cashfree);
                        // }
                        // initializeSDK();

                        let checkoutOptions = {
                          paymentSessionId: result.res.payment_session_id,
                          redirectTarget: '_self',
                        };
                        cashfree.checkout(checkoutOptions);

                        // window.location.assign(`/site/mips/payment-request?orderId=${result.orderId}`);
                      } else if (
                        result &&
                        result.status == 1 &&
                        result.message === 'Razorpay order created'
                      ) {
                        // console.log(result)
                        console.log(
                          result.res,
                          'jjjjjjjjjjjjjbbbbbbbbbbbbbbbbbbbjjjjjjjjjjjjjjjjjj'
                        );
                        // result.res.amount += this.shippingCharge;
                        this.payWithRazor(result.res, result.res.sceretkey,result.orderid);
                      } else if (
                        result &&
                        result.status == 1 &&
                        result.message === 'stripe'
                      ) {
                        setTimeout(() => {
                          this.payoutCheckstripe(amount, result.orderid);
                        }, 900);
                      } else {
                        console.log('Payment failure');
                        this.notifyService.showError('Payment failed');
                      }
                    });
                }
              }
            }
          });
      }else{
        localStorage.setItem('order_email', this.emails);
        this.socketService
          .socketCall('r2e_checkout_cart_details', data)
          .subscribe((result) => {
            console.log(result, 'result of the check box');
            if (result && result.err == 0) {
              cartdetail = result.cartDetails;
              let outofS = false;
              cartdetail.cart_details.forEach((el) => {
                const matchingSize = el.quantity_size.find(
                  (fil) => fil.size === el.size
                );

                console.log(matchingSize, ',matching sizeeeee');

                if (matchingSize && Number(matchingSize.quantity) <= 0) {
                  outofS = true;
                  return this.notifyService.showError(
                    'Please remove the Out of stock products'
                  );
                }
              });
              console.log(outofS, 'outofSoutofS');

              if (!outofS) {
                console.log('111111111111');

                cartdetail.delivery_address = this.address;
                if (this.useSameAddress = false) {
                  // this.billingAddress =  this.BillForm.value
                  console.log(this.billingAddress, "this.billingAddress1234");

                  cartdetail.billing_address = this.billingAddress;

                }
                cartdetail.shippingCharge = this.shippingCharge ? this.shippingCharge : 0
                cartdetail.service_tax = this.totalTax.toFixed(2) ? this.totalTax.toFixed(2) : 0
                cartdetail.total_weight = this.totalWeight ? this.totalWeight : 0
                cartdetail.cod_charge = this.selectedOption === 'cashOnDelivery' ? this.codCharge : 0
                cartdetail.billing_address = this.billingAddress
                  ? this.billingAddress
                  : {};
                cartdetail.email = this.emails;
                cartdetail.client_offset = new Date().getTimezoneOffset();
                if (this.settings.time_slot != 'enable') {
                  console.log('hi are you here');

                  const days = this.settings.delivery_days;
                  const thisDate = new Date();
                  const deliveryDate = moment(thisDate).add(days, 'days');
                  const formatDate = moment(deliveryDate).format('DD/MM/yyyy');
                  cartdetail.schedule_date = formatDate;
                } else {
                  cartdetail.schedule_date = moment(
                    this.time_schedule_date
                  ).format('DD/MM/yyyy');
                  cartdetail.schedule_time_slot = this.schedule_time_slot;
                }
                if (this.emails && this.address && data.userId != '') {
                  // console.log(cartdetail,'cartdetail cartdetail cartdetail cartdetail ');
                  cartdetail.paymenttype = this.selectedOption;
                  cartdetail.pay_total = cartdetail.pay_total + this.totalTax + this.shippingCharge;
                  console.log(cartdetail);
                  console.log('cartdetail', this.selectedOption);

                  this.apiService
                    .CommonApi(
                      Apiconfig.createTempOrder.method,
                      Apiconfig.createTempOrder.url,
                      cartdetail
                    )
                    .subscribe((result) => {
                      console.log(
                        result,
                        'this is the result from youuu_______________'
                      );

                      if (
                        result &&
                        result.status == 1 &&
                        result.message === 'Order created'
                      ) {
                        console.log(result, 'result.res.payment_session_id');
                        // const cashfree = Cashfree({
                        //   mode: 'sandbox',
                        // });
                        //   var initializeSDK = async function () {
                        //     let cashfree = await load({
                        //         mode: "sandbox"
                        //     });
                        //     console.log(cashfree);
                        // }
                        // initializeSDK();

                        let checkoutOptions = {
                          paymentSessionId: result.res.payment_session_id,
                          redirectTarget: '_self',
                        };
                        // cashfree.checkout(checkoutOptions);

                        // window.location.assign(`/site/mips/payment-request?orderId=${result.orderId}`);
                      } else if (
                        result &&
                        result.status == 1 &&
                        result.message === 'Razorpay order created'
                      ) {
                        // console.log(result)
                        console.log(
                          result.res,
                          'jjjjjjjjjjjjjbbbbbbbbbbbbbbbbbbbjjjjjjjjjjjjjjjjjj'
                        );
                        // result.res.amount += this.shippingCharge;
                        this.payWithRazor(result.res, result.res.sceretkey,result.orderid);
                      } else if (
                        result &&
                        result.status == 1 &&
                        result.message === 'stripe'
                      ) {
                        setTimeout(() => {
                          this.payoutCheckstripe(amount, result.orderid);
                        }, 900);
                      } else {
                        console.log('Payment failure');
                        this.notifyService.showError('Payment failed');
                      }
                    });
                }
              }
            }
          });
      }
    } else {
      this.notifyService.showError(
        'Sorry, but we are unable to continue without a delivery address'
      );
      return false;
    }
  }




  payoutCheckstripe(amounttopay, orderid) {
    const paymentHandler = (<any>window).StripeCheckout.configure({
      key: this.stripepublihser_key,
      locale: 'auto',
      token: function (stripeToken: any) {
        console.log('tokesy at token', stripeToken);
        makestripebackendcall(stripeToken);
      },
    });
    const makestripebackendcall = (token) => {
      let data = {
        tokens: token,
        amount: amounttopay,
        paymenttype: 'stripe',
        orderid: orderid,
      };

      console.log('tokesydata', data);
      this.apiService
        .CommonApi(
          Apiconfig.stripePayment.method,
          Apiconfig.stripePayment.url,
          { data }
        )
        .subscribe((res) => {
          console.log(res, 'stripee responseee');
          this.route.navigateByUrl('/payment-success', { state: { order_id: data.orderid } });
         
          // this.route.navigate(['/payment-success']).then(() => {

          //   window.location.reload()
          // })
        });
    };
    paymentHandler.open({
      name: 'E-commerce',
      amount: amounttopay * 100,
      currency: 'inr',
      description: 'Order Payment',
    });
  }

  payWithRazor(val, key,orderId) {
    //razorpay payment handling fucntion that help show the checkout page of our razorpay payment gateway
    const options: any = {
      key: key,
      // amount: val.amount + (this.shippingCharge * 100), // amount should be in paise format to display Rs 1255 without decimal point
      amount: val.amount,
      currency: val.currency,
      name: 'Pillais', // company name or product name
      description: '', // product description
      image: ' /assets/image/mens-wear/logo ecommerce.png', // company logo or product image
      order_id: val.id, // order_id created by you in backend
      modal: {
        // We should prevent closing of the form when esc key is pressed.
        escape: false,
      },
      prefill: {
        name: !this.guestLogin?this.userDetails.username:this.firstname,
        email: this.emails,
      },
      notes: {
        // include notes if any
      },
      theme: {
        color: '#0a472e',
      },
    };
    options.handler = (response, error) => {
      options.response = response;
      console.log('responseff', response);
      response.paymenttype = 'razorpay';
      response.guestLogin = true;
      var serveykey = sessionStorage.getItem('serverKey');
      response.userId = serveykey;


      console.log(options);
      this.apiService
        .CommonApi(
          Apiconfig.checkPaymentStatus.method,
          Apiconfig.checkPaymentStatus.url,
          { data: response }
        )
        .subscribe((res) => {
          // this.route.navigate(["/payment-success"])
          console.log(res,"a.....b....c");
          if(res && res.status == 1){
            this.route.navigateByUrl('/payment-success', { state: { order_id: res.order_id } }).then(() => {
              window.location.reload();
            });

          }
        });

      // call your backend api to verify payment signature & capture transaction
    };
    options.modal.ondismiss = () => {
      // handle the case when user closes the form while transaction is in progress
      console.log('Transaction cancelled.');
      this.notifyService.showError('Transaction cancelled.');
    };
    // const rzp = new this.winRef.nativeWindow.Razorpay(options);
    // rzp.open();
    const rzp = new Razorpay(options);
    rzp.open();
  }

  changeAddress() {
    setTimeout(() => {
      var data = {
        page: 'checkout',
      };
      this.apiService.checkoutFunction({ data: data });
    }, 100);
    this.route.navigate(['/manage-address']);
  }

  productDetails(
    slug: any,
    id: any,
    rcat: any,
    scat: any,
    cart_id: any,
    size: any
  ) {
    setTimeout(() => {
      var data = {
        view: 'checkout',
        cart_id: cart_id,
        size: size,
      };
      this.apiService.viewProductPage({ data: data });
    }, 100);
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

  sizePopup(id: any, size: any, arraySize: any[], cart_id: any, template: any) {
    this.sizeArray = arraySize || [];
    this.select_size = size;
    this.old_size = size;
    this.productid = id;
    this.cart_id = cart_id;
    this.changeSizeRef = this.modalService.show(template, {
      id: 1,
      class: 'changesize-model',
      ignoreBackdropClick: false,
    });
    // this.apiService.CommonApi(Apiconfig.getProductSize.method, Apiconfig.getProductSize.url,{id: id}).subscribe(result=>{
    //   if(result && result.status == 1){
    //     this.sizeArray = result.data || [];
    //     this.select_size = size;
    //     this.productid = id;
    //     this.cart_id = cart_id;
    //     this.changeSizeRef = this.modalService.show(template,{id: 1, class: 'changesize-model', ignoreBackdropClick: false});
    //   }
    // })
  }

  destroyModel() {
    this.changeSizeRef.hide();
  }

  change_size(size: any) {
    this.select_size = size;
  }
  // shipManagement

  changeSize(value: any) {
    var filterSize = this.sizeArray.filter((e) => {
      return e.size == value && e.quantity == 0;
    });
    if (filterSize && filterSize.length > 0) {
      return this.notifyService.showError('This is product out of stock');
    }
    if (this.cart_id && this.productid && value) {
      var data = {} as any;
      data.foodId = this.productid;
      data.cart_id = this.cart_id;
      data.size = value;
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
      if (data.userId != '' && data.cart_id != '') {
        this.socketService
          .socketCall('r2e_change_cart_quantity', data)
          .subscribe((res) => {
            if (res && res.err == 0) {
              console.log('1111111111');
              this.getCardDetails();
              this.changeSizeRef.hide();
            } else {
              this.notifyService.showError(
                res.message || 'Somthing went wrong'
              );
            }
          });
      }
    } else {
      this.notifyService.showError('Something went wrong');
    }
  }
  onOptionChange() {
    console.log(this.selectedOption, 'selectedOption');
  }
  cashonDelivery() { }


  fetchCoupon(cartDetail: any) {
    console.log(cartDetail, 'hhhhhhhhhh');

    let data = {
      userId: this.userId,
      cartAmount: cartDetail.pay_total,
    };
    this.apiService
      .CommonApi(
        Apiconfig.fetchCoupon.method,
        Apiconfig.fetchCoupon.url,
        data
      )
      .subscribe((result) => {
        console.log(result, 'sdfsdfsdfsdfsdf');
        if (result && result.success == true) {
          // this.notifyService.showSuccess(result.message || 'Coupon added');
          // this.getCardDetails();.
          this.couponCode = result.data.availableCoupons[0]?.code

          this.nearestCoupon = result.data.nearestCoupons[0]
          console.log(this.couponCode, 'sdfsdfsdfsdfsdf');
          console.log(this.nearestCoupon, 'sdfsdfsdfsdfsdf');

        } else {
          this.notifyService.showError(
            result.message || 'Somthing went wrong'
          );
        }
      });

  }

  applyCoupon(couponCode: string) {
    console.log(this.cartDetails);
    console.log(this.cartDetails.pay_total);

    console.log(couponCode);
    if (couponCode) {
      let data = {
        couponCode: couponCode,
        user_id: this.userId,
        cart_id: this.cartDetails._id,
        type: 'cart',
        cartamount: this.cartDetails.pay_total,
      };
      this.apiService
        .CommonApi(
          Apiconfig.applayCoupon.method,
          Apiconfig.applayCoupon.url,
          data
        )
        .subscribe((result) => {
          console.log(
            result,
            'this is the result_____-------------____________-----------_________-----------_________----'
          );
          if (result && result.error == false) {
            this.notifyService.showSuccess(result.message || 'Coupon added');
            this.getCardDetails();
          } else {
            this.notifyService.showError(
              result.message || 'Somthing went wrong'
            );
          }
        });
    } else {
      return this.notifyService.showError('Enter a valid coupon code');
    }
  }

  removeCoupon(couponCode: String) {
    let data = {
      couponCode: couponCode,
      user_id: this.userId,
      cart_id: this.cartDetails._id,
      type: 'cart',
    };
    this.apiService
      .CommonApi(
        Apiconfig.removeCoupon.method,
        Apiconfig.removeCoupon.url,
        data
      )
      .subscribe((result) => {
        console.log(
          result,
          'this is the result_____-------------____________-----------_________-----------_________----'
        );
        if (result && result.error == false) {
          this.notifyService.showSuccess(result.message || 'Coupon removed');
          this.getCardDetails();
        } else {
          this.notifyService.showError(result.message || 'Somthing went wrong');
        }
      });
  }



  toggleCoupon(couponCode: string) {
    if (this.appiledCouponCode.coupon_code) {
      // If a coupon is already applied, remove it
      this.removeCoupon(this.appiledCouponCode.coupon_code);
    } else {
      // If no coupon is applied, apply the new one
      this.applyCoupon(couponCode);
    }
  }
  generateTimeSlots(startTime, endTime, slot_time, today) {
    if (today) {
      const starts = new Date();
      const ents = new Date(endTime);
      const ends = new Date(
        starts.getFullYear(),
        starts.getMonth(),
        starts.getDate(),
        ents.getHours(),
        ents.getMinutes(),
        ents.getSeconds()
      );

      this.new_timeSlots = [];

      // let currentTime = new Date(starts);

      console.log('todaytime', starts, ends);
      while (starts < ends) {
        const formattedTimes = starts.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        // console.log("todaytime", currentTime)

        this.new_timeSlots.push(formattedTimes);
        starts.setMinutes(starts.getMinutes() + parseInt(slot_time));
      }
      return this.new_timeSlots;
    } else {
      console.log('today', today);
      // Parse start and end times
      const start = new Date(startTime);
      const end = new Date(endTime);
      console.log('starrtuioddd', start < end);
      // Initialize an array to store time slots
      this.new_timeSlots = [];

      // Set the current time to the start time
      let currentTime = new Date(start);

      // Loop through each 30-minute interval until reaching the end time
      while (currentTime <= end) {
        // Format the current time as desired (e.g., hh:mm AM/PM)
        const formattedTime = currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        // Add the formatted time to the time slots array
        this.new_timeSlots.push(formattedTime);

        // Increment the current time by 30 minutes
        currentTime.setMinutes(currentTime.getMinutes() + parseInt(slot_time));
      }
      return this.new_timeSlots;
    }
  }

  clearCoupon() {
    this.couponCode = '';
  }

  onFormSubmit(shippingForm: any) {
    console.log('1111111111111');
    if(this.emailExistsError){
      return this.notifyService.showError("The email is already exists")
    }
    this.submitted = true;
    console.log(shippingForm, "shippingFormshippingForm");
    this.mockAddress=shippingForm.value
    if (shippingForm.valid) {
      let data = {} as any;
      data.first_name = shippingForm.value.first_name;
      data.last_name = shippingForm.value.last_name;
      data.country = shippingForm.value.country;
      data.line1 = shippingForm.value.address;
      data.city = shippingForm.value.city;
      data.state = shippingForm.value.state;
      data.pincode = shippingForm.value.pincode;
      data.phone_number = shippingForm.value.phone_number;
      data.email = shippingForm.value.email;
      data.checkout = 1,
      data.choose_location = 'other'
      if (this.userId) {
        data.user_id = this.userId;
      }
      if (
        this.shippingAddress &&
        this.shippingAddress != ('' || undefined || null) &&
        this.shippingAddress._id && this.selectedAddressId !== ''

      ) {
        data._id = this.shippingAddress._id;
      }
      console.log(data, 'datadatadatadatadatadata');

      // return
      this.apiService
        .CommonApi(
          Apiconfig.saveNewAddres.method,
          Apiconfig.saveNewAddres.url,
          data
        )
        .subscribe((res) => {
          if (typeof res.status != 'undefined' && res.status == '1') {
            // if(this.shippingAddress && this.shippingAddress != ('' || undefined || null) && this.shippingAddress._id){
            //   this.notifyService.showSuccess("Updated Successfully");
            // }else{
            //   this.notifyService.showSuccess("Added Successfully");
            // }
            // this.ngOnInit();
            this.getAddress();


            if (this.useSameAddress) {
              this.shippingPage = true;
              this.informationPage = false;
              this.paymentPage = false;
              window.scroll(0, 0);
            }
          } else {
            if (typeof res.errors != 'undefined') {
              this.notifyService.showError(res.errors);
            }
          }
        });
    } else {
      this.notifyService.showError('Please fill all the mandatory fields');
    }
  }

  onFormbillSubmit(billingForm: any) {
    console.log('1111111122211111');
    console.log(this.BillForm.value, 'this.BillForm.value');
    if (!this.emails) {
      this.notifyService.showError('Please enter the email');
      return false;
    }

    if (this.useSameAddress === false) {
      console.log('555555555555555555555');

      this.billsubmitted = true;
      if (this.BillForm.valid) {
        console.log('666666666666666666666666');

        let data = {} as any;
        data.first_name = this.BillForm.value.first_name;
        data.last_name = this.BillForm.value.last_name;
        data.country = this.BillForm.value.country;
        data.line1 = this.BillForm.value.address;
        data.city = this.BillForm.value.city;
        data.state = this.BillForm.value.state;
        data.pincode = this.BillForm.value.pincode;
        data.phone_number = this.BillForm.value.phone_number;
        data.email = this.BillForm.value.email;
        if (this.userId) {
          data.user_id = this.userId;
        }
        this.billindatas = data;
        if (
          this.billingAddress &&
          this.billingAddress != ('' || undefined || null) &&
          this.billingAddress._id
        ) {
          data._id = this.billingAddress._id;
        }
        this.billingAddress = data
        this.apiService
          .CommonApi(
            Apiconfig.saveBillingAddress.method,
            Apiconfig.saveBillingAddress.url,
            data
          )
          .subscribe((res) => {
            if (typeof res.status != 'undefined' && res.status == '1') {
              if (
                this.billingAddress &&
                this.billingAddress != ('' || undefined || null) &&
                this.billingAddress._id
              ) {
                this.notifyService.showSuccess('Updated Successfully');
              } else {
                this.notifyService.showSuccess('Added Successfully');
              }
              // this.ngOnInit();
              ///my-account-page/manage-address
              // this.route.navigate(['my-account-page/manage-address'])
              // this.placeOrderCODPayment()
              this.shippingPage = true;
              this.informationPage = false;
              this.paymentPage = false;
            } else {
              if (typeof res.errors != 'undefined') {
                this.notifyService.showError(res.errors);
              }
            }
          });
      } else {
        this.notifyService.showError('Please fill all the mandatory fields');
      }
    }
  }

  // submitphone(){
  //   this.onFormbillSubmit(this.billindatas)
  //   console.log("dsdfdfgf");

  // }

  payment(data: any) {
    console.log(data, 'wwwwwwwwwwwww');
    if (data == 1) {
      this.paymentPage = false;
      this.shippingPage = false;
      this.informationPage = true;
    } else if (data == 2) {
      this.paymentPage = false;
      this.shippingPage = true;
      this.informationPage = false;
    } else if (data == 3) {
      this.paymentPage = true;
      this.shippingPage = false;
      this.informationPage = false;
    }
    // this.paymentPage = true
    // this.shippingPage = false

    window.scroll(0, 0);
  }

  loadInformationPage() {
    this.shippingPage = false;
    this.informationPage = true;
    this.paymentPage = false;
  }
  loadShippingPage() {
    this.shippingPage = true;
    this.informationPage = false;
    this.paymentPage = false;
  }
}
