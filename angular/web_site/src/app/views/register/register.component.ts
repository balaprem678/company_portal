import { AfterViewInit, Component, ElementRef, Input, OnInit, TemplateRef, ViewChild, } from '@angular/core';
import { FormControl, FormGroup, Validators, NgForm, FormBuilder } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { COUNTRY } from 'src/app/_services/country';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from '@khazii/ngx-intl-tel-input';
const phoneNumberUtil = PhoneNumberUtil.getInstance();
import { NotificationService } from 'src/app/_services/notification.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { environment } from 'src/environments/environment';

// import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from "angularx-social-login";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, AfterViewInit {
  @ViewChild('registerForm') form: NgForm;
  @Input() registerRef;
  @Input() sociallogin;
  separateDialCode = false;
  SearchCountryField = SearchCountryField;
  CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  preferredCountries: CountryISO[] = [CountryISO.UnitedStates, CountryISO.UnitedKingdom];
  selectedCountryISO: CountryISO = CountryISO['India'];
  checkpassword: any;
  loginRef: BsModalRef;
  modalRef: BsModalRef;
  modalRefOtp: BsModalRef;
  settings: any;
  userDetail: any;
  otpObject: any;
  submitted: boolean = false
  num1: any;
  num2: any;
  num3: any;
  num4: any;
  formInput: string[] = ['digit1', 'digit2', 'digit3', 'digit4'];

  passtypenp: string;
  passtypecnp: string;

  nppassicon: string;
  cnppassicon: string;
  socialLogin: any;

  @ViewChild('digit1', { static: true }) digit1: ElementRef;
  @ViewChild('digit2', { static: true }) digit2: ElementRef;
  @ViewChild('digit3', { static: true }) digit3: ElementRef;
  @ViewChild('digit4', { static: true }) digit4: ElementRef;

  /* googleLoginOptions = {
    scope: 'profile email'
  }; */ // https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiauth2clientconfig
  confpass: any;
  pass: any;
  gender: any;
  env: any = environment.apiUrl;

  constructor(
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private notifyService: NotificationService,
    public store: DefaultStoreService,
    private authenticationService: AuthenticationService,
    // private authService: SocialAuthService
  ) {
    this.store.generalSettings.subscribe(result => {
      this.settings = result;
    })
  }

  ngOnInit(): void {
    this.setCurrentCountryFlag();
    this.passtypenp = 'password'
    this.passtypecnp = 'password'
    this.nppassicon = 'fa fa-eye-slash'
    this.cnppassicon = 'fa fa-eye-slash'
    // if(this.sociallogin){
    //   this.socialLogin = this.sociallogin;
    //   this.ngAfterViewInit();
    // }
    console.log(this.socialLogin, 'social login');

  }

  keyUpEvent(index: number) {
    setTimeout(() => {
      console.log("this.digit2.nativeElement", this.digit2.nativeElement)
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

  phoneNumberChange(event) {
    console.log(this.form.form.controls["phone"].value, 'this is the phone value give it please');

    if (this.form.form.controls["phone"].value && this.form.form.controls["phone"].value.number && this.form.form.controls["phone"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.form.form.controls["phone"].value.number, this.form.form.controls["phone"].value.countryCode);
      this.form.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.form.form.controls["phone"].value.countryCode));
    }
  };

  openLoginPopup(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, { id: 1, class: 'login-model', ignoreBackdropClick: false })
  }

  destroyModel() {
    this.modalService.hide()
  }

  onFormSubmit(registerForm: NgForm, template: TemplateRef<any>) {
    this.submitted = true
    if (registerForm.valid) {
      if (!this.socialLogin && registerForm.value.password != registerForm.value.confirmpassword) {
        this.notifyService.showError('Password and Confirm Password is not matching.');
        return false;
      }
      if (registerForm.value.phone == null) {
        this.notifyService.showError('Please fill the phone number');
        return false;
      }

      if (!this.gender) {
        this.notifyService.showError('Please select gender');
        return false;
      }

      var object = {
        first_name: registerForm.value.first_name,
        country_code: registerForm.value.phone.dialCode,
        phone_number: registerForm.value.phone.number.replace(/\s/g, ""),
        email: registerForm.value.email
      } as any;
      this.userDetail = {};
      this.userDetail.first_name = registerForm.value.first_name,
        this.userDetail.last_name = registerForm.value.last_name,
        this.userDetail.country_code = registerForm.value.phone.dialCode,
        this.userDetail.phone_number = registerForm.value.phone.number.replace(/\s/g, ""),
        this.userDetail.email = registerForm.value.email,
        this.userDetail.gender = this.gender,
        this.userDetail.phone = {
          code: registerForm.value.phone.dialCode,
          number: registerForm.value.phone.number.replace(/\s/g, "")
        }
      if (this.socialLogin && typeof this.socialLogin.id != 'undefined') {
        this.userDetail.social_id = this.socialLogin.id;
        this.userDetail.social_login = this.socialLogin.social_login;
      } else {
        this.userDetail.password = registerForm.value.password;
      }

      this.apiService.CommonApi(Apiconfig.siteRegister.method, Apiconfig.siteRegister.url, this.userDetail).subscribe(result => {
        if (result && result.data) {
          localStorage.removeItem('userDetails');
          localStorage.removeItem('userId');
          setTimeout(() => {
            localStorage.setItem('userDetails', JSON.stringify(result.data));
            localStorage.setItem('userId', result.data.user_id);
            this.authenticationService.currentUserSubject.next({ username: result.data.user_name, role: result.data.role })
            var data = {
              page: 'register'
            }
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
          console.log("result.message.message", result)
          this.notifyService.showError(result.message || 'Something went wrong')
        }
      })
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
      this.notifyService.showError('Please enter all the mandatory fields!')
    }
  }

  onChangeGender(gender) {
    this.gender = gender;
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
  onSubmit(otpForm: NgForm) {
    if (otpForm.valid && this.num1 != '' && this.num2 != '' && this.num3 != '' && this.num4 != '') {

      this.userDetail.password = `${this.num1}${this.num2}${this.num3}${this.num4}`;
      this.apiService.CommonApi(Apiconfig.siteRegisterOtp.method, Apiconfig.siteRegisterOtp.url, this.userDetail).subscribe(result => {
        if (result && result.data) {
          localStorage.setItem('userDetails', JSON.stringify(result.data));
          localStorage.setItem('userId', result.data.user_id);
          this.notifyService.showSuccess(result.data.message);
          this.modalRefOtp.hide();
          var data = {
            page: 'register'
          }
          this.apiService.realoadFunction({ data: data })
        } else {
          this.notifyService.showError(result.message ? (result.message.message ? result.message.message : 'Something went wrong') : 'Something went wrong')
        }
      })
    } else {
      this.notifyService.showError('Please enter all the mandatory field!')
    }
  }

  onDigitInput(event) {
    let element;
    if (event.code !== 'Backspace')
      element = event.srcElement.nextElementSibling;
    if (event.code === 'Backspace')
      element = event.srcElement.previousElementSibling;
    if (element == null)
      return;
    else
      element.focus();
  }

  googleSignup() {

  }

  hideShowPassword(type: string) {
    if (type === 'np') {
      this.passtypenp === 'password' ? this.nppassicon = 'fa fa-eye' : this.nppassicon = 'fa fa-eye-slash';
      this.passtypenp === 'password' ? this.passtypenp = 'text' : this.passtypenp = 'password';
    } else if (type === 'cnp') {
      this.passtypecnp === 'password' ? this.cnppassicon = 'fa fa-eye' : this.cnppassicon = 'fa fa-eye-slash';
      this.passtypecnp === 'password' ? this.passtypecnp = 'text' : this.passtypecnp = 'password';
    }
  }

  /* signInWithGoogle(): void {
    this.authService.signIn(GoogleLoginProvider.PROVIDER_ID,this.googleLoginOptions).then(socialusers => {
      if (socialusers && typeof socialusers.id != 'undefined') {
        this.socialLogin = socialusers;
        var userData = {
          first_name: socialusers.firstName,
          last_name: socialusers.lastName,
          email:  socialusers.email,
          social_id: socialusers.id,
          social_login: this.socialLogin.social_login? this.socialLogin.social_login : 'google'
        } as any;
        this.apiService.CommonApi(Apiconfig.siteRegister.method, Apiconfig.siteRegister.url, userData).subscribe(result=>{
          if(result && result.data){
            localStorage.removeItem('userDetails');
            localStorage.removeItem('userId');
            setTimeout(() => {            
              localStorage.setItem('userDetails', JSON.stringify(result.data));
              localStorage.setItem('userId', result.data.user_id);
              this.authenticationService.currentUserSubject.next({username : result.data.user_name , role : result.data.role})             
            }, 100);
            setTimeout(() => {
              var data = {
                page: 'register'
              }
              this.apiService.realoadFunction({data: data});
            }, 300);

            setTimeout(() => {
              this.updateRecentVisit();
              this.tempcartToCart();
            }, 200);
            this.registerRef.hide();
            this.notifyService.showSuccess(result.data.message);
          }else{
            console.log("result.message.message", result)
            this.notifyService.showError(result.message || 'Something went wrong')
          }
        })
        // this.ngAfterViewInit()
      }
    })
  } */
  ngAfterViewInit(): void {
    if (this.socialLogin) {
      // console.log("this.socialLogin", this.socialLogin)
      setTimeout(() => {
        this.form.controls['first_name'].setValue(this.socialLogin.firstName ? this.socialLogin.firstName : '')
        this.form.controls['last_name'].setValue(this.socialLogin.firstName ? this.socialLogin.lastName : '')
        this.form.controls['email'].setValue(this.socialLogin.email ? this.socialLogin.email : '')
        if (this.socialLogin.phone && typeof this.socialLogin.phone.code != 'undefined') {
          var codedata = this.socialLogin.phone.code as string;
          codedata = codedata.split('+')[1];
          let selected = COUNTRY.filter(x => x.code == codedata);
          let val = selected.length > 0 ? selected[0].name : '';
          this.selectedCountryISO = CountryISO[val];
          let number = phoneNumberUtil.parseAndKeepRawInput(this.socialLogin.phone.number, this.selectedCountryISO);
          this.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.selectedCountryISO));
          this.form.controls['phone'].disable();
        }
      }, 100);
    }
  }
  /* signInWithfaceBook(): void {
    this.authService.signIn(FacebookLoginProvider.PROVIDER_ID).then(socialusers => {
      if (socialusers && typeof socialusers.id != 'undefined') {
        this.socialLogin = socialusers;
        var userData = {
          first_name: socialusers.firstName,
          last_name: socialusers.lastName,
          email:  socialusers.email?socialusers.email: socialusers.id,
          social_id: socialusers.id,
          social_login: this.socialLogin.social_login? this.socialLogin.social_login : 'facebook'
        } as any;
        this.apiService.CommonApi(Apiconfig.siteRegister.method, Apiconfig.siteRegister.url, userData).subscribe(result=>{
          if(result && result.data){
            localStorage.removeItem('userDetails');
            localStorage.removeItem('userId');
            setTimeout(() => {            
              localStorage.setItem('userDetails', JSON.stringify(result.data));
              localStorage.setItem('userId', result.data.user_id);
              this.authenticationService.currentUserSubject.next({username : result.data.user_name , role : result.data.role})
            }, 100);
            setTimeout(() => {
              var data = {
                page: 'register'
              }
              this.apiService.realoadFunction({data: data});
            }, 300);

            setTimeout(() => {
              this.updateRecentVisit();
              this.tempcartToCart();
            }, 200);
            this.registerRef.hide();
            this.notifyService.showSuccess(result.data.message);
          }else{
            console.log("result.message.message", result)
            this.notifyService.showError(result.message || 'Something went wrong')
          }
        })
      }
    })
  } */

  updateRecentVisit() {
    var user_key = localStorage.getItem('user_key');
    var userId = localStorage.getItem('userId');
    if (userId && user_key) {
      this.socketService.socketCall('update_temp_vist', { user_id: user_key, userId: userId }).subscribe(result => {
        if (result && result.status == 0) {
          // localStorage.removeItem('user_key');
        }
      })
    }
  }

  tempcartToCart() {
    var user_id = sessionStorage.getItem('serverKey');
    var userId = localStorage.getItem('userId');
    if (user_id && userId) {
      this.socketService.socketCall('tempcart_to_cart', { user_id: user_id, userId: userId }).subscribe(result => {
        if (result && result.status == 0) {
          var data = {
            page: 'login'
          }
          this.apiService.realoadFunction({ data: data });
        }
      })
    }
  }



}
