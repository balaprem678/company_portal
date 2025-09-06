import { Component, ElementRef, Input, OnInit, TemplateRef, ViewChild, } from '@angular/core';
import { FormControl, FormGroup, Validators, NgForm, FormBuilder, NgModel } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { COUNTRY } from 'src/app/_services/country';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from '@khazii/ngx-intl-tel-input';
import { NotificationService } from 'src/app/_services/notification.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { PhoneNumberUtil } from 'google-libphonenumber';
const phoneNumberUtil = PhoneNumberUtil.getInstance();
// import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from "angularx-social-login";
import { WebsocketService } from 'src/app/_services/websocket.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  @ViewChild('loginForm') form: NgForm;
  @ViewChild('forgetForm') forgotform: NgForm;
  // @ViewChild('registerForm') registerform: NgForm;
  @ViewChild('phoneInput', { static: false }) phoneInput: NgModel;

  registerForm: FormGroup;

  @ViewChild('otpform') otform: NgForm;
  @ViewChild('changeForm') changeForm: NgForm;
  @Input() modalRef: BsModalRef;
  logotpRequested : boolean = false
  // @Input() modalRef;
  usernames: any
  submitted: boolean = false
  loginsubmitted: boolean = false
  separateDialCode = false;
  SearchCountryField = SearchCountryField;
  CountryISO = CountryISO;
  PhoneNumberFormat = PhoneNumberFormat;
  selectedCountryISO: CountryISO;
  preferredCountries: CountryISO[] = [CountryISO.India, CountryISO.India];
  preferredCountrieslogin: CountryISO[] = [CountryISO.India, CountryISO.India];
  checkpassword: any;
  modalRefOtp: BsModalRef;
  registerRef: BsModalRef;
  forgotRef: BsModalRef;
  changePassRef: BsModalRef;
  num1: any;
  num2: any;
  num3: any;
  num4: any;
  formInput: string[] = ['digit1', 'digit2', 'digit3', 'digit4'];
  userDetail: any;

  loginObject: any;
  passtypenp: string;
  passtypecnp: string;

  nppassicon: string;
  cnppassicon: string;

  @ViewChild('digit1', { static: true }) digit1: ElementRef;
  @ViewChild('digit2', { static: true }) digit2: ElementRef;
  @ViewChild('digit3', { static: true }) digit3: ElementRef;
  @ViewChild('digit4', { static: true }) digit4: ElementRef;

  socialLogin: any;
  sociallogin: any;

  /* googleLoginOptions = {
    scope: 'profile email'
  };  */// https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiauth2clientconfig

  resendTime: number = 60; // Resend time in seconds
  remainingTime: number;
  timer: any; // Timer reference
  forgot_mail: any;
  otp: any;
  settings: any;
  env: any = environment.apiUrl;
  passwordFieldType: string = 'password';
  passwordFieldTypereg: string = 'password';
  otpSent = false;
  // timer: number = 15;
  interval: any;
  otpRequested = false;
  countdown: number = 15;
  logincountdown: number = 15;
  countdownInterval: any;
  logcountdownInterval: any;
  loginotp1 : any
  loginotp2 : any
  loginotp3 : any
  loginotp4 : any
  @ViewChild('otp1') otp1: ElementRef;
  @ViewChild('otp2') otp2: ElementRef;
  @ViewChild('otp3') otp3: ElementRef;
  @ViewChild('otp4') otp4: ElementRef;
  // @ViewChild('loginotp1') loginotp1: ElementRef;
  // @ViewChild('loginotp2') loginotp2: ElementRef;
  // @ViewChild('loginotp3') loginotp3: ElementRef;
  // @ViewChild('loginotp4') loginotp4: ElementRef;
  constructor(
    private apiService: ApiService,
    private modalService: BsModalService,
    private formBuilder: FormBuilder,
    private yourElement: ElementRef,
    private notifyService: NotificationService,
    private authenticationService: AuthenticationService,
    // private authService: SocialAuthService,
    private socketService: WebsocketService,
    private store: DefaultStoreService,
    private route: Router,

  ) {
    this.store.generalSettings.subscribe((result) => {
      this.settings = result;
    });
  }
  footerRouter(){
    this.route.navigate(['/page/privacy-policy'])
    window.scrollTo(0, 0);
  }

  ngOnInit(): void {
    this.setCurrentCountryFlag();
    this.passtypenp = 'password'
    this.passtypecnp = 'password'
    this.nppassicon = 'fa fa-eye-slash'
    this.cnppassicon = 'fa fa-eye-slash'
    // this.countryISO = 'in';
    // this.registerForm = this.formBuilder.group({
    //   first_name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
    //   last_name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
    //   email: ['', [
    //     Validators.required,
    //     Validators.email,
    //     Validators.maxLength(40),
    //     // Validators.minLength(7),
    //     Validators.pattern(/^[a-z0-9.]+@[a-z0-9.-]+\.[a-z]{2,3}$/)
    //   ]],
    //   // password: ['', [
    //   //   Validators.required,
    //   //   Validators.minLength(6),
    //   //   Validators.maxLength(13),
    //   //   Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,13}$/)
    //   // ]],
    // });

    this.registerForm = this.formBuilder.group({
      first_name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      last_name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(40), Validators.pattern(/^[a-z0-9.]+@[a-z0-9.-]+\.[a-z]{2,3}$/)]],
      phone: [null, [Validators.required]],
      otp1: ['', Validators.required],
      otp2: ['', Validators.required],
      otp3: ['', Validators.required],
      otp4: ['', Validators.required]
    });
  }
  onPhoneChange(value: any) {
    const maxLength = 15;
    if (value && value.length > maxLength) {
      // this.phone = value.substring(0, maxLength);
      this.phoneInput.control.setValue(value.substring(0, maxLength));

    }
  }
  phoneNumber(event) {
    if (this.form.form.controls["phoneNum"].value && this.form.form.controls["phoneNum"].value.number && this.form.form.controls["phoneNum"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.form.form.controls["phoneNum"].value.number, this.form.form.controls["phoneNum"].value.countryCode);
      this.form.form.controls["phoneNum"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.form.form.controls["phoneNum"].value.countryCode));
    }
  };

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
  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }
  togglePasswordregVisibility() {
    this.passwordFieldTypereg = this.passwordFieldTypereg === 'password' ? 'text' : 'password';
  }

  destroyModel() {
    this.modalService.hide()
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

  // phoneNumberChange(event) {
  //   console.log(event,"1111111111111");

  //   if (this.registerform.form.controls["phone"].value && this.registerform.form.controls["phone"].value.number && this.registerform.form.controls["phone"].value.number.length > 3) {
  //     let number = phoneNumberUtil.parseAndKeepRawInput(this.registerform.form.controls["phone"].value.number, this.registerform.form.controls["phone"].value.countryCode);
  //     this.registerform.form.controls["phone"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.registerform.form.controls["phone"].value.countryCode));
  //   }
  // };
  phoneNumberChange(event: Event) {
    const phoneControl = this.registerForm.get('phone');

    if (phoneControl && phoneControl.value && phoneControl.value.number && phoneControl.value.number.length > 3) {
      const number = phoneNumberUtil.parseAndKeepRawInput(phoneControl.value.number, phoneControl.value.countryCode);
      phoneControl.setValue(phoneNumberUtil.formatInOriginalFormat(number, phoneControl.value.countryCode));
    }
  }
  onFormSubmit(loginForm: NgForm, template: TemplateRef<any>) {
    console.log(loginForm.valid)
    this.loginsubmitted = true
    if (loginForm.valid) {
      // if (loginForm.value.phone == null) {
      //   this.notifyService.showError('Please fill the phone number');
      //   return false;
      // }
      // console.log(loginForm.value.phoneNum.number,"loginFormloginFormloginForm");
      if(!this.logotpRequested){
        return this.notifyService.showError("Otp is required")
      }
// return
      // code: this.registerForm.value.phone.dialCode,
      // number: this.registerForm.value.phone.number.replace(/\s/g, "")
      // var otp = this
      var object = {
        phone_number: loginForm.value.phoneNum.number.replace(/\s/g, ""),
        password: "1234"
      }
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
      console.log(object, 'object');

      this.authenticationService.login(object).subscribe(result => {
        if (result && result.data) {
          this.notifyService.showSuccess(result.data.message);
          // this.modalRefOtp.hide();
          // if(template){

          //   this.modalRef.hide()
          // }
          this.route.navigate(['/'])

          var data = {
            page: 'login'
          }
          this.apiService.realoadFunction({ data: data });
          setTimeout(() => {
            this.updateRecentVisit();
            this.tempcartToCart();

          }, 200);
          this.destroyModel();
        } else {
          this.notifyService.showError(result.message ? result.message.message : 'Something went wrong')
          loginForm.reset()
        }
      })
    } else {
      if(!loginForm.value.phoneNum.number){
        this.notifyService.showError('Phone number is required')
      }
     else if(!this.loginotp1 && this.loginotp1 == undefined){
        this.notifyService.showError('Otp is required')
      }else{
        this.notifyService.showError('Please enter all the mandatory field!')
      }
      setTimeout(() => {

      }, 1000);
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
  onregFormSubmit() {
    // console.log(registerForm.valid);
    console.log(this.registerForm.value)
    // return
    this.submitted = true
    console.log(this.otp1,"this.otp1this.otp1this.otp1this.otp1");
    if (this.registerForm.valid) {
      if (!this.otp1 || this.otp1 == (null || undefined) || !this.otp2 || !this.otp3 || !this.otp4) {
        return this.notifyService.showError("Otp is required")
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
      this.userDetail.first_name = this.registerForm.value.first_name,
        this.userDetail.last_name = this.registerForm.value.last_name,
        this.userDetail.username = this.registerForm.value.first_name.trim().toLowerCase() + this.registerForm.value.last_name.trim().toLowerCase()
        console.log("+++++++++++++++++++++")
        console.log(this.userDetail.username)
        // this.userDetail.country_code = registerForm.value.phone.dialCode,
        // this.userDetail.phone_number = registerForm.value.phone.number.replace(/\s/g, ""),
        this.userDetail.email = this.registerForm.value.email;

      // this.userDetail.password = this.registerForm.value.password;
      this.userDetail.phone = {
        code: this.registerForm.value.phone.dialCode,
        number: this.registerForm.value.phone.number.replace(/\s/g, "")
      }
      if (this.socialLogin && typeof this.socialLogin.id != 'undefined') {
        this.userDetail.social_id = this.socialLogin.id;
        this.userDetail.social_login = this.socialLogin.social_login;
      }

      console.log(this.userDetail, "this.userDetailthis.userDetailthis.userDetail");

      //  else {
      //   this.userDetail.password = this.registerForm.value.password;
      // }
      // return
      this.apiService.CommonApi(Apiconfig.siteRegister.method, Apiconfig.siteRegister.url, this.userDetail).subscribe(result => {
        if (result && result.data) {
          localStorage.removeItem('userDetails');
          localStorage.removeItem('userId');
          setTimeout(() => {
            localStorage.setItem('userDetails', JSON.stringify(result.data));
            localStorage.setItem('userId', result.data.user_id);
            this.authenticationService.currentUserSubject.next({ username: result.data.user_name, role: result.data.role })
            this.route.navigate(['/'])
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
          this.notifyService.showError(result.message.message ||result.message|| 'Something went wrong')
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
      if(!this.otp1 && this.otp1 == undefined){
        this.notifyService.showError('Otp is required')
      }else{
        this.notifyService.showError('Please enter all the mandatory fields!')
      }
    }
  }
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
        if (result && result.err == 0) {
          var data = {
            page: 'login'
          }
          this.apiService.realoadFunction({ data: data });
        }
      })
    }
  }

  onSubmit(otpform: NgForm, template: TemplateRef<any>) {
    console.log(otpform, 'otp form');

    if (otpform.valid && (typeof this.num1 != 'undefined' && this.num1 != null) && (typeof this.num2 != 'undefined' && this.num2 != null) && (typeof this.num3 != 'undefined' && this.num3 != null) && (typeof this.num4 != 'undefined' && this.num4 != null)) {
      // if (this.remainingTime == 0) {
      //   this.notifyService.showError('Timeout please try again.')
      //   return false;
      // }
      var otp = `${this.num1}${this.num2}${this.num3}${this.num4}`;
      console.log(otp, 'otp otp otp');

      this.apiService.CommonApi(Apiconfig.verifyOtp.method, Apiconfig.verifyOtp.url, { email: this.forgot_mail, otp: otp }).subscribe(result => {
        if (result && result.status == 1) {
          // this.modalRefOtp.hide();
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

  onForgotSubmit(forgotForm: NgForm, template: TemplateRef<any>) {
    delete this.num1;
    delete this.num2;
    delete this.num3;
    delete this.num4;
    if (forgotForm.valid) {
      var email = forgotForm.value.email;
      this.forgot_mail = forgotForm.value.email;
      console.log(email, this.forgot_mail, 'this are the credentials');
      this.apiService.CommonApi(Apiconfig.forgotPassword.method, Apiconfig.forgotPassword.url, { email: email }).subscribe(result => {
        console.log("result", result)
        if (result && result.status == 1) {
          this.otp = result.otp;
          this.notifyService.showSuccess(result.message);
          this.forgotRef.hide();
          this.startTimer()
          this.modalRefOtp = this.modalService.show(template, { id: 1, class: 'verifyotp-model', ignoreBackdropClick: false });
        } else {
          this.notifyService.showError(result.message || 'Something went wrong please try again')
        }
      })
    } else {
      this.notifyService.showError('Please enter the email')
    }
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

  registPopup(template: TemplateRef<any>) {
    this.destroyModel();
    setTimeout(() => {
      this.registerRef = this.modalService.show(template, { id: 1, class: 'register-model', ignoreBackdropClick: false });
    }, 500);
  }

  forgotPopup(template: TemplateRef<any>) {
    // this.modalRef.hide();

    this.modalService.hide()
    setTimeout(() => {
      this.forgotRef = this.modalService.show(template, { id: 1, class: 'forgotpas-model', ignoreBackdropClick: false });
    }, 500)

  }

  resenOtp() {
    if (this.forgot_mail) {
      this.apiService.CommonApi(Apiconfig.forgotPassword.method, Apiconfig.forgotPassword.url, { email: this.forgot_mail }).subscribe(result => {
        if (result && result.status == 1) {
          this.remainingTime = 0;
          this.stopTimer();
          setTimeout(() => {
            this.startTimer();
          }, 100);
        } else {
          this.notifyService.showError(result.message || 'Something went wrong please try again')
        }
      })
    }
  }

  destroyForModel() {
    this.forgotRef.hide()
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
        console.log(element, 'element');

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
    // var value = Number(e.target.value + e.key) || 0;
    console.log('keyCode', keyCode);
    if ((keyCode >= 37 && keyCode <= 40) || (keyCode == 8 || keyCode == 9 || keyCode == 13) || (keyCode >= 48 && keyCode <= 57) || (keyCode == 96 || keyCode == 97 || keyCode == 98 || keyCode == 98 || keyCode == 99 || keyCode == 100 || keyCode == 101 || keyCode == 102 || keyCode == 103 || keyCode == 104 || keyCode == 105)) {
      return true;
      // return this.isValidNumber(value);
    }
    return false;
  }

  isValidNumber(number) {
    console.log(number)
    return (1 <= number && number <= 10)
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

  /* signInWithGoogle(template: TemplateRef<any>): void {
    this.authService.signIn(GoogleLoginProvider.PROVIDER_ID, this.googleLoginOptions).then(socialusers => {
      if (socialusers && typeof socialusers.id != 'undefined') {
        this.sociallogin = socialusers;
        var object = {
          social_id: socialusers.id,
          username: socialusers.email,
          social_login: 'google',
          password: ' '
        } as any;
        this.authenticationService.login(object).subscribe(result => {
          if (result && result.data) {
            this.notifyService.showSuccess(result.data.message);
            this.modalRef.hide();
            var data = {
              page: 'register'
            }
            this.apiService.realoadFunction({data: data});
            setTimeout(() => {
              this.updateRecentVisit();
              this.tempcartToCart();
            }, 200);
          } else {
            if (result.message && result.message.status) {
              this.modalRef.hide();
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
                  }, 100);
                  setTimeout(() => {
                    var data = {
                      page: 'register'
                    }
                    this.apiService.realoadFunction({data: data});
                    this.updateRecentVisit();
                    this.tempcartToCart();
                  }, 200);
                  this.registerRef.hide();
                  this.notifyService.showSuccess(result.data.message);
                }else{
                  this.notifyService.showError(result.message || 'Something went wrong')
                }
              })
            } else {
              this.notifyService.showError(result.message ? result.message.message : 'Something went wrong')
            }
          }
        })
      }
    })
  } */

  /* signInWithfaceBook(template: TemplateRef<any>): void {
    this.authService.signIn(FacebookLoginProvider.PROVIDER_ID,{scope:"email,name,id", return_scopes: true,enable_profile_selector: true}).then(socialusers => {
      console.log("socialusers", socialusers)
      if (socialusers && typeof socialusers.id != 'undefined') {
        this.sociallogin = socialusers;
        var object = {
          social_id: socialusers.id,
          username: socialusers.email?socialusers.email: socialusers.id,
          social_login: 'facebook',
          password: ' '
        } as any;
        this.authenticationService.login(object).subscribe(result => {
          if (result && result.data) {
            this.notifyService.showSuccess(result.data.message);
            this.modalRef.hide()
            var data = {
              page: 'register'
            }
            this.apiService.realoadFunction({data: data});
            setTimeout(() => {
              this.updateRecentVisit();
              this.tempcartToCart();
            }, 200);
          } else {
            if (result.message && result.message.status) {
              this.modalRef.hide();
              var userData = {
                first_name: socialusers.firstName,
                last_name: socialusers.lastName,
                email:  socialusers.email? socialusers.email: socialusers.id,
                social_id: socialusers.id,
                social_login: 'facebook',
              } as any;
              this.apiService.CommonApi(Apiconfig.siteRegister.method, Apiconfig.siteRegister.url, userData).subscribe(result=>{
                if(result && result.data){
                  localStorage.removeItem('userDetails');
                  localStorage.removeItem('userId');
                  setTimeout(() => {            
                    localStorage.setItem('userDetails', JSON.stringify(result.data));
                    localStorage.setItem('userId', result.data.user_id);
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
            } else {
              this.notifyService.showError(result.message ? result.message.message : 'Something went wrong')
            }
          }
        })
      }
    })
  } */

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
    clearInterval(this.timer);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  destroyPassModel() {
    this.changePassRef.hide()
  }
  destroyOtpModel() {
    this.modalRefOtp.hide();
  }




}
