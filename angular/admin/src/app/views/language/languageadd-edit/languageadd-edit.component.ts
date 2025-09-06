import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { PrivilagesData } from 'src/app/menu/privilages';

@Component({
  selector: 'app-languageadd-edit',
  templateUrl: './languageadd-edit.component.html',
  styleUrls: ['./languageadd-edit.component.scss']
})
export class LanguageaddEditComponent implements OnInit {

  @ViewChild('LanguageAddEditForm') form: NgForm;

  languageDetails: any;
  pageTitle: string = 'Add Language';
  submitebtn: boolean = false;
  finalImage: File;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
imageName:any
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/language/add' || (split.length > 0 && split[2] == 'language')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'language');
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
      this.pageTitle = "Language Edit";
      this.apiService.CommonApi(Apiconfig.language_Edit.method, Apiconfig.language_Edit.url + id, {}).subscribe(
        (result) => {
            this.languageDetails = result[0];
            this.form.controls['name'].setValue(this.languageDetails.name ? this.languageDetails.name : '');
            this.form.controls['code'].setValue(this.languageDetails.code ? this.languageDetails.code : '');
            this.form.controls['status'].setValue(this.languageDetails.status ? this.languageDetails.status.toString() : '');
            if (this.languageDetails && this.languageDetails.image) {
              this.croppedImage = environment.apiUrl + this.languageDetails.image;
              var imgLen=this.languageDetails.image.split('/')
              this.imageName=imgLen[imgLen.length-1];              
            };
          }
      )
    }
  }

  public onFormSubmit(LanguageAddEditForm: UntypedFormGroup) {
    if (LanguageAddEditForm.valid) {
      this.submitebtn = true;
      var data = LanguageAddEditForm.value;
      data._id = this.ActivatedRoute.snapshot.paramMap.get('id');
      this.apiService.CommonApi(Apiconfig.language_Save.method, Apiconfig.language_Save.url, data).subscribe(
        (result) => {
          if (result) {
            this.router.navigate(['/app/language/list']);
            this.notifyService.showSuccess('Successfully Updated');
          } else {
            this.notifyService.showError(result.message);
          }
          this.submitebtn = false;
        }, (error) => {          
          this.notifyService.showError(error);
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }
}
