import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from '@khazii/ngx-intl-tel-input';
import { ApiService } from 'src/app/_services/api.service';
import { COUNTRY } from 'src/app/_services/country';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { interest, language } from "src/app/interface/interface";
import { NotificationService } from 'src/app/_services/notification.service';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from "src/environments/environment";
import { RootUserDetails } from 'src/app/interface/userDetails.interface';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { PrivilagesData } from 'src/app/menu/privilages';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
const phoneNumberUtil = PhoneNumberUtil.getInstance();

@Component({
  selector: 'app-useraddedit',
  templateUrl: './useraddedit.component.html',
  styleUrls: ['./useraddedit.component.scss']
})
export class UseraddeditComponent implements OnInit {
  @ViewChild('userAddEditForm') form: NgForm;
  modalLogoutRef: BsModalRef;
  separateDialCode = false;
  SearchCountryField = SearchCountryField;
  CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  preferredCountries: CountryISO[] = [CountryISO.UnitedStates, CountryISO.UnitedKingdom];
  selectedCountryISO: CountryISO;

  userimageChangedEvent: any = '';
  usercroppedImage: any = 'assets/image/user.jpg';
  interestList: interest[] = [];
  languageList: language[] = [];
  test = 'Select Your languages'
  coverimageChangedEvent: any = '';
  coverCroppedImage: any = 'assets/image/coverimg.png';
  coverfinalImage: File;
  userfinalImage: File;
  userDetails: any;
  RootUserDetails: RootUserDetails;
  pageTitle: string = 'Add Customer';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  imageurl: string = environment.apiUrl;
  emailVerifyTag: number = 2;
  minDate: Date = new Date();
  @ViewChild('search') public searchElementRef: ElementRef;
  public latitude: number;
  public longitude: number;
  private geoCoder;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[];
  checkpassword: boolean = false;
  agm_address = {
    fulladres: ""
  }
  address: { fulladres: string; };
  user_image: any;
  croppedImage: any;
  currentEmail: any;
  removerPhoto: boolean = false;
  statusOptions = [
    { label: '--Select--', value: '' },
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' }
  ];
  genderOptions = [
    { label: '--Select--', value: '' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' }
  ];
  dropdownBorderRadius1 = 4;

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    // private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
    private authService: AuthenticationService,
    private modalService: BsModalService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/users/add' || (split.length > 0 && split[2] == 'users')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'users');
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
    if (split && split.length > 3) {
      if ('view' == split[3]) {
        this.viewpage = true;
      }
    };
  }

