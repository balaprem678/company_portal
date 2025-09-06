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
@Component({
  selector: 'app-offer-add-edit',
  templateUrl: './offer-add-edit.component.html',
  styleUrls: ['./offer-add-edit.component.scss']
})
export class OfferAddEditComponent {
  @ViewChild('offermanagement') offermanagement: NgForm;
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
  categoryOptions = [];
  dropdownBorderRadius1 = 4;
  categorylist: any = [];
  productOptions = [];
  productlist: any ;
  selectedProductSlug: string;
  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private notifyService: NotificationService,
    private authenticationservice: AuthenticationService, private cd: ChangeDetectorRef,) {


  }

  ngOnInit(): void {
    // this.route.paramMap.subscribe(params => {
    //   const id = params
    //   console.log('Route parameter id:', window);
    // });

    this.apiService.CommonApi(Apiconfig.productcatgory.method,Apiconfig.productcatgory.url,{}).subscribe(
      (result) => {
        console.log(result, 'category fetch for me ............');
        if (result && result.status == 1) {
          // this.store.categoryList.next(result.list ? result.list : []);
          this.categorylist = result.list ? result.list : [];
          // this.rcategorylist = result.list ? result.list : [];
          // console.log(this.rcategorylist, 'rcategoryy');
          this.categoryOptions = this.categorylist;
          
          this.cd.detectChanges();
        }
      },
      (error) => {
        console.log('error', error);
      }
    );


    this.id = this.route.snapshot.paramMap.get('id')
    if(this.id){
      this.apiService
      .CommonApi(Apiconfig.getofferManagement.method, Apiconfig.getofferManagement.url, {_id : this.id})
      .subscribe((res) => {
  console.log(res,"outputtttttttttttttttttttt");
             this.getBanners = res.data.doc
             this.offermanagement.form.controls['offer_name'].setValue(this.getBanners.offer_name)
            //  this.offermanagement.form.controls['offer_url'].setValue(this.getBanners.offer_url)
             this.offermanagement.form.controls['category'].setValue(this.getBanners.category)
             const event = { _id: this.getBanners.category };
              this.getProducts(event);
             this.offermanagement.form.controls['products'].setValue(this.getBanners.products)
            //  this.offermanagement.form.controls['specification'].setValue(this.getBanners.content ? this.getBanners.content : '')
            //  this.typeStatus = this.getBanners.type_status
            //  this.offermanagement.form.controls['selectedStatus'].setValue(this.getBanners.status)
             this.selectedStatus = this.getBanners.status
             this.preview = environment.apiUrl + this.getBanners.image
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
        var image_valid = ['image/jpg', 'image/jpeg','image/webp', 'image/png', 'image/JPG', 'image.JPEG', 'image.PNG','image/WEBP'];
        if (image_valid.indexOf(file.type) == -1) {
            this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
            this.offermanagement.controls['image'].setValue('');
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
     let newform =  this.offermanagement.value
    let newurl =  `/products/${this.selectedProductSlug}`
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
      formData.append('offer_name', form.controls.offer_name.value);
      // formData.append('offer_url', form.controls.offer_url.value);     
      formData.append('image', this.imageFile);
      formData.append('status', this.selectedStatus);
      formData.append('products', newform.products);
      formData.append('category', newform.category);
      formData.append('producturl', newurl);
      // return
      this.apiService
        .CommonApi(Apiconfig.offerManagementAddEdit.method, Apiconfig.offerManagementAddEdit.url, formData)
        .subscribe((res) => {
          if (res && res.status == 1) {
            if(this.id){
              this.notifyService.showSuccess("Updated successfully")
            }else{
              this.notifyService.showSuccess("Created successfully")
            }
            this.router.navigate(['/app/offer/list'])
          } else {
            console.error(res.message);
          }

        });
    }

  }
  getProducts(event: any) {
    console.log(event);
    // this.form.controls['product'].setValue('');
    // this.apiService.CommonApi(Apiconfig.prid);

    const data = { rcat: event._id };
    this.apiService
      .CommonApi(Apiconfig.productList.method, Apiconfig.productList.url, data)
      .subscribe(
        (result) => {
          if (result) {
            this.productlist = result[0] ? result[0] : [];
            this.productOptions = this.productlist;
            // this.form.controls['product'].setValue(this.productOptions?this.productOptions:'');
            this.cd.detectChanges();
          }
        },
        (error) => {
          console.log('error', error);
        }
      );
  }

  onProductChange(productId: any) {
    console.log(productId._id);
    
    const selectedProduct = this.productOptions.find(product => product._id === productId._id);
    console.log(selectedProduct);
    
    if (selectedProduct) {
        this.selectedProductSlug = selectedProduct.slug;
    }
}

}
