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
import { PopupComponent } from 'src/app/shared/popup.component';
import { apis } from 'src/app/interface/interface';

@Component({
  selector: 'app-subcategorylist',
  templateUrl: './subcategorylist.component.html',
  styleUrls: ['./subcategorylist.component.scss'],
})
export class SubcategorylistComponent implements OnInit {
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
  view_btn: boolean = false;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/category/sub-category-add';
  addBtnName: string = 'Add Sub Category';
  editUrl: string = '/app/category/sub-category-edit/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  archivedDetails: boolean = false;
  deleteApis: apis = Apiconfig.archieveDeleteSubCategory;
  restoreApis: apis = Apiconfig.sub_categoryRestore;
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
    if (this.curentUser && this.curentUser.doc.role == 'subadmin') {
      if (
        this.router.url == '/app/category/sub-category-list' &&
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

  // getdata(data) {
  //   this.apiService.CommonApi(Apiconfig.subcategoryList.method, Apiconfig.subcategoryList.url, data).subscribe(response => {
  //     console.log(response)
  //     if (response && response.length > 0) {
  //       this.categorylist = response[0];
  //       this.count = response[1];
  //       this.getcardsdata = response[2];
  //       this.source.load(this.categorylist);
  //       this.loadCard_Details(response[2][0].all.length > 0 ? response[2][0].all[0].count : 0, response[2][0].active.length > 0 ? response[2][0].active[0].count : 0, response[2][0].inactive.length > 0 ? response[2][0].inactive[0].count : 0);
  //       this.cd.detectChanges();
  //     }
  //   })
  // }

  onDeleteChange(event) {
    this.ngOnInit();
  }

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      skip: 0,
      limit: this.limit,
      search: event,
    };
    this.getdata(data);
  }
  getdata(data) {
    this.apiService
      .CommonApi(
        Apiconfig.subcategoryList.method,
        Apiconfig.subcategoryList.url,
        data
      )
      .subscribe((response) => {
        console.log(response, 'this is the response I need to');
        if (response && response.length > 0) {
          this.categorylist = response[0];
          this.count = response[1];
          this.getcardsdata = response[2];
          this.source.load(this.categorylist);
          this.apiService
            .CommonApi(
              Apiconfig.archieveSubCategory.method,
              Apiconfig.archieveSubCategory.url,
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

  loadCard_Details(all, active, inactive, archieveList) {
    this.card_details = [
      {
        title: 'ALL Sub-categorys',
        value: all,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all',
      },
      {
        title: 'ACTIVE Sub-categorys',
        value: active,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active',
      },
      {
        title: 'INACTIVE Sub-categorys',
        value: inactive,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive',
      },
      {
        title: 'ARCHIVED Sub-categorys',
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

  loadsettings(event) {
    if (event == 'archieve') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          // sort_rcatname: {
          //   title: 'Category name',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     return value;
          //   }
          // },
          scatname: {
            title: 'Sub Category name',
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
        },
        scatname: {
          title: 'Sub Category name',
          filter: true,
          valuePrepareFunction: (value) => {
            return value;
          },
        },
      };
      this.settings.actions.custom = this.getSettings.loadSettings(
        event,
        this.curentUser,
        '/app/category/sub-category-list',
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
          // sort_rcatname: {
          //   title: 'Category name',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     return value;
          //   }
          // },
          scatname: {
            title: 'Sub Category name',
            filter: true,
            valuePrepareFunction: (value) => {
              return value;
            },
          },
          sort_rcatname: {
            title: 'Parent Category',
            filter: true,
            valuePrepareFunction: (value, row) => {
              console.log('rews', row);
              if (row && row.rcategory_data && row.rcategory_data.length > 0) {
                row.rcategory_data.sort((a, b) => {
                  return a.level - b.level;
                });

                console.log('rews', row.rcategory_data);
                if (row.rcategory_data.length == 1) {
                  return row.rcategory_data[0].scatname;
                  //
                }
                if (row.rcategory_data.length == 2) {
                  return (
                    row.rcategory_data[0].scatname +
                    ' > ' +
                    row.rcategory_data[1].scatname
                  );
                  //
                }
                if (row.rcategory_data.length == 3) {
                  return (
                    row.rcategory_data[0].scatname +
                    ' > ' +
                    row.rcategory_data[1].scatname +
                    ' > ' +
                    row.rcategory_data[2].scatname
                  );
                  //
                }
                if (row.rcategory_data.length == 4) {
                  return (
                    row.rcategory_data[0].scatname +
                    ' > ' +
                    row.rcategory_data[1].scatname +
                    ' > ' +
                    row.rcategory_data[2].scatname +
                    ' > ' +
                    row.rcategory_data[3].scatname
                  );
                }
                if (row.rcategory_data.length == 5) {
                  return (
                    row.rcategory_data[0].scatname +
                    ' > ' +
                    row.rcategory_data[1].scatname +
                    ' > ' +
                    row.rcategory_data[2].scatname +
                    ' > ' +
                    row.rcategory_data[3].scatname +
                    ' > ' +
                    row.rcategory_data[4].scatname
                  );
                }
              } else {
                return value;
              }

              //
            },
          },
          status: {
            title: 'Status',
            filter: false,
            type: 'custom',
            renderComponent: PopupComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe((row) => {
                this.changefeatured(row._id, row.status);
              });
            },
          },
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
        '/app/category/sub-category-list',
        this.userPrivilegeDetails,
        this.delete_btn,
        this.edit_btn,
        this.view_btn
      );
    }
  }
  changefeatured(id, status) {
    console.log(id, status);
    var data = {
      db: 'scategory',
      id: id,
      value: 1,
    };
    if (status == 1) {
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
}