  // ngAfterViewInit(): void {
  //   if (!this.viewpage) {
  //     this.loadMap();
  //   }
  // };

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.checkpassword = true;
      this.pageTitle = (this.viewpage ? 'View' : 'Edit') + " Customer";
      if (!this.viewpage) {
        this.apiService.CommonApi(Apiconfig.userEdit.method, Apiconfig.userEdit.url, { id: id }).subscribe(
          (result) => {
            if (result && result.status == 1) {
              this.userDetails = result.data.userDetails;
              console.log("this.userDetails", this.userDetails)
              this.form.controls['first_name'].setValue(this.userDetails.first_name ? this.userDetails.first_name : (this.userDetails.name ? this.userDetails.name : ''));
              this.form.controls['last_name'].setValue(this.userDetails.last_name ? this.userDetails.last_name : (this.userDetails.name ? this.userDetails.name : ''));
              this.currentEmail = this.userDetails.email
              this.form.controls['email'].setValue(this.userDetails.email ? this.userDetails.email : '');
              this.form.controls['status'].setValue(this.userDetails.status ? this.userDetails.status.toString() : '');
              // this.form.controls['gender'].setValue(this.userDetails.gender ? this.userDetails.gender.toString() : '');
              // if(this.userDetails.address){
              //   if (this.userDetails.address.fulladres) {
              //     this.form.controls['address'].setValue(this.userDetails.address.fulladres ? this.userDetails.address.fulladres : '');
              //   } else {
              //     this.form.controls['address'].setValue(this.userDetails.address ? this.userDetails.address : '');
              //   }
              // }
              // this.emailVerifyTag = this.userDetails.email_verify ? this.userDetails.email_verify : 0;
              if (this.userDetails.phone && typeof this.userDetails.phone.code != 'undefined') {
                var codedata = this.userDetails.phone.code as string;
                codedata = codedata.split('+')[1];
                let selected = COUNTRY.filter(x => x.code == codedata);
                let val = selected.length > 0 ? selected[0].name : '';
                this.selectedCountryISO = CountryISO[val];
                let number = phoneNumberUtil.parseAndKeepRawInput(this.userDetails.phone.number, this.selectedCountryISO);
                this.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.selectedCountryISO));
                // this.form.controls['phone'].disable();
              }
              this.setCurrentCountryFlag();
              this.cd.detectChanges();

              this.apiService.imageExists(environment.apiUrl + this.userDetails.avatar, (exists) => {
                if (exists) {
                  this.usercroppedImage = environment.apiUrl + this.userDetails.avatar;
                }
              });
            }

          }
        )
      } else {
        this.apiService.CommonApi(Apiconfig.getUserDetails.method, Apiconfig.getUserDetails.url, { id: id }).subscribe(
          (result) => {
            if (result && result.status == 1) {
              console.log(result.data,"result.dataresult.dataresult.dataresult.data");
              
              this.RootUserDetails = result.data;
              this.address = this.RootUserDetails.userDetails.address
              this.apiService.imageExists(environment.apiUrl + this.RootUserDetails.userDetails.avatar, (exists) => {
                if (exists) {
                  this.usercroppedImage = environment.apiUrl + this.RootUserDetails.userDetails.avatar;
                }
              });
            } else {

            }
          }
        );
      }
    } else {
      this.setCurrentCountryFlag();
      // this.form.controls['languages'].setValue(null);

    };
  };

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
    if (this.form.form.controls["phone"].value && this.form.form.controls["phone"].value.number && this.form.form.controls["phone"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.form.form.controls["phone"].value.number, this.form.form.controls["phone"].value.countryCode);
      this.form.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.form.form.controls["phone"].value.countryCode));
    }
  };

  loadMap() {
    /* this.mapsAPILoader.load().then(() => {
      // this.setCurrentLocation();
      this.geoCoder = new google.maps.Geocoder;
      let autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement, {
        types: ["address"]
      });
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          let place: google.maps.places.PlaceResult = autocomplete.getPlace();

          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          //set latitude, longitude and zoom
          this.latitude = place.geometry.location.lat();
          this.longitude = place.geometry.location.lng();
          this.getAddress(this.latitude, this.longitude);
        });
      });
    }); */
  };

  private setCurrentLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.getAddress(this.latitude, this.longitude);
      });
    }
  }

  getAddress(latitude, longitude) {
    this.geoCoder.geocode({ 'location': { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          this.agm_address['fulladres'] = results[0].formatted_address;
          this.agm_address['city'] = this.getaddresscomponents(results[0].address_components, 'short', ['locality']);
          this.agm_address['state'] = this.getaddresscomponents(results[0].address_components, 'short', ['administrative_area_level_1']);
          this.agm_address['zipcode'] = this.getaddresscomponents(results[0].address_components, 'short', ['postal_code']);
          this.agm_address['country'] = this.getaddresscomponents(results[0].address_components, 'short', ['country']);
          this.agm_address['lat'] = this.latitude;
          this.agm_address['lng'] = this.longitude;
        }
      }
    });
  }
  getaddresscomponents(address_components: any, component, type: string[]): any {
    var element = ""
    for (let i = 0; i < address_components.length; i++) {
      if (address_components[i].types[0] == type[0]) {
        element = (component == 'short') ? address_components[i].short_name : address_components[i].long_name;
      }
    }
    return element;
  }


  fileoploadclick() {
    let profileimg = <HTMLElement>document.querySelector('.file-upload');
    profileimg.click();
  };
  coverimageClick() {
    let profileimg = <HTMLElement>document.querySelector('.cover-file-upload');
    profileimg.click();
  };

  fileChangeEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      // if (event.target.files[0].size <= 1024 * 1024 * 2) {
      if (event.target.files[0].type == 'image/jpeg' || event.target.files[0].type == 'image/png' || event.target.files[0].type == 'image/jpg') {
        this.userimageChangedEvent = event;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG ');
      }
      // } else {
      //   this.notifyService.showError('The file size can not exceed 2MiB.');
      // }
    }
  }
  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(event.objectUrl || event.base64 || '');
    console.log(event);
    console.log(event.base64, 'this is that');
    console.log(this.croppedImage.base64, 'this is croppedImage');
    this.usercroppedImage = event.base64;
    // this.userfinalImage = this.dataURLtoFile(event.base64, 'userimage.png');
  }

  coverFileChangeEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      // if (event.target.files[0].size <= 1024 * 1024 * 2) {
      if (event.target.files[0].type == 'image/jpeg' || event.target.files[0].type == 'image/png' || event.target.files[0].type == 'image/jpg') {
        this.coverimageChangedEvent = event;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG ');
      }
      // } else {
      //   this.notifyService.showError('The file size can not exceed 2MiB.');
      // }
    }
  }

  imageCroppedCover(event: ImageCroppedEvent) {
    this.coverCroppedImage = event.base64;
    this.coverfinalImage = this.dataURLtoFile(event.base64, 'coverimage.png');
  }

  removeImage() {
    this.removerPhoto = true;
    this.usercroppedImage = 'assets/image/user.jpg';
    this.croppedImage = '';
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



  onFormSubmit(userAddEditForm: UntypedFormGroup) {
    if (userAddEditForm.valid) {
      this.submitebtn = true;
      // let formData = new FormData();      
      var data = userAddEditForm.value;

      let phone = { code: "", number: "" };
      if (this.userimageChangedEvent) {
        data.avatarBase64 = this.usercroppedImage;
      }
      if (!this.userimageChangedEvent && this.userDetails && this.userDetails.avatar) {
        data.avatar = this.userDetails.avatar
      }
      if (this.removerPhoto) {
        data.avatar = '';
      }
      // console.log(this.currentEmail, 'currentEmail');
      // data.email = this.currentEmail
      // data.gender = data.gender;
      phone.code = data.phone ? data.phone.dialCode : (this.userDetails.phone ? this.userDetails.phone.code : undefined);
      phone.number = data.phone ? data.phone.number.replace(/\s/g, "") : (this.userDetails.phone ? this.userDetails.phone.number.replace(/\s/g, "") : undefined);
      // data.password = data.password ? data.password : undefined;
      // data.confirm_password = data.confirm_password ? data.confirm_password : undefined;
      // data.exp_user_subscription = data.exp_user_subscription ? data.exp_user_subscription : new Date();
      // data.email_verify=this.userDetails.email_verify?this.userDetails.email_verify:0;
      // data.interestList = [];
      // data.languageList = [];
      // this.interestList.forEach(item => {
      //   if (data.interest.includes(item._id)) {
      //     data.interestList.push({ id: item._id, name: item.name });
      //   }
      // });
      // this.languageList.forEach(item => {
      //   if (data.languages.includes(item._id)) {
      //     data.languageList.push({ id: item._id, name: item.name, image: item.image });
      //   }
      // });
      // if(this.agm_address && this.agm_address.fulladres!=''){
      //   data.address = this.agm_address
      // }
      data._id = this.ActivatedRoute.snapshot.paramMap.get('id');
      data.phone = phone;

      // formData.append('data', JSON.stringify(data));
      this.apiService.CommonApi(Apiconfig.userSave.method, Apiconfig.userSave.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/app/users/list']);
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  };

  imageCropPopout(template: TemplateRef<any>) {
    this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: false })
  }
  closeProductCrop() {
    // this.imageChangedEvent = null
    this.modalLogoutRef.hide();
  }
}
