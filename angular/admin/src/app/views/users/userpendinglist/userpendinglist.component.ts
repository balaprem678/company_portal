import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
import { PrivilagesData } from 'src/app/menu/privilages';
import { SendmailComponent } from 'src/app/shared/sendmail.component';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
import { BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-userpendinglist',
  templateUrl: './userpendinglist.component.html',
  styleUrls: ['./userpendinglist.component.scss']
})
export class UserpendinglistComponent implements OnInit {

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
  deleteApis: apis = Apiconfig.subUserDelete;
  global_status: number = 1;
  global_search: string;
  delete_btn: boolean = true;
  edit_btn: boolean = false;
  view_btn: boolean = false;
  add_btn: boolean = false;
  modalRef: any;
  newaddSubEmail: any;
  subscribeMail:boolean=true


  constructor(
    private apiService: ApiService,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private loader: SpinnerService,
    private getSettings: TableSettingsService,
    private router: Router,
    private notifyService: NotificationService,
    private modalService: BsModalService

  ) {
    this.loader.loadingSpinner.next(true);
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.doc.role == "subadmin") {
      if (this.router.url == '/app/users/subscribe' && this.curentUser.doc.privileges) {
        this.userPrivilegeDetails = this.curentUser.doc.privileges.filter(x => x.alias == 'users');
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
        if (this.userPrivilegeDetails[0].status.view) {
          this.view_btn = true;
        } else {
          this.view_btn = false;
        }
        if (this.userPrivilegeDetails[0].status.add) {
          this.subscribeMail = true;
        } else {
          this.subscribeMail = false;
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
    this.getUserList(data);
  };

  getUserList(data) {
    this.apiService.CommonApi(Apiconfig.subscribeUser.method, Apiconfig.subscribeUser.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.source.load(result.data);
          this.count = result.count;
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
    this.getUserList(data);
  };

  addSubEmail(event) {
    this.newaddSubEmail = event
    console.log(this.newaddSubEmail, "newaddSubEmail");
    let data = {
      email: this.newaddSubEmail
    }
    this.apiService.CommonApi(Apiconfig.addSubscribeEmail.method, Apiconfig.addSubscribeEmail.url, data).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.notifyService.showSuccess('New Email Added Successfuly')
          this.cd.detectChanges();
          this.ngOnInit();

        } else {
          this.notifyService.showError('Something went wrong')

        }
      }
    )
  }

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
    this.getUserList(data);
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
    this.getUserList(data);
  }

  onNotificationAction(event: any) {
    const { type, data } = event;

    if (type === 'mail') {
      console.log("sdfsdfsfsdf");
      // this.showSendMailModal(data);


      // Call your service method to send emails
      // this.apiService.(data).subscribe(response => {
      //   if (response.status === 1) {
      //     this.notifyService.showSuccess('Emails sent successfully');
      //     this.getUserList({
      //       'skip': this.skip,
      //       'limit': this.limit,
      //       'status': this.global_status,
      //       'search': this.global_search
      //     });
      //   } else {
      //     this.notifyService.showError('Failed to send emails');
      //   }
      // });
    }
  }
  showSendMailModal(data: any) {
    // Open the SendmailComponent in a modal
    console.log(data);

    this.modalRef = this.modalService.show(SendmailComponent, {
      initialState: {
        selectedUsers: data
      }
    });

    // Handle result or actions from the modal if needed
    this.modalRef.onHidden.subscribe(() => {
      // Perform actions after modal is closed if necessary
      console.log('Sendmail modal closed');
      this.getUserList({
        'skip': this.skip,
        'limit': this.limit,
        'status': this.global_status,
        'search': this.global_search
      });
    });
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
    this.getUserList(data);
  }

  loadsettings(event) {
    this.settings = {
      selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        email: {
          title: 'Email',
          filter: true,
          type: 'html',
          valuePrepareFunction: value => {
            return value
          }
        },
        createdAt: {
          title: 'Created At',
          filter: true,
          valuePrepareFunction: value => {
            if (value) {
              var date = value ? new DatePipe('en-US').transform(value, 'dd/MM/yyyy') : new DatePipe('en-US').transform(new Date(), 'dd/MM/yyyy');
              return date;
            } else {
              return null;
            }
          }
        },
        status: {
          title: 'Status',
          filter: false,
          type: 'html',
          valuePrepareFunction: value => {
            if (value == 1) {
              return "<span class='badge badge-success badge-pill mb-1'>Active</span>";
            } else if (value == 2) {
              return "<span class='badge badge-pill badge-warning mb-1'>InActive</span>";
            }
          }
        },
        // assign:{
        //   title: 'Send Mail',
        //   filter: false,
        //   type: "custom",
        //   renderComponent: SendmailComponent,
        //   sort: false,
        //   editable: true,
        //   onComponentInitFunction: (instance: any) => {
        //     instance.save.subscribe(row => {
        //         this.ngOnInit()
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
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/users/list', this.userPrivilegeDetails, this.delete_btn, false, false);
  };

};
