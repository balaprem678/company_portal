import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import privilagedata, { PrivilagesData } from 'src/app/menu/privilages';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { environment } from 'src/environments/environment';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-addmaincategory',
  templateUrl: './addmaincategory.component.html',
  styleUrls: ['./addmaincategory.component.scss']
})
export class AddmaincategoryComponent implements OnInit {

  @ViewChild('categoryForm') form: NgForm;
  croppedImage: any;
  buttonContent='Submit'
  taxError: boolean = false;

  categoryDetails: any;
  imageChangedEvent: Event | null = null;
  filesvalid : boolean = false
  iconfile : boolean = false
  bannerfile : boolean = false
  imageChangedEvent_hover: Event | null = null;
  imageChangedEvent_banner: Event | null = null;
  pageTitle: string = 'Add Category';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  curentUser: any;
  userPrivilegeDetails: PrivilagesData[] = [];
  previewImage: any;
  iconpreviewImage: any
  bannerImage: any
  inputFile: any;
  icon_inputFile: any;
  banner_inputFile: any;
  id: any;
  cateory_name: string = '';
  category_slug: string = "";
  view: string
  disableview: boolean = false
  statusOptions = [
    { value: 1, label: 'Active' },
    { value: 2, label: 'Inactive' }
  ];
  selectedStatus: any;
  dropdownBorderRadius1: number = 5;
  modalLogoutRef: BsModalRef;
  croppedImage_hover: any;
  croppedImage_banner: any;
  avatarImg: any;
  metakeyList: any[] = [];
  metakeyname: string = '';
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private sanitizer: DomSanitizer,
    private authService: AuthenticationService,
    private modalService: BsModalService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    console.log(this.curentUser)
    if (this.curentUser.doc && this.curentUser.doc.role == "subadmin" && this.curentUser.doc.privileges) {
      if (this.router.url == '/app/category/sub-category-add' || (split.length > 0 && split[2] == 'category')) {

        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'category');
        console.log(this.userPrivilegeDetails, 'this is the user privilegeDetails');

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
    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    this.view = this.ActivatedRoute.snapshot.paramMap.get('view');
    if (this.id) {
      this.pageTitle = "Edit Category";
      this.buttonContent = 'Save Changes'
      this.apiService.CommonApi(Apiconfig.categoryEdit.method, Apiconfig.categoryEdit.url, { id: this.id }).subscribe(
        (result) => {
          if (result && result.length > 0) {
            this.categoryDetails = result[0];
            console.log(this.categoryDetails,"this.categoryDetailsthis.categoryDetails");
            
            this.cateory_name = this.categoryDetails.rcatname;
            this.form.controls['rcatname'].setValue(this.categoryDetails.rcatname ? this.categoryDetails.rcatname : '');
            // this.form.controls['Taxs'].setValue(this.categoryDetails.Taxs ? this.categoryDetails.Taxs : '');
            this.form.controls['status'].setValue(this.categoryDetails.status ? this.categoryDetails.status : '');
            this.previewImage = environment.apiUrl + this.categoryDetails.img
            this.iconpreviewImage = environment.apiUrl + this.categoryDetails.iconimg
            this.bannerImage = this.categoryDetails && this.categoryDetails.bannerimg != (undefined || null || '') &&  this.categoryDetails.bannerimg ? environment.apiUrl + this.categoryDetails.bannerimg : ''
            this.inputFile = this.categoryDetails.img
            this.icon_inputFile = this.categoryDetails.iconimg;
            this.banner_inputFile = this.categoryDetails.bannerimg;
            this.metakeyList = this.categoryDetails && this.categoryDetails.meta && this.categoryDetails.meta.meta_keyword ? this.categoryDetails.meta.meta_keyword : []
              
            this.form.controls['meta_title'].setValue(this.categoryDetails && this.categoryDetails.meta && this.categoryDetails.meta.meta_title != (undefined || null || '') && this.categoryDetails.meta.meta_title ? this.categoryDetails.meta.meta_title : '');
            this.form.controls['meta_description'].setValue(this.categoryDetails &&  this.categoryDetails.meta && this.categoryDetails.meta.meta_description != (undefined || null || '') && this.categoryDetails.meta.meta_description ? this.categoryDetails.meta.meta_description : '');
            this.changeSlug();
          }
        }
      )
    }



    if (this.view) {
      this.pageTitle = "View Category";
      this.disableview = true
      this.apiService.CommonApi(Apiconfig.categoryEdit.method, Apiconfig.categoryEdit.url, { id: this.view }).subscribe(
        (result) => {
          if (result && result.length > 0) {
            this.categoryDetails = result[0];
            this.cateory_name = this.categoryDetails.rcatname;
            this.form.controls['rcatname'].setValue(this.categoryDetails.rcatname ? this.categoryDetails.rcatname : '');
            // this.form.controls['Taxs'].setValue(this.categoryDetails.Taxs ? this.categoryDetails.Taxs : '');
            this.form.controls['status'].setValue(this.categoryDetails.status ? this.categoryDetails.status : '');
            this.previewImage = environment.apiUrl + this.categoryDetails.img
            this.iconpreviewImage = environment.apiUrl + this.categoryDetails.iconimg
            this.bannerImage = this.categoryDetails && this.categoryDetails.bannerimg != (undefined || null || '') &&  this.categoryDetails.bannerimg ? environment.apiUrl + this.categoryDetails.bannerimg : ''

            this.inputFile = this.categoryDetails.img
            this.icon_inputFile = this.categoryDetails.iconimg;
            this.banner_inputFile = this.categoryDetails.bannerimg;
            this.metakeyList = this.categoryDetails && this.categoryDetails.meta && this.categoryDetails.meta.meta_keyword ? this.categoryDetails.meta.meta_keyword : []
              
            this.form.controls['meta_title'].setValue(this.categoryDetails && this.categoryDetails.meta && this.categoryDetails.meta.meta_title != (undefined || null || '') && this.categoryDetails.meta.meta_title ? this.categoryDetails.meta.meta_title : '');
            this.form.controls['meta_description'].setValue(this.categoryDetails &&  this.categoryDetails.meta && this.categoryDetails.meta.meta_description != (undefined || null || '') && this.categoryDetails.meta.meta_description ? this.categoryDetails.meta.meta_description : '');
            this.changeSlug();
          }
        }
      )
    }
  };

