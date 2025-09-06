import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-driverlandingpage',
  templateUrl: './driverlandingpage.component.html',
  styleUrls: ['./driverlandingpage.component.scss']
})
export class DriverlandingpageComponent implements OnInit {
  @ViewChild('landingForm') form: NgForm;
  @ViewChild('bannerForm') banner_form: NgForm;
  imageChangedEvent1: any = '';
  imageChangedEvent2: any = '';
  imageChangedEvent3: any = '';
  imageChangedEvent_banner: any = '';
  croppedImage1: any = '';
  croppedImage2: any = '';
  croppedImage3: any = '';
  croppedImage_banner: any = '';
  landingDetails: any;
  envUrl: any = environment.apiUrl;
  preview1: any;
  preview2: any;
  preview3: any;
  banner_preview: any;
  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService
  ) { }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.getLandingContent.method, Apiconfig.getLandingContent.url, {}).subscribe((result) => {
      if (result && result.status == 1 && result.response != null) {
        this.landingDetails = result.response;
        this.form.controls['main_title'].setValue(this.landingDetails ? this.landingDetails.main_title : '');
        this.form.controls['title1'].setValue(this.landingDetails.section1 ? this.landingDetails.section1.title : '');
        this.form.controls['title2'].setValue(this.landingDetails.section2 ? this.landingDetails.section2.title: '');
        this.form.controls['title3'].setValue(this.landingDetails.section3 ? this.landingDetails.section3.title: '');
        this.form.controls['description1'].setValue(this.landingDetails.section1.description ? this.landingDetails.section1.description : '');
        this.form.controls['description2'].setValue(this.landingDetails.section2.description ? this.landingDetails.section2.description : '');
        this.form.controls['description3'].setValue(this.landingDetails.section3.description ? this.landingDetails.section3.description : '');
        this.banner_form.controls['banner_title'].setValue(this.landingDetails.banner.title ? this.landingDetails.banner.title : '');
        this.banner_form.controls['banner_description'].setValue(this.landingDetails.banner.description ? this.landingDetails.banner.description : '');
        this.banner_preview = this.landingDetails.banner.icon
        this.preview1 = this.landingDetails.section1.icon
        this.preview2 = this.landingDetails.section2.icon
        this.preview3 = this.landingDetails.section3.icon
      }
    })

  }
  fileChangeEvent1(event: any): void {
    var file = event.target.files[0];
    var image_valid=['image/jpg','image/jpeg','image/png','image/JPG','image/JPEG','image/PNG'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow! Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        return;
      }
    var _URL = window.URL || window.webkitURL;
    if (file && file.size < 2000000) {
      var img = new Image();
      var objectUrl = _URL.createObjectURL(file);
      img.onload = () => {
        if (img.height > 250 && img.width > 250) {
          this.imageChangedEvent1 = event;
        } else {
          this.notifyService.showError('Image minimum dimension 250 * 250 in pixels');
        }
      };
      img.src = objectUrl;
    } else {
      this.notifyService.showError('Max file size less than 2Mb ');
    }
  }
  fileChangeEvent2(event: any): void {
    var file = event.target.files[0];
    var image_valid=['image/jpg','image/jpeg','image/png','image/JPG','image/JPEG','image/PNG'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow! Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        return;
      }
    var _URL = window.URL || window.webkitURL;
    if (file && file.size < 2000000) {
      var img = new Image();
      var objectUrl = _URL.createObjectURL(file);
      img.onload = () => {
        if (img.height > 250 && img.width > 250) {
          this.imageChangedEvent2 = event;
        } else {
          this.notifyService.showError('Image minimum dimension 250 * 250 in pixels');
        }
      };
      img.src = objectUrl;
    } else {
      this.notifyService.showError('Max file size less than 2Mb ');
    }
  }
  fileChangeEvent3(event: any): void {
    var file = event.target.files[0];
    var image_valid=['image/jpg','image/jpeg','image/png','image/JPG','image/JPEG','image/PNG'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow! Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        return;
      }
    var _URL = window.URL || window.webkitURL;
    if (file && file.size < 2000000) {
      var img = new Image();
      var objectUrl = _URL.createObjectURL(file);
      img.onload = () => {
        if (img.height > 250 && img.width > 250) {
          this.imageChangedEvent3 = event;
        } else {
          this.notifyService.showError('Image minimum dimension 250 * 250 in pixels');
        }
      };
      img.src = objectUrl;
    } else {
      this.notifyService.showError('Max file size less than 2Mb ');
    }
  }
  fileChangeEvent_banner(event: any): void {
    var file = event.target.files[0];
    var image_valid=['image/jpg','image/jpeg','image/png','image/JPG','image/JPEG','image/PNG'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow! Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        return;
      }
    var _URL = window.URL || window.webkitURL;
    if (file && file.size < 2000000) {
      var img = new Image();
      var objectUrl = _URL.createObjectURL(file);
      img.onload = () => {
        if (img.height > 250 && img.width > 250) {
          this.imageChangedEvent_banner = event;
        } else {
          this.notifyService.showError('Image minimum dimension 250 * 250 in pixels');
        }
      };
      img.src = objectUrl;
    } else {
      this.notifyService.showError('Max file size less than 2Mb ');
    }
  }
  // get f(){
  //   return this.form.controls
  // }
  imageCropped1(event: ImageCroppedEvent) {
    this.croppedImage1 = event.base64;
  }
  imageCropped2(event: ImageCroppedEvent) {
    this.croppedImage2 = event.base64;
  }
  imageCropped3(event: ImageCroppedEvent) {
    this.croppedImage3 = event.base64;
  }
  imageCropped_banner(event: ImageCroppedEvent) {
    this.croppedImage_banner = event.base64;
  }
  imageLoaded() {
    /* show cropper */
  }
  cropperReady() {
    /* cropper ready */
  }
  loadImageFailed() {
    /* show message */
  }

  onFormSubmit(landingForm: UntypedFormGroup) {
    if (landingForm.status != "INVALID") {
      var data = {
        croppedImage1: this.croppedImage1 ? this.croppedImage1 : '',
        croppedImage2: this.croppedImage2 ? this.croppedImage2 : '',
        croppedImage3: this.croppedImage3 ? this.croppedImage3 : '',
        description1: landingForm.value.description1,
        description2: landingForm.value.description2,
        description3: landingForm.value.description3,
        main_title: landingForm.value.main_title,
        title1: landingForm.value.title1,
        title2: landingForm.value.title2,
        title3: landingForm.value.title3,
      }
      this.apiService.CommonApi(Apiconfig.addLanding.method, Apiconfig.addLanding.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            window.location.reload()
            this.notifyService.showSuccess("Successfully saved.");
          } else {
            this.notifyService.showError("Something went wrong.");
          }
        })
    }

  }
  onSubmit(bannerForm: UntypedFormGroup) {
    if (bannerForm.status != "INVALID" && this.croppedImage_banner) {
      var data = {
        description: bannerForm.value.banner_description ? bannerForm.value.banner_description : '',
        icon: this.croppedImage_banner ? this.croppedImage_banner : '',
        title: bannerForm.value.banner_title ? bannerForm.value.banner_title : ''
      }
      this.apiService.CommonApi(Apiconfig.addBanner.method, Apiconfig.addBanner.url, data).subscribe(
        (result) => {
          window.location.reload()
          this.notifyService.showSuccess("Successfully saved.");
        }), (error) => {
          this.notifyService.showError("Something went wrong.");
        }

    }
  }

}
