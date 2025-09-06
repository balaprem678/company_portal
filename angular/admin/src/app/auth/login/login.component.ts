import { Component, OnInit } from '@angular/core';
import { UntypedFormGroup, FormControl, Validators, UntypedFormBuilder } from '@angular/forms';

import { ApiService } from "src/app/_services/api.service";
import { Apiconfig } from "src/app/_helpers/api-config";
import { settings } from "src/app/interface/interface";
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { NotificationService } from 'src/app/_services/notification.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  settings: settings;
  loginform: UntypedFormGroup;
  formsubmite: boolean = false;
  logo: any;
  environment = environment.apiUrl
  passwordVisible: boolean = false;
  private errorMessageDisplayed = false;
  constructor(
    private apiService: ApiService,
    private formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private router: Router,
    private titleService: Title,
    private notifyService: NotificationService,
    private store: DefaultStoreService
  ) {

    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(
      (result) => {
        if (result) {
          this.settings = result;
          this.apiService.setAppFavicon(this.settings.favicon);
          this.titleService.setTitle(this.settings.site_title);
          this.store.generalSettings.next(this.settings);
          this.logo = result.logo;
        }
      },
      (error) => {
        console.log(error);
      }
    );
    this.initiateForm();
  }

  get from() {
    return this.loginform.controls;
  }
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
    const passwordField: any = document.getElementById('password');
    if (this.passwordVisible) {
      passwordField.type = 'text';
    } else {
      passwordField.type = 'password';
    }
  }

  ngOnInit(): void {
    if (this.authService.currentUserValue) {
      this.router.navigate(['/app']);
    }
  }

  public initiateForm() {
    this.loginform = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    })
  }

  public onFormSubmit() {
    this.formsubmite = true;
    if (this.loginform.valid) {
      var username = this.loginform.controls['username'].value;
      var password = this.loginform.controls['password'].value;
      this.authService.login(username, password).subscribe(
        (result) => {
          if (result && result.data && result.data.status == 1) {
            this.router.navigate(['/app']);
            this.notifyService.showSuccess("Logged in successfully");
          } else {
            this.showError(result.message.message || 'Username or Password Does Not Match');
          }
        }
      )
    } else {
      this.showError('Please Enter all mandatory fields');
    }
  }

  private showError(message: string) {
    if (!this.errorMessageDisplayed) {
      this.errorMessageDisplayed = true;
      this.notifyService.showError(message);
      setTimeout(() => {
        this.errorMessageDisplayed = false;
      }, 3000); // Assuming the toast disappears after 3 seconds
    }
  }

}