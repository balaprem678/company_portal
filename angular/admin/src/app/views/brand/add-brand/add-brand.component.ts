import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apiconfig } from "src/app/_helpers/api-config";
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { environment } from 'src/environments/environment';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-add-brand',
  templateUrl: './add-brand.component.html',
  styleUrls: ['./add-brand.component.scss']
})
export class AddBrandComponent implements OnInit {

  categorylist: any;
  category_id: any;
  selectcategory: any;
  category_name: any;
  subcategorylist: any;
  sub_category_name: any;
  preview: string;
  brandFrom: UntypedFormGroup;
  status: string = '';
  imagePath: string;
  id: any;
  data: any;
  brandname: string
  category: any;
  subCategory: any;
  submitted: boolean = false;
  imageFile: any;
  viewpage: boolean = false;
  pageTitle: string;
  curentUser: any;
  userPrivilegeDetails: any;
  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private authenticationservice: AuthenticationService, private notifyService: NotificationService) {
    this.curentUser = this.authenticationservice.currentUserValue;
    var split = this.router.url.split('/');
    console.log(this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/brand/brand-add' || (split.length > 0 && split[2] == 'brand')) {
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
    this.id = this.route.snapshot.paramMap.get('id')
    console.log("sdfsdf", this.id)
    this.apiService.CommonApi(Apiconfig.brandcategory.method, Apiconfig.brandcategory.url, {}).subscribe(catList => {
      this.categorylist = catList.list;
      if (this.id) {
        this.pageTitle = (this.viewpage ? 'Add' : 'Edit Brand');
        this.authenticationservice.updateBrands({ id: this.id }).subscribe(result => {

          this.category = this.categorylist.filter(x => x._id == result[0].rcategory)
          console.log(this.categorylist);

          this.brandFrom.controls.brandname.setValue(result[0].brandname)
          this.brandFrom.controls.status.setValue(result[0].status)
          this.brandFrom.controls.category_names.setValue(this.category[0]._id)

          this.preview = environment.apiUrl + result[0].img
          this.apiService.CommonApi(Apiconfig.brandsubcategory.method, Apiconfig.brandsubcategory.url, { id: this.category[0]._id }).subscribe(subCatList => {
            console.log("sfsd", this.category_id)
            this.subcategorylist = subCatList;
            this.subCategory = subCatList.filter(x => x._id == result[0].scategory)
            console.log(this.subCategory);

            this.brandFrom.controls.sub_category_names.setValue(this.subCategory[0]._id)
            console.log(this.subcategorylist)
          })
        })
      }
    })



    this.brandFrom = this.fb.group({
      category_names: ['', Validators.required],
      sub_category_names: ['', Validators.required],
      brandname: ['', Validators.required],
      status: [' ', Validators.required],
      image: [''],
      id: []
    });
  }

  onFilterData(event) {
    this.sub_category_name = [];
    this.apiService.CommonApi(Apiconfig.brandsubcategory.method, Apiconfig.brandsubcategory.url, { id: event._id }).subscribe(subCatList => {
      this.subcategorylist = subCatList;
      console.log(this.subcategorylist)
    })
  }

  onSelectedFile(event) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      var image_valid = ['image/jpg', 'image/jpeg','image/webp', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG','image/WEBP'];
      if (image_valid.indexOf(file.type) == -1) {
        this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
        this.brandFrom.controls['image'].setValue('')
        return;
      }
      this.imageFile = file
      const reader = new FileReader();
      reader.onload = () => {
        this.preview = reader.result as string;
      }
      reader.readAsDataURL(file);
    }
  }

  get f() {
    return this.brandFrom.controls;
  }

  onSubmit() {
    console.log(this.f);

    this.submitted = true;
    if (this.brandFrom.valid) {
      const formData = new FormData();
      if (this.id) {
        formData.append('_id', this.id);
      }
      formData.append('rcategory', this.brandFrom.get('category_names').value);
      console.log("category", this.brandFrom.get('category_names').value)
      formData.append('scategory', this.brandFrom.get('sub_category_names').value);
      console.log("category", this.brandFrom.get('sub_category_names').value)
      formData.append('status', this.brandFrom.get('status').value);
      formData.append('brandname', this.brandFrom.get('brandname').value);
      formData.append('image', this.imageFile);
      formData.append('slug1', this.brandFrom.get('brandname').value.replace(/ /g, '-'));
      this.apiService.CommonApi(Apiconfig.addBrands.method, Apiconfig.addBrands.url, formData).subscribe(result => {
        if (result) {
          this.router.navigate(['/app/brand/brand-list']);
          this.notifyService.showSuccess("Added Successfully");
        }
      })
    }
  }

}
