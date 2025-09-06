import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FormGroup, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/_services/notification.service';
import { log } from 'console';
@Component({
  selector: 'app-banner-types',
  templateUrl: './banner-types.component.html',
  styleUrls: ['./banner-types.component.scss']
})
export class BannerTypesComponent {
  //bannerTypeAdd
  @ViewChild('bannerstypes') bannerstypes: NgForm;
  statusOptions = [
    // { label: 'Select Status', value: '' },
    { name: 'Active', id: 1 },
    { name: 'Inactive', id: 2 }
  ];
  routerurl: any
  submitted: boolean = false;
  url: any
  typeStatus: any
  preview: string = '';
  imageFile: any;
  id:any
  getBanners:any
  selectedStatus: any = 1;
  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private notifyService: NotificationService,
    private authenticationservice: AuthenticationService, private cd: ChangeDetectorRef,) {


  }

  ngOnInit(): void {
    // this.route.paramMap.subscribe(params => {
    //   const id = params
    //   console.log('Route parameter id:', window);
    // });
    this.id = this.route.snapshot.paramMap.get('id')
    if(this.id){
      this.apiService
      .CommonApi(Apiconfig.getBannerTypes.method, Apiconfig.getBannerTypes.url, {_id : this.id})
      .subscribe((res) => {
  console.log(res,"outputtttttttttttttttttttt");
             this.getBanners = res.data.doc
             this.bannerstypes.form.controls['banner_name'].setValue(this.getBanners.banner_name)
             this.bannerstypes.form.controls['banner_url'].setValue(this.getBanners.banner_url)
            //  this.bannerstypes.form.controls['specification'].setValue(this.getBanners.content ? this.getBanners.content : '')
            //  this.typeStatus = this.getBanners.type_status
            //  this.bannerstypes.form.controls['selectedStatus'].setValue(this.getBanners.status)
             this.selectedStatus = this.getBanners.status
             this.preview = environment.apiUrl + (this.getBanners && this.getBanners.image &&  this.getBanners.image.fallbackImage  != undefined && this.getBanners.image.fallbackImage ? this.getBanners.image.fallbackImage : this.getBanners.image)
            //  this.imageFile = this.getBanners.image
             
      })
    }
    console.log("this.id",this.id);
    
    //getBannerTypes
    console.log(this.router.url, "this.router.url");
    this.routerurl = this.router.url.split('/')
    if(this.id){
      this.url = this.routerurl[this.routerurl.length - 2]      
    }else{
      this.url = this.routerurl[this.routerurl.length - 1]
    }
    if (this.url == 'header-1') {
      this.typeStatus = 1
    } else if (this.url == 'header-2') {
      this.typeStatus = 2
    } else if (this.url == 'post-header-1') {
      this.typeStatus = 3
    } else if (this.url == 'post-header-2') {
      this.typeStatus = 4
    } else if (this.url == 'post-category-3') {
      this.typeStatus = 5

    } else if (this.url == 'post-category-6') {
      this.typeStatus = 6
    }
    else if (this.url == 'pre-footer') {
      this.typeStatus = 7
    }

  }
  onStatusChange(event: any) {
    console.log('Selected Status Changed: ', event);
    this.selectedStatus = event; // Update the selectedStatus manually
  }
  // onSelectedFile(event) {
  //   if (event.target.files.length > 0) {
  //     const file = event.target.files[0];
  //     var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];
  //     if (image_valid.indexOf(file.type) == -1) {
  //       this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
  //       this.bannerstypes.controls['image'].setValue('');
  //       return;
  //     }

  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       const img = new Image();
  //       img.onload = () => {

  //         // console.log("image", img.width == 1349,  img.height)
  //         // if (img.width < 1000 || img.height < 300) {
  //         // this.notifyService.showError('Image should be greater than 1000x300');
  //         // this.bannerstypes.controls['image'].setValue('');
  //         // return;
  //         // }
  //         this.imageFile = file;
  //         console.log(this.imageFile, "this.imageFile");

  //         this.preview = reader.result as string;
  //       };
  //       img.src = reader.result as string;
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // }


  onSelectedFile(event) {
    if (event.target.files.length > 0) {
        const file = event.target.files[0];
        var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image.JPEG', 'image.PNG','image/WEBP'];
        if (image_valid.indexOf(file.type) == -1) {
            this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
            this.bannerstypes.controls['image'].setValue('');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                // Define required dimensions based on this.url
                // let requiredWidth = 0;
                // let requiredHeight = 0;

                // switch (this.url) {
                //     case 'header-1':
                //         requiredWidth = 1280;
                //         requiredHeight = 720;
                //         break;
                //     case 'header-2':
                //         requiredWidth = 1080;
                //         requiredHeight = 1920;
                //         break;
                //     case 'post-header-1':
                //         requiredWidth = 1440;
                //         requiredHeight = 314;
                //         break;
                //     case 'post-header-2':
                //         requiredWidth = 1536;
                //         requiredHeight = 200;
                //         break;
                //     case 'post-category-3':
                //         requiredWidth = 1310;
                //         requiredHeight = 461;
                //         break;
                //     case 'post-category-6':
                //         requiredWidth = 567;
                //         requiredHeight = 482;
                //         break;
                //     case 'pre-footer':
                //         requiredWidth = 1080;
                //         requiredHeight = 380;
                //         break;
                //     default:
                //         this.notifyService.showError('Invalid image size');
                //         return;
                // }

                // // Validate image dimensions
                // if (img.width !== requiredWidth || img.height !== requiredHeight) {
                //     this.notifyService.showError(`Image dimensions should be ${requiredWidth}px x ${requiredHeight}px`);
                //     this.bannerstypes.controls['image'].setValue('');
                //     return;
                // }

                this.imageFile = file;
                this.preview = reader.result as string;
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    }
}
  submitForm(form: any) {
    this.submitted = true
    let data = {} as any
    if (form.valid) {
      const formData = new FormData();
      if ((this.imageFile == undefined || this.imageFile == null || this.imageFile == '' || this.imageFile == 'undefined') && !this.preview) {
        return this.notifyService.showError("Image is required")
      }
      if (this.selectedStatus == undefined || this.selectedStatus == null || this.selectedStatus == '' || this.selectedStatus == 'undefined') {
        return this.notifyService.showError("Status is required")
      }
      if (this.id) {
        formData.append('_id', this.id);
      }
      // data.banner_name = form.controls.banner_name.value
      // data.banner_url = form.controls.banner_name.value
      // data.banner_name = form.controls.banner_name.value
      // data.specification = form.controls.specification.value
      // data.type_name = this.url
      // data.type_name = this.typeStatus
      // data.selectedStatus = this.selectedStatus
      formData.append('banner_name', form.controls.banner_name.value);
      formData.append('banner_url', form.controls.banner_url.value);
      // formData.append('specification', form.controls.specification.value ? form.controls.specification.value : "");
      formData.append('type_name', this.url);
      formData.append('type_status', this.typeStatus);
      formData.append('image', this.imageFile);
      formData.append('status', this.selectedStatus);
      // return
      this.apiService
        .CommonApi(Apiconfig.bannerTypeAdd.method, Apiconfig.bannerTypeAdd.url, formData)
        .subscribe((res) => {
          if (res && res.status == 1) {
            console.log("savedddddd");
            if(this.id){
              this.notifyService.showSuccess("Updated successfully")
            }else{
              this.notifyService.showSuccess("Created successfully")
            }
            // console.log(this.router.navigate(['banner-types-list']),"this.router.navigate(['banner-types-list'])");
            this.router.navigate(['/app/banners/banner-types-list'])
            // /app/drivers/driverslist
            // setTimeout(() => {
            //   if (this.id) {
            //     // this.notifyService.showSuccess('Updated Successfully')
            //     if(this.language_mail == 'fr_web'){
            //       this.notifyService.showSuccess("Mise à jour réussie")
            //     }else{
            //        this.notifyService.showSuccess('Updated Successfully')
            //     }
            //   } else {
            //     // this.notifyService.showSuccess('Added Successfully')
            //     if(this.language_mail == 'fr_web'){
            //       this.notifyService.showSuccess("Ajouté avec succès")
            //     }else{
            //        this.notifyService.showSuccess('Added Successfully')
            //     }
            //   }
            //   this.router.navigate(['/reservations'])
            // }, 200);
          } else {
            console.error(res.message);
          }

        });
    }

  }




}
