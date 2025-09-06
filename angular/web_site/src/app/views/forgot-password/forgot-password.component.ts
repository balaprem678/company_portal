import { Component, ElementRef, Input, OnInit, TemplateRef, ViewChild, } from '@angular/core';
import { FormControl, FormGroup, Validators, NgForm, FormBuilder } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { COUNTRY } from 'src/app/_services/country';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { SearchCountryField, CountryISO, PhoneNumberFormat } from '@khazii/ngx-intl-tel-input';
import { NotificationService } from 'src/app/_services/notification.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
const phoneNumberUtil = PhoneNumberUtil.getInstance();
// import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from "angularx-social-login";
import { WebsocketService } from 'src/app/_services/websocket.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  num1: any;
  num2: any;
  num3: any;
  num4: any;
  @ViewChild('forgetForm') forgotform: NgForm;
  // @ViewChild('registerForm') registerform: NgForm;

  registerForm: FormGroup;

  @ViewChild('otpform') otform: NgForm;
  @ViewChild('changeForm') changeForm: NgForm;
  @Input() modalRef: BsModalRef;

  checkpassword: any;
  modalRefOtp: BsModalRef;
  registerRef: BsModalRef;
  forgotRef: BsModalRef;
  changePassRef: BsModalRef;
  submitted : boolean = false
  resendTime: number = 60; // Resend time in seconds
  remainingTime: number;
  timer: any; // Timer reference
  forgot_mail: any;
  otp: any;
  settings: any;
  env: any = environment.apiUrl;
  passwordFieldType: string = 'password';
  
  loginObject: any;
  passtypenp: string;
  passtypecnp: string;

  nppassicon: string;
  cnppassicon: string;

  constructor(private apiService: ApiService,
    private modalService: BsModalService,
    private formBuilder: FormBuilder,
    private yourElement: ElementRef,
    private notifyService: NotificationService,
    private authenticationService: AuthenticationService,
    // private authService: SocialAuthService,
    private socketService: WebsocketService,
    private store: DefaultStoreService,
    private route : Router,) { }

  ngOnInit(): void {
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

  onForgotSubmit(forgotForm: NgForm, template: TemplateRef<any>) {
    console.log(template,"templatetemplatetemplate");
    this.submitted = true
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
          console.log("1111111111111");
          
          this.otp = result.otp;
          this.notifyService.showSuccess(result.message);
          // this.forgotRef.hide();
          this.startTimer()
          
          this.modalRefOtp = this.modalService.show(template, { id: 1, class: 'verifyotp-model', ignoreBackdropClick: false });
          console.log(this.modalRefOtp,"this.modalRefOtpthis.modalRefOtpthis.modalRefOtp");

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

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  destroyModel() {
    this.modalService.hide()
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
