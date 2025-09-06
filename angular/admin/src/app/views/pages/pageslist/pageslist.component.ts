import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { PopupComponent } from 'src/app/shared/popup.component';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-pageslist',
  templateUrl: './pageslist.component.html',
  styleUrls: ['./pageslist.component.scss']
})
export class PageslistComponent implements OnInit {
  restoreApis: apis = Apiconfig.pagerestore;
  settings: any;
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
  addBtnUrl: string = '/app/pages/add';
  addBtnName: string = 'Add Page';
  editUrl: string = '/app/pages/edit/';
  deleteApis: apis = Apiconfig.pageDelete;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/pages/list' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Layout Control');
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
        if (this.userPrivilegeDetails[0].status.add) {
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
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'search': this.global_search
    };
    this.getDataList(data);
  };

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.pageList.method, Apiconfig.pageList.url, data).subscribe(
      (result) => {

        this.source.load(result[0]);
        this.count = result[1];
        this.cd.detectChanges();
      }
    )
  };
  onDeleteChange(event) {

    console.log("event", event)
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
      'search': event
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
      'search': this.global_search
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
      'search': this.global_search
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
      'search': this.global_search
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

  changefeatured(id, status) {
    var data = {
      db: "pages",
      id: id,
      value: 1
    };
    if (status == 1) {
      data.value = 2;
    }
    this.apiService.CommonApi(Apiconfig.changeStatus.method, Apiconfig.changeStatus.url, data).subscribe(response => {
      if (response && response.status == 1) {
        this.notifyService.showSuccess("Successfully Updated");
        this.ngOnInit();
      } else {
        this.notifyService.showError("Something went wrong. Please try again later.");
      }
    })
  }

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          name: {
            title: 'Page Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          createdAt: {
            title: 'Published On',
            filter: true,
            valuePrepareFunction: date => {
              if (date) {
                return new DatePipe('en-US').transform(date, 'dd-MMM-yyyy, hh:mm:ss a');
              } else {
                return null;
              }
            }
          },
          status: {
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
          }
          // status: {
          //   title: 'Status',
          //   filter: true,
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/pages/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          name: {
            title: 'Page Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          createdAt: {
            title: 'Published On',
            filter: true,
            valuePrepareFunction: date => {
              if (date) {
                return new DatePipe('en-US').transform(date, 'MMMM dd,yyyy hh:mm a');
              } else {
                return null;
              }
            }
          },
          // status: {
          //   title: 'Status',
          //   filter: false,
          //   type: 'custom',
          //   renderComponent: PopupComponent,
          //   sort: false,
          //   editable: true,
          //   onComponentInitFunction: (instance: any) => {
          //     instance.save.subscribe(row => {
          //       this.changefeatured(row._id, row.status);
          //     });
          //   }
          // }
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/pages/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };



}
