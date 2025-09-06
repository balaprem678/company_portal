import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { PrivilagesData } from 'src/app/menu/privilages';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-seosettings',
  templateUrl: './seosettings.component.html',
  styleUrls: ['./seosettings.component.scss']
})
export class SeosettingsComponent implements OnInit {
  @ViewChild('seoSettingForm') form: NgForm;
  submitebtn: boolean = false;
  filesize: boolean = false;
  fileDimension: boolean = false;
  og_image: File;
  width: number;
  height: number;
  OgimageChangedEvent: any = '';
  croppedOgImage: any = '';
  finalImage: File;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[];
  seosettings: any;
  image: boolean = false;
  previewOgImage: string;
  viewOnly:boolean=false;

  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/settings/seosetting' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'settings');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        if (this.userPrivilegeDetails[0].status.view && !this.userPrivilegeDetails[0].status.edit) {
          this.viewOnly = true;
        } else {
          this.viewOnly = false;
        }

      }
    }
  }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.seo_Setting.method, Apiconfig.seo_Setting.url, {}).subscribe(
      (result) => {
        if (result) {
          this.seosettings = result
          console.log(this.seosettings);
          this.form.form.controls['focus_keyword'].setValue(this.seosettings.focus_keyword);
          this.form.form.controls['seo_title'].setValue(this.seosettings.seo_title);
          // this.form.form.controls['meta_description'].setValue(this.seosettings.meta_description??"");
          // this.form.form.controls['google_analytics'].setValue(this.seosettings.webmaster.google_analytics);
          if (this.seosettings.og_image) {
            this.image = true;
            
            this.finalImage=this.seosettings.og_image??"";
          this.apiService.imageExists(environment.apiUrl + this.seosettings.og_image, (exists) => {
            this.previewOgImage=environment.apiUrl + this.seosettings.og_image;
            
          })
        }
        };
      },
      (error) => {
        console.log(error);
      }
    )
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

  filechange(event: any) {
    this.filesize = false;
    this.fileDimension = false;
    this.OgimageChangedEvent = '';
    var _URL = window.URL || window.webkitURL;
    var file = event.target.files[0];
  
    if (file) {
      if (file.size < 2000000) {
        if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg') {
          var img = new Image();
          var objectUrl = _URL.createObjectURL(file);
          img.onload = () => {
            if (img.height < 600 && img.width < 1200) {
              this.fileDimension = true;
            } else {
              this.finalImage = file; // Bind the file here
              this.previewOgImage = objectUrl; // Set the preview URL for the image
              this.OgimageChangedEvent = event; // Optional: Save the event for cropping or other use
            }
          };
          img.src = objectUrl;
        } else {
          this.finalImage = null;
          this.notifyService.showError('Photo only allows file types of PNG, JPG, and JPEG.');
        }
      } else {
        this.filesize = true;
      }
    } else {
      this.finalImage = null; // Reset in case no file is selected
      this.previewOgImage = ''; // Reset the preview image
    }
  }


  imageCropped(event: ImageCroppedEvent) {
    const reader = new FileReader();
    reader.onloadend = () =>{ 
      this.croppedOgImage = reader.result;
      this.finalImage = this.dataURLtoFile(reader.result, 'og_image.png')
    };
    reader.readAsDataURL(event.blob);
  }
  reloadComponent() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
      this.router.navigate([currentUrl]));
  }

 public onFormSubmit(seoSettingForm: UntypedFormGroup) {
  // Ensure the form is valid and finalImage is set
  if (seoSettingForm.valid && this.finalImage) {
    this.submitebtn = true;
    let formData = new FormData();
    var data = seoSettingForm.value;
    data.google_html_tag = 'yeyer';
    formData.append('focus_keyword', data.focus_keyword);
    formData.append('seo_title', data.seo_title);
    formData.append('og_image', this.finalImage); // Ensure finalImage is appended

    this.apiService.CommonApi(Apiconfig.seo_SettingSave.method, Apiconfig.seo_SettingSave.url, formData).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.reloadComponent();
          this.notifyService.showSuccess("Successfully Updated");
        } else {
          this.notifyService.showError(result.message);
        }
        this.submitebtn = false;
      },
      (error) => {
        this.submitebtn = false;
        this.notifyService.showError(error);
      }
    );
  } else {
    this.notifyService.showError('Please enter all mandatory fields and ensure the image is valid');
  }
}
}
