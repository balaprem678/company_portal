import { Component, OnInit, TemplateRef, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, NgZone, AfterViewChecked } from '@angular/core';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { environment } from 'src/environments/environment';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { CategoryPipePipe } from 'src/app/views/category-pipe.pipe';
import { LoginComponent } from '../../views/login/login.component';
import { ModalModalServiceService } from 'src/app/_services/modal-modal-service.service';
import { FormControl, FormGroup, Validators, NgForm, FormBuilder, NgModel } from '@angular/forms';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { AuthenticationService } from 'src/app/_services/authentication.service';
declare var bootstrap: any;

const phoneNumberUtil = PhoneNumberUtil.getInstance();

import { CountryISO, SearchCountryField } from '@khazii/ngx-intl-tel-input';
import { generateKey } from 'crypto';
interface allSubObject {
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
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, AfterViewChecked {

  @ViewChild('loginForm') form: NgForm;

  email = 'poovarasan@casperon.in';
  environment = environment
  username: any;
  userDetails: any = '';
  userDetail: any;
  phoneNo: any
  settings: any;
  site_logo: any;
  logo: any;
  apirUrl: any;
  search: any;
  all_subcategory: any[] = [];
  headerSearch: any[] = [];
  all_Subs: any[] = [];
  selectedCategory: any = {};
  searchData: any[] = [];
  hidelist: boolean = false;
  cartDetails: any;
  fcategory: any[] = [];
  categoryList: any[] = [];
  modalRef: BsModalRef;
  user_image: any;
  modalLogoutRef: BsModalRef;
  cityid: any;
  SearchCountryField = SearchCountryField;
  selectedCountryISO: CountryISO;
  loginsubmitted: boolean = false
  logotpRequested: boolean = false
  submitted: boolean = false
  @ViewChild('otp1') otp1: ElementRef;
  @ViewChild('otp2') otp2: ElementRef;
  @ViewChild('otp3') otp3: ElementRef;
  @ViewChild('otp4') otp4: ElementRef;
  @ViewChild('otpInput1') otpInput1: ElementRef;
  loginotp1: any
  loginotp2: any
  loginotp3: any
  loginotp4: any
  logincountdown: number = 15;
  countdownInterval: any;
  logcountdownInterval: any;
  registerForm: FormGroup;
  socialLogin: any;
  sociallogin: any;
  registerRef: BsModalRef;
  otpRequested = false;
  countdown: number = 15;
  loginForm: FormGroup;
  otpForm: FormGroup;
  showOtpForm = false;


  cartidstatus: boolean = false;
  preferredCountries: CountryISO[] = [CountryISO.India];
  cartCount: any;
  newChild = { id: 9, name: 'New Child', children: [] } as any
  parent_list: any = [];
  firstAndLastname: any
  selectedCategoryId: string | null = null;
  @ViewChild('categoryDropdown', { static: false }) dropdwn!: ElementRef;
  @ViewChild('personalDropdwn', { static: false }) userDropdwn!: ElementRef;
  @ViewChild('articleDeleteTemplate') articleDeleteTemplate!: TemplateRef<any>;
  @ViewChild('loginSignupTemplate', { static: true }) loginSignupTemplate!: TemplateRef<any>;
  @ViewChild('register', { static: true }) register!: TemplateRef<any>;

  user_in: boolean = false
  cacheBuster: number
  code: any;
  shouldFocus: boolean;
  favitemlength: any;
  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    public store: DefaultStoreService,
    private apiService: ApiService,
    private socketService: WebsocketService,
    private modalService: BsModalService,
    private modalServices: ModalModalServiceService,
    private notifyService: NotificationService,
    private renderer: Renderer2,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authenticationService: AuthenticationService,
    private fb: FormBuilder,
    private ngZone: NgZone
  ) {



    this.loginForm = this.fb.group({
      phoneNum: ['', Validators.required],
    });

    this.otpForm = this.fb.group({
      loginotp1: ['', Validators.required],
      loginotp2: ['', Validators.required],
      loginotp3: ['', Validators.required],
      loginotp4: ['', Validators.required],
    });


    this.registerForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      last_name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(40), Validators.minLength(7)]],
      // phone: ['', [Validators.required]],  // Add validation as needed
      // Add OTP controls if needed
      // otp1: ['', Validators.required],
      // otp2: ['', Validators.required],
      // otp3: ['', Validators.required],
      // otp4: ['', Validators.required]
    });

    var userId = localStorage.getItem('userId');

    if (userId != '' && userId != (null || undefined)) {
      this.user_in = true

      //  console.log(this.user_in,userId,"this.user_in");

      this.getUser()
    }
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    this.username = this.userDetails ? this.userDetails.user_name : '';

    // console.log("this.userDetails", this.userDetails)
    if (this.userDetails && this.userDetails.first_name && this.userDetails.last_name) {

      this.firstAndLastname = this.userDetails.first_name
    } else {
      this.firstAndLastname = ''
    }
    this.apiService.reloadObservable$.subscribe(result => {
      if (result) {
        this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
        this.username = this.userDetails ? this.userDetails.user_name : '';
        if (this.userDetails && this.userDetails.first_name && this.userDetails.last_name) {

          this.firstAndLastname = this.userDetails.first_name
        } else {
          this.firstAndLastname = ''
        }
        this.getCartCount();
      }
    })

    this.store.cartdetails.subscribe((result) => {

      this.cartDetails = result
    });
    var searlocation = JSON.parse(sessionStorage.getItem('searchLocation'));
    if (searlocation) {
      this.cityid = searlocation.cityid
    }

    this.apirUrl = environment.apiUrl;

    this.store.generalSettings.subscribe(result => {
      this.settings = result;
      this.logo = result.logo
      this.site_logo = result.site_logo
    })
    // this.store.searchData.subscribe(result => {
    //   this.searchData = result
    // })

    this.store.fcategory.subscribe(result => {
      this.fcategory = result;

    })
    this.store.categoryList.subscribe((result) => {
      this.categoryList = result;
    });
    this.getCardDetails();
  }
  allCategory() {
    this.route.navigate(['/search'])
  }
  getproducts(mid: any, name: any) {
    var name_arr = [];
    name_arr.push(name);
    var obj = JSON.stringify({
      category: [{ rcat: mid, scat: [] }],
      category_name: name_arr,
      filter: 'latest',
    });
    this.route.navigate(['/search'], { queryParams: { filter: btoa(obj) } });
  }

  ngOnInit(): void {
    this.modalServices.openLoginModal$.subscribe(() => {
      this.openLoginModal();
    });


    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Close the modal
        const modalElement = document.getElementById('menuModel');
        if (modalElement) {
          const modalInstance = bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      }
    });





    this.apiService.CommonApi(Apiconfig.fCategory.method, Apiconfig.fCategory.url, {}).subscribe(result => {
      // console.log(result, 'resultttt');
      // const all_sub=result.scat
      // console.log(result, 'this are the result');
      this.all_Subs = result.scat;
      // console.log(this.all_Subs, 'what is the result?');

      // const map = {};
      // all_sub.forEach((item) => {
      //   item.map = { ...item, children: [] };
      // });
      // all_sub.forEach((item) => {
      //   if (item.rcategory !== null) {
      //     map[item.rcategory].children.push(map[item._id]);
      //   } else {
      //     tree.push(map[item._id]);
      //   }
      // });
      // console.log(all_sub,'this is the tree');

      if (result && result.status == 6) {
        this.fcategory = result.list;
        // console.log(this.fcategory,'this  maybe fcategory...')
      }
    })
    this.getCartCount();
    this.getfav()
    var userId = localStorage.getItem('userId');
    if (userId != '') {
      this.getUser()
    }
    var avatar = localStorage.getItem('avatar');
    // console.log(avatar, 'checkavatar');

    // this.socketService.myComponentUpdated.subscribe((avatar) => {
    //   console.log(avatar, 'avatarrr');

    this.reloadImage(avatar)
    // })
  }


  ngAfterViewChecked() {
    if (this.shouldFocus && this.otpInput1) {
      console.log("ngaftercheck");

      this.otpInput1.nativeElement.focus();
      this.shouldFocus = false; // Reset the flag after focusing
    }
  }

  showOtp() {
    // this.showOtpForm = true; 
    console.log("show otopjsdfsdjfn");
    this.shouldFocus = true;

    // this.otpInput1.nativeElement.focus();
    if (this.otpInput1) {
      this.otpInput1.nativeElement.focus();
    }

    // setTimeout(() => {
    //   console.log(123);

    //   this.otpInput1.nativeElement.focus();
    // }, 0);
  }
  trimFirstName() {
    const trimmedValue = this.registerForm.controls['first_name'].value.trim();
    this.registerForm.controls['first_name'].setValue(trimmedValue);
}

