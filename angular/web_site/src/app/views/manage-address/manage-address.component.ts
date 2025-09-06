import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { NgForm } from '@angular/forms';
import * as moment from 'moment';
// import { MapsAPILoader } from '@agm/core';
import { COUNTRY } from 'src/app/_services/country';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from '@khazii/ngx-intl-tel-input';
const phoneNumberUtil = PhoneNumberUtil.getInstance();

@Component({
  selector: 'app-manage-address',
  templateUrl: './manage-address.component.html',
  styleUrls: ['./manage-address.component.scss']
})
export class ManageAddressComponent implements OnInit {
  @ViewChild('addressForm') form: NgForm;
  @ViewChild('BillingForm') Billingform: NgForm;


  private geoCoder;
  updateadress: any = {}
  userId: any;
  delivery_charge: any;
  lat: any;
  long: any;
  order_address: any;
  deliveryAddress: any;
  mapsearch = {} as any;
  AddressType = [{ value: 'home', id: 'HOME', selected: false }, { value: 'work', id: 'WORK', selected: false }, { value: 'other', id: 'OTHERS', selected: false }];
  @ViewChild('searchmap')
  public searchElementRef: ElementRef;
  orderAddress: any[] = [];
  billingAddress: any[] = [];
  CountryISO = CountryISO;
  SearchCountryField = SearchCountryField;
  PhoneNumberFormat = PhoneNumberFormat;
  preferredCountries: CountryISO[] = [CountryISO.UnitedStates, CountryISO.UnitedKingdom];
  selectedCountryISO: CountryISO;
  separateDialCode = false;
  checkpassword: any;
  edited: boolean = false;
  edited_billing: boolean = true;
  billbtn: boolean = true;
  addressCurrentPage: number = 1;
  addrsItemsPerPage: number = 100;
  addressMaximum: number = 0;
  continue: boolean = false;
  editaddressid: any;

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    // private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
  ) {
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    };

    this.apiService.checkoutObservable$.subscribe(result => {
      if (result) {
        this.continue = true;
      }
    })
  }

  ngOnInit(): void {
    window.scroll(0, 0);
    this.setCurrentCountryFlag();
    var data = {
      userId: this.userId,
      limit: this.addrsItemsPerPage,
      pageId: this.addressCurrentPage
    }
    this.getAlldata()
    this.getBillingAddress()
    if (this.userId) {
      this.apiService.CommonApi(Apiconfig.addressCount.method, Apiconfig.addressCount.url, { user_id: this.userId }).subscribe(result => {
        if (result && typeof result.status != 'undefined' && result.status == 1) {
          this.addressMaximum = result.count ? result.count : 0
        }
      })
    }
    this.loadmap()
  }
  getAlldata() {
    var data = {
      userId: this.userId,
      limit: this.addrsItemsPerPage,
      pageId: this.addressCurrentPage
    }
    this.socketService.socketCall('r2e_get_saved_address', data).subscribe(res => {
      if (res && res.err == 0) {
        console.log(res, 'socket dataaaa');

        this.orderAddress = res.order_address;
        if (this.orderAddress.length > 0) {
          this.edited = true;
        } else {
          this.edited = false;
        }
      }
    })
  }

  getBillingAddress() {
    var data = {
      userId: this.userId,
      limit: this.addrsItemsPerPage,
      pageId: this.addressCurrentPage
    }
    this.socketService.socketCall('r2e_get_billing_address', data).subscribe(res => {
      if (res && res.err == 0) {
        console.log(res, 'socket billing dataaaa');

        this.billingAddress = res.order_address;
        console.log(this.billingAddress,"this.billingAddressthis.billingAddress");
        
        if (this.billingAddress.length > 0) {
          this.edited = true;
        } else {
          this.edited = false;
        }
      }
    })

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
          // let val = selected.length > 0 ? selected[0].name : 'India';
          let val = 'India';
          if (typeof CountryISO[val] != 'undefined') {
            this.selectedCountryISO = CountryISO[val];
          } else {
            this.selectedCountryISO = CountryISO['India'];
          };
        };
      });
    }
  };

  phoneNumberChange(event) {
    if (this.form.form.controls["phone"].value && this.form.form.controls["phone"].value.number && this.form.form.controls["phone"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.form.form.controls["phone"].value.number, this.form.form.controls["phone"].value.countryCode);
      this.form.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.form.form.controls["phone"].value.countryCode));
    }
  };
  phoneNumberChanges(event) {
    if (this.Billingform.form.controls["phone"].value && this.Billingform.form.controls["phone"].value.number && this.Billingform.form.controls["phone"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.Billingform.form.controls["phone"].value.number, this.Billingform.form.controls["phone"].value.countryCode);
      this.Billingform.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.Billingform.form.controls["phone"].value.countryCode));
    }
  };

  loadmap() {
    console.log("Hi this is the load map");

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
          console.log(place.geometry.location.lat(),'place.geometry.location.lat() ');
          console.log(place.geometry.location.lng(),'place.geometry.location.lng()');
          
          this.mapsearch.lat = place.geometry.location.lat();
          this.mapsearch.long = place.geometry.location.lng();
          var lat = place.geometry.location.lat();
          var long = place.geometry.location.lng();
          // this.addressGet(lat, long)
        });
      });
    }); */
  }




  onFormSubmit(addressForm: NgForm) {
    console.log(this.editaddressid)
    console.log(addressForm.value, 'addressForm');
    // this.mapsearch = [];
    // if (addressForm.valid) {
    if (addressForm.value.phone == null) {
      this.notifyService.showError('Please fill the phone number');
      return false;
    }
    this.mapsearch.phone = {
      code: addressForm.value.phone.dialCode,
      number: addressForm.value.phone.number.replace(/\s/g, ""),
    }

    this.mapsearch.name = addressForm.value.full_name;
    this.mapsearch.lastname = addressForm.value.last_name;
    this.mapsearch.fulladres = addressForm.value.fulladres1;
    this.mapsearch.country = addressForm.value.country_region;

    this.mapsearch.city = addressForm.value.town_city;
    this.mapsearch.state = addressForm.value.state1;
    this.mapsearch.zipcode = addressForm.value.zipcode1;

    if (this.mapsearch && this.mapsearch.loc) {
      this.mapsearch.lat = this.mapsearch.loc.lat;
      this.mapsearch.long = this.mapsearch.loc.lng;
    }

    console.log(this.userId, 'userIDddd');

    console.log(this.mapsearch, 'mapsearchhhhhh');


    if (this.userId) {
      console.log('hi im, here');

      // if (this.editaddressid) {
      //   console.log("------------------------------indise ifn tugadfhefksfksdahf--------------------")
      //   this.mapsearch.id = this.editaddressid
      // }
      this.mapsearch.user_id = this.userId;
      console.log(this.mapsearch, 'map search is the map search');

      this.apiService.CommonApi(Apiconfig.saveNewAddres.method, Apiconfig.saveNewAddres.url, this.mapsearch).subscribe(res => {
        if (typeof res.status != 'undefined' && res.status == '1') {
          this.notifyService.showSuccess(res.response);
          this.ngOnInit();
          setTimeout(() => {
            this.edited = true;
          }, 100);
        }
        else {
          if (typeof res.errors != 'undefined') {
            this.notifyService.showError(res.errors);
          }

        }
      })
    }
    // }
    else {
      this.notifyService.showError('Please fill all the mandatory fields');
    }
  }

  onBillFormSubmit(BillingForm: NgForm) {
    console.log(BillingForm.value, 'BillingForm');

    // if (BillingForm.valid) {
    if (BillingForm.value.phone == null) {
      this.notifyService.showError('Please fill the phone number');
      return false;
    }
    this.mapsearch.phone = {
      code: BillingForm.value.phone.dialCode,
      number: BillingForm.value.phone.number.replace(/\s/g, ""),
    }
    if(this.billingAddress[0] && (this.billingAddress[0]._id != (null || undefined))  && this.billingAddress[0]._id){
      this.mapsearch._id = this.billingAddress[0]._id 
    }
    this.mapsearch.name = BillingForm.value.full_name;
    this.mapsearch.lastname = BillingForm.value.last_name;
    this.mapsearch.fulladres = BillingForm.value.fulladres1;
    this.mapsearch.country = BillingForm.value.country_region;

    this.mapsearch.city = BillingForm.value.town_city;
    this.mapsearch.state = BillingForm.value.state1;
    this.mapsearch.zipcode = BillingForm.value.zipcode1;

    if (this.mapsearch && this.mapsearch.loc) {
      this.mapsearch.lat = this.mapsearch.loc.lat;
      this.mapsearch.long = this.mapsearch.loc.lng;
    }

    console.log(this.userId, 'userIDddd');

    console.log(this.mapsearch, 'mapsearchhhhhh');

    if (this.userId) {
      console.log('hi im, here');

      this.mapsearch.user_id = this.userId;
      console.log(this.mapsearch, 'map search is the map search');


      this.apiService.CommonApi(Apiconfig.saveBillingAddress.method, Apiconfig.saveBillingAddress.url, this.mapsearch).subscribe(res => {
        if (typeof res.status != 'undefined' && res.status == '1') {
          this.notifyService.showSuccess(res.response);
          this.ngOnInit();
          setTimeout(() => {
            this.edited = true;
          }, 100);
        }
        else {
          if (typeof res.errors != 'undefined') {
            this.notifyService.showError(res.errors);
          }

        }
      })
    }
    // }
    else {
      this.notifyService.showError('Please fill all the mandatory fields');
    }
  }


  chooseLocation(location) {
    this.mapsearch.choose_location = location;
  }

  addNew() {
    this.edited_billing = false;
    if (this.addressMaximum < 5) {
      if (this.edited == true) {
        this.edited = false;
        this.mapsearch = {}
        // this.billbtn = false;
      } else {
        this.edited = true;
      }
    } else {
      this.edited = true;
      this.notifyService.showError('you can add only 5 address');
      return false;
    }
  }

  Billing_btn() {
    this.edited = true;
    if (this.edited_billing == true) {
      this.edited_billing = false;
      // this.mapsearch = {}
    } else {
      this.edited_billing = true;
    }

  }

  // activetheAddress(id){
  //   if(id){
  //     this.apiService.CommonApi(Apiconfig.updateAddress.method, Apiconfig.updateAddress.url,{address_id: id, user_id: this.userId}).subscribe(result=>{
  //       if(result && result.status == 1){
  //         this.notifyService.showSuccess('Successfully update the address');
  //         this.ngOnInit();
  //       } else {
  //         this.notifyService.showError(result.errors)
  //       }
  //     })
  //   }
  // }

  activetheAddress(id) {


    var data = {
      address_id: id,
      user_id: this.userId,

    }
    if (id) {
      this.apiService.CommonApi(Apiconfig.updateAddress.method, Apiconfig.updateAddress.url, data).subscribe(result => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess('Successfully update the address');
          this.ngOnInit();
        } else {
          this.notifyService.showError(result.errors)
        }
      })
    }
  }


  editeAddress(address) {
    this.edited = false;
    this.edited_billing = true;
    this.editaddressid = address._id
    var id = address._id;
    delete address._id;

    this.mapsearch = address;
    this.mapsearch.id = id;
    window.scrollTo({ top: 10, behavior: 'smooth' });
    setTimeout(() => {

      console.log(this.mapsearch, 'mappp in edit');

      this.form.controls["full_name"].setValue(this.mapsearch.first_name ? this.mapsearch.first_name : '')
      this.form.controls["last_name"].setValue(this.mapsearch.last_name ? this.mapsearch.last_name : '')
      this.form.controls["fulladres1"].setValue(this.mapsearch.fulladres ? this.mapsearch.fulladres : '')
      this.form.controls["town_city"].setValue(this.mapsearch.city ? this.mapsearch.city : '')
      this.form.controls["country_region"].setValue(this.mapsearch.country ? this.mapsearch.country : '')
      this.form.controls["state1"].setValue(this.mapsearch.state ? this.mapsearch.state : '')
      this.form.controls["zipcode1"].setValue(this.mapsearch.zipcode ? this.mapsearch.zipcode : '')

      // console.log(address.phone, 'address phonee');
      // console.log(address.phone.code, 'address phonee');

      if (address.phone && typeof address.phone.code != 'undefined') {
        var codedata = address.phone.code as string;
        codedata = codedata.split('+')[1];
        let selected = COUNTRY.filter(x => x.code == codedata);
        let val = selected.length > 0 ? selected[0].name : '';
        this.selectedCountryISO = CountryISO[val];
        let number = phoneNumberUtil.parseAndKeepRawInput(address.phone.number, this.selectedCountryISO);

        // console.log('///////////////////////////////////////');

        // console.log(this.selectedCountryISO, 'this.selectedCountryISOthis.selectedCountryISO');
        // console.log(number, 'number123');
        // console.log('//////////////////////////////////////////');


        this.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.selectedCountryISO));
        // this.form.controls['phone'].disable();
      }
    }, 200);
  }

  editebillingAddress(address) {
    this.edited = true;
    this.edited_billing = false;

    var id = address._id;
    delete address._id;

    this.mapsearch = address;
    this.mapsearch.id = id;
    window.scrollTo({ top: 10, behavior: 'smooth' });
    setTimeout(() => {

      console.log(this.mapsearch, 'mappp in edit');

      this.Billingform.controls["full_name"].setValue(this.mapsearch.first_name ? this.mapsearch.first_name : '')
      this.Billingform.controls["last_name"].setValue(this.mapsearch.last_name ? this.mapsearch.last_name : '')
      this.Billingform.controls["fulladres1"].setValue(this.mapsearch.fulladres ? this.mapsearch.fulladres : '')
      this.Billingform.controls["town_city"].setValue(this.mapsearch.city ? this.mapsearch.city : '')
      this.Billingform.controls["country_region"].setValue(this.mapsearch.country ? this.mapsearch.country : '')
      this.Billingform.controls["state1"].setValue(this.mapsearch.state ? this.mapsearch.state : '')
      this.Billingform.controls["zipcode1"].setValue(this.mapsearch.zipcode ? this.mapsearch.zipcode : '')

      // console.log(address.phone, 'address phonee');
      // console.log(address.phone.code, 'address phonee');

      if (address.phone && typeof address.phone.code != 'undefined') {
        var codedata = address.phone.code as string;
        codedata = codedata.split('+')[1];
        let selected = COUNTRY.filter(x => x.code == codedata);
        let val = selected.length > 0 ? selected[0].name : '';
        this.selectedCountryISO = CountryISO[val];
        let number = phoneNumberUtil.parseAndKeepRawInput(address.phone.number, this.selectedCountryISO);

        // console.log('///////////////////////////////////////');

        // console.log(this.selectedCountryISO, 'this.selectedCountryISOthis.selectedCountryISO');
        // console.log(number, 'number123');
        // console.log('//////////////////////////////////////////');


        this.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.selectedCountryISO));
        // this.form.controls['phone'].disable();
      }
    }, 200);
  }

  deleteAddress(id) {
    this.apiService.CommonApi(Apiconfig.deleteAddress.method, Apiconfig.deleteAddress.url, { address_id: id, user_id: this.userId }).subscribe(res => {
      this.notifyService.showSuccess('Address deleted');
      this.getAlldata()
    })
  }

  deleteBillingAddress(id) {
    this.apiService.CommonApi(Apiconfig.deleteBillingAddress.method, Apiconfig.deleteBillingAddress.url, { address_id: id, user_id: this.userId }).subscribe(res => {
      this.notifyService.showSuccess('Address deleted');
      this.getBillingAddress()
    })
  }



  cancelEdite() {
    if (this.orderAddress.length > 0) {
      this.edited = true;
    } else {
      this.edited = false;
    }
  }

}
