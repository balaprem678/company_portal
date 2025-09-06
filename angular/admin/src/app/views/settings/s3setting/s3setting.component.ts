import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { s3RootSettings } from 'src/app/interface/s3-bucket-setting.interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-s3setting',
  templateUrl: './s3setting.component.html',
  styleUrls: ['./s3setting.component.scss']
})
export class S3settingComponent implements OnInit {

  @ViewChild('s3BucketSettingForm') form: NgForm;
  submitebtn: boolean = false;
  s3Settings: s3RootSettings;

  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private store: DefaultStoreService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.getSetting.method, Apiconfig.getSetting.url + 's3-bucket', {}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.s3Settings = result.data;
          this.form.form.controls['access_key'].setValue(this.s3Settings.settings.access_key);
          this.form.form.controls['base_url'].setValue(this.s3Settings.settings.base_url);
          this.form.form.controls['bucket_name'].setValue(this.s3Settings.settings.bucket_name);
          this.form.form.controls['region'].setValue(this.s3Settings.settings.region);
          this.form.form.controls['secret_key'].setValue(this.s3Settings.settings.secret_key);
        }
      }, (error) => {
        console.log(error);
      })
  };


  reloadComponent() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
      this.router.navigate([currentUrl]));
  }

  public onFormSubmit(s3BucketSettingForm: UntypedFormGroup) {
    if (s3BucketSettingForm.valid) {
      this.submitebtn = true;
      var data = {
        settings: s3BucketSettingForm.value
      };
      data.settings.base_url = data.settings.base_url.replace(/\.\//i, "");
      this.apiService.CommonApi(Apiconfig.s3BucketSettingSave.method, Apiconfig.s3BucketSettingSave.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.reloadComponent();
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
          this.submitebtn = false;
        }, (error) => {
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }
}
