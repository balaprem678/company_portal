import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { settings } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.component.html',
  styleUrls: ['./forgot.component.scss']
})
export class ForgotComponent implements OnInit {
  @ViewChild('forgotForm') form: NgForm;
  settings: settings;
  logo: any;
  environment = environment.apiUrl;

  constructor(
    private apiService: ApiService,
    private titleService: Title,
    private router: Router,
    private store: DefaultStoreService,
    private notifyService: NotificationService,
  ) {
    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(
      (result) => {
        if (result && result != null) {
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
  }

  ngOnInit(): void {
  }

  public onFormSubmit(forgotForm: UntypedFormGroup) {
    if (forgotForm && forgotForm.valid) {
      this.apiService.CommonApi(Apiconfig.forgotPassword.method, Apiconfig.forgotPassword.url, forgotForm.value).subscribe(
        (result) => {
          if (result && result.status == "1") {
            this.router.navigate(['/app']);
            this.notifyService.showSuccess(result.response);
          } else {
            this.notifyService.showError(result.response);
          }
        }
      )
    } else {
      this.notifyService.showError('Email is required');
    }
  }

}
