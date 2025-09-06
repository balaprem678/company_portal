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
  selector: 'app-batch-banners',
  templateUrl: './batch-banners.component.html',
  styleUrls: ['./batch-banners.component.scss']
})
export class BatchBannersComponent {
  @ViewChild('bannerstypes') bannerstypes: NgForm;
  batchImg1: any;
  preview: string = '';
  preview1: string = '';
  preview2: string = '';
  preview3: string = '';
  batchImg2: any;
  batchImg3: any;
  batchImg4: any;
  submitted: boolean = false;
  id : any
  url: any
  getBanners:any
  routerurl : any
  typeStatus: any = 8;
  statusOptions = [
    // { label: 'Select Status', value: '' },
    { name: 'Active', id: 1 },
    { name: 'Inactive', id: 2 }
  ];
  statusOption = [
    // { label: 'Select Status', value: '' },
    { name: 'Farms', id: "Farms" },
    { name: 'Homemade', id: "Homemade" },
    { name: 'Traditional', id: "Traditional" }
  ];
  statusbatch2Option = [
    // { label: 'Select Status', value: '' },
    { name: 'Farms', id: "Farms" },
    { name: 'Homemade', id: "Homemade" },
    { name: 'Traditional', id: "Traditional" }
  ];
  statusbatch3Option = [
    // { label: 'Select Status', value: '' },
    { name: 'Farms', id: "Farms" },
    { name: 'Homemade', id: "Homemade" },
    { name: 'Traditional', id: "Traditional" }
  ];
  statusbatch4Option = [
    // { label: 'Select Status', value: '' },
    { name: 'Farms', id: "Farms" },
    { name: 'Homemade', id: "Homemade" },
    { name: 'Traditional', id: "Traditional" }
  ];
  selectedStatus: any = 1;
  selectedoptions: any = '';
  selectedOptionsBatch2: any = '';
  selectedOptionsBatch3: any = '';
  selectedOptionsBatch4: any = '';
  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private notifyService: NotificationService,
    private authenticationservice: AuthenticationService, private cd: ChangeDetectorRef) {

  }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')

    if(this.id){
      this.apiService
      .CommonApi(Apiconfig.getBannerTypes.method, Apiconfig.getBannerTypes.url, {_id : this.id})
      .subscribe((res) => {
  console.log(res,"outputtttttttttttttttttttt");
             this.getBanners = res.data.doc
            //  this.bannerstypes.form.controls['selectedoptions'].setValue(this.getBanners.banner_name)
            //  this.bannerstypes.form.controls['banner_url'].setValue(this.getBanners.banner_url)
            //  this.bannerstypes.form.controls['specification'].setValue(this.getBanners.content ? this.getBanners.content : '')
            //  this.typeStatus = this.getBanners.type_status
            //  this.bannerstypes.form.controls['selectedStatus'].setValue(this.getBanners.status)
             this.selectedStatus = this.getBanners.status
             this.selectedoptions = this.getBanners.batchname_1
             this.selectedOptionsBatch2 = this.getBanners.batchname_2
             this.selectedOptionsBatch3 = this.getBanners.batchname_3
             this.selectedOptionsBatch4 = this.getBanners.batchname_4
             this.preview = environment.apiUrl + this.getBanners.image_1
             this.preview1 = environment.apiUrl + this.getBanners.image_2
             this.preview2 = environment.apiUrl + this.getBanners.image_3
             this.preview3 = environment.apiUrl + this.getBanners.image_4
             this.batchImg1 = this.getBanners.image_1
             this.batchImg2 = this.getBanners.image_2
             this.batchImg3 = this.getBanners.image_3
             this.batchImg4 = this.getBanners.image_4
             
      })
    }



    this.routerurl = this.router.url.split('/');
    if(this.id){
      this.url = this.routerurl[this.routerurl.length - 2]      
    }else{
      this.url = this.routerurl[this.routerurl.length - 1]
    }
    


  }
  onStatusChange(event: any) {
    this.selectedStatus = event;
  }
  onBatchChange(event: any) {
    this.selectedoptions = event;
  }
  onBatch2Change(event: any) {
    this.selectedOptionsBatch2 = event;
  }
  onBatch3Change(event: any) {
    this.selectedOptionsBatch3 = event;
  }
  onBatch4Change(event: any) {
    this.selectedOptionsBatch4 = event;
  }
  onSelectedFile(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/JPG', 'image.JPEG', 'image.PNG', , 'image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
        this.bannerstypes.controls['image'].setValue('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.batchImg1 = file;
          this.preview = reader.result as string;
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSelectedFile1(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/JPG', 'image.JPEG', 'image.PNG', , 'image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
        this.bannerstypes.controls['image1'].setValue('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.batchImg2 = file;

          this.preview1 = reader.result as string;
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }


  onSelectedFile2(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/JPG', 'image.JPEG', 'image.PNG', , 'image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
        this.bannerstypes.controls['image2'].setValue('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.batchImg3 = file;

          this.preview2 = reader.result as string;
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  onSelectedFile3(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/JPG', 'image.JPEG', 'image.PNG', , 'image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
        this.bannerstypes.controls['image2'].setValue('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.batchImg4 = file;

          this.preview3 = reader.result as string;
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }


  submitForm(form: any) {
    this.submitted = true
    let data = {} as any
    console.log(this.bannerstypes.valid,"form.validform.valid");
    
    if (this.bannerstypes.valid) {
      const formData = new FormData();
      if ((this.batchImg1 == undefined || this.batchImg1 == null || this.batchImg1 == '' || this.batchImg1 == 'undefined') && !this.preview) {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if ((this.batchImg2 == undefined || this.batchImg2 == null || this.batchImg2 == '' || this.batchImg2 == 'undefined') && !this.preview1) {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if ((this.batchImg3 == undefined || this.batchImg3 == null || this.batchImg3 == '' || this.batchImg3 == 'undefined') && !this.preview2) {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if (this.selectedStatus == undefined || this.selectedStatus == null || this.selectedStatus == '' || this.selectedStatus == 'undefined') {
        return this.notifyService.showError("Status is required")
      }
      if (this.selectedoptions == undefined || this.selectedoptions == null || this.selectedoptions == '' || this.selectedoptions == 'undefined') {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if (this.selectedOptionsBatch2 == undefined || this.selectedOptionsBatch2 == null || this.selectedOptionsBatch2 == '' || this.selectedOptionsBatch2 == 'undefined') {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if (this.selectedOptionsBatch3 == undefined || this.selectedOptionsBatch3 == null || this.selectedOptionsBatch3 == '' || this.selectedOptionsBatch3 == 'undefined') {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if (this.selectedOptionsBatch4 == undefined || this.selectedOptionsBatch4 == null || this.selectedOptionsBatch4 == '' || this.selectedOptionsBatch4 == 'undefined') {
        return this.notifyService.showError("Please enter all mandotary fields")
      }
      if (this.id) {
        formData.append('_id', this.id);
      }
      formData.append('batchname_1', this.selectedoptions);
      formData.append('batchname_2', this.selectedOptionsBatch2);
      formData.append('batchname_3', this.selectedOptionsBatch3);
      formData.append('batchname_4', this.selectedOptionsBatch4);
      formData.append('image_1', this.batchImg1);
      formData.append('image_2', this.batchImg2);
      formData.append('image_3', this.batchImg3);
      formData.append('image_4', this.batchImg4);
      formData.append('status', this.selectedStatus);
      formData.append('type_name', this.url);
      formData.append('type_status', this.typeStatus);
      // return
      console.log(formData,"formDataformData")
      this.apiService
        .CommonApi(Apiconfig.bannerBatchs.method, Apiconfig.bannerBatchs.url, formData)
        .subscribe((res) => {
          if (res && res.status == 1) {
            console.log("savedddddd");
            if(this.id){
              this.notifyService.showSuccess("Updated successfully")
            }else{
              this.notifyService.showSuccess("Created successfully")
            }
            // return
            this.router.navigate(['/app/banners/banner-types-list'])
          } else {
            console.error(res.message);
          }

        });
    }else{
      this.notifyService.showError("Please enter all mandotary fields")
    }

  }

}
// bannerBatchs