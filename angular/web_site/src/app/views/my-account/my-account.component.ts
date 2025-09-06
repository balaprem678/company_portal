import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { Socket } from 'ngx-socket-io';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { CountryISO, PhoneNumberFormat, SearchCountryField } from '@khazii/ngx-intl-tel-input';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { NgForm } from '@angular/forms';
import { NotificationService } from 'src/app/_services/notification.service';
const phoneNumberUtil = PhoneNumberUtil.getInstance();
import { COUNTRY } from 'src/app/_services/country';
import { environment } from 'src/environments/environment';
import { Route, ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss']
})
export class MyAccountComponent implements OnInit, AfterViewInit {
  @ViewChild('form') form: NgForm;
  my_account: boolean = true;
  my_order: boolean = false;
  my_address: boolean = false;

  userDetails: any;
  code: string;
  dialCode: string;
  userId: any;
  currentUser: any;
  orderId: any;
  editprofile: boolean = false;
  PhoneNumberFormat = PhoneNumberFormat;
  CountryISO = CountryISO;
  preferredCountries: CountryISO[] = [CountryISO.UnitedStates, CountryISO.UnitedKingdom];
  SearchCountryField = SearchCountryField;
  selectedCountryISO;
  separateDialCode: any;
  edit: string;
  orderDetails: any;
  currentPage: number = 1;
  refercurrentPage: number = 1;
  addressCurrentPage: number = 1;
  FavouriteCurrentPage: number = 1;
  itemsPerPage: number = 10;
  addrsItemsPerPage: number = 100;
  settings: any;
  orderAddress: any[] = [];
  mapsearch: any;
  AddressType = [{ value: 'home', id: 'HOME', selected: false }, { value: 'work', id: 'WORK', selected: false }, { value: 'other', id: 'OTHERS', selected: false }];
  modelRef: BsModalRef;
  changePassRef: BsModalRef;
  modalRefOtp: BsModalRef;
  checked_gender: boolean = false;
  gender: any;
  apiUrl: any;
  previewImage: any;
  inputFile: any;
  base64Image: any;
  avatar: any;
  forgot_mail: any;
  num1: any;
  num2: any;
  num3: any;
  num4: any;
  formInput: string[] = ['digit1', 'digit2', 'digit3', 'digit4'];
  resendTime: number = 60; // Resend time in seconds
  remainingTime: number;
  timer: any; // Timer reference

  changes: boolean = false;

  passtypenp: string;
  passtypecnp: string;

  nppassicon: string;
  cnppassicon: string;

  constructor(
    private apiService: ApiService,
    private modalService: BsModalService,
    private socketService: WebsocketService,
    private authService: AuthenticationService,
    private socket: Socket,
    private store: DefaultStoreService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
    private Router: Router,
    private activatedroute: ActivatedRoute,
    private route: Router

  ) {
    this.currentUser = this.authService.currentUserValue;
    console.log(this.currentUser, 'hi this is current user');

    this.edit = 'show';
    var useStrg = localStorage.getItem('userId');
    if (useStrg) {
      this.userId = useStrg;
    }

    this.store.generalSettings.subscribe(result => {
      this.settings = result;
    });
    this.apiUrl = environment.apiUrl;

    this.apiService.tapObservable$.subscribe(res => {
      if (res && res.data) {
        if (res.data.tapName == 'my_account') {
          this.my_account = true;
          this.my_order = false;
          this.my_address = false
        } else if (res.data.tapName == 'my_order') {
          this.my_account = false;
          this.my_order = true;
          this.my_address = false
        } else {
          this.my_account = true;
          this.my_order = false;
          this.my_address = false
        }
      }
    });



  }

  validateDigitInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 1) {
      input.value = input.value.slice(0, 1);
    }
  }


  onCtrlV(event: Event, inputIndex: number): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.ctrlKey && keyboardEvent.key.toLowerCase() === 'v') {
      event.preventDefault();
      navigator.clipboard.readText().then(pastedText => {
        if (pastedText && /^\d+$/.test(pastedText) && pastedText.length === 4) {
          for (let i = 0; i < pastedText.length; i++) {
            const num = Number(pastedText[i]);
            switch (i + 1) {
              case 1:
                this.num1 = num;
                break;
              case 2:
                this.num2 = num;
                break;
              case 3:
                this.num3 = num;
                break;
              case 4:
                this.num4 = num;
                break;
              default:
                break;
            }
          }
        }
      }).catch(err => {
        console.error('Failed to read clipboard data: ', err);
      });
    }
  }

  hasLetter(value: string): boolean {
    return /[a-zA-Z]/.test(value);
  }

  hasUpperCase(value: string): boolean {
    return /[A-Z]/.test(value);
  }

  hasSpecialChar(value: string): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(value);
  }
  hasNumber(value: string): boolean {
    return /\d/.test(value);
  }

  ngOnInit(): void {
    // console.log(this.currentUser, 'hi currnt user');


    if (this.route.url == '/edit-profile') {
      this.editprofile = true;
      console.log(this.userId);

      if (this.userId) {
        this.socketService.socketCall('r2e_get_user_details', { userId: this.userId }).subscribe(result => {
          this.userDetails = result.userDetails;
          console.log(this.userDetails);

          this.forgot_mail = this.userDetails.email;
          if (this.userDetails && this.userDetails.gender) {
            this.gender = this.userDetails.gender;
          }
          if (this.changes) {
            setTimeout(() => {
              this.updateLocalstorage(this.userDetails)
            }, 100);
          }

        })
        this.socketService.socketCall('r2e_get_single_order_details', { orderId: this.userId }).subscribe(result => {
          if (result && result.err == 0) {
            this.orderDetails = result.orderDetails && result.orderDetails.length > 0 ? result.orderDetails : [];
          }
        })
        var data = {
          userId: this.userId,
          limit: this.addrsItemsPerPage,
          pageId: this.addressCurrentPage
        }
        this.socketService.socketCall('r2e_get_saved_address', data).subscribe(res => {
          if (res && res.err == 0) {
            this.orderAddress = res.order_address;
          }
        })
      }
      setTimeout(() => {
        this.ngAfterViewInit();
      }, 100);
    } else {
      window.scroll(0, 0);
      if (this.userId) {
        this.socketService.socketCall('r2e_get_user_details', { userId: this.userId }).subscribe(result => {
          this.userDetails = result.userDetails;
          this.forgot_mail = this.userDetails.email;
          if (this.userDetails && this.userDetails.gender) {
            this.gender = this.userDetails.gender;
          }
          if (this.changes) {
            setTimeout(() => {
              this.updateLocalstorage(this.userDetails)
            }, 100);
          }

        })
        this.socketService.socketCall('r2e_get_single_order_details', { orderId: this.userId }).subscribe(result => {
          if (result && result.err == 0) {
            this.orderDetails = result.orderDetails && result.orderDetails.length > 0 ? result.orderDetails : [];
          }
        })
        var data = {
          userId: this.userId,
          limit: this.addrsItemsPerPage,
          pageId: this.addressCurrentPage
        }
        this.socketService.socketCall('r2e_get_saved_address', data).subscribe(res => {
          if (res && res.err == 0) {
            this.orderAddress = res.order_address;
          }
        })
      }



      this.passtypenp = 'password'
      this.passtypecnp = 'password'
      this.nppassicon = 'fa fa-eye-slash'
      this.cnppassicon = 'fa fa-eye-slash'
    }








  }  // end
  updateLocalstorage(data) {
    localStorage.removeItem('userDetails')
    var userdetail = {
      "user_image": this.apiUrl + data.avatar,
      "user_id": data._id,
      "user_name": data.username,
      "status": data.status,
      "role": data.role,
      "email": data.email,
      "country_code": data.phone.code,
      "phone_number": data.phone.number,
      "unique_code": data.unique_code,
    }
    setTimeout(() => {
      localStorage.setItem('userDetails', JSON.stringify(userdetail));
      var data = {
        page: 'profile'
      }
      this.apiService.realoadFunction({ data: data });
    }, 100);
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
          // let val = selected.length > 0 ? selected[0].name : 'Mauritius';
          let val = 'Mauritius';
          if (typeof CountryISO[val] != 'undefined') {
            this.selectedCountryISO = CountryISO[val];
          } else {
            this.selectedCountryISO = CountryISO['Mauritius'];
          };
        };
      });
    }
  };
  checkPhoneNumber(event) {
    // if (this.form.controls.Phone.value && this.form.controls.Phone.value.number && this.form.controls.Phone.value.number.length > 3) {
    //   let number = phoneNumberUtil.parseAndKeepRawInput(this.form.controls.Phone.value.number, this.form.controls.Phone.value.countryCode);
    //   this.form.controls.Phone.setValue(phoneNumberUtil.formatInOriginalFormat(number, this.form.controls.Phone.value.countryCode));
    // }
  };

  changetab(event) {
    console.log(event)
  }

  OnSaveProfile(form: NgForm) {

    if (form.valid) {
      if (form.value.phone == null) {
        this.notifyService.showError('Please fill the phone number');
        return false;
      }
      if (!this.gender) {
        this.notifyService.showError('Please fill the gender');
        return false;
      }
      var form_value = form.value
      var data = {
        email: form_value.email,
        first_name: form_value.yourname,
        last_name: form_value.yourname1,
        user_id: this.userId,
        phone: {
          code: form_value.phone.dialCode,
          number: form_value.phone.number.replace(/\s/g, "")
        },
        gender: this.gender
      } as any;
      console.log(this.base64Image, 'baseImageeee');

      if (this.base64Image) {
        data.base64 = this.base64Image;
      } else {
        data.image = this.avatar;
      }
      this.apiService.CommonApi(Apiconfig.save_profilelist.method, Apiconfig.save_profilelist.url, data).subscribe(result => {
        if (result && result.status == 1) {
          this.changes = true;
          this.notifyService.showSuccess(result.response);
          this.editprofile = false;


          this.getUser()
          this.Router.navigate(['/my-account']).then(() => {
            setTimeout(() => {
              window.location.reload();
            }, 100);

          })
          // var data = {
          //   page: 'profile'
          // }
          // this.apiService.realoadFunction({ data: data });
          // this.ngOnInit()
        } else {
          this.notifyService.showError(result.errors || 'Something went wrong please try again')
        }
      })
    } else {
      this.notifyService.showError('Please fill all the mandatory fields');
      return false;
    }
    this.socketService.myComponentUpdated.emit(this.avatar)
  }
  getUser() {
    var userId = this.userId
    let data = {
      userId: userId
    }
    if (userId != ('' || null || undefined)) {
      this.apiService.CommonApi(Apiconfig.getUser.method, Apiconfig.getUser.url, data).subscribe(respon => {
        console.log(respon, 'respon');
        localStorage.setItem('avatar', respon.data.avatar);
        localStorage.setItem('userDetails', JSON.stringify(respon.data));
        localStorage.setItem('userId', respon.data._id);
      })
    }
  }
  onFileChange(event: any): void {
    const file = event.target.files[0];

    if (file && file.size < 5000000) {
      const image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];

      if (image_valid.indexOf(file.type) === -1) {
        this.notifyService.showError('Images only allow! please select file types of JPG,JPEG & PNG');
        event.target.value = '';
        return;
      }
      this.getBase64(file).then(
        (data: any) => {
          this.previewImage = data;
          this.base64Image = data;
        }
      );
    } else {
      this.notifyService.showError('Max file size less than 5Mb');
      event.target.value = '';
    }
  }


  getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  editfun() {
    this.Router.navigate(['/edit-profile'])

  }
  ngAfterViewInit(): void {
    if (this.form && this.userDetails) {
      this.form.controls['yourname'].setValue(this.userDetails.first_name ? this.userDetails.first_name : '');
      this.form.controls['yourname1'].setValue(this.userDetails.last_name ? this.userDetails.last_name : '');
      this.form.controls['email'].setValue(this.userDetails.email ? this.userDetails.email : '');

      if (this.userDetails.phone && typeof this.userDetails.phone.code != 'undefined') {
        var codedata = this.userDetails.phone.code as string;
        codedata = codedata.split('+')[1];
        let selected = COUNTRY.filter(x => x.code == codedata);
        let val = selected.length > 0 ? selected[0].name : '';
        this.selectedCountryISO = CountryISO[val];
        let number = phoneNumberUtil.parseAndKeepRawInput(this.userDetails.phone.number, this.selectedCountryISO);
        this.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.selectedCountryISO));
      }
      this.apiService.imageExists(environment.apiUrl + this.userDetails.avatar, (exists) => {
        if (exists) {
          this.previewImage = environment.apiUrl + this.userDetails.avatar;
          this.avatar = this.userDetails.avatar;
        }
      });
      this.setCurrentCountryFlag();
      this.cd.detectChanges();
    }
  }

  getOrderAddress() {

  }

  EditAddress(address, template: TemplateRef<any>) {
    this.mapsearch = address;
    this.mapsearch.isAreaDetected = false;
    if (this.mapsearch.line1) {
      var Address = this.mapsearch.line1.split(',');
      Address = Address.reverse()
      if (Address.length >= 4) {
        this.mapsearch.area = Address[3].trim();
        this.mapsearch.isAreaDetected = true;
      } else {
        this.mapsearch.area = this.mapsearch.cityname;
      }
    }
    this.mapsearch.url = "https://maps.googleapis.com/maps/api/staticmap?zoom=15&size=400x400&maptype=roadmap&markers=" + this.mapsearch.loc.lat + ',' + this.mapsearch.loc.lng + "&key=" + environment.mapAPIKey;
    this.mapsearch.loader = 0;
    this.mapsearch.type = this.mapsearch.choose_location;
    this.mapsearch.other_type = '';
    if (this.mapsearch.address_value != 'home' && this.mapsearch.address_value != 'work') {
      this.mapsearch.other_type = this.mapsearch.address_value;
    }
    this.mapSearch();
    this.modelRef = this.modalService.show(template, { id: 1, class: 'address-model', ignoreBackdropClick: false });
  }
  removeAddress(address, template: TemplateRef<any>) {
    this.mapsearch = address;
    this.modelRef = this.modalService.show(template, { id: 1, class: 'removeaddrs-model', ignoreBackdropClick: false })
  }

  mapSearch() {
    if (this.mapsearch) {
      var address_index = this.AddressType.map(function (e) { return e.value; }).indexOf(this.mapsearch.choose_location);
      if (address_index != -1) {
        this.AddressType[address_index].selected = true;
      } else {
        this.AddressType[2].selected = true;
      }
    }
  }

  onFormSubmit(addressForm: NgForm) {
    if (addressForm.valid) {
      if (typeof this.mapsearch.type == 'undefined') {
        this.mapsearch.type = 'other';
        this.mapsearch.address_value = '';
      } else {
        if (this.mapsearch.type == 'other') {
          var others = '';
          if (typeof this.mapsearch.other_type != 'undefined') {
            others = this.mapsearch.other_type.trim();
          }
          if (others == '') {
            this.mapsearch.type = 'other';
            this.mapsearch.choose_location = 'other';
            this.mapsearch.address_value = '';
          } else {
            this.mapsearch.type = others;
            this.mapsearch.choose_location = others;
            this.mapsearch.address_value = others;
          }
        } else {
          this.mapsearch.choose_location = this.mapsearch.type;
          this.mapsearch.address_value = this.mapsearch.type;
        }

        if (this.userId) {
          this.mapsearch.user_id = this.userId;
          this.mapsearch.address_id = this.mapsearch._id;
          this.apiService.CommonApi(Apiconfig.editAddress.method, Apiconfig.editAddress.url, this.mapsearch).subscribe(result => {
            if (typeof result.status != 'undefined' && result.status == '1') {
              this.modelRef.hide();
              this.ngOnInit();
              this.notifyService.showSuccess(result.response)
            } else {
              this.notifyService.showError(result.errors)
            }
          })
        }
      }
    } else {
      this.notifyService.showError('Please fill all the mandatory fields');
    }
  }

  destroyModel() {
    this.modelRef.hide();
  }

  addressTypeChanged(address) {
    this.AddressType.forEach((value) => {
      value.selected = false;
    });
    this.AddressType.forEach((value) => {
      if (value.id == address.id) {
        if (address.id == 'OTHERS') {
          if (this.mapsearch.other_type == '') {
            address.value = 'other';
            this.mapsearch.type = 'other';
            value.value = 'other';
          }
        }
        this.mapsearch.type = address.value;
        this.mapsearch.choose_location = address.value;
        value.selected = true;

      } else {
        if (value.id == 'OTHERS') {
          if (this.mapsearch.other_type == '') {
            value.value = 'other';
          } else {
            value.value = this.mapsearch.other_type;
          }
        }
      }
    });
  }

  changeGender(value) {
    this.gender = value;
    this.checked_gender = true;
  }

  onChangeFormSubmit(changeForm: NgForm) {
    if (changeForm.valid) {
      if (changeForm.value.newpassword != changeForm.value.confirmpassword) {
        this.notifyService.showError('Password and Confirm Password is not matching.');
        return false;
      }
      var objec = {
        email: this.forgot_mail,
        password: changeForm.value.confirmpassword
      }
      this.apiService.CommonApi(Apiconfig.changePassword.method, Apiconfig.changePassword.url, objec).subscribe(result => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message);
          this.changePassRef.hide();
        } else {
          this.notifyService.showError(result.message || 'Something went wrong please try again')
        }
      })
    } else {
      this.notifyService.showError('Please enter all mandatory field')
    }
  }
  changePassow(template: TemplateRef<any>) {
    delete this.num1;
    delete this.num2;
    delete this.num3;
    delete this.num4;
    if (this.forgot_mail) {
      this.apiService.CommonApi(Apiconfig.forgotPassword.method, Apiconfig.forgotPassword.url, { email: this.forgot_mail }).subscribe(result => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message);
          this.startTimer()
          this.modalRefOtp = this.modalService.show(template, { id: 1, class: 'verifyotp-model', ignoreBackdropClick: false });
        } else {
          this.notifyService.showError(result.message || 'Something went wrong please try again')
        }
      })
    }
  }
  onSubmit(otpform, template: TemplateRef<any>) {
    if (otpform.valid && (typeof this.num1 != 'undefined' && this.num1 != null) && (typeof this.num2 != 'undefined' && this.num2 != null) && (typeof this.num3 != 'undefined' && this.num3 != null) && (typeof this.num4 != 'undefined' && this.num4 != null)) {
      // if (this.remainingTime == 0) {
      //   this.notifyService.showError('Timeout please try again.')
      //   return false;
      // }
      var otp = `${this.num1}${this.num2}${this.num3}${this.num4}`;
      this.apiService.CommonApi(Apiconfig.verifyOtp.method, Apiconfig.verifyOtp.url, { email: this.forgot_mail, otp: otp }).subscribe(result => {
        if (result && result.status == 1) {
          this.modalRefOtp.hide();
          this.changePassRef = this.modalService.show(template, { id: 1, class: 'changepass-model', ignoreBackdropClick: false });
          this.notifyService.showSuccess(result.message);
          this.stopTimer();
          setTimeout(() => {
            this.passtypenp = 'password'
            this.passtypecnp = 'password'
            this.nppassicon = 'fa fa-eye-slash'
            this.cnppassicon = 'fa fa-eye-slash'
          }, 200);
        } else {
          this.notifyService.showError(result.message || 'Something went wrong');
          return false;
        }
      })
    } else {
      this.notifyService.showError('Please enter the OTP.')
    }
  }
  onDigitInput(num, event) {
    var keyCode = event.keyCode == 0 ? event.charCode : event.keyCode;
    let element;
    if ((keyCode >= 37 && keyCode <= 40) || (keyCode == 8 || keyCode == 9 || keyCode == 13) || (keyCode >= 48 && keyCode <= 57) || (keyCode == 8 || keyCode == 9 || keyCode == 13) || (keyCode >= 48 && keyCode <= 57) || (keyCode == 96 || keyCode == 97 || keyCode == 98 || keyCode == 98 || keyCode == 99 || keyCode == 100 || keyCode == 101 || keyCode == 102 || keyCode == 103 || keyCode == 104 || keyCode == 105)) {

      const inputValues = (event.target as HTMLInputElement).value;
      if (inputValues.length > 1) {
        if (num == 1) {
          this.num1 = inputValues.slice(0, 1);
        }
        if (num == 2) {
          this.num2 = inputValues.slice(0, 1);
        }
        if (num == 3) {
          this.num3 = inputValues.slice(0, 1);
        }
        if (num == 4) {
          this.num4 = inputValues.slice(0, 1);
        }
      } else {

        if (event.code !== 'Backspace')
          element = event.srcElement.nextElementSibling;

        if (event.code === 'Backspace')
          element = event.srcElement.previousElementSibling;

        if (element == null)
          return;
        else
          element.focus();
      }
    } else {
      return false;
    }
  }

  digitKeyOnly(e) {
    var keyCode = e.keyCode == 0 ? e.charCode : e.keyCode;
    if ((keyCode >= 37 && keyCode <= 40) || (keyCode == 8 || keyCode == 9 || keyCode == 13) || (keyCode >= 48 && keyCode <= 57) || (keyCode == 8 || keyCode == 9 || keyCode == 13) || (keyCode >= 48 && keyCode <= 57) || (keyCode == 96 || keyCode == 97 || keyCode == 98 || keyCode == 98 || keyCode == 99 || keyCode == 100 || keyCode == 101 || keyCode == 102 || keyCode == 103 || keyCode == 104 || keyCode == 105)) {
      return true;
    }
    return false;
  }

  isValidNumber(number) {
    return (1 <= number && number <= 10)
  }

  resenOtp() {
    if (this.forgot_mail) {
      delete this.num1;
      delete this.num2;
      delete this.num3;
      delete this.num4;
      this.apiService.CommonApi(Apiconfig.forgotPassword.method, Apiconfig.forgotPassword.url, { email: this.forgot_mail }).subscribe(result => {
        if (result && result.status == 1) {
          this.remainingTime = 0;
          this.stopTimer();
          setTimeout(() => {
            this.startTimer();
          }, 100);
          this.notifyService.showSuccess('OTP sent successfully')
        } else {
          this.notifyService.showError(result.message || 'Something went wrong please try again')
        }
      })
    }
  }
  destroyPassModel() {
    this.changePassRef.hide();
  }

  startTimer() {
    this.remainingTime = this.resendTime;
    this.timer = setInterval(() => {
      this.remainingTime--;
      if (this.remainingTime === 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  stopTimer() {
    this.remainingTime = 0
    clearInterval(this.timer);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  hideShowPassword(type) {
    if (type === 'np') {
      this.passtypenp === 'password' ? this.nppassicon = 'fa fa-eye' : this.nppassicon = 'fa fa-eye-slash';
      this.passtypenp === 'password' ? this.passtypenp = 'text' : this.passtypenp = 'password';
    } else if (type === 'cnp') {
      this.passtypecnp === 'password' ? this.cnppassicon = 'fa fa-eye' : this.cnppassicon = 'fa fa-eye-slash';
      this.passtypecnp === 'password' ? this.passtypecnp = 'text' : this.passtypecnp = 'password';
    }
  }

  destroyChange() {
    this.modalRefOtp.hide();
  }

}
