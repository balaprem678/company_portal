import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-appearance',
  templateUrl: './appearance.component.html',
  styleUrls: ['./appearance.component.scss']
})
export class AppearanceComponent implements OnInit {
  @ViewChild('appearanceSettingForm') form: NgForm;
  submitebtn: boolean = false;
  sitelandingChangedEvent: any = '';
  taskerloginChangedEvent: any = '';
  taskersignupChangedEvent: any = '';
  adminloginChangedEvent: any = '';
  adminlogo: any;
  taskersignup: any;
  previewtaskersignup: string;
  taskersignupfinalImage: any;
  previewadminlogin: any;
  adminlogin: any;
  taskerlogin: any;
  sitelanding: any;
  adminloginfinalImage: any;
  adminloginimage: boolean = false;
  taskersignupimage: boolean = false;
  taskerloginimage: boolean = false;
  taskerloginfinalImage: any;
  previewtaskerlogin: string;
  sitelandingimage: boolean = false;
  sitelandingfinalImage: any;
  previewsitelanding: string;
  appearance: any;
  adminfileDimension: boolean = false;
  adminfilesize: boolean = false;
  sitelandingfileDimension: boolean = false;
  sitelandingfilesize: boolean = false;
  taskerloginfileDimension: boolean = false;
  taskerloginfilesize: boolean = false;
  taskersignupfileDimension: boolean = false;
  taskersignupfilesize: boolean = false;
  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.getappearance_Setting.method, Apiconfig.getappearance_Setting.url, {}).subscribe(
      (result) => {
        if (result) {
          this.taskersignup = result.filter(x => x.imagefor == "taskersignup");
          this.adminlogin = result.filter(x => x.imagefor == "adminlogin");
          this.taskerlogin = result.filter(x => x.imagefor == "loginpage");
          this.sitelanding = result.filter(x => x.imagefor == "sitelanding");

          if (this.taskersignup && this.taskersignup.length != 0) {
            this.taskersignupimage = true;
            this.taskersignupfinalImage = this.taskersignup[0].image;
            this.apiService.imageExists(environment.apiUrl + this.taskersignup[0].image, (exists) => {
              if (exists) {
                this.previewtaskersignup = environment.apiUrl + this.taskersignup[0].image;
              }
            })
          }
          if (this.adminlogin && this.adminlogin.length != 0) {
            this.adminloginimage = true;
            this.adminloginfinalImage = this.adminlogin[0].image;
            this.apiService.imageExists(environment.apiUrl + this.adminlogin[0].image, (exists) => {
              if (exists) {
                this.previewadminlogin = environment.apiUrl + this.adminlogin[0].image;
              }
            })
          }
          if (this.taskerlogin && this.taskerlogin.length != 0) {
            this.taskerloginimage = true;
            this.taskerloginfinalImage = this.taskerlogin[0].image;
            this.apiService.imageExists(environment.apiUrl + this.taskerlogin[0].image, (exists) => {
              if (exists) {
                this.previewtaskerlogin = environment.apiUrl + this.taskerlogin[0].image;
              }
            })
          }
          if (this.sitelanding && this.sitelanding.length != 0) {
            this.sitelandingimage = true;
            this.sitelandingfinalImage = this.sitelanding[0].image;
            this.apiService.imageExists(environment.apiUrl + this.sitelanding[0].image, (exists) => {
              if (exists) {
                this.previewsitelanding = environment.apiUrl + this.sitelanding[0].image;
              }
            })
          }

        };
      },
      (error) => {
        console.log(error);
      }
    )
    this.apiService.CommonApi(Apiconfig.getappearance.method, Apiconfig.getappearance.url, {}).subscribe(
      (result) => {
        if (result) {
          this.appearance = result.admin;
        }
      })
  }
  dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  adminfilechange(event: any) {
    this.adminfilesize = false;
    this.adminfileDimension = false;
    this.adminloginChangedEvent = '';
    var _URL = window.URL || window.webkitURL;
    var file = event.target.files[0]
    this.previewadminlogin = '';
    if (file.size < 5000000) {
      if (file.type == 'image/jpeg' || file.type == 'image/png' || file.type == 'image/jpg') {
        var img = new Image();
        var objectUrl = _URL.createObjectURL(file);
        img.onload = () => {
          if (img.height < 662 && img.width < 1366) {
            this.adminfileDimension = true;
          } else {
            this.adminloginChangedEvent = event;
          }
        };
        img.src = objectUrl;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG and Max file size less than 5Mb');
      }
    } else {
      this.adminfilesize = true;
    }
  }
  adminloginCropped(event: ImageCroppedEvent) {
    this.adminloginfinalImage = this.dataURLtoFile(event.base64, 'adminlogin.png');
  }

  sitelandingfilechange(event: any) {
    this.sitelandingfilesize = false;
    this.sitelandingfileDimension = false;
    this.sitelandingChangedEvent = '';
    this.previewsitelanding = '';
    var _URL = window.URL || window.webkitURL;
    var file = event.target.files[0]
    if (file.size < 5000000) {
      if (file.type == 'image/jpeg' || file.type == 'image/png' || file.type == 'image/jpg') {
        var img = new Image();
        var objectUrl = _URL.createObjectURL(file);
        img.onload = () => {
          if (img.height < 528 && img.width < 1349) {
            this.sitelandingfileDimension = true;
          } else {
            this.sitelandingChangedEvent = event;
          }
        };
        img.src = objectUrl;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG and Max file size less than 5Mb');
      }
    } else {
      this.sitelandingfilesize = true;
    }
  }
  sitelandingCropped(event: ImageCroppedEvent) {
    this.sitelandingfinalImage = this.dataURLtoFile(event.base64, 'sitelanding.png');
  }
  taskerloginfilechange(event: any) {
    this.taskerloginfilesize = false;
    this.taskerloginfileDimension = false;
    this.taskerloginChangedEvent = '';
    this.previewtaskerlogin = '';
    var _URL = window.URL || window.webkitURL;
    var file = event.target.files[0]
    if (file.size < 5000000) {
      if (file.type == 'image/jpeg' || file.type == 'image/png' || file.type == 'image/jpg') {
        var img = new Image();
        var objectUrl = _URL.createObjectURL(file);
        img.onload = () => {
          if (img.height < 500 && img.width < 1587) {
            this.taskerloginfileDimension = true;
          } else {
            this.taskerloginChangedEvent = event;
          }
        };
        img.src = objectUrl;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG and Max file size less than 5Mb');
      }
    } else {
      this.taskerloginfilesize = true;
    }
  }
  taskerloginCropped(event: ImageCroppedEvent) {
    this.taskerloginfinalImage = this.dataURLtoFile(event.base64, 'loginpage.png');
  }
  taskersignupfilechange(event: any) {
    this.taskersignupfilesize = false;
    this.taskersignupfileDimension = false;
    this.taskersignupChangedEvent = '';
    this.previewtaskersignup=''
    var _URL = window.URL || window.webkitURL;
    var file = event.target.files[0]
    if (file.size < 5000000) {
      if (file.type == 'image/jpeg' || file.type == 'image/png' || file.type == 'image/jpg') {
        var img = new Image();
        var objectUrl = _URL.createObjectURL(file);
        img.onload = () => {
          if (img.height < 400 && img.width < 1540) {
            this.taskersignupfileDimension = true;
          } else {
            this.taskersignupChangedEvent = event;
          }
        };
        img.src = objectUrl;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG and Max file size less than 5Mb');
      }
    } else {
      this.taskersignupfilesize = true;
    }
  }
  taskersignupCropped(event: ImageCroppedEvent) {
    // this.previewtaskersignup = event.base64;
    this.taskersignupfinalImage = this.dataURLtoFile(event.base64, 'taskersignup.png');
  }
  reloadComponent() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
      this.router.navigate([currentUrl]));
  }
  public onFormSubmit(appearanceSettingForm: UntypedFormGroup) {
    if (appearanceSettingForm.valid) {
      this.submitebtn = true;
      let formData = new FormData();
      formData.append('header', this.appearance.colors.header)
      formData.append('branding', this.appearance.colors.branding)
      formData.append('sidebar', this.appearance.colors.sidebar)
      formData.append('active', this.appearance.colors.active)
      formData.append('fixedaside', this.appearance.fixed_aside)
      formData.append('fixedheader', this.appearance.fixed_header)
      if (typeof this.taskersignupfinalImage != 'undefined' && this.taskersignupfinalImage) {
        formData.append('taskersignup', this.taskersignupfinalImage)
      };
      if (typeof this.taskerloginfinalImage != 'undefined' && this.taskerloginfinalImage) {
        formData.append('loginpage', this.taskerloginfinalImage)
      };
      if (typeof this.adminloginfinalImage != 'undefined' && this.adminloginfinalImage) {
        formData.append('adminlogin', this.adminloginfinalImage)
      };
      if (typeof this.sitelandingfinalImage != 'undefined' && this.sitelandingfinalImage) {
        formData.append('sitelanding', this.sitelandingfinalImage)
      };
      this.apiService.CommonApi(Apiconfig.getappearance_save.method, Apiconfig.getappearance_save.url, formData).subscribe(
        (result) => {
          if (result && result.ok == 1) {
            this.reloadComponent();
            this.notifyService.showSuccess("Succesfully Updated");
          } else {
            this.notifyService.showError("Not Updated");
          }
          this.submitebtn = false;
        }, (error) => {
          this.submitebtn = false;
          this.notifyService.showError(error);
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }
}
