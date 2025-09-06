import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { environment } from "src/environments/environment";
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { PrivilagesData } from 'src/app/menu/privilages';

@Component({
  selector: 'app-interestadd-edit',
  templateUrl: './interestadd-edit.component.html',
  styleUrls: ['./interestadd-edit.component.scss']
})
export class InterestaddEditComponent implements OnInit {
  @ViewChild('InterestAddEditForm') form: NgForm;

  interestDetails: any;
  pageTitle: string = 'Interest Add';
  submitebtn: boolean = false;
  finalImage: File;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  imageName: any;
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/interests/add' || (split.length > 0 && split[2] == 'interests')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'interests');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };
  }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.pageTitle = "Interest Edit";
      this.apiService.CommonApi(Apiconfig.interestEdit.method, Apiconfig.interestEdit.url + id, {}).subscribe(
        (result) => {
          if (result && result.status) {
            this.interestDetails = result.data;
            this.form.controls['name'].setValue(this.interestDetails.name ? this.interestDetails.name : '');
            this.form.controls['status'].setValue(this.interestDetails.status ? this.interestDetails.status.toString() : '');
            if (this.interestDetails && this.interestDetails.image) {
              this.croppedImage = environment.apiUrl + this.interestDetails.image;
              var imgLen = this.interestDetails.image.split('/');
              this.imageName = imgLen[imgLen.length - 1]
            };
          }
        }
      )
    }
  };

  fileChangeEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      // if(event.target.files[0].size <= 1024 * 1024 * 2){
      if (event.target.files[0].type == 'image/jpeg' || event.target.files[0].type == 'image/png' || event.target.files[0].type == 'image/jpg') {
        this.imageChangedEvent = event;
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG ');
      }
      // }else{
      //   this.notifyService.showError('The file size can not exceed 2MiB.');
      // }
    }
  }
  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64;
    this.finalImage = this.dataURLtoFile(event.base64, 'interestimage.png');
  };

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

  public onFormSubmit(InterestAddEditForm: UntypedFormGroup) {
    if (InterestAddEditForm.valid) {
      this.submitebtn = true;
      let formData = new FormData();
      formData.append('image', this.finalImage);
      var data = InterestAddEditForm.value;
      data.id = this.ActivatedRoute.snapshot.paramMap.get('id');
      formData.append('data', JSON.stringify(data));
      this.apiService.CommonApi(Apiconfig.interestSave.method, Apiconfig.interestSave.url, formData).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.router.navigate(['/app/interests/list']);
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
