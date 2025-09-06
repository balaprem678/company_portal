import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PopupComponent } from 'src/app/shared/popup.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-emailtempletelist',
  templateUrl: './emailtempletelist.component.html',
  styleUrls: ['./emailtempletelist.component.scss']
})
export class EmailtempletelistComponent implements OnInit {

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
  view_btn: boolean = true;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/email-template/add';
  addBtnName: string = 'Template Add';
  editUrl: string = '/app/email-template/edit/';
  viewUrl: string = '/app/email-template/view/';
  deleteApis: apis = Apiconfig.emailTempletDelete;
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
  ) {
    this.add_btn = true
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/email-template/list' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'Email Template');
        // if (!this.userPrivilegeDetails[0].status.view) {
        //   this.notifyService.showWarning('You are not authorized this module');
        //   this.router.navigate(['/app']);
        // };
        // if (this.userPrivilegeDetails[0].status.delete) {
        //   this.delete_btn = true;
        // } else {
        //   this.delete_btn = false;
        //   this.bulk_action = false;
        // }
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
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
    this.getList(data);

  }

  getList(data) {
    this.apiService.CommonApi(Apiconfig.emailTempletList.method, Apiconfig.emailTempletList.url, data).subscribe(
      (result) => {
        if (result) {
          this.source.load(result[0]);
          this.count = result[1];
          this.cd.detectChanges();
        }
      }
    )
  }

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
      'search': event
    }
    this.getList(data);
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
    this.getList(data);
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
    this.getList(data);
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
    this.getList(data);
  }

  loadsettings(event) {
    if (event == 'delete') {
      this.settings = {
        // selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          index: {
            title: 'S No',
            type: 'text',
            valuePrepareFunction: (value, row, cell) => {
              return this.skip+cell.row.index + 1 + '.'
            }
          },
          name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          email_subject: {
            title: 'Email Subject',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          sender_email: {
            title: 'Sender Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          // status: {
          //   title: 'Status',
          //     filter: false,
          //     type: 'custom',
          //     renderComponent: PopupComponent,
          //     sort: false,
          //     editable: true,
          //     onComponentInitFunction: (instance: any) => {
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
          add: false,
          edit: false,
          delete: false,
          columnTitle: 'Actions',
          class: 'action-column',
          position: 'right',
          custom: [],
        },
      }
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/email-template/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    } else {
      this.settings = {
        // selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          index: {
            title: 'S No',
            type: 'text',
            valuePrepareFunction: (value, row, cell) => {
              return this.skip+cell.row.index + 1 + '.'
            }
          },
          name: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          email_subject: {
            title: 'Email Subject',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          sender_email: {
            title: 'Sender Email',
            filter: true,
            valuePrepareFunction: value => {
              return value;
            }
          },
          // status: {
          //   title: 'Status',
          //   filter: true,
          //   type: 'html',
          //   valuePrepareFunction: value => {
          //     return value == 1 ? "<span class='badge badge-success badge-pill mb-1'>Active</span>" : "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/email-template/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };
}
