import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from "src/environments/environment";
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { PrivilagesData } from 'src/app/menu/privilages';
@Component({
  selector: 'app-postheader-addedit',
  templateUrl: './postheader-addedit.component.html',
  styleUrls: ['./postheader-addedit.component.scss']
})
export class PostheaderAddeditComponent implements OnInit {
  @ViewChild('postheaderAddEditForm') form: NgForm;

  pageTitle: string = 'PostHeader Add';
  submitebtn: boolean = false;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  imageName: any;
  postheaderDetails: any;
  previewHeaderImage: any;
  finalHeaderImage: File;
  filesize: boolean=false;;
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
      if (this.router.url == '/app/settings/postheaderadd' || (split.length > 0 && split[2] == 'postheaderadd')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'postheader');
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
      this.pageTitle = "PostHeader Edit";
      this.apiService.CommonApi(Apiconfig.postheader_edit.method, Apiconfig.postheader_edit.url, { id: id }).subscribe(
        (result) => {
          if (result) {
            this.postheaderDetails = result;
            this.form.controls['postheadertitle'].setValue(this.postheaderDetails.title ? this.postheaderDetails.title : '');
            this.form.controls['postheadername'].setValue(this.postheaderDetails.name ? this.postheaderDetails.name : '');
            this.form.controls['postheaderdescription'].setValue(this.postheaderDetails.description ? this.postheaderDetails.description : '');
            this.form.controls['postheaderdescription1'].setValue(this.postheaderDetails.description1 ? this.postheaderDetails.description1 : '');
            this.form.controls['Post_Type'].setValue(this.postheaderDetails.type ? this.postheaderDetails.type : '');
            this.form.controls['status'].setValue(this.postheaderDetails.status ? this.postheaderDetails.status : '');
            if (this.postheaderDetails && this.postheaderDetails.image) {
              this.previewHeaderImage = environment.apiUrl + this.postheaderDetails.image;
              this.finalHeaderImage = this.postheaderDetails.image;
            }
          }
        })
    }
  }

  filechange(event: any) {
    if (event) {
      var file = event.target.files[0];
      if(file && file.size < 1000000){
      if (file.type == 'image/jpeg' || file.type == 'image/png' || file.type == 'image/jpg') {
        var reader = new FileReader();
        reader.onload = (evt) => {
          this.previewHeaderImage = evt.target.result;
          this.finalHeaderImage = this.dataURLtoFile(this.previewHeaderImage, 'admin_profile.png');
        };
        reader.readAsDataURL(file);
      } else {
        this.notifyService.showError('Photo only allows file types of PNG, JPG and JPEG ');
      }
    }else {
      this.filesize = true;
    }
  }
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

  public onFormSubmit(postheaderAddEditForm: UntypedFormGroup) {
    if (postheaderAddEditForm.valid) {
      this.submitebtn = true;
      let formData = new FormData();
      var data = postheaderAddEditForm.value;
      var id = this.ActivatedRoute.snapshot.paramMap.get('id');
      formData.append('image', this.finalHeaderImage);
      formData.append('title', data.postheadertitle);
      formData.append('name', data.postheadername);
      formData.append('description', data.postheaderdescription);
      formData.append('description1', data.postheaderdescription1);
      formData.append('type', data.Post_Type);
      formData.append('status', data.status);
      if(id){
        formData.append('_id', id);
      }
      this.apiService.CommonApi(Apiconfig.postheader_save.method, Apiconfig.postheader_save.url, formData).subscribe(
        (result) => {
          if (result) {
            this.router.navigate(['/app/settings/postheaderlist']);
            this.notifyService.showSuccess("Succesfully Updated");
          } else {
            this.notifyService.showError("Not Updated");
          }
          this.submitebtn = false;
        }, (error) => {
          this.submitebtn = false;
        })
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }
}
