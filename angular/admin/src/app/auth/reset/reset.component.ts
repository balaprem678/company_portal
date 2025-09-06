import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { settings } from 'src/app/interface/interface';
import data from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss']
})
export class ResetComponent implements OnInit {

  userID: string = '';
  userCode: string = '';
  verification: any;
  settings: settings;
  logo:any;
  environment=environment.apiUrl;
  @ViewChild('resetpassForm') form: NgForm;

  constructor(
    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private titleService: Title,
    private router: Router,
    private notifyService: NotificationService,
    private store: DefaultStoreService
  ) {
    this.userID = this.activatedRoute.snapshot.paramMap.get('id');
    this.userCode = this.activatedRoute.snapshot.paramMap.get('code');
    this.verification = this.activatedRoute.snapshot.paramMap.get('verification');

    this.apiService.CommonApi(Apiconfig.landingData.method, Apiconfig.landingData.url, {}).subscribe(
      (result) => {
        if (result && result.data) {
          this.settings = result.data;
          this.apiService.setAppFavicon(this.settings.favicon);
          this.titleService.setTitle(this.settings.site_title);
          this.store.generalSettings.next(this.settings);
          this.logo=result.data.logo;
        }
      },
      (error) => {
        console.log(error);
      }
    );

  }

  ngOnInit(): void {
    if (this.verification) {
      var date = new Date().getTime();
      var resolution = date - this.verification
      var re = ((resolution / 1000) / 60)
      if (re > 10) {
        this.notifyService.showError('Link validity is expired, Please try again !!!')
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 1000);
      }
    }
  }

  public onFormSubmit(resetpassForm: UntypedFormGroup) {
    if (resetpassForm && resetpassForm.valid) {
      var data = resetpassForm.value;
      data['id'] = this.userID;
      data['Verification'] = this.verification
      this.apiService.CommonApi(Apiconfig.resetPassword.method, Apiconfig.resetPassword.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/auth']);
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

}
