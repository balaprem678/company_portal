import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { StarButtonComponent } from 'src/app/shared/star-button.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-languagelist',
  templateUrl: './languagelist.component.html',
  styleUrls: ['./languagelist.component.scss']
})
export class LanguagelistComponent implements OnInit {

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
  edit_btn: boolean = true;
  view_btn: boolean = false;
  delete_btn: boolean = true;
  managebtn:boolean=true;
  addBtnUrl: string = '/app/language/add';
  addBtnName: string = 'Language Add';
  editUrl: string = '/app/language/edit/';
  manageurl:string='/app/language/manage';
  deleteApis: apis = Apiconfig.language_Delete;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private notifyService: NotificationService,
    private getSettings: TableSettingsService
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/language/list' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'language');
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
    this.apiService.CommonApi(Apiconfig.language_List.method, Apiconfig.language_List.url, data).subscribe(
      (result) => {
          this.source.load(result[0]);
          this.count = result[1];
          this.cd.detectChanges();
      }
    )
  }

  onDeleteChange(event) {
    if (event) {
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

  defaultlang(id) {
    this.apiService.CommonApi(Apiconfig.language_Default.method, Apiconfig.language_Default.url, { id: id }).subscribe(
      (result) => {
        if (result) {
          this.notifyService.showSuccess('Succesfully Updated');
          this.ngOnInit();
        } else {
          this.notifyService.showError(result.message);
        }
      }
    )
  }

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          code: {
            title: 'Code',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          default: {
            title: 'Default',
            filter: false,
            type: "custom",
            renderComponent: StarButtonComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe(row => {
                this.defaultlang(row._id);
                //this.changedValue[row.content] = row.value;
              });
            }
          },
          status: {
            title: 'Status',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Enable</span>" : "<span class='badge badge-pill badge-warning mb-1'>Disable</span>";
            }
          }
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/language/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn,this.managebtn);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          code: {
            title: 'Code',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          default: {
            title: 'Default',
            filter: false,
            type: "custom",
            renderComponent: StarButtonComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
              instance.save.subscribe(row => {
                this.defaultlang(row._id);
                //this.changedValue[row.content] = row.value;
              });
            }
          },
          status: {
            title: 'Status',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Enable</span>" : "<span class='badge badge-pill badge-warning mb-1'>Disable</span>";
            }
          }
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/language/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn,this.managebtn);
    };
  };

}
