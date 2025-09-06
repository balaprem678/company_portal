import { ChangeDetectorRef, Component, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { WebsocketService } from 'src/app/_services/websocket.service';
import { CountryISO, SearchCountryField } from '@khazii/ngx-intl-tel-input';
import { PhoneNumberUtil } from 'google-libphonenumber';

const phoneNumberUtil = PhoneNumberUtil.getInstance();

@Component({
  selector: 'app-eaccount',
  templateUrl: './eaccount.component.html',
  styleUrls: ['./eaccount.component.scss']
})
export class EaccountComponent {

  passwordVisible = false
  confirmpasswordVisible = false
  newpasswordVisible = false
  submitted = false;
  isEditMode = true;
  userProfileEditForm: FormGroup;
  userDetails: any = ''
  username: string = ''
  SearchCountryField = SearchCountryField;
  selectedCountryISO: CountryISO;

  phoneNumberDisable: boolean = true;
  preferredCountries: CountryISO[] = [CountryISO.India, CountryISO.India];
  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private route: Router
  ) {

    var userId = localStorage.getItem('userId');
    if (userId != '') {
      this.getUser()
    }
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'));
    this.username = this.userDetails ? this.userDetails.username : '';
  }

  ngOnInit(): void {
    this.userProfileEditForm = this.fb.group({
      firstName: [this.userDetails.first_name ? this.userDetails.first_name : '', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z]+$/),
        Validators.maxLength(20),
        // Validators.minLength(4)
      ]],
      lastName: [this.userDetails.last_name ? this.userDetails.last_name : '', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z]+$/),
        Validators.maxLength(20),
        // Validators.minLength(4)
      ]],
      displayName: [this.userDetails.username ? this.userDetails.username : '', [
        Validators.required,
        Validators.maxLength(20),
        // Validators.minLength(4) 
      ]],
      email: [this.userDetails.email ? this.userDetails.email : '', [

        Validators.required,
        Validators.email,
        Validators.maxLength(40),
        // Validators.minLength(7),
        Validators.pattern(/^[a-z0-9.]+@[a-z0-9.-]+\.[a-z]{2,3}$/)

      ]],
      phoneNumber: [{ value: this.userDetails.phone.number ? this.userDetails.phone.number : '', disabled: true }],
      // currentPassword: [''],
      // newPassword: [''],
      // confirmPassword: ['']
    });
    // Subscribe to changes in newPassword field

    // this.userProfileEditForm.get('newPassword').valueChanges
    // .pipe(
    //   // Ensure no additional processing happens during subscription
    //   // Only call updatePasswordValidators when there's an actual change
    // )
    // .subscribe(value => {
    //   this.updatePasswordValidators();
    // });
    this.toggleEditMode()
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;

    if (this.isEditMode) {

      this.userProfileEditForm.get('firstName')?.enable();
      this.userProfileEditForm.get('lastName')?.enable();
      this.userProfileEditForm.get('displayName')?.enable();
      this.userProfileEditForm.get('email')?.enable();

    } else {
      this.userProfileEditForm.get('firstName')?.disable();
      this.userProfileEditForm.get('lastName')?.disable();
      this.userProfileEditForm.get('displayName')?.disable();
      this.userProfileEditForm.get('email')?.disable();


    }
  }



  phoneNumber(event) {
    // console.log("phone",this.phoneNo);
    console.log(this.userProfileEditForm,"this.userProfileEditForm");

    if (this.userProfileEditForm?.controls["phoneNumber"].value && this.userProfileEditForm.controls["phoneNumber"].value.number && this.userProfileEditForm.controls["phoneNumber"].value.number.length > 3) {
      let number = phoneNumberUtil.parseAndKeepRawInput(this.userProfileEditForm.controls["phoneNumber"].value.number, this.userProfileEditForm.controls["phoneNumber"].value.countryCode);
      this.userProfileEditForm.controls["phoneNumber"].setValue(phoneNumberUtil.formatInOriginalFormat(number, this.userProfileEditForm.controls["phoneNumber"].value.countryCode));
    }


    // if(this.phoneNo.number && this.phoneNo && this.phoneNo.number.length >3 ){
    //   this.logotpRequested =true
    //   this.form.form.controls["phoneNum"].setValue(this.phoneNo.e164Number);

    // }
  };


  // Update validators for password fields based on newPassword input
  // updatePasswordValidators() {
  //   const newPasswordControl = this.userProfileEditForm.get('newPassword');
  //   const confirmPasswordControl = this.userProfileEditForm.get('confirmPassword');
  //   const currentPasswordControl = this.userProfileEditForm.get('currentPassword');

  //   if (newPasswordControl.value) {
  //     // Apply validators if newPassword is provided
  //     newPasswordControl.setValidators([
  //       Validators.required,
  //       Validators.minLength(6),
  //       Validators.maxLength(13),
  //       Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,13}$/)
  //     ]);
  //     confirmPasswordControl.setValidators([
  //       Validators.required,
  //       Validators.minLength(6),
  //       Validators.maxLength(13),
  //       Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,13}$/)
  //     ]);
  //     currentPasswordControl.setValidators([
  //       Validators.minLength(6),
  //       Validators.maxLength(13),
  //       Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,13}$/)
  //     ]);
  //   } else {
  //     // Remove validators if newPassword is not provided
  //     newPasswordControl.clearValidators();
  //     confirmPasswordControl.clearValidators();
  //     currentPasswordControl.clearValidators();
  //   }

  //   newPasswordControl.updateValueAndValidity({ emitEvent: false });
  //   confirmPasswordControl.updateValueAndValidity({ emitEvent: false });
  //   currentPasswordControl.updateValueAndValidity({ emitEvent: false })

  // }

  userProfileEditSubmit() {
    this.submitted = true;
    const data = this.userProfileEditForm.getRawValue();
    console.log(this.userProfileEditForm, 'ssss');

    if (this.userProfileEditForm.valid) {
      // Check if passwords are entered and match if required
      // const newPassword = data.newPassword;
      // const confirmPassword = data.confirmPassword;
      // const currentPassword = data.currentPassword
      data.userId = this.userDetails._id

      // if (newPassword && (confirmPassword === '' || newPassword !== confirmPassword)) {
      //   console.log('New password and confirm password do not match.');
      //   if(!currentPassword){
      //   this.notifyService.showError('Current Password required for password Change')
      //   return; 
      //   }else{
      //     this.notifyService.showError('New password and confirm password do not match')
      //     return; // Exit if passwords do not match
      //   }

      // }

      console.log(data, 'form data');
      this.apiService.CommonApi(Apiconfig.userProfileUpdate.method, Apiconfig.userProfileUpdate.url, data).subscribe(
        (result) => {
          if (result.status == 1) {
            console.log(result.status, 'THIS IS RESULT');
            console.log(result);
            localStorage.removeItem('userDetails');
            localStorage.removeItem('userId');
            setTimeout(() => {
              localStorage.setItem('userDetails', JSON.stringify(result.userData));
              localStorage.setItem('userId', result.userData._id);

              this.toggleEditMode()
              // this.route.navigate(['/my-account-page'])
            }, 100);
          } else {
            console.log(result)
            this.notifyService.showError(result.message);
          }


        }
      )
    } else {
      console.log('Form is invalid.');
    }
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword').value;
    const confirmPassword = formGroup.get('confirmPassword').value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }


  getUser() {
    this.userDetails = JSON.parse(localStorage.getItem('userDetails'))
    console.log(this.userDetails);
  }


  togglePasswordVisibility(key): void {
    if (key === 'password') {
      this.passwordVisible = !this.passwordVisible; // Toggle visibility state
    } else if (key === 'confirmPassword') {
      this.confirmpasswordVisible = !this.confirmpasswordVisible; // Toggle visibility state
    } else if (key === 'newPassword') {
      this.newpasswordVisible = !this.newpasswordVisible; // Toggle visibility state 
    }
  }

}
