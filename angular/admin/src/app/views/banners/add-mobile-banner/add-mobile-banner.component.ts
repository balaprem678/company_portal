import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/_services/notification.service';


@Component({
  selector: 'app-add-mobile-banner',
  templateUrl: './add-mobile-banner.component.html',
  styleUrls: ['./add-mobile-banner.component.scss']
})
export class AddMobileBannerComponent implements OnInit {

  webform: UntypedFormGroup;
  preview: string;
  status: any = "";
  id: string;
  imageFile: string | Blob;
  submitted: boolean = false;
  curentUser: any;
  userPrivilegeDetails: any;
  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private notifyService: NotificationService,
    private authenticationservice: AuthenticationService) {
    this.curentUser = this.authenticationservice.currentUserValue;
    var split = this.router.url.split('/');
    console.log(this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/banners/mobile-banner-add' || (split.length > 0 && split[2] == 'Banners')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'category');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.route.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.route.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };
  }

  ngOnInit(): void {

    this.webform = this.fb.group({
      bannername: ['', Validators.required],
      status: [' ', Validators.required],
      image: [''],
    });
    this.id = this.route.snapshot.paramMap.get('id')
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.mobEdit.method, Apiconfig.mobEdit.url, { id: this.id }).subscribe(result => {
        if (result) {
          this.webform.controls.bannername.setValue(result[0].bannername)
          this.webform.controls.status.setValue(result[0].status)
          this.preview = environment.apiUrl + result[0].img
        }
      })
    }
  }

  get formcontrol() {
    return this.webform.controls;
  }


  onSelectedFile(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG,JPEG,PNG');
        this.webform.controls['image'].setValue('')
        return;
      }
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.preview = reader.result as string;
      }
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    this.submitted = true

    if (!this.webform.valid) {
      return
    }
    else {
      const formData = new FormData();
      if (this.id) {
        formData.append('_id', this.id);
      }
      formData.append('bannername', this.webform.get('bannername').value);
      formData.append("status", this.webform.get('status').value)
      formData.append('img', this.imageFile);
      formData.append('slug1', this.webform.get('bannername').value.replace(/ /g, '-'));
      this.apiService.CommonApi(Apiconfig.mobSave.method, Apiconfig.mobSave.url, formData).subscribe(result => {
        if (result && result.status == 1) {
          this.router.navigate(["/app/banners/mobile-list"])
          this.notifyService.showSuccess(result.message)
        }
        else {
          this.notifyService.showError(result.message)
        }
      })
    }
  }

}
