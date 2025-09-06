import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { apis } from 'src/app/interface/interface';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { CommonModalComponent } from 'src/app/shared/common-modal.component';
import { PrivilagesData } from 'src/app/menu/privilages';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { PopupComponent } from 'src/app/shared/popup.component';

@Component({
  selector: 'app-banner-types-list',
  templateUrl: './banner-types-list.component.html',
  styleUrls: ['./banner-types-list.component.scss']
})
export class BannerTypesListComponent {

  settings: any;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: PrivilagesData[];
  bulk_action: boolean = true;
  activeBulkAction: boolean = true;
  add_btn: boolean = false;
  category: boolean = true;
  delete_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = false;
  addBtnUrl: string = '/app/users/add';
  addBtnName: string = 'User Add';
  editUrl: string = '/app/banners/';
  viewUrl: string = '/app/users/view/';
  deleteApis: apis = Apiconfig.bannerDelete;
  permanentdelete: apis = Apiconfig.UserPermanentDele
  exportApis: apis = Apiconfig.userExport;
  restoreApis: apis = Apiconfig.userRestore;
  inactiveApis: apis = Apiconfig.bannerInactive;
  userActive: apis = Apiconfig.bannerActive
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  global_filter: string;
  selectedRow: any;
  filter_action: boolean = true;
  filter_action_list: any[] = [];
  global_filter_action = {} as any;
  user_list_filter_action: boolean = true;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private socketService: WebSocketService,
    private notifyService: NotificationService,
    private ActivatedRoute: ActivatedRoute,
    private store: DefaultStoreService
  ) {
    this.loader.loadingSpinner.next(true);
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/banners/banner-types-list' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Banner');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
          this.bulk_action = false;
        }
        if (this.userPrivilegeDetails[0].status.edit) {
          this.edit_btn = true;
        } else {
          this.edit_btn = false;
        }

      }
    }
    this.filter_action_list = [
      {
        name: 'From Date',
        tag: 'input',
        type: 'date',
      },
      {
        name: 'To Date',
        tag: 'input',
        type: 'date',
      },
      // {
      //   name: 'Category',
      //   tag: 'select',
      //   type: '',
      // }
    ]
    this.loadsettings('');
    this.socketService.listen('new_user_created').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          this.notifyService.showInfo(data.message);
          this.ngOnInit();
        }
      }
    });
    this.ActivatedRoute.queryParams.subscribe(params => {
      if (params && params['selected']) {
        this.global_filter = params['selected'];
      }
    });
  }

  ngOnInit(): void {
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,

    };
    // this.getUserList(data);
    this.getbannerDetais(data)

    // this.apiService.CommonApi(Apiconfig.bannerTypeList.method, Apiconfig.bannerTypeList.url, data).subscribe((result) => {
    //   if (result) {
    //     console.log(result,"resultsssssssssssssssssssssssssssssssssssss");
        
    //   }})
  };

  getbannerDetais(data){
    this.apiService.CommonApi(Apiconfig.bannerTypeList.method, Apiconfig.bannerTypeList.url, data).subscribe((result) => {
      if (result) {
        console.log(result[0],"resultsssssssssssssssssssssssssssssssssssss");
        this.source.load(result[0]);
        this.count = result[1];
        this.cd.detectChanges()
      }})
  }

  getUserList(data) {
    this.apiService.CommonApi(Apiconfig.userList.method, Apiconfig.userList.url, data).subscribe(
      (result) => {
        if (result) {
          this.loadCard_Details(result[2].allValue || 0, result[2].activeValue || 0, result[2].deactivateValue || 0, result[2].deletedUsers || 0);
          // this.source.load(result[0]);
          // this.count = result[1];

          // if (result[0].length == 0) {
          //   this.export_btn = false;
          // }
          // if (data.status == 4) {
          // this.export_btn = false;
          // } 
          // else {
          //   this.export_btn = true;
          // }
          // this.from = 'userlsit';
          setTimeout(() => {
            // this.loader.loadingSpinner.next(false);
          }, 1000);
          this.cd.detectChanges();
        }
      }
    )
  }

  onDeleteChange(event) {
    if (event && event.status == 1) {
      // this.skip = 0;
      this.ngOnInit();
    }
  };

  onInactivechange(event) {

    console.log("bgbhsdfgsd", event)
    if (event && event.status == 1) {
      // this.skip = 0;
      this.ngOnInit();
    }
  }


  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.skip = 0
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': event,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,

    }
    this.getbannerDetais(data);
  };

  onitemsPerPageChange(event) {
    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action
    }
    this.getbannerDetais(data);
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,

    };
    this.getbannerDetais(data);
  }

  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,

    }
    if (event == 'all') {
      data.status = 0;
      this.global_status = 0;
      this.user_list_filter_action = true
      this.activeBulkAction = true
    } else if (event == 'active') {
      data.status = 1;
      this.global_status = 1;
      this.user_list_filter_action = true
      this.activeBulkAction = false
    } else if (event == 'inactive') {
      data.status = 2;
      this.global_status = 2;
      this.user_list_filter_action = false
      this.activeBulkAction = true
    } else if (event == 'delete') {
      // this.export_btn = false;
      data.status = 4;
      this.global_status = 4;
      this.user_list_filter_action = false
      this.activeBulkAction = false
    } else if (event == 'today') {
      data.status = 5;
      this.global_status = 5;
    }
    this.loadsettings(event);
    this.getUserList(data);
  }

  onFilterAction(event) {
    this.source = new LocalDataSource();
    if (event && event != '') {
      this.global_filter_action = event;
    } else {
      this.global_filter_action = {};
    }
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter': this.global_filter,
      'filter_action': this.global_filter_action,
    };
    this.getbannerDetais(data);
  }

  loadCard_Details(allUsers, activeUsers, inactiveUsers, deletedUsers) {
    this.card_details = [
      {
        title: 'ALL USERS',
        value: allUsers,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'ACTIVE USERS',
        value: activeUsers,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
      },
      {
        title: 'INACTIVE USERS',
        value: inactiveUsers,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive'
      },
      {
        title: 'DELETED USERS',
        value: deletedUsers,
        bg_color: 'clr-red',
        //icon: 'fa fa-trash-o',
        click_val: 'delete'
      },
      // {
      //   title: "TODAY'S USERS",
      //   value: todayUsers,
      //   bg_color: 'delete-user',
      //   icon: 'fa fa-user-circle-o',
      //   click_val: 'today'
      // },
    ];
  }

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          type_name: {
            title: 'Banner types',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              console.log(value,"valueeeeeeeeeeeeeeee");
              
              return value
            }
          },
          banner_name: {
            title: 'Banner names',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
            return value
            }
          },
          // phone: {
          //   title: 'Phone',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     if (this.add_btn || this.edit_btn) {
          //       if (value.code && value.number) {
          //         return value.code + ' ' + value.number;
          //       } else {
          //         return '-';
          //       }
          //     } else {
          //       return 'XXXXX-XXXXX';
          //     }
          //   }
          // },
          status: {
            title: 'Status',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              return "<span class='badge badge-danger badge-pill mb-1'>Deleted</span>";
            }
          },
        },
        pager: {
          display: true,
          perPage: this.default_limit
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
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/users/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: this.delete_btn?'multi':undefined,
        hideSubHeader: true,
        columns: {
          type_name: {
            title: 'Banner Type',
            filter: true,
            type: 'html',
            valuePrepareFunction: (value) => {
             return  `<b>${value}</b>`
            }
          },
          // username: {
          //   title: 'User Name',
          //   filter: true,
          //   type: 'html',
          //   valuePrepareFunction: (value, row) => {
          //     console.log("row", row.first_name)
          //     return `<div class="overflow-text">${(value.charAt(0).toUpperCase() + value.substr(1).toLowerCase())}</div>`;
          //   }
          // },
          banner_name: {
            title: 'Banner Name',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
             return `<b>${value ? value : '-'}</b>`
            }
          },
          // phone: {
          //   title: 'Phone',
          //   filter: true,
          //   valuePrepareFunction: value => {
          //     if (this.add_btn || this.edit_btn) {
          //       if (value.code && value.number) {
          //         return value.code + ' ' + value.number;
          //       } else {
          //         return '-';
          //       }
          //     } else {
          //       return 'XXXXX-XXXXX';
          //     }
          //   }
          // },
          status: {},
        },
        pager: {
          display: true,
          perPage: this.default_limit
        },
        actions: {
          add: false,
          edit: false,
          delete: false,
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      if (this.edit_btn) {
        this.settings.columns.status = {
          title: 'Status',
          filter: false,
          type: 'custom',
          renderComponent: PopupComponent,
          sort: false,
          editable: true,
          onComponentInitFunction: (instance: any) => {
            instance.save.subscribe(row => {
              this.changefeatured(row._id, row.status);
            });
          }
          // type: 'html',
          // valuePrepareFunction: value => {
          //   if (value == 1) {
          //     return "<span class='badge badge-success badge-pill mb-1'>Active</span>";
          //   } else if (value == 2) {
          //     return "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
          //   } else if (value == 0) {
          //     return "<span class='badge badge-danger badge-pill mb-1'>Deleted</span>";
          //   } else if (value == 3) {
          //     return "<span class='badge badge-info badge-pill mb-1'>In Complete</span>";
          //   }
          // }
        }
      } else {
        this.settings.columns.status = {
          title: 'Status',
          filter: false,
          type: 'html',
          valuePrepareFunction: (value, rowData) => {
            if (rowData && rowData.status == 1) {
              return `<span style="cursor: pointer;" class='badge badge-success badge-pill mb-1' " >Active</span>`;
            } else if (rowData && rowData.status == 2) {
              return `<span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1' >Inactive</span>`;
            }
            // return  `<span style="cursor: pointer;" class='badge badge-success badge-pill mb-1' *ngIf="rowData && rowData.status == 1" (click)="showModal()" >Active</span><span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1' (click)="showModal()" *ngIf="rowData && rowData.status == 2">Inactive</span>`
          }
        }
      }
      if (!this.delete_btn) {
        const indexColumn = {
          index: {
            title: 'S No',
            type: 'text',
            valuePrepareFunction: (value, row, cell) => {
              return this.skip + cell.row.index + 1 + '.';
            },
          },
        };

        // Insert `indexColumn` at the beginning of the `columns`
        this.settings.columns = { ...indexColumn, ...this.settings.columns };
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/users/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };

  changefeatured(id, status) {
    var data = {
      db: "bannertype",
      id: id,
      value: 1
    };
    if (status == 1) {
      data.value = 2;
    }
    this.apiService.CommonApi(Apiconfig.changeStatus.method, Apiconfig.changeStatus.url, data).subscribe(response => {
      if (response && response.status == 1) {
        this.notifyService.showSuccess("Status changed successfully");
        this.ngOnInit()
        // window.location.reload();
      } else {
        this.notifyService.showError("Something went wrong. Please try again later.");
      }
    })
  }



}
