import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { environment } from 'src/environments/environment';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { FeaturedComponent } from 'src/app/shared/featured.component';
import { apis, exportsapi } from 'src/app/interface/interface';
import { PopupComponent } from 'src/app/shared/popup.component';

@Component({
  selector: 'app-maincategorylist',
  templateUrl: './maincategorylist.component.html',
  styleUrls: ['./maincategorylist.component.scss'],
})
export class MaincategorylistComponent implements OnInit {
  status: any;
  categorylist: any;
  getcardsdata: any;
  settings: any;
  env_url: any = environment.apiUrl;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  add_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = true;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/category/category-add';
  addBtnName: string = 'Add Category';
  editUrl: string = '/app/category/category-edit/';
  viewUrl: string = '/app/category/category-view/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  archivedDetails: boolean = false;
  deleteApis: apis = Apiconfig.archieveDeleteCategory;
  restoreApis: apis = Apiconfig.main_categoryRestore;
  exportApis: exportsapi = Apiconfig.exportCategoryList;
  export_btn: boolean = true;
  filter_action: boolean = true;


  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private apiService: ApiService,
    private sanitized: DomSanitizer,
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef
  ) {
    this.loader.loadingSpinner.next(true);
    this.curentUser = this.authService.currentUserValue;
    console.log(this.curentUser,'this.curentUser==============');
    if (this.curentUser && this.curentUser.doc.role == 'subadmin') {
      if (
        this.router.url == '/app/category/category-list' &&
        this.curentUser.doc.privileges
      ) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(
          (x) => x.alias == 'category'
        );
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized to access this module');
          this.router.navigate(['/app']);
        }
        if (this.userPrivilegeDetails[0].status.delete && this.delete_btn) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit && this.edit_btn) {
          this.edit_btn = true;
        } else {
          this.edit_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.view && this.view_btn) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.add && this.add_btn) {
          this.add_btn = true;
        } else {
          this.add_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.export && this.export_btn) {
          this.export_btn = true;
        } else {
          this.export_btn = false;
        }
      }
    }
    this.loadsettings('');
  }

  ngOnInit(): void {
    var data = {
      limit: this.limit,
      skip: this.skip,
      status: this.status,
    };
    this.getdata(data);
  }

  getdata(data) {
    this.apiService
      .CommonApi(
        Apiconfig.categoryList.method,
        Apiconfig.categoryList.url,
        data
      )
      .subscribe((response) => {
        if (response && response.length > 0) {
          this.categorylist = response[0];
          this.count = response[1];
          this.getcardsdata = response[2];
          this.source.load(this.categorylist);
          this.apiService
            .CommonApi(
              Apiconfig.archieveCategory.method,
              Apiconfig.archieveCategory.url,
              data
            )
            .subscribe((result) => {
              this.loadCard_Details(
                response[2][0].all[0] ? response[2][0].all[0].count : 0,
                response[2][0].active[0] ? response[2][0].active[0].count : 0,
                response[2][0].inactive[0]
                  ? response[2][0].inactive[0].count
                  : 0,
                result[1] ? result[1] : 0
              );
              if (!this.archivedDetails) {
                this.loadsettings('');
                this.source.load(this.categorylist);
              } else {
                this.source.load(result[0]);
                this.count = result[1];
                this.archivedDetails = false;
              }
            });
          this.cd.detectChanges();
        }
      });
  }

  onDeleteChange(event) {
    this.ngOnInit();
  }

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.skip = 0;
    this.global_search = event;
    let data = {
      skip: this.skip,
      limit: this.limit,
      search: event,
    };
    this.getdata(data);
  }

  onitemsPerPageChange(event) {
    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    let data = {
      skip: this.skip,
      limit: this.limit,
      search: this.global_search,
    };
    this.getdata(data);
  }
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      skip: this.limit * (event - 1),
      limit: this.limit,
      search: this.global_search,
    };
    this.getdata(data);
  }


  onexportChange(event) {
    var data = {
      // status: this.status,
      // city: this.global_filter_action.city,
      // start_date: this.global_filter_action.From_Date,
      // end_date: this.global_filter_action.To_Date,
      // area: '',
      // rest: ''
    }
    this.apiService.CommonApi(this.exportApis.method, this.exportApis.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          // window.open(environment.apiUrl + 'uploads/csv/orders/' + result.message.filename + '.' + result.message.type);

          const blob = new Blob([result.data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          
          // Create a link element to trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = 'CategoryList.csv';  // Name of the CSV file
          document.body.appendChild(a);
          a.click();
          
          // Clean up the URL and link element
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a)


          this.notifyService.showSuccess("File downloaded successfully");
        } else {
          this.notifyService.showError(result.message);
        }
      },
      (error) => {
        this.notifyService.showError(error.message);
      }
    )
  }


  loadCard_Details(all, active, inactive, archieveList) {
    this.card_details = [
      {
        title: 'ALL Categorys',
        value: all,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all',
      },
      {
        title: 'ACTIVE Categorys',
        value: active,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active',
      },
      {
        title: 'INACTIVE Categorys',
        value: inactive,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive',
      },
      {
        title: 'ARCHIVED Categotrys',
        value: archieveList,
        bg_color: 'clr-red',
        icon: 'fa fa-user-circle-o',
        click_val: 'archieve',
      },
    ];
  }

  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      skip: this.skip,
      limit: this.limit,
      status: this.global_status,
      search: this.global_search,
    };
    if (event == 'all') {
      data.status = 0;
      this.global_status = 0;
    } else if (event == 'active') {
      data.status = 1;
      this.global_status = 1;
    } else if (event == 'inactive') {
      data.status = 2;
      this.global_status = 2;
    } else if (event == 'archieve') {
      data.status = 0;
      this.global_status = 0;
      this.archivedDetails = true;
      this.loadsettings('archieve');
    }
    this.getdata(data);
  }

  changefeatured(id, feature) {
    var data = {
      db: 'rcategory',
      id: id,
      value: 1,
    };
    if (feature == 1) {
      data.value = 0;
    }
    this.apiService
      .CommonApi(
        Apiconfig.categoryFeatured.method,
        Apiconfig.categoryFeatured.url,
        data
      )
      .subscribe((response) => {
        if (response && response.status == 1) {
          this.notifyService.showSuccess('Successfully Updated');
          this.ngOnInit();
        } else {
          this.notifyService.showError(
            'Something went wrong. Please try again later.'
          );
        }
      });
  }
  changeStatus(id, feature) {
    var data = {
      db: 'rcategory',
      id: id,
      value: 1,
    };
    if (feature == 1) {
      data.value = 2;
    }
    this.apiService
      .CommonApi(
        Apiconfig.changeStatus.method,
        Apiconfig.changeStatus.url,
        data
      )
      .subscribe((response) => {
        if (response && response.status == 1) {
          this.notifyService.showSuccess('Successfully Updated');
          this.ngOnInit();
        } else {
          this.notifyService.showError(
            'Something went wrong. Please try again later.'
          );
        }
      });
  }

  loadsettings(event) {
    if (event == 'archieve') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          img: {
            title: 'Image ',
            filter: true,
            type: 'html',
            valuePrepareFunction: (image) => {
              return (
                '<img src="' +
                environment.apiUrl +
                image +
                '" width="32" height="32">'
              );
            },
          },
          rcatname: {
            title: 'Category name',
            filter: true,
            valuePrepareFunction: (value) => {
              return value;
            },
          },

          status: {
            title: 'Status',
            filter: true,
            valuePrepareFunction: (value) => {
              return 'Archived';
            },
          },
          // feature: {
          //   title: 'Featured Category',
          //   filter: true,
          //   type: 'html',
          //   valuePrepareFunction: value => {
          //     return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Featured</span>" : "<span class='badge badge-pill badge-warning mb-1'>Un Featured</span>";
          //   }
          // }
        },
        pager: {
          display: true,
          perPage: this.default_limit,
        },
        actions: {
          add: true,
          edit: false,
          delete: false,
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      };
      this.settings.actions.custom = this.getSettings.loadSettings(
        event,
        this.curentUser,
        '/app/category/category-list',
        this.userPrivilegeDetails,
        this.delete_btn,
        this.edit_btn,
        this.view_btn
      );
    } else {
      this.settings = {
        // selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          index: {
            title: 'S No',
            type: 'text',
            valuePrepareFunction: (value, row, cell) => {
              return this.skip + cell.row.index + 1 + '.';
            },
          },
          img: {
            title: 'Image ',
            filter: true,
            type: 'html',
            valuePrepareFunction: (image) => {
              return (
                '<img src="' +
                environment.apiUrl +
                image +
                '" width="32" height="32">'
              );
            },
          },
          rcatname: {
            title: 'Category name',
            filter: true,
            valuePrepareFunction: (value) => {
              // return (
              //   value.charAt(0).toUpperCase() + value.substr(1).toLowerCase()
              // );

              return value
              .split(' ')
              .map(word => 
                word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
              ) 
              .join(' ');

            },

            
          },
          // Taxs: {
          //   title: 'Tax',
          //   filter: true,
          //   valuePrepareFunction: (tax) => {
          //     return (
          //       tax != (null || undefined || '') && tax ? `<strong>${tax}%</strong>` : '-' 
          //     );
          //   },
          //   type: 'html',
          // },

          status: {
            title: 'Status',
            filter: true,
            type: 'custom',
            renderComponent: PopupComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe((row) => {
                this.changeStatus(row._id, row.status);
              });
            },
          },
          // feature: {
          //   title: 'Featured Category',
          //   filter: false,
          //   type: 'custom',
          //   renderComponent: FeaturedComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe((row) => {
          //       console.log('row', row);
          //       this.changefeatured(row._id, row.feature);
          //     });
          //   },
          // },
        },
        pager: {
          display: true,
          perPage: this.default_limit,
        },
        actions: {
          add: true,
          edit: false,
          delete: false,
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      };
      this.settings.actions.custom = this.getSettings.loadSettings(
        event,
        this.curentUser,
        '/app/category/category-list',
        this.userPrivilegeDetails,
        this.delete_btn,
        this.edit_btn,
        this.view_btn
      );
    }
  }
}
