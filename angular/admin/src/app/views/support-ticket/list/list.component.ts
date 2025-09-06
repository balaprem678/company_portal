import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { ButtonComponent } from 'src/app/shared/button.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {


  settings: any;
  source: LocalDataSource = new LocalDataSource();
  skip: number = 0;
  limit: number = 10;
  count: number = 0;
  curentUser: any;
  settingData: any;
  default_limit: number = 10;
  userPrivilegeDetails: any;
  add_btn: boolean = false;
  edit_btn: boolean = false;
  view_btn: boolean = true;
  bulk_action: boolean = false;
  delete_btn: boolean = true;
  addBtnUrl: string = '/app/support-ticket/add';
  addBtnName: string = 'Add';
  viewUrl: string = '/app/support-ticket/view/';
  deleteApis: apis = Apiconfig.supportTicketDelete;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  support_ticket:boolean=true;
  global_filter_action: any;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/support-ticket/list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'support-ticket');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
      }
    }
    this.filter_action_list = [
      {
        name: 'Status',
        tag: 'select',
        type: '',
      }
    ]
    this.loadsettings('');
  }

  ngOnInit(): void {
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,
    };
    this.getDataList(data);
  }

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.supportTicketList.method, Apiconfig.supportTicketList.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.source.load(result.data.userData);
          this.count = result.data.count;
          this.cd.detectChanges();
        }
      }
    )
  };

  onDeleteChange(event) {
    if (event && event.status == 1) {
      this.skip = 0;
      this.ngOnInit();
    }
  };

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': event,
      'filter_action': this.global_filter_action,

    }
    this.getDataList(data);
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
      'filter_action': this.global_filter_action,

    }
    this.getDataList(data);
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    let data = {
      'skip': this.limit * (event - 1),
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,

    };
    this.getDataList(data);
  }

  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    let data = {
      'skip': this.skip,
      'limit': this.limit,
      'status': this.global_status,
      'search': this.global_search,
      'filter_action': this.global_filter_action,
    }
    if (event == 'all') {
      data.status = 0;
      this.global_status = 0;
    } else if (event == 'active') {
      data.status = 1;
      this.global_status = 1;
    } else if (event == 'inactive') {
      data.status = 2;
      this.global_status = 2;
    } else if (event == 'delete') {
      data.status = 4;
      this.global_status = 4;
    } else if (event == 'today') {
      data.status = 5;
      this.global_status = 5;
    }
    this.loadsettings(event);
    this.getDataList(data);
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
      'filter_action': this.global_filter_action,
    };
    this.getDataList(data);
  }
  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          topic: {
            title: 'Topic',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          // description: {
          //   title: 'Description',
          //   filter: false,
          //   type: 'html',
          //   valuePrepareFunction: value => {
          //     return '<span class="description-tag">'+value+'</span>';
          //   }
          // },
          user_name: {
            title: 'User Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          user_email: {
            title: 'User Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          user_phone: {
            title: 'User Phone',
            valuePrepareFunction: value => {
             if (this.view_btn) {
                if (value.code && value.number) {
                  return value.code + ' ' + value.number;
                } else {
                  return '-';
                }
              } else {
                return 'XXXXX-XXXXX';
              }
            }
          },
          open_close_status: {
            title: 'Status',
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Open</span>" : "<span class='badge badge-pill badge-danger mb-1'>Close</span>";
            }
          },
          // status: {
          //   title: 'Status',
          //   type: 'html',
          //   valuePrepareFunction: value => {
          //     return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" : "<span class='badge badge-pill badge-danger mb-1'>Deleted</span>";
          //   }
          // },
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/support-ticket/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          topic: {
            title: 'Topic',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          // description: {
          //   title: 'Description',
          //   filter: false,
          //   type: 'html',
          //   valuePrepareFunction: value => {
          //     return '<span class="description-tag">'+value+'</span>';
          //   }
          // },
          user_name: {
            title: 'User Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          user_email: {
            title: 'User Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          user_phone: {
            title: 'User Phone',
            valuePrepareFunction: value => {
             if (this.view_btn) {
                if (value.code && value.number) {
                  return value.code + ' ' + value.number;
                } else {
                  return '-';
                }
              } else {
                return 'XXXXX-XXXXX';
              }
            }
          },
          open_close_status: {
            title: 'Status',
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Open</span>" : "<span class='badge badge-pill badge-danger mb-1'>Close</span>";
            }
          },
          default: {
            title: 'Open/Close',
            filter: false,
            type: "custom",
            renderComponent: ButtonComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe(row => {
                this.closeSupportData(row)
              });
            }
          },
          // status: {
          //   title: 'Status',
          //   type: 'html',
          //   valuePrepareFunction: value => {
          //     return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" : "<span class='badge badge-pill badge-danger mb-1'>Deleted</span>";
          //   }
          // },
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/support-ticket/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };

  closeSupportData(data) {
    this.apiService.CommonApi(Apiconfig.supportTicketClose.method, Apiconfig.supportTicketClose.url, { id: data._id }).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess(result.message);
          this.ngOnInit();
        } else {
          this.notifyService.showError(result.message);
        }
      }
    )
  }
}
