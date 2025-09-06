import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import data, { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
import { DatePipe } from '@angular/common';
import { CommonModalComponent } from 'src/app/shared/common-modal.component';
import { environment } from 'src/environments/environment';



@Component({
  selector: 'app-postheader-list',
  templateUrl: './postheader-list.component.html',
  styleUrls: ['./postheader-list.component.scss']
})

export class PostheaderListComponent implements OnInit {

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
  add_btn: boolean = true;
  category: boolean = true;
  delete_btn: boolean = true;
  edit_btn: boolean = true;
  view_btn: boolean = false;
  addBtnUrl: string = '/app/settings/postheaderadd';
  addBtnName: string = 'Post Header Add';
  editUrl: string = '/app/settings/postheaderedit/';
  deleteApis: apis = Apiconfig.postheader_delete;

  global_status: number = 0;
  global_search: string;
  global_filter: string;
  selectedRow: any;
  filter_action: boolean = true;
  global_filter_action = {} as any;

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
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/settings/postheader/list') {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'users');
        // console.log(this.userPrivilegeDetails);

        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.edit) {
          this.edit_btn = true;
        } else {
          this.edit_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
      }
    };
    this.loadsettings('');
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
    this.getDataList(data);
  }
  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.postheader_list.method, Apiconfig.postheader_list.url, data).subscribe(
      (result) => {
        if (result) {
          this.source.load(result[0]);
          this.count = result[1];
          setTimeout(() => {
            // this.loader.loadingSpinner.next(false);
          }, 1000);
          this.cd.detectChanges();
        }
      }
    )
  }

  onDeleteChange(event) {
    if (event && event.ok == 1) {
      // this.skip = 0;
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

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          title: {
            title: 'Title',
            filter: true,
            type: 'html',
            valuePrepareFunction: (value, row) => {
              return `<div class="overflow-text">${(value.charAt(0).toUpperCase() + value.substr(1).toLowerCase())}</div>`;
            }
          },
          image: {
            title: 'Image',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              return '<img src="' + environment.apiUrl + value + '" width="32" height="32">';
            }
          },
          status: {
            title: 'Status',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" : "<span class='badge badge-pill badge-danger mb-1'>Deleted</span>";
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/settings/postheader/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          title: {
            title: 'Title',
            filter: true,
            type: 'html',
            valuePrepareFunction: (value, row) => {
              return `<div class="overflow-text">${(value.charAt(0).toUpperCase() + value.substr(1).toLowerCase())}</div>`;
            }
          },
          image: {
            title: 'Image',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              return '<img src="' + environment.apiUrl + value + '" width="32" height="32">';
            }
          },
          status: {
            title: 'Status',
            filter: false,
            type: 'html',
            valuePrepareFunction: value => {
              if (value == 1) {
                return "<span class='badge badge-success badge-pill mb-1'>Publish</span>";
              } else if (value == 2) {
                return "<span class='badge badge-pill badge-warning mb-1'>UnPublish</span>";
              } 
            }
          },
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/settings/postheader/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };
}
