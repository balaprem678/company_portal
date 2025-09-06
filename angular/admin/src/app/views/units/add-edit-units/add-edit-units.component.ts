import { Component, OnInit } from '@angular/core';
import { FormGroup, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { NotificationService } from 'src/app/_services/notification.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
@Component({
  selector: 'app-add-edit-units',
  templateUrl: './add-edit-units.component.html',
  styleUrls: ['./add-edit-units.component.scss']
})
export class AddEditUnitsComponent implements OnInit {


  userForm: FormGroup;
  editAttributesData: any = {};
  username: any;
  status: any = "";
  unitname: any
  id: string;
  webfoodcategory = [];
  units: [];
  submitted: boolean = false;
  curentUser: any;
  userPrivilegeDetails: any;
  selectedRcatnames: string[] = [];
  selectedWebHeader: any;
  statusOptions = [
    { label: 'Select Status', value: '' },
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 2}
  ];
  selectedStatus: string;
  dropdownBorderRadius: number = 5;
  pattern = /^(?![ ]).*$/

  patternvalue: string = '^[0-9]+(g|kg|l|ml|oz|tbsp|tsp)$';
  constructor(private route: ActivatedRoute, private router: Router, private apiService: ApiService, private fb: UntypedFormBuilder, private notifyService: NotificationService,
    private authService: AuthenticationService) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/units/units-add' || (split.length > 0 && split[2] == 'Units')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'Units');
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
    this.editAttributesData = {
      units: []
    }
    this.editAttributesData.units.push({});
  }
  onSelectionChange(selectedItems: any[]): void {
    console.log(selectedItems, 'selected Item');
    this.selectedRcatnames = selectedItems.map(item => item);
  }

  ngOnInit() {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', Validators.required],
      webHeader: [this.selectedWebHeader, Validators.required],
      units: new UntypedFormArray([
        this.newSkill()
      ])
    });


    this.id = this.route.snapshot.paramMap.get('id')
    if (this.id) {
      this.apiService.CommonApi(Apiconfig.unitedit.method, Apiconfig.unitedit.url, { id: this.id }).subscribe(
        (result) => {
          console.log(result, 'this is the result,+++++++++++++');

          if (result && result.length > 0 && result[0] != "undefined") {
            this.userForm.patchValue({
              name: result[0].name,
              status: result[0].status,
            });

            const selectedCategories = result[0].category.map(category => { return category._id });

            console.log(selectedCategories, ' selectedCategories  selectedCategories');


            this.userForm.get('webHeader').setValue(selectedCategories);
            this.setValue(result[0].units);
          }
        }, (error) => {
          console.log(error)
          this.notifyService.showError(error)
          window.location.reload()
        })
    }
    this.apiService.CommonApi(Apiconfig.get_foodcategory.method, Apiconfig.get_foodcategory.url, {}).subscribe(
      (result) => {
        this.webfoodcategory = result.list;
        // this.mobilefoodcategory = result.list
      })
  }

  newSkill(): UntypedFormGroup {
    return this.fb.group({
      name: new UntypedFormControl('', Validators.required)
    })

    //  check
  }

  getUnits(form) {
    // return form.controls.units.controls;

    // if (form && form.controls && form.controls.units && form.controls.units.controls && form.controls.units.controls.length <= 10) {
    return form.controls.units.controls;
    // } else {
    // this.notifyService.showError("Only 10 symbols can be add")
    // }
  }

  onAddSkills() {
    const control = this.userForm.get('units') as UntypedFormArray;
    if (control && control['value'] && control['value'].length < 10) {
      control.push(this.newSkill());
      console.log("checkyr", control['value'])

    } else {
      this.notifyService.showError("Only 10 Symbols able to add")
    }
  }
  onRemoveSkill(index: number) {
    const units = this.userForm.get('units') as UntypedFormArray;

    // Ensure at least one unit remains before removing
    if (units.length > 1) {
      units.removeAt(index);
    } else {
      this.notifyService.showWarning('Atleast one attribute is required');
    }
  }

  checkstatus() {

    console.log(this.selectedStatus, 'fffffffffffffff');

  }

  setValue(item: any[]) {
    const formArray = new UntypedFormArray([]);
    for (let x of item) {
      formArray.push(this.fb.group({
        name: x.name
      }));
    }
    this.userForm.setControl('units', formArray);
  }

  get f() {
    console.log("nhg", this.userForm.controls)
    return this.userForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    console.log(this.id, 'this is id');
    console.log(this.userForm.value)
    console.log(this.selectedStatus,"selectedStatusselectedStatusselectedStatus");
    console.log(this.statusOptions,"statusOptionsstatusOptionsstatusOptions");
    
    // console.log(this.webfoodcategory,'how is this possible');
    console.log('Selected Web Headers:', this.userForm.value.units);
    if (this.id) {
      console.log("jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj1111111111111111111111");
      if (this.userForm.valid) {
        let array_check = [];
        if (this.userForm.value.units && Array.isArray(this.userForm.value.units) && this.userForm.value.units.length > 0) {
          for (let index = 0; index < this.userForm.value.units.length; index++) {
            if (array_check.indexOf(this.userForm.value.units[index].name) === -1) {
              array_check.push(this.userForm.value.units[index].name);
            } else {
              return this.notifyService.showWarning("Please use different symbol name");
            }
          };
        }
        this.editAttributesData = {
          _id: this.id,
          name: this.userForm.value.name,
          status: this.userForm.value.status,
          slug: this.userForm.value.name,
          units: this.userForm.value.units,
          category: this.selectedRcatnames
        }
        console.log(this.editAttributesData, 'this is atribute edit data');

        this.apiService.CommonApi(Apiconfig.unitssave.method, Apiconfig.unitssave.url, { value: this.editAttributesData }).subscribe(result => {
          if (result.status) {
            this.router.navigate(['app/units/units-list']);
            this.notifyService.showSuccess("Variation Saved Successfully")
          } else {
            this.notifyService.showWarning(result.msg)
          }

        })
      }
    }
    else if (!this.id) {
      console.log("jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj");
      console.log(this.userForm.valid, "this.userForm.validthis.userForm.valid");

      if (this.userForm.valid) {
        this.editAttributesData = {
          name: this.userForm.value.name,
          status: this.userForm.value.status,
          slug: this.userForm.value.name,
          units: this.userForm.value.units,
          category: this.selectedRcatnames
        }
        console.log(this.editAttributesData, 'this is atribute edit data');
        this.apiService.CommonApi(Apiconfig.unitssave.method, Apiconfig.unitssave.url, { value: this.editAttributesData }).subscribe(result => {
          if (result.status) {
            this.router.navigate(['app/units/units-list']);
            this.notifyService.showSuccess("Variation Saved Successfully")
          } else {
            this.notifyService.showWarning(result.msg)

          }

        })
      }
    }
    else {
      this.notifyService.showError("please Kindly fill all the fields")
    }

  }



}
