import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/_services/notification.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';

@Component({
  selector: 'app-add-edit-banner',
  templateUrl: './add-edit-banner.component.html',
  styleUrls: ['./add-edit-banner.component.scss']
})
export class AddEditBannerComponent implements OnInit {
  webform: any;
  preview: string;
  status: any = "";
  id: string;
  imageFile: any;
  submitted: boolean = false;
  curentUser: any;
  userPrivilegeDetails: any;
  categorylist: any = [];
  currentCategory: string;
  bannerName: string;
  maxNameLength: any = 30
  nameWordsLeft: any = 30
  specificationLeft: any = 100
  specification: string
  statusOptions = [
    { label: 'Select Status', value: '' },
    { label: 'Active', value: '1' },
    { label: 'Inactive', value: '2' }
  ];
  bannerOptions = [
    { label: 'Select Type', value: '' },
    { label: 'Header-1', value: 'Header-1' },
    { label: 'Header-2', value: 'Header-2' },
    { label: 'post-header-1', value: 'post-header-1' },
    { label: 'post-header-2', value: 'post-header-2' },
    { label: 'post-category-3', value: 'post-category-3' },
    { label: 'post-category-6', value: 'post-category-6' },
    { label: 'pre-footer-6', value: 'pre-footer-6' }
  ];

  selectedStatus: string = '';
  dropdownBorderRadius: number = 5;

  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private notifyService: NotificationService,
    private store: DefaultStoreService, private authenticationservice: AuthenticationService, private cd: ChangeDetectorRef,) {
    this.curentUser = this.authenticationservice.currentUserValue;
    var split = this.router.url.split('/');
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/banners/web-add' || (split.length > 0 && split[2] == 'Banners')) {
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
      description: ['', Validators.required],
      status: ['', Validators.required],
      banner_category: ['', Validators.required],
      image: [''],
    });
    this.id = this.route.snapshot.paramMap.get('id')
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.webEdit.method, Apiconfig.webEdit.url, { id: this.id }).subscribe(result => {
        if (result) {
          console.log(result, 'this is the result');

          this.webform.controls.bannername.setValue(result[0].bannername)
          this.webform.controls.description.setValue(result[0].description)
          this.webform.controls.banner_category.setValue(result[0].category)
          this.webform.controls.status.setValue(result[0].status)
          // this.currentCategory=result[0].category
          console.log(this.currentCategory);

          this.preview = environment.apiUrl + result[0].img
        }
      })
    }
    this.apiService.CommonApi(Apiconfig.productcatgory.method, Apiconfig.productcatgory.url, {}).subscribe(
      (result) => {
        console.log(result, 'this is the result');
        if (result && result.status == 1) {
          this.store.categoryList.next(result.list ? result.list : []);
          this.categorylist = result.list ? result.list : [];

          this.cd.detectChanges();
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }
  letterLeft(letter) {

    this.nameWordsLeft = this.maxNameLength - parseInt(letter.length)


  }
  // onSelectedFile(event) {
  //   if (event.target.files.length > 0) {
  //     const file = event.target.files[0];
  //     var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];
  //     if (image_valid.indexOf(file.type) == -1) {
  //       this.notifyService.showError('Please Select File Types of JPG,JPEG,PNG');
  //       this.webform.controls['image'].setValue('')
  //       return;
  //     }
  //     this.imageFile = file;
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       this.preview = reader.result as string;
  //     }
  //     reader.readAsDataURL(file);
  //   }
  // }
  onSelectedFile(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg','image/webp', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Please Select File Types of JPG, JPEG, PNG');
        this.webform.controls['image'].setValue('');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {

          // console.log("image", img.width == 1349,  img.height)
          if (img.width < 1000 || img.height < 300) {
            this.notifyService.showError('Image should be greater than 1000x300');
            this.webform.controls['image'].setValue('');
            return;
          }
          this.imageFile = file;
          this.preview = reader.result as string;
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  get formcontrol() {
    return this.webform.controls;
  }

  onSubmit() {
    this.submitted = true;
    if (this.webform.valid) {
      const formData = new FormData();
      if (this.id) {
        formData.append('_id', this.id);
      }
      console.log(this.webform.get('banner_category').value, "this.webform.get('banner_category')");

      formData.append('bannername', this.webform.get('bannername').value);
      formData.append('description', this.webform.get('description').value);
      formData.append("status", this.webform.get('status').value)
      formData.append('banner_category', this.webform.get('banner_category').value)
      formData.append('img', this.imageFile);
      formData.append('slug1', this.webform.get('bannername').value.replace(/ /g, '-'));
      // console.log(this.imageFile,"formDataformDataformData");
      
      // return
      this.apiService.CommonApi(Apiconfig.addWeb.method, Apiconfig.addWeb.url, formData).subscribe(result => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message)
          this.router.navigate(['/app/banners/web-list'])
        }
        else {
          this.notifyService.showError(result.message)
        }
      })
    }
  }
  specificationLetterLeft(leters) {
    this.specificationLeft = 100 - parseInt(leters.length)
  }
}
