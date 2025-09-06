import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, FormControl, UntypedFormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-addsubcategory',
  templateUrl: './addsubcategory.component.html',
  styleUrls: ['./addsubcategory.component.scss']
})
export class AddsubcategoryComponent implements OnInit {
  id: any;
  pageTitle: string = "Add Sub Category";
  restaurantCatList: any;
  selectedCategory: any;
  previewImage: any;
  subCategory: UntypedFormGroup;
  inputFile: any;
  idExist: boolean = false;
  disabled: boolean = false;
  submitted: boolean = false;
  curentUser: any;
  showOptions: boolean = false;
  userPrivilegeDetails: PrivilagesData[] = [];
  indx: any;
  slugName: any = "";
  subCatName: any = '';
  dropdownBorderRadius1 = 4;
  meta_titles : any;
  meta_descriptions : any;
  submitebtn : Boolean = false;

  // statusOptions = [
  //   { value: '1', label: 'Active' },
  //   { value: '2', label: 'Inactive' }
  // ];
  statusOptions = [
    // { name: 'Select Options', id: '' },
    { name: 'Active', id: 1 },
    { name: 'Inactive', id: 2 }
  ];
  statusColor = [
    // { name: 'Select Options', id: '' },
    { name: 'blush pink', id: "#ffe4f5" },
    { name: 'rose petal', id: "#ffd6db" },
    { name: 'soft lemon', id: "#ffe9ac" },
    { name: 'peach sorbet', id: "#ffc5ac" },
    { name: 'candy floss pink', id: "#ffabd9" },
    { name: 'blush coral', id: "#ffb7b9" },
    { name: 'lavender mist', id: "#e4c7ff" },
    { name: 'silver cloud', id: "#e1e1e1" },
    { name: 'sky blue', id: "#acc9ff" },
    { name: 'apricot cream', id: "#ffd9ae" },
    { name: 'buttercream', id: "#fff3bb" },
    { name: 'mint frost', id: "#d8ffe3" }

    // { name: 'Yellow', id: 2 },
    //   { name: 'grey', id: 2 },
    //   { name: 'blue', id: 2 },
    //   { name: 'green', id: 2 },
    //   { name: 'orange', id: 2 },
  ];
  statusHeadingColor = [
    // { name: 'Select Options', id: '' },
    { name: 'mulberry', id: "#983a76" },
    { name: 'crimson red', id: "#89212c" },
    { name: 'goldenrod', id: "#d4a72a" },
    { name: 'chestnut', id: "#a24a24" },
    { name: 'fuchsia pink', id: "#e93497" },
    { name: 'scarlet', id: "#b61f24" },
    { name: 'amethyst purple', id: "#582f7e" },
    { name: 'charcoal gray', id: "#424243" },
    { name: 'steel blue', id: "#1e4286" },
    { name: 'burnt orange', id: "#bd7b2f" },
    { name: 'olive green', id: "#95832f" },
    { name: 'forest green', id: "#275e37" }
    // { name: 'Yellow', id: 2 },
    //   { name: 'grey', id: 2 },
    //   { name: 'blue', id: 2 },
    //   { name: 'green', id: 2 },
    //   { name: 'orange', id: 2 },
  ];
  selectedStatus: any
  selectedColor: any = ''
  selectedheadingColor: any = ''
  selected_status: any;
  metakeyList: any[] = [];
  metakeyname: string = '';
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private store: DefaultStoreService,
    private authService: AuthenticationService,
    private fb: UntypedFormBuilder
  ) {
    this.subCategory = this.fb.group({
      rcategory: ['', Validators.required],
      scatname: ['', Validators.required],
      status: ['', Validators.required],
      fields: this.fb.array([]),
      cimage: [''],
      meta_title: ['', Validators.required],
      // meta_keyword: ['', Validators.required],
      meta_description: ['', Validators.required]

    })
    this.curentUser = this.authService.currentUserValue;

    var split = this.router.url.split('/');
    console.log(this.curentUser, 'this is the current user');

    console.log(split, 'this is the split');

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
    console.log("hi you enetered to the ngOnInit");

    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    console.log(this.id, 'hi this is id');
    // this.dropdownOptions = [[{ label: 'Add new', value: 'add-new' }]];
    // console.log(this.subCategory);

    this.pageTitle = this.id ? "Edit Sub Category" : "Add Sub Category";
    this.apiService.CommonApi(Apiconfig.restaurantCategory.method, Apiconfig.restaurantCategory.url, {}).subscribe(
      (catList) => {
        console.log(catList, 'this is catlist');

        if (catList && catList.list.length > 0) {
          this.restaurantCatList = catList.list
        }
        if (this.id) {
          this.idExist = true;
          this.disabled = true;
          this.apiService.CommonApi(Apiconfig.editSubCategory.method, Apiconfig.editSubCategory.url, { id: this.id }).subscribe(
            async (result) => {
              console.log(result.result, 'this is the result that I am waiting for')
              // var categoryFilter=this.restaurantCatList.filter(x=>x._id==result[0].rcategory)
              // console.log(categoryFilter);

              let len = result.result
              const add = [...result.result]
              len.pop()

              console.log(len, 'this are len');
              // len.push('add-new')
              console.log(len, 'this are len');
              this.showOptions = true;
              this.selectedCategory = result.result[result.result.length - 1]

              // this.subCategory.controls.rcategory.setValue(categoryFilter[0]._id)
              this.subCategory.controls.scatname.setValue(result.data.scatname);
              this.subCatName = result.data.scatname;
              this.selectedColor = result.data.color
              // this.meta_titles = result && result.data && result.data.meta && result.data.meta.meta_title != (undefined || null || '') ? result.data.meta.meta_title : ''
              this.subCategory.controls.meta_title.setValue(result && result.data && result.data.meta && result.data.meta.meta_title != (undefined || null || '') ? result.data.meta.meta_title : '');
              this.metakeyList = result && result.data && result.data.meta && result.data.meta.meta_keyword != (undefined) && result.data.meta.meta_keyword != null  ? result.data.meta.meta_keyword : [];
              console.log(this.metakeyList,"this.metakeyListthis.metakeyList");
              
              this.subCategory.controls.meta_description.setValue(result && result.data && result.data.meta && result.data.meta.meta_description != (undefined || null || ''));
              // this.meta_descriptions = result && result.data && result.data.meta && result.data.meta.meta_description != (undefined || null || '') ? result.data.meta.meta_description : ''

              this.selectedheadingColor = result.data.heading_color
              console.log(this.statusOptions, result.data.status, "statusOptionsstatusOptionsstatusOptions");
              this.selectedStatus = result.data.status;
              this.subCategory.controls.status.setValue(result.data.status);
              this.previewImage = environment.apiUrl + result.data.img
              this.inputFile = result.data.img
              console.log(this.previewImage, 'len len len +++++++++++++ len len len')
              len.reverse()
              len.pop()
              console.log(len, 'len len len ----------------------- len len len')
              for (let i = 0; i <= len.length - 1; i++) {
                console.log(len[i], 'len[i].rcategory len[i].rcategory');
                await this.getSubCategoryAsync(len[i], i);
              }
              console.log(add, 'this is final');
              add.pop();
              add.reverse();
              add.shift();
              this.changeSlug();
              console.log(add, 'this is final twooo');
              this.initializeFields(add)
            })
        }
      })
    this.addDropdown();
  }
  
  onStatusChange(event: any) {
    console.log('selectedVeg Changed: ', event);
    this.selectedStatus = event;
    this.rcatEditForm.status.setValue(event)
  }
  onColourChange(event: any) {
    console.log('selectedVeg Changed: ', event);
    this.selectedColor = event;
    // this.rcatEditForm.status.setValue(event)
  }
  onColourheadChange(event: any) {
    console.log('selectedVeg Changed: ', event);
    this.selectedheadingColor = event;
    // this.rcatEditForm.status.setValue(event)
  }
  addmetamanage(event) {
    console.log("metakeyname",this.metakeyname)
    if (event.which == 13) {
      this.metakeyList.push(event.target.value);
      
      this.metakeyname = '';
    }
  }
  removemetaTag(index) {
    this.metakeyList.splice(index, 1);
    console.log(this.metakeyList, "this.metakeyList");


  }
  initializeFields(ids: string[]) {
    // Clear existing form controls
    while (this.fields.length !== 0) {
      this.fields.removeAt(0);
    }

    // Add new form controls based on the array of IDs
    for (const id of ids) {
      console.log(id, 'this are id ');

      const newField = this.fb.group({
        dropdown: new FormControl(id)
      });

      this.fields.push(newField);
    }
  }

  async getSubCategoryAsync(value: any, index: number): Promise<void> {
    try {
      console.log(value, 'thjis calue');

      const result = await this.apiService.CommonApi("post", "scategory/get_all_sub", { id: value }).toPromise();

      if (result && result.length > 0) {
        console.log(result, 'this is the result');

        // Populate the dropdown options for the corresponding category
        this.dropdownOptions[index] = result;
      }
    } catch (error) {
      // Handle error if the request fails
      this.notifyService.showError(error.message);
    }
  }

  onSubmit() {
    this.submitebtn = true
    console.log('im insideeee');
    console.log(this.subCategory.value, 'ddkddk');
// return
    console.log(this.subCategory.status, 'ssss');
    console.log(this.subCategory.controls.fields.value, 'what about the controls');
    // console.log(this.d);
    const length = this.subCategory.controls.fields.value.length
    console.log(length, 'the length');
    var value;
    if (length < 2) {
      value = this.subCategory.get('rcategory')
      console.log(value, "valuevaluevaluevalue");

    }
    else {
      value = this.subCategory.controls.fields.value[length - 2].dropdown
      console.log(value, "valuevaluevaluevalue2222222222222");
    }
    console.log(value, 'this is the value of the control');
    this.submitted = true;
    if (this.subCategory.status != 'INVALID') {
      var formData = new FormData;
      console.log(this.subCategory.get('status').value, 'check statuss');
      // let status = this.subCategory.get('status').value === 'Active' ? 1 : 2;
      formData.append('_id', this.id)
      formData.append('rcategory', this.selectedCategory)
      formData.append('rootCategory', this.selectedCategory)
      formData.append('scatname', this.subCategory.get('scatname').value.substr(0, 1).toUpperCase() + this.subCategory.get('scatname').value.substr(1))
      // formData.append('status', status);
      formData.append('status', this.selectedStatus)
      formData.append('img', this.inputFile)
      formData.append('img', this.inputFile)
      formData.append('color', this.selectedColor);
      formData.append('heading_color', this.selectedheadingColor);
      formData.append('meta_title', this.subCategory.value.meta_title)

      for(let i=0;i<this.metakeyList.length;i++){
        formData.append(`meta_keyword[${i}]`, this.metakeyList[i])
        // console.log(this.metakeyList[i],"this.metakeyList[i]");
        
      }

      formData.append('meta_description', this.subCategory.value.meta_description)
      console.log(formData, 'subcatteeeeee');
   if(this.selectedheadingColor == ''  || this.selectedColor == '' ){
    return console.error("please select color")
   }

   
      // formData.append('slug',this.subCategory.get('scatname').value.replace(/ /g,'-'));
console.log(this.selectedheadingColor,this.selectedColor);

      // return
      this.apiService.CommonApi(Apiconfig.addSubCategory.method, Apiconfig.addSubCategory.url, formData).subscribe(
        (result) => {
          if (result) {
            this.router.navigate(['/app/category/sub-category-list']);
            if (this.id) {
              this.notifyService.showSuccess("Successfully updated.");
            } else {
              this.notifyService.showSuccess("Successfully Added.");
            }
          } else {
            this.notifyService.showError("Sorry, Please try again later.");
          }
        })
    }

  }

  get rcatEditForm() {
    return this.subCategory.controls
  }
  get fields() {
    return this.subCategory.get('fields') as FormArray;
  }
  // fileUpload(event) {
  //   var file = event.target.files[0]
  //   var image_valid = ['image/jpg', 'image/jpeg', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG'];
  //   if (image_valid.indexOf(file.type) == -1) {
  //     this.subCategory.controls['cimage'].setValue('')
  //     this.notifyService.showError('Images  only allow!Please select file types of jpg,jpeg,png,JPG,JPEG,PNG');
  //     return;
  //   }
  //   this.inputFile = event.target.files[0];
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     this.previewImage = reader.result as string;
  //   }
  //   reader.readAsDataURL(this.inputFile)
  // }


  fileUpload(event: any) {
    const file = event.target.files[0];
    const image_valid = ['image/jpg', 'image/jpeg', 'image/webp', 'image/png', 'image/JPG', 'image/JPEG', 'image/PNG', 'image/WEBP',];

    if (image_valid.indexOf(file.type) === -1) {
      this.subCategory.controls['cimage'].setValue('');
      this.notifyService.showError('Images only allow! Please select file types of jpg, jpeg, png, JPG, JPEG, PNG.');
      return;
    }

    const maxSizeInMB = 5;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      this.subCategory.controls['cimage'].setValue('');
      this.notifyService.showError('File size should not exceed 5MB.');
      return;
    }

    this.inputFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result as string;
    };
    reader.readAsDataURL(this.inputFile);
  }

  addDropdown() {
    const newField = this.fb.group({
      dropdown: new FormControl('')
    });

    this.fields.push(newField);

  }
  dropdownOptions: { label: string; value: string, scatname: string }[][] = [[]];
  dropdownOptions1: { label: string; value: string }[][] = [
    [
      { label: 'Option 1-A', value: 'option-1a' },
      { label: 'Option 2-A', value: 'option-2a' },
      { label: 'Add New', value: 'add-new' } // "Add New" option
    ],

    // Add more sets of options as needed
  ];
  removeDropdown(index: number) {
    while (this.fields.length > index + 1) {
      this.fields.removeAt(index + 1);
    }
  }

  getSubCategory(value, index) {
    console.log(value, 'this is the value');
    this.dropdownOptions = []
    this.apiService.CommonApi("post", "scategory/get_all_sub", { id: value }).subscribe(
      (result) => {
        console.log(result, 'this is the result love and drama');

        if (result && result.length > 0) {
          this.dropdownOptions[index] = result
          console.log(this.dropdownOptions, 'this is drop options');
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )
  }

  getDropdownOptions(index: number): { label: string; value: string }[] {
    console.log(index);
    // console.log(this.dropdownOptions,'this are drop option in actual drop option');
    // this.dropdownOptions = [[{ label: 'Add new', value: 'add-new' }]];.
    if (!this.dropdownOptions[index]) {
      this.dropdownOptions[index] = [];
    }
    this.dropdownOptions[index].unshift({ value: 'add-new', label: 'Add new', scatname: 'Add new' });
    return this.dropdownOptions[index] || [];
  }

  onDropdownChange(index: number) {

    this.dropdownOptions[index + 1] = []
    console.log(index, 'this is the index');

    const currentDropdown = this.fields.at(index).get('dropdown');
    const currentDropdownValue = currentDropdown.value;

    this.removeDropdown(index);
    console.log(currentDropdownValue, 'this is the current dropdown value');

    if (currentDropdownValue !== 'add-new') {
      this.showOptions = false;
      this.addDropdown();
      this.apiService.CommonApi("post", "scategory/get_all_sub", { id: currentDropdownValue }).subscribe(
        (result) => {
          console.log(result, 'this is the result');
          if (result && result.length > 0) {
            this.dropdownOptions[index + 1] = result
            console.log(this.dropdownOptions, 'this is drop options');
          }
        },
        (error) => {
          this.notifyService.showError(error.message);
        }
      )
      // const newDropdownIndex = index + 1;
      // const newDropdown = this.fields.at(newDropdownIndex).get('dropdown');
      // const newOptions = this.getUpdatedOptions(index, currentDropdownValue);
      // newDropdown.setValue('');
      // newDropdown.reset(newOptions);
    } else {
      this.showOptions = true;
    }

    if (index == 4) {
      this.notifyService.showWarning('You can add only five sub-levels');
    }

    this.indx = index
  }

  changeSlug() {
    if (this.subCatName) {
      this.slugName = this.subCatName.trim().toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
    } else {
      this.slugName = "";
    }
  }

  // getUpdatedOptions(previousIndex: number, selectedValue: string): { label: string; value: string }[] {
  //   // Implement your logic here to determine options based on the selected value
  //   // For example, return a set of options based on the selected value
  //   // You may use 'previousIndex' to get the selected value from the previous dropdown
  //   if (selectedValue === 'option-1a') {
  //     return [
  //       { label: 'New Option A-1', value: 'new-option-a-1' },
  //       { label: 'New Option A-2', value: 'new-option-a-2' },
  //       // Add more options as needed
  //     ];
  //   } else if (selectedValue === 'option-1b') {
  //     return [
  //       { label: 'New Option B-1', value: 'new-option-b-1' },
  //       { label: 'New Option B-2', value: 'new-option-b-2' },
  //       // Add more options as needed
  //     ];
  //   } else {
  //     return [];
  //   }
  // }
  // I told you that I don't need drop down in add-new select and I need only one drop down from each drop down except the add-new 

}
