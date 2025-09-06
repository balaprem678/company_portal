import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { CountryISO, PhoneNumberFormat, SearchCountryField } from '@khazii/ngx-intl-tel-input';
// import { MapsAPILoader } from '@agm/core';
import { UntypedFormBuilder, UntypedFormGroup, NgForm, Validators } from '@angular/forms';
import { NotificationService } from 'src/app/_services/notification.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { ActivatedRoute, Router } from '@angular/router';
import { COUNTRY } from 'src/app/_services/country';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from 'src/app/_services/authentication.service';
const phoneNumberUtil = PhoneNumberUtil.getInstance();
@Component({
  selector: 'app-addedit',
  templateUrl: './addedit.component.html',
  styleUrls: ['./addedit.component.scss']
})
export class AddeditComponent implements OnInit {
  @ViewChild('search') searchElementRef: ElementRef;



  separateDialCode = false;
  SearchCountryField = SearchCountryField;
  CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  preferredCountries: CountryISO[] = [CountryISO.UnitedStates];

  selectedCountryISO: CountryISO;


  getcity: any;
  cityname: any;
  lat: any;
  lng: any;
  // geoCoder: google.maps.Geocoder;
  address: any;
  zoom: number;
  latitude: number;
  longitude: number;
  addressline1: string;
  addressline2: string = '';
  city: string;
  state: string;
  country: string;
  zipcode: string;
  imageFile: any[] = [];
  preview: any[] = [];
  userimageChangedEvent: any;
  imageChangedEvent: any;
  croppedImage: any;
  vinFile: any;
  email: any;
  vinpreview: string;
  selectcity: any = [];
  drivername: any;
  status: any;
  phone: any;
  vinnumber: any;
  license: any;
  selectadmin: any;
  submitted: boolean = false;

  userAddEditForm: UntypedFormGroup;
  docdata: any;
  id: any;
  editdata: any;
  // place: google.maps.places.PlaceResult;
  fileUpload: any;
  imageName: string = 'name.png';
  imageBlob: any;
  driverdocument: any;
  curentUser: any;
  userPrivilegeDetails: any;

  constructor(private apiService: ApiService, private ngZone: NgZone, /* private mapsAPILoader: MapsAPILoader, */
    private notifyService: NotificationService,
    private fb: UntypedFormBuilder, private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private authService: AuthenticationService
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    console.log("current", this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/drivers/adddriver' || (split.length > 0 && split[2] == 'Drivers ')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Drivers ');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.route.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.route.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };


    this.userAddEditForm = this.fb.group({
      selectcity: ['', Validators.required],
      avatar: [''],
      category: ['', Validators.required],
      drivername: ['', Validators.required],
      status: ['', Validators.required],
      email: ['', Validators.required],
      phone: ['', Validators.required],
      addressline1: ['', Validators.required],
      addressline2: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      country: ['', Validators.required],
      zipcode: ['', Validators.required],
      license: [''],
      accountname: [''],
      accountnumber: ['', Validators.max(99999999999999999999)],
      accountaddress: [''],
      bankname: [''],
      branchname: [''],
      branchaddress: [''],
      swiftcode: [''],
      routingnumber: ['', Validators.maxLength(9)],
      about: [''],
    });
  }

  ngOnInit(): void {

    this.id = this.route.snapshot.paramMap.get('id')
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.driveredit.method, Apiconfig.driveredit.url, { id: this.id }).subscribe(result => {
        if (result) {
          this.editdata = result[0];
          this.driverdocument = result[1]
          console.log("sdfsd", this.driverdocument)
          this.userAddEditForm.controls.selectcity.setValue(this.editdata[0].main_city);
          this.userAddEditForm.controls.category.setValue(this.editdata[0].category);
          this.userAddEditForm.controls.drivername.setValue(this.editdata[0].username);
          this.userAddEditForm.controls.email.setValue(this.editdata[0].email);
          this.userAddEditForm.controls.addressline1.setValue(this.editdata[0].address.line1);
          this.userAddEditForm.controls.addressline2.setValue(this.editdata[0].address.line2);
          this.userAddEditForm.controls.city.setValue(this.editdata[0].address.city);
          this.userAddEditForm.controls.state.setValue(this.editdata[0].address.state);
          this.userAddEditForm.controls.country.setValue(this.editdata[0].address.country);
          this.userAddEditForm.controls.zipcode.setValue(this.editdata[0].address.zipcode);
          this.userAddEditForm.controls.status.setValue(this.editdata[0].status);
          this.userAddEditForm.controls.about.setValue(this.editdata[0].about)
          this.userAddEditForm.controls.accountname.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.account_name : '');
          this.userAddEditForm.controls.accountaddress.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.account_address : '');
          this.userAddEditForm.controls.accountnumber.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.accountnumber : '');
          this.userAddEditForm.controls.bankname.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.bank_name : '');
          this.userAddEditForm.controls.branchname.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.branch_name : '');
          this.userAddEditForm.controls.branchaddress.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.branch_address : '');
          this.userAddEditForm.controls.swiftcode.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.swift_code : '');
          this.userAddEditForm.controls.routingnumber.setValue(this.editdata[0].account_details ? this.editdata[0].account_details.routing_number : '');
          this.croppedImage = environment.apiUrl + this.editdata[0].avatar;
          for (var i = 0; i < this.driverdocument.length; i++) {
            this.preview.push(environment.apiUrl + this.driverdocument[i].image)
          }
          for (var i = 0; i < this.driverdocument.length; i++) {
            this.imageFile.push(this.driverdocument[i].image)
          }
          if (this.editdata[0].phone && typeof this.editdata[0].phone.code != 'undefined') {
            var codedata = this.editdata[0].phone.code as string;
            codedata = codedata.split('+')[1];
            let selected = COUNTRY.filter(x => x.code == codedata);
            let val = selected.length > 0 ? selected[0].name : '';
            this.selectedCountryISO = CountryISO[val];
            let number = phoneNumberUtil.parseAndKeepRawInput(this.editdata[0].phone.number, this.selectedCountryISO);
            this.userAddEditForm.controls.phone.setValue(phoneNumberUtil.formatInOriginalFormat(number, this.selectedCountryISO));
          }
          this.setCurrentCountryFlag();
          this.cd.detectChanges();
        }
      })
    }

    /* this.mapsAPILoader.load().then(() => {
      this.geoCoder = new google.maps.Geocoder;
      this.getAddress(this.lat, this.lng)
      const autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement);
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          const place: google.maps.places.PlaceResult = autocomplete.getPlace();
          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          //set latitude, longitude and zoom
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.place = place;
          this.getAddress(this.lat, this.lng)
        });
      });
    }); */
    this.apiService.CommonApi(Apiconfig.restaurantcity.method, Apiconfig.restaurantcity.url, {}).subscribe(result => {
      this.getcity = result[0];
    })
    this.apiService.CommonApi(Apiconfig.getrestaurantdoc.method, Apiconfig.getrestaurantdoc.url, {}).subscribe((result) => {
      if (result && result.length > 0 && result[0] != 0) {
        this.docdata = result
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
          let val = selected.length > 0 ? selected[0].name : 'India';
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
    if (this.userAddEditForm.controls.phone.value && this.userAddEditForm.controls.phone.value.number && this.userAddEditForm.controls.phone.value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.userAddEditForm.controls.phone.value.number, this.userAddEditForm.controls.phone.value.countryCode);
      this.userAddEditForm.controls.phone.setValue(phoneNumberUtil.formatInOriginalFormat(number, this.userAddEditForm.controls.phone.value.countryCode));
    }
  };


  get f() {
    return this.userAddEditForm.controls;
  }



  getAddress(latitude, longitude) {

    /* this.geoCoder.geocode({ 'location': { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          this.zoom = 12;
          var locationa = this.place;
          if (locationa.name) {
            this.userAddEditForm.controls.addressline1.setValue(locationa.name)
          }
          for (var i = 0; i < locationa.address_components.length; i++) {
            for (var j = 0; j < locationa.address_components[i].types.length; j++) {
              if (locationa.address_components[i].types[j] == 'neighborhood') {
                if (this.addressline1 != locationa.address_components[i].long_name) {
                  if (this.addressline1 != '') {
                    this.userAddEditForm.controls.addressline1.setValue(locationa.address_components[i].long_name)
                  } else {
                    this.userAddEditForm.controls.addressline1.setValue(locationa.address_components[i].long_name)
                  }
                }
              }

              if (locationa.address_components[i].types[j] == 'street_number') {
                if (this.addressline2 != '') {
                  this.addressline2 = this.addressline2 + ',' + locationa.address_components[i].long_name;
                } else {
                  this.addressline2 = this.addressline2;
                }
              }
              if (locationa.address_components[i].types[j] == 'sublocality_level_1') {
                if (this.addressline2 != '') {
                  this.userAddEditForm.controls.addressline2.setValue(locationa.address_components[i].long_name)
                } else {
                  this.userAddEditForm.controls.addressline2.setValue(locationa.address_components[i].long_name)
                }
              }
              if (locationa.address_components[i].types[j] == 'locality') {
                this.userAddEditForm.controls.city.setValue(locationa.address_components[i].long_name)
              }
              if (locationa.address_components[i].types[j] == 'country') {
                this.userAddEditForm.controls.country.setValue(locationa.address_components[i].long_name)
              }
              if (locationa.address_components[i].types[j] == 'postal_code') {
                this.userAddEditForm.controls.zipcode.setValue(locationa.address_components[i].long_name)
              }
              if (locationa.address_components[i].types[j] == 'administrative_area_level_1' || locationa.address_components[i].types[j] == 'administrative_area_level_2') {
                this.userAddEditForm.controls.state.setValue(locationa.address_components[i].long_name)
              }
            }
          }
        } else {
          window.alert('No results found');
        }
      } else {
        window.alert('Geocoder failed due to: ' + status);
      }
    }); */
  }

  get addform() {
    return this.userAddEditForm.controls;
  }


  fileChangeEvent(event: any): void {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg','image/webp', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        this.userAddEditForm.controls['avatar'].setValue('')
        return;
      }
    }
    this.imageChangedEvent = event;
  }
  dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
  imageCropped(event: ImageCroppedEvent) {

    this.croppedImage = event.base64;
    this.imageBlob = this.dataURLtoFile(this.croppedImage, 'name.png')
  }

  imageLoaded() {
    /* show cropper */
  }

  cropperReady() {
    /* cropper ready */
  }

  loadImageFailed() {
    /* show message */
  }

  onSelectedFile(event, index) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg','image/webp', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        this.userAddEditForm.controls['license'].setValue('')
        return;
      }
      this.imageFile[index] = file
      const reader = new FileReader();
      reader.onload = () => {
        this.preview[index] = reader.result as any;
      }
      reader.readAsDataURL(file);
    }
  }


  onFormSubmit() {
    this.submitted = true;
    if (this.userAddEditForm.status != "INVALID") {
      const formdata = new FormData()
      var data = this.userAddEditForm.value;
      if (this.id) {
        formdata.append('_id', this.id);
      }

      formdata.append('com_type', 'common');
      formdata.append('main_city', this.userAddEditForm.get('selectcity').value);
      formdata.append('about', this.userAddEditForm.get('about').value);
      formdata.append('category', this.userAddEditForm.get('category').value);
      formdata.append('username', this.userAddEditForm.get('drivername').value);
      formdata.append('email', this.userAddEditForm.get('email').value);
      formdata.append('avatar', this.imageBlob);
      formdata.append('phone[code]', data.phone.dialCode);
      formdata.append('phone[number]', data.phone.number);
      formdata.append('address[line1]', this.userAddEditForm.get('addressline1').value);
      formdata.append('address[line2]', this.userAddEditForm.get('addressline2').value);
      formdata.append('address[city]', this.userAddEditForm.get('city').value);
      formdata.append('address[fulladres]', this.address)
      // formdata.append('address[lat]', this.lat)
      // formdata.append('address[lng]', this.lng)
      formdata.append('address[state]', this.userAddEditForm.get('state').value);
      formdata.append('address[country]', this.userAddEditForm.get('country').value);
      formdata.append('address[zipcode]', this.userAddEditForm.get('zipcode').value);
      formdata.append('role', "driver")
      var docdata = []
      if (this.driverdocument) {
        docdata = this.driverdocument
        console.log("docdata", docdata)
      } else {
        docdata = this.docdata
      }
      console.log("docdata", docdata)
      for (let index = 0; index < docdata.length; index++) {
        console.log("docdara", this.imageFile[index], this.docdata[index])
        if (!this.id) {
          formdata.append(`newimage[${docdata[index]._id}]`, this.imageFile[index])
        } else if (this.id) {
          if (this.imageFile[index] == this.driverdocument[index].image) {
            formdata.append(`images[${index}][image]`, this.imageFile[index]);
          } else {
            formdata.append(`newimage[${docdata[index]._id}]`, this.imageFile[index])
          }
        }
        formdata.append(`images[${index}][status]`, docdata[index].status);
        formdata.append(`images[${index}][_id]`, docdata[index]._id);
        formdata.append(`images[${index}][doc_for]`, docdata[index].doc_for);
        formdata.append(`images[${index}][doc_name]`, docdata[index].doc_name);
        formdata.append(`images[${index}][expiry_dates]`, docdata[index].expiry_dates);
        formdata.append(`images[${index}][has_require]`, docdata[index].has_require);
        formdata.append(`images[${index}][has_expire]`, docdata[index].has_expire);
      }
      formdata.append('account_details[account_name]', this.userAddEditForm.get('accountname').value ? this.userAddEditForm.get('accountname').value : '');
      formdata.append('account_details[account_address]', this.userAddEditForm.get('accountaddress').value ? this.userAddEditForm.get('accountaddress').value : '');
      formdata.append('account_details[account_number]', this.userAddEditForm.get('accountnumber').value ? this.userAddEditForm.get('accountnumber').value : '');
      formdata.append('account_details[bank_name]', this.userAddEditForm.get('bankname').value ? this.userAddEditForm.get('bankname').value : '');
      formdata.append('account_details[branch_name]', this.userAddEditForm.get('branchname').value);
      formdata.append('account_details[branch_address]', this.userAddEditForm.get('branchaddress').value);
      formdata.append('account_details[swift_code]', this.userAddEditForm.get('swiftcode').value);
      formdata.append('account_details[routing_number]', this.userAddEditForm.get('routingnumber').value);
      formdata.append('status', this.userAddEditForm.get('status').value);
      console.log(formdata.get('newimage'))
      this.apiService.CommonApi(Apiconfig.driversave.method, Apiconfig.driversave.url, formdata).subscribe(result => {
        this.router.navigate(['/app/drivers/driverslist']);
        this.notifyService.showSuccess("Added Successfully");
      }, (error) => {
        this.notifyService.showError(error);
        this.ngOnInit()
      })
    }
    else {
      this.notifyService.showError("Please Fill All Mandatory Details")
    }
  }
}