trimLastName() {
    const trimmedValue = this.registerForm.controls['last_name'].value.trim();
    this.registerForm.controls['last_name'].setValue(trimmedValue);
}

  onregFormSubmit() {
    this.submitted = true;

    if (this.registerForm.invalid) {
      return;
    }
    let phoneNo = localStorage.getItem('phone')
    this.phoneNo = JSON.parse(phoneNo)
    // Process registration
    const firstName = this.registerForm.value.first_name.trim();
    const lastName = this.registerForm.value.last_name.trim();
    this.registerForm.controls['first_name'].setValue(firstName);
    this.registerForm.controls['last_name'].setValue(lastName);
    
    this.userDetail = {
      first_name: firstName,  
      last_name: lastName,    
      email: this.registerForm.value.email,
      phone: {
        number: this.phoneNo,
        code: this.code
      }
    };

    this.apiService.CommonApi(Apiconfig.siteRegister.method, Apiconfig.siteRegister.url, this.userDetail).subscribe(result => {
      if (result && result.data) {
        localStorage.removeItem('userDetails');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        this.ngZone.run(() => {
          setTimeout(() => {
            localStorage.setItem('userDetails', JSON.stringify(result.data));
            localStorage.setItem('token', result.data.token);

            localStorage.setItem('userId', result.data.user_id);
            this.modalServices.closeModal()
            this.authenticationService.currentUserSubject.next({ username: result.data.user_name, role: result.data.role });
            this.route.navigate(['/']).then(() => {
              window.location.reload()
            });
            this.apiService.realoadFunction({ data: { page: 'register' } });
          }, 100);
        })
        setTimeout(() => {
          this.updateRecentVisit();
          this.tempcartToCart();
          this.tempfavToFav();
        }, 200);
        this.registerRef.hide();
        this.notifyService.showSuccess(result.data.message);
        this.destroyModel();
      } else {
        this.notifyService.showError(result.message.message || result.message || 'Something went wrong');
      }
    });
  }


  handleBackspace(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      // If it's the first input, do nothing
      if (index === 1) return;

      const previousInput = this.otpForm.get(`loginotp${index - 1}`);
      if (previousInput) {
        previousInput.setValue('');
        setTimeout(() => {
          const inputToFocus = this.otpInput1.nativeElement.parentElement.children[index - 2];
          inputToFocus.focus();
        }, 0);
      }
    }
  }



  phoneNumber(event) {
    // console.log("phone",this.phoneNo);
    // console.log(this.form);

    if (this.form?.form.controls["phoneNum"].value && this.form.form.controls["phoneNum"].value.number && this.form.form.controls["phoneNum"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.form.form.controls["phoneNum"].value.number, this.form.form.controls["phoneNum"].value.countryCode);
      this.form.form.controls["phoneNum"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.form.form.controls["phoneNum"].value.countryCode));
    }


    // if(this.phoneNo.number && this.phoneNo && this.phoneNo.number.length >3 ){
    //   this.logotpRequested =true
    //   this.form.form.controls["phoneNum"].setValue(this.phoneNo.e164Number);

    // }
  };

  openLoginModal() {

    // Close the modal
    const modalElement = document.getElementById('menuModel');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    this.modalServices.openModal(this.loginSignupTemplate, {
      backdrop: 'static',
      keyboard: true,
      class: 'form-modal modal-dialog-centered'
    });

  }


  openRegister() {
    this.modalServices.openModal(this.register, {
      backdrop: 'static',
      keyboard: true,
      class: 'form-modal  modal-dialog-centered register_modal'
    });
  }



  reloadImage(img: any) {
    // console.log(img, 'profile image im here');
    this.getUser()
    this.user_image = img
    //  this.userDetails.avatar = img
    //   this.cacheBuster = Date.now();
    this.cdr.detectChanges();


  }
  updateSelectedCategory(index: number, subcategories: allSubObject[]): void {
    // console.log(subcategories, 'this is the subcategories update');
    if (this.selectedCategory[index]) {
      // console.log("hi");
    } else {
      this.selectedCategory[index] = subcategories
    }
    // console.log(this.selectedCategory);

  }


  getSubCategories(id: string, index): void {
    // console.log(index, 'this is the index in the get sub');
    // console.log(id, 'this is the id');

    const res = this.all_Subs.filter((el: any) => {
      return el.rcategory === id;
    });
    this.updateSelectedCategory(index, res);
  }

  removeSub(parentId: number): void {



    const parentIndex = this.fcategory.findIndex(item => item._id === parentId);
    this.selectedCategory[parentIndex] = [];
  }
  getUser() {
    var userId = localStorage.getItem('userId');
    let data = {
      userId: userId
    }
    if (userId != ('' || null || undefined)) {
      this.apiService.CommonApi(Apiconfig.getUser.method, Apiconfig.getUser.url, data).subscribe(respon => {
        // console.log(respon, 'respon');
        if (respon.status && respon) {
          localStorage.setItem('userDetails', JSON.stringify(respon.data));
          localStorage.setItem('userId', respon.data._id);
        }

      })
    }
  }

  editPhoneNumber() {
    this.showOtpForm = false;
    this.logotpRequested = !this.logotpRequested
    // this.loginForm.reset(); // Resets the phone number form
  }


  getCartCount() {
    var userId = localStorage.getItem('userId');
    var data = {} as any;
    if (userId) {
      data.userId = userId;
      data.type = 'cart'
    } else {
      var apikey = sessionStorage.getItem('serverKey');
      if (apikey) {
        data.userId = apikey;
        data.type = 'temp_cart'
      }
    }
    if (data.userId != '') {
      this.apiService.CommonApi(Apiconfig.cartCount.method, Apiconfig.cartCount.url, data).subscribe(respon => {

        // console.log(respon, 'respomsssss');

        // console.log(respon.count, 'cart details count');

        if (respon && respon.status == 1) {
          this.cartCount = respon.count ? respon.count : 0;
        } else {
          this.cartCount = 0
        }
      })
    }
  }



  onFormSubmit() {
    this.loginsubmitted = true;

    if (this.loginForm.valid) {
      if (!this.logotpRequested) {
        return this.notifyService.showError("OTP is required");
      }

      const phoneNumber = this.loginForm.value.phoneNum.number.replace(/\s/g, "");
      const otp = [
        this.loginForm.value.loginotp1,
        this.loginForm.value.loginotp2,
        this.loginForm.value.loginotp3,
        this.loginForm.value.loginotp4
      ].join('');

      const object = {
        phone_number: phoneNumber,
        otp: otp,
        password: "1234"
      };

      // console.log(object, 'object');

      this.authenticationService.login(object).subscribe(result => {
        if (result && result.data && result.status == 1) {

          this.notifyService.showSuccess(result.data.message);
          this.route.navigate(['/']);

          const data = { page: 'login' };
          this.apiService.realoadFunction({ data: data });
          setTimeout(() => {
            this.updateRecentVisit();
            this.tempcartToCart();
            this.tempfavToFav()
          }, 200);
          this.destroyModel();

        } else {
          this.notifyService.showError(result.message ? result.message.message : 'Something went wrong');
          this.loginForm.reset();
        }
      });
    } else {
      if (!this.loginForm.get('phoneNum')?.value.number) {
        this.notifyService.showError('Phone number is required');
      } else if (!this.loginForm.get('loginotp1')?.value || !this.loginForm.get('loginotp2')?.value || !this.loginForm.get('loginotp3')?.value || !this.loginForm.get('loginotp4')?.value) {
        this.notifyService.showError('OTP is required');
      } else {
        this.notifyService.showError('Please enter all the mandatory fields!');
      }
    }
  }

  destroyModel() {
    this.modalService.hide()
    this.loginsubmitted = false;
    this.logotpRequested = false
    this.showOtpForm = false
    this.loginForm.reset()
    this.otpForm.reset()
    // this.loginForm.value.loginotp1.setValue('')
    // this.loginForm.value.loginotp2 = ''
    // this.loginForm.value.loginotp3 = ''
    // this.loginForm.value.loginotp4  = ''
    // this.otpForm.value.loginotp1.setValue('')
    // this.loginForm.value.phoneNum.number = ''
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


  buyProductAsGuest() {
    const server = this.generateServerKey();
    console.log(server, "servereeeeeeeeeeeeeeeeeeee");
    localStorage.setItem('guest_login', 'true');
    localStorage.setItem('guestId', server);
    this.route.navigate(['/checkout']);
    this.modalServices.closeModal();
  }
  generateServerKey(length: number = 32): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);

    // Convert the random bytes into a hex string
    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  loginitiateOTPRequest() {
    const phoneControl = this.loginForm.get('phoneNum');

    if (phoneControl?.valid) {

      this.logstartCountdown();

      //  console.log(phoneControl,"phoneControl");

      // Logic to send OTP
      const phoneNumber = phoneControl.value.number.replace(/\s/g, ""); // Adjust based on your form control structure
      const code = phoneControl.value.dialCode
      this.code = code
      this.phoneNo = phoneNumber
      let data = {
        code: code,
        phone_number: phoneNumber,
      }
      this.apiService.CommonApi(Apiconfig.sendOtp.method, Apiconfig.sendOtp.url, data).subscribe(respon => {
        // console.log(respon, 'respon');
        if (respon.status == '1' && respon) {
          this.logotpRequested = true;
          this.showOtpForm = true;
          this.showOtp()
          this.notifyService.showSuccess("OTP sent successfully")
          // localStorage.setItem('userDetails', JSON.stringify(respon.data));
          // localStorage.setItem('userId', respon.data._id);
        } else {
          this.notifyService.showError(respon.message)
        }

      })
    } else {
      this.notifyService.showError('Please enter a valid phone number.');
    }
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


  verifyOtp() {
    if (this.otpForm.invalid) {
      this.loginsubmitted = true;
      return;
    }

    // Extract OTP values from the form controls
    const otp1 = this.otpForm.get('loginotp1')?.value;
    const otp2 = this.otpForm.get('loginotp2')?.value;
    const otp3 = this.otpForm.get('loginotp3')?.value;
    const otp4 = this.otpForm.get('loginotp4')?.value;

    // Combine the OTP values into a single string
    const otp = `${otp1}${otp2}${otp3}${otp4}`;

    // Construct the payload
    let data = {
      code: this.code,
      phone: this.phoneNo, // Ensure phoneNo is correctly set in your component
      otp: otp
    };
    localStorage.setItem('phone', JSON.stringify(this.phoneNo))
    // Call the API to verify the OTP
    this.apiService.CommonApi(Apiconfig.verifyOtp.method, Apiconfig.verifyOtp.url, data).subscribe(response => {
      // console.log(response, 'response');

      if (response.status === 1) {
        // Handle successful OTP verification
        // console.log('OTP verified successfully');

        // Store user details in local storage if user is found

        if (response.userData) {
          if (response.userData && response.userData.status == 1) {
            localStorage.removeItem('guest_login')
            localStorage.removeItem('guestId')
            localStorage.setItem('userDetails', JSON.stringify(response.userData));
            localStorage.setItem('userId', response.userData._id);
            localStorage.setItem('token', response.token);

            // this.route.navigate(['/']);

            const data = { page: 'login' };
            this.apiService.realoadFunction({ data: data });
            setTimeout(() => {
              this.updateRecentVisit();
              this.tempcartToCart();
              this.tempfavToFav()
              window.location.reload()
            }, 200);
            this.destroyModel();
            this.notifyService.showSuccess("Logged in successfully")
          } else {
            this.destroyModel();
            this.notifyService.showError("Your account is inactive...Please contact administrator for further details");

          }

          // Redirect or navigate to another page if needed
        } else {
          // If user is not found, open the registration modal
          this.modalServices.closeModal()

          this.openRegister();
        }

      } else {
        // Handle verification failure
        this.notifyService.showError(response.message);
        // console.log('OTP verification failed:', response.message);
      }
    }, error => {
      // Handle API call error
      // console.error('Error verifying OTP:', error);
    });
  }



  getfav() {
    var userId = localStorage.getItem('userId');

    if (userId) {
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: userId }).subscribe(result => {
        if (result && result.status == 1) {
          this.favitemlength = result.data.length
          // this.favoritList = result.data ? result.data : [];

          // console.log("favoritList", this.favoritList)
        } else {
          // this.showfavourite = true;
        }
      });
      // this.getCartDetails();
    } else {
      let userid = sessionStorage.getItem('serverKey');
      this.apiService.CommonApi(Apiconfig.favouriteList.method, Apiconfig.favouriteList.url, { user_id: userid, not_login: true }).subscribe(result => {
        if (result && result.status == 1) {
          this.favitemlength = result.data.length
          // this.favoritList = result.data ? result.data : [];

          console.log("favoritList", this.favitemlength, result)
          // this.showfavourite = true;
        } else {
          // this.showfavourite = true;
        }
      });
      // this.getCartDetails();
    }
  }


  logonOtpInput(event: any, index: number) {
    const input = event.target.value;

    // Check for backspace
    if (event.key === 'Backspace') {
      if (input.length === 0 && index > 1) {
        // Move focus to the previous input if the current is empty
        const previousInputIndex = index - 1;
        const previousInput = document.getElementById(`loginotp${previousInputIndex}`);
        if (previousInput) {
          (previousInput as HTMLInputElement).focus();
        }
      }
      return; // Exit the function for backspace handling
    }

    // If the current input has a value, move focus to the next input
    if (input.length === 1) {
      const nextInputIndex = index + 1;
      if (nextInputIndex <= 4) {
        const nextInput = document.getElementById(`loginotp${nextInputIndex}`);
        if (nextInput) {
          (nextInput as HTMLInputElement).focus();
        }
      }
    }

    // Check if all inputs are filled
    const otp1 = this.otpForm.get('loginotp1')?.value;
    const otp2 = this.otpForm.get('loginotp2')?.value;
    const otp3 = this.otpForm.get('loginotp3')?.value;
    const otp4 = this.otpForm.get('loginotp4')?.value;

    if (otp1 && otp2 && otp3 && otp4) {
      // Automatically submit the form
      this.verifyOtp();
    }
  }



  logrestartOTPRequest() {
    if (this.logincountdown === 0) {
      this.logincountdown = 15;
      this.logstartCountdown();
      this.loginitiateOTPRequest()
    }
  }


  footerRouter() {
    this.route.navigate(['/page/privacy-policy'])
    window.scrollTo(0, 0);
    this.destroyModel()
  }
  combo() {
    this.route.navigate(['/combo-offer'])
    window.scrollTo(0, 0);
    this.destroyModel()
  }

  onOtpInput(event: any, index: number) {
    const input = event.target.value;
    if (input.length === 1 && index < 4) {
      this[`otp${index + 1}`].nativeElement.focus();
    }
  }

  restartOTPRequest() {
    if (this.countdown === 0) {
      this.countdown = 15;
      this.startCountdown();
      // Logic to resend OTP
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

  tempfavToFav() {
    var user_id = sessionStorage.getItem('serverKey');
    var userId = localStorage.getItem('userId');
    if (user_id && userId) {
      this.socketService.socketCall('tempfav_to_fav', { user_id: user_id, userId: userId }).subscribe(result => {
        if (result && result.err == 0) {
          var data = {
            page: 'login'
          }
          this.apiService.realoadFunction({ data: data });
        }
      })
    }
  }

  SendEmail() {
    const windowRef = window.open(`mailto:` + this.email, '_blank');

    windowRef.focus();

    setTimeout(function () {
      if (!windowRef.document.hasFocus()) {
        windowRef.close();
      }
    }, 500);
  }
  searchProduct(search: any) {
    // console.log(search, 'is this getting or not');
    let sear = search.trim()

    if (sear.length < 1) {
      this.hidelist = false;
      return;
    }


    function unwindPriceDetails(products: any[]) {
      return products.flatMap(product =>
        product.price_details.map(detail => ({
          slug: product.slug,
          name: product.name,
          mPrice: detail.mprice,
          sPrice: detail.sprice,
          productImage: product.avatar,
          quantity: detail.attributes[0]?.chaild_name || 'Unknown',
        }))
      );
    }


    this.apiService.CommonApi(Apiconfig.allSearchData.method, Apiconfig.allSearchData.url, { search: sear }).subscribe(result => {
      if (result && result.status == 1) {
        // console.log('this search result', result);
        this.headerSearch = unwindPriceDetails(result.sear_product);
        // this.headerSearch = result.sear_product || [];
        // console.log('this is head search ,,,', this.headerSearch);
        this.hidelist = (this.headerSearch?.length ?? 0) > 0;
        // window.location.reload()
      }
    })


  }


  onSearchEnter(search: string) {
  
    this.router.navigate(['/search'], { queryParams: { se: search } });
   this.closeDropDown()
  }
  showProducts(psearch: any) {
    this.hidelist = false;
    this.search = psearch;
    var obj = JSON.stringify({ psearch: psearch, filter: "latest" });
    this.route.navigate(['/search'], { queryParams: { filter: btoa(obj) } });
  }
  serachProductDetail(slug) {
    // console.log('this search proudct detial is being hit ');
    this.headerSearch = []
    // this.hidelist=false
    this.route.navigateByUrl(`/products/${slug}`)
    // routerLink="/products/{{psearch.slug}}"

  }

  getProductWithslug(slug: any) {
    // console.log('this search proudct detial is being hit ');
    this.route.navigateByUrl(`/products/${slug}`).then(() => {
      window.location.reload()
    })

    // setTimeout(() => {


    // }, 200);

  }
  getCardDetails() {
    // console.log('@@@@@@@@@@@@@@')
    var userId = localStorage.getItem('userId');
    var data = {} as any;
    if (userId) {
      data.userId = userId;
      data.type = 'cart'
    } else {
      var apikey = sessionStorage.getItem('serverKey');
      if (apikey) {
        data.userId = apikey;
        data.type = 'temp_cart'
      }
    }
    data.client_offset = (new Date).getTimezoneOffset();
    data.schedule_type = 0;
    var searlocation = JSON.parse(sessionStorage.getItem('searchLocation'));
    if (searlocation) {
      data.cityid = searlocation.cityid
    }
    if (data.userId != '') {
      this.cartDetails = {};
      this.socketService.socketCall('r2e_cart_details', data).subscribe(result => {
        if (result && result.err == 0) {
          this.cartDetails = result.cartDetails;
          // console.log(this.cartDetails, "result.cartDetailsresult.cartDetails");

          // this.cartidstatus = true;
        }
        // this.cartDetails.CartLoader = false as any;
      })
    }
  }


  phoneNumberChange(event: Event) {
    const phoneControl = this.registerForm.get('phone');

    if (phoneControl && phoneControl.value && phoneControl.value.number && phoneControl.value.number.length > 3) {
      const number = phoneNumberUtil.parseAndKeepRawInput(phoneControl.value.number, phoneControl.value.countryCode);
      phoneControl.setValue(phoneNumberUtil.formatInOriginalFormat(number, phoneControl.value.countryCode));
    }
  }

  initiateOTPRequest() {
    if (this.registerForm.controls['phone'].valid) {
      this.otpRequested = true;
      this.startCountdown();
      // Logic to send OTP
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
  // getCardDetails() {
  //   console.log('**************')
  //   var userId = localStorage.getItem('userId');
  //   var data = {} as any;
  //   if (userId) {
  //     data.userId = userId;
  //     data.type = 'cart'
  //   } else {
  //     var apikey = sessionStorage.getItem('serverKey');
  //     if (apikey) {
  //       data.userId = apikey;
  //       data.type = 'temp_cart'
  //     }
  //   }
  //   data.client_offset = (new Date).getTimezoneOffset();
  //   data.schedule_type = 0;
  //   if (data.userId != '') {
  //     this.cartDetails = {};
  //     this.socketService.socketCall('r2e_cart_details', data).subscribe(result => {

  //       if (result && result.err == 0) {
  //         this.cartDetails = result.cartDetails;
  //         console.log(this.cartDetails, 'this.cartDetailsthis.cartDetails');
  //         this.cart_details = this.cartDetails ? (this.cartDetails.cart_details && this.cartDetails.cart_details.length > 0 ? this.cartDetails.cart_details.map(e => { return e.id }) : []) : [];

  //         // let cartLength = result.cartDetails.cart_details.length;
  //         // console.log(cartLength, 'cartLengthcartLength');

  //         // this.cartVariationDetails = result.cartDetails.cart_details;

  //         // for (let i = 0; i < cartLength; i++) {

  //         //   console.log(this.cartVariationDetails[i], 'cartVariationDetailscartVariationDetails');

  //         //   this.cartVariationObject = this.cartVariationDetails[i];


  //         //   this.varientArray.push(this.cartVariationObject.variations[0]);
  //         //   for (let j = 0; j < this.cartVariationObject.variations[0].length; j++) {
  //         //     this.separateCartVarient = this.cartVariationObject.variations[0];

  //         //   }

  //         //   console.log(this.separateCartVarient, 'separateCartVarient');

  //         //   for (let k = 0; k < this.separateCartVarient.length; k++) {
  //         //     this.a = this.separateCartVarient[k];
  //         //     console.log(this.a, 'aaaaaaa');

  //         //   }


  //         //   console.log(this.cartVariationObject, 'cartVariationObjectcartVariationObject');
  //         //   console.log(this.varientArray, 'varientObject');


  //         // this.cartDetails = result.cartDetails.cart_details[i];
  //         // console.log(this.cartDetails, 'all the carts');
  //         // this.detailsCart = result.cartDetails.cart_details[i];
  //         // this.cartVariations = result.cartDetails.cart_details[i].variations[0];

  //         // console.log(this.detailsCart, 'this.detailsCart');
  //         // console.log(this.cartVariations, 'this.cartVariations');

  //         // this.formattedItemName = this.formatItemName(this.detailsCart, this.cartVariations);

  //         // return this.detailsCart;


  //         // return this.cartDetails;
  //         // }


  //         // this.detailsCart = result.cartDetails.cart_details[1];
  //         // this.cartVariations = result.cartDetails.cart_details[0].variations[0];
  //         // this.cartVariation = result.cartDetails.cart_details[0].variations[0][0];
  //         this.cartId = this.cartDetails._id
  //         console.log("this.cartDetails=====================", this.cartDetails)
  //         this.showcart = true;
  //         this.cartidstatus = true;
  //       } else {
  //         this.showcart = true;
  //       }
  //     })
  //   }
  // }
  categoryLink(cat: any) {
    this.router.navigate(['/category/' + cat.slug]).then(() => {

      window.location.reload()
    })
  }


  // categoryLink(cat: any) {
  //   const url = '/category/' + cat.slug;
  //   this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
  //     this.router.navigate([url]);
  //     const modal = document.getElementById('menuModel');
  //     modal.style.display = 'none';
  //     modal.classList.remove('show')
  //     modal.removeAttribute('role');
  //   });
  // }

  // changeCart(prod: { quantity: number; id: any; cart_id: any; varntid: any; }, action: string) {
  //   if (action == 'decreement' || (action == 'increement' && prod.quantity < 20)) {
  //     var userId = localStorage.getItem('userId');
  //     var data = {} as any;
  //     data.foodId = prod.id;
  //     data.cart_id = prod.cart_id;
  //     data.varntid = prod.varntid;
  //     data.quantity_type = action;
  //     // var searlocation = JSON.parse(sessionStorage.getItem('searchLocation'));
  //     // if (searlocation) {
  //     //   data.cityid = searlocation.cityid
  //     // }
  //     if (userId) {
  //       data.userId = '';
  //       data.type = 'cart'
  //     } else {
  //       var apikey = sessionStorage.getItem('serverKey');
  //       if (apikey) {
  //         data.userId = apikey;
  //         data.type = 'temp_cart'
  //       }
  //     }
  //     if (data.userId != '') {
  //       this.socketService.socketCall('r2e_change_cart_quantity', data).subscribe(res => {
  //         console.log("res", res)
  //         if (res && res.err == 0) {
  //           // this.getCardDetails();
  //         }
  //       })
  //     }
  //   }
  // }

  loginUser(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, { id: 1, class: 'login-model', ignoreBackdropClick: false })
  }

  checkOutPage() {

  }

  logOutPop(template: TemplateRef<any>) {
    this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: false })
  }

  logout() {
    localStorage.removeItem('userDetails');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('searchLocation');
    localStorage.removeItem('recently_visit');
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    this.username = this.userDetails ? this.userDetails.user_name : '';
    if (this.userDetails && this.userDetails.first_name && this.userDetails.last_name) {

      this.firstAndLastname = this.userDetails.first_name
    } else {
      this.firstAndLastname = ''
    }
    this.modalLogoutRef.hide();
    this.route.navigate(['/'])
    var data = {
      page: 'logout'
    }
    this.apiService.realoadFunction({ data: data });
    window.location.reload()
  }

  // getproducts() {
  //   // this.route.navigate([''])
  //   var obj = JSON.stringify({ filter: "latest" });
  //   this.route.navigate(['/search'], { queryParams: { filter: btoa(obj) } });
  //   this.closeDropDown()
  // }


  isActive(substring: string): boolean {

    const currentUrl = this.router.url;

    return currentUrl.includes(substring);
  }

  getproduct(name: any, mid: any) {
    // var name_arr = [];
    // console.log(name, mid, 'name and mid');
    // console.log("----------vheck---")
    // name_arr.push(name)
    // var obj = JSON.stringify({ category: [{ rcat: mid, scat: [] }], category_name: name_arr, filter: "latest" });
    // this.renderer.removeClass(this.dropdwn.nativeElement,'show')
    // this.route.navigate(['/category/'+name], {});
    window.location.replace('/category/' + name);


  }

  getsubProduct(name: any, maiId: any, subId: any) {

    // console.log("--------------name---------------------", name)
    // console.log("--------------maiId---------------------", maiId)
    // console.log("--------------subId---------------------", subId)


    // var name_arr = [];
    // name_arr.push(name)
    // var obj = JSON.stringify({ category: [{ rcat: maiId, scat: [subId] }], category_name: name_arr, filter: "latest" });
    // this.route.navigate(['/category/'+name], { });
    this.renderer.removeClass(this.dropdwn.nativeElement, 'show');
    window.location.replace('/category/' + name);

  }

  goMyAccountPage() {
    this.route.navigate(['/my-account']);
    this.renderer.removeClass(this.userDropdwn.nativeElement, 'show')
    // var obj = {
    //   tapName: str
    // }
    // setTimeout(() => {      
    //   this.apiService.getTapName({ data: obj });
    // }, 100);
  }

  orderPage() {
    this.route.navigate(['/my-order']);
    this.renderer.removeClass(this.userDropdwn.nativeElement, 'show')
  }
  addressPage() {
    this.route.navigate(['/manage-address']);
    this.renderer.removeClass(this.userDropdwn.nativeElement, 'show')
  }
  wishlistPage() {
    this.route.navigate(['/my-wishlist']);
    this.renderer.removeClass(this.userDropdwn.nativeElement, 'show')
  }

  destroyPopup() {
    this.modalLogoutRef.hide();
  }
  closeDropDown() {
    setTimeout(() => {
      this.hidelist = false;
      delete this.search;
    }, 500);
  }

  goWishList(template: TemplateRef<any>) {
    if (this.userDetails) {
      this.route.navigate(['/my-wishlist'])
    } else {
      this.modalRef = this.modalService.show(template, { id: 1, class: 'login-model', ignoreBackdropClick: false })
      // this.notifyService.showError('Please login...')
    }
  }
  buildTree(parent, i?) {
    // console.log(parent, this.all_Subs);

    let tree = [];
    this.parent_list.push(parent);
    // console.log(i, this.selectedCategory)
    for (let item of this.all_Subs) {
      // console.log("it-----------------------em", item);

      if (item.rcategory == parent) {
        // console.log(item.rcategory == parent, item.rcategory, parent);

        let children = this.buildTree(item._id);

        if (children.length) {
          item.children = children;
        }
        tree.push(item);

      }
    }
    // console.log(tree);
    this.selectedCategory[parent] = tree;
    // console.log(this.selectedCategory)
    // console.log(this.selectedCategory[i], 'selectedCategoryselectedCategory');

    return tree;
  }


  getllcategory() {

  }


}