  validateTaxValue(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    const taxValue = parseInt(input, 10);
console.log(taxValue,"taxValuetaxValuetaxValuetaxValue");

    if (taxValue > 100) {
        this.taxError = true;
    } else {
        this.taxError = false;
    }
}

allowOnlyNumbers(event: KeyboardEvent): boolean {
  const charCode = event.charCode;
  // Allow only numeric input (0-9)
  if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
  }
  return true;
}
  public onFormSubmit(categoryForm) {
    this.submitebtn = true;
    if (categoryForm.valid && this.inputFile) {
      console.log(categoryForm.value, "categoryForm.valuecategoryForm.value");

      var formdata = new FormData;
      formdata.append('_id', this.id);
      formdata.append('rcatname', categoryForm.value.rcatname.substr(0, 1).toUpperCase() + categoryForm.value.rcatname.substr(1));
      formdata.append('status', categoryForm.value.status);
      // formdata.append('Taxs', categoryForm.value.Taxs);
      formdata.append('img', this.inputFile);
      formdata.append('slug1', this.category_slug);
      formdata.append('iconimg', this.icon_inputFile)
      formdata.append('bannerimg', this.banner_inputFile)
      formdata.append('meta_title', categoryForm.value.meta_title)

      for(let i=0;i<this.metakeyList.length;i++){
        formdata.append(`meta_keyword[${i}]`, this.metakeyList[i])
        // console.log(this.metakeyList[i],"this.metakeyList[i]");
        
      }

      formdata.append('meta_description', categoryForm.value.meta_description)
      // return
      this.apiService.CommonApi(Apiconfig.categorySave.method, Apiconfig.categorySave.url, formdata).subscribe(
        (result) => {
          if (result && result.status) {
            this.router.navigate(['/app/category/category-list']);
            if (this.id) {
              this.notifyService.showSuccess("Successfully updated.");
            } else {
              this.notifyService.showSuccess("Successfully Added.");
            }
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

  // fileUpload(event) {
  //   this.inputFile = event.target.files[0];
  //   this.imageChangedEvent = event
  //   var file = event.target.files[0];
  //   if (file && file.size < 50000000) {
  //     console.log(this.inputFile, 'input file image');
  //     var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];
  //     if (image_valid.indexOf(file.type) == -1) {
  //       this.form.controls['cimage'].setValue('')
  //       this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
  //       return;
  //     }

  //     this.getBase64(event.target.files[0]).then(
  //       (data: any) => {
  //         console.log(data, 'data123');

  //         this.previewImage = data;
  //         // this.avatarImg = data;

  //       }
  //     );
  //   } else {
  //     this.notifyService.showError('Max file size less than 50Mb ');
  //   }
  //   // const reader = new FileReader();
  //   // reader.onload = () => {
  //   //   this.previewImage = reader.result as string;
  //   // }
  //   // reader.readAsDataURL(this.inputFile)
  // }



  // icon_fileUpload(event) {
  //   this.icon_inputFile = event.target.files[0];
  //   this.imageChangedEvent_hover = event
  //   var file = event.target.files[0]
  //   var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];
  //   if (image_valid.indexOf(file.type) == -1) {
  //     this.form.controls['iconimage'].setValue('')
  //     this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
  //     return;
  //   }
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     this.iconpreviewImage = reader.result as string;
  //   }
  //   reader.readAsDataURL(this.icon_inputFile)
  // }
  fileUpload(event) {
    this.inputFile = event.target.files[0];
    this.imageChangedEvent = event;
    var file = event.target.files[0];
    if (file && file.size < 8000000) {
      this.filesvalid = true
      console.log(this.inputFile, 'input file image');
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.filesvalid = false
        this.form.controls['cimage'].setValue('');
        this.notifyService.showError('Images only allowed! Please select file types of jpg, jpeg, png');
        return;
      }
  
      this.getBase64(file).then(
        (data: any) => {
          console.log(data, 'data123');
          this.previewImage = data;
        }
      );
    } else {
      this.filesvalid = false
      this.notifyService.showError('Max file size is 8MB');
    }
  }
  

  addmetamanage(event) {
    if (event.which == 13) {
      this.metakeyList.push(event.target.value);
      this.metakeyname = '';
    }
  }
  removemetaTag(index) {
    this.metakeyList.splice(index, 1);
    console.log(this.metakeyList, "this.metakeyList");


  }


  icon_fileUpload(event) {
    this.icon_inputFile = event.target.files[0];
    this.imageChangedEvent_hover = event;
    var file = event.target.files[0];
    if (file && file.size < 8000000) { // 8MB size limit
      this.iconfile = true
      
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.iconfile = false
        this.form.controls['iconimage'].setValue('');
        this.notifyService.showError('Images only allowed! Please select file types of jpg, jpeg, png');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.iconpreviewImage = reader.result as string;
      };
      reader.readAsDataURL(this.icon_inputFile);
    } else {
      this.iconfile = false

      this.notifyService.showError('Max file size is 8MB');
    }
  }

  categoryBanner(event) {
    this.banner_inputFile = event.target.files[0];
    this.imageChangedEvent_banner = event;
    var file = event.target.files[0];
    if (file && file.size < 8000000) { // 8MB size limit
      this.bannerfile = true
      
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png','image/webp', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.bannerfile = false
        this.form.controls['categorybanner'].setValue('');
        this.notifyService.showError('Images only allowed! Please select file types of jpg, jpeg, png');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.bannerImage = reader.result as string;
      };
      reader.readAsDataURL(this.banner_inputFile);
    } else {
      this.bannerfile = false

      this.notifyService.showError('Max file size is 8MB');
    }
  }
  
  changeSlug() {
    if (this.cateory_name) {
      this.category_slug = this.cateory_name.trim().toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
    } else {
      this.category_slug = "";
    }
  }

  getBase64(file) {

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  imageCropped(event: ImageCroppedEvent) {

    console.log(event, "eventeventevent");
    this.previewImage = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    this.croppedImage = event.base64;
    console.log(this.croppedImage, 'cropped');

    console.log(this.previewImage, 'iiiasfsfsf');

    const file = new File([event.blob], this.inputFile.name, { type: this.inputFile.type });
    console.log(file, 'Converted File');
    this.avatarImg = file;
  }

  imageCropped_hover(event: ImageCroppedEvent) {
    console.log(event, "eventeventevent");
    this.iconpreviewImage = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    this.croppedImage_hover = event.base64;
    // console.log(this.croppedImage, 'cropped');

    // console.log(this.cropImgPreview, 'iiiasfsfsf');

    const file = new File([event.blob], this.inputFile.name, { type: this.inputFile.type });
    console.log(file, 'Converted File');
    // this.hoverImage = file;
  }
  imageCropped_banner(event: ImageCroppedEvent) {
    console.log(event, "eventeventevent");
    this.bannerImage = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    this.croppedImage_banner = event.base64;
    // console.log(this.croppedImage, 'cropped');

    // console.log(this.cropImgPreview, 'iiiasfsfsf');

    const file = new File([event.blob], this.inputFile.name, { type: this.inputFile.type });
    console.log(file, 'Converted File');
    // this.hoverImage = file;
  }

  imageLoaded(image: LoadedImage) {
    // display cropper tool
  }
  cropperReady() {
    /* cropper ready */
  }
  loadImageFailed() {
    /* show message */
  }

  closeProductCrop() {
    // this.imageChangedEvent = null
    this.modalLogoutRef.hide();
  }

  closeiconcrop() {
    // this.imageChangedEvent_hover = null
    this.modalLogoutRef.hide();
  }

  imageCropPopout(template: TemplateRef<any>) {
    if(this.filesvalid == true){
      this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: true })
    }
  
  }
  imageCropPopouts(template: TemplateRef<any>) {
    
    if(this.iconfile == true){
      this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: true })
    }
  
  }
  imageCropPopbanner(template: TemplateRef<any>) {
    
    if(this.bannerfile == true){
      this.modalLogoutRef = this.modalService.show(template, { id: 1, class: 'logoutPop-model', ignoreBackdropClick: true })
    }
  
  }


}
