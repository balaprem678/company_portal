import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { apis } from 'src/app/interface/interface';
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
export class ListComponent implements OnInit, AfterViewInit {

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
  delete_btn: boolean = true;
  addBtnUrl: string;
  addBtnName: string;
  editUrl: string;
  deleteApis: apis
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  notification_action: boolean = true;
  notificationActionData: any;
  template: string = '';
  templateList: any[] = [];
  mainTemplateList: any[] = [];
  tempdata: any;
  message: any;
  template_id: any;
  notificationtype: any;
  maildata: any;
  finalArray: any;
  templatename: any;
  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private notifyService: NotificationService,
    private getSettings: TableSettingsService
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/notification/list' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'notification');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
        };
        if (this.userPrivilegeDetails[0].status.delete) {
          this.delete_btn = true;
        } else {
          this.delete_btn = false;
        }
      }
    }
    this.loadsettings('');
  }
  ngAfterViewInit(): void {
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'search': this.global_search
    };
    this.apiService.CommonApi(Apiconfig.notificationuserlist.method, Apiconfig.notificationuserlist.url, data).subscribe(
      (result) => {
        if (result) {
          console.log("result", result)
          this.mainTemplateList = result ? result : [];
        }
      }
    )
  }

  ngOnInit(): void {
    var data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'search': this.global_search
    };
    this.getDataList(data);
    this.getTemplateList(data)
    this.apiService.CommonApi(Apiconfig.getmessagetemplate.method, Apiconfig.getmessagetemplate.url, {}).subscribe(result => {
      this.tempdata = result;
    })
    this.apiService.CommonApi(Apiconfig.getmailemplate.method, Apiconfig.getmailemplate.url, {}).subscribe(result => {
      this.maildata = result
    })
  };
  selectedData(data) {
    console.log(data);
    this.message = data[0].content
    this.template_id = data[0]._id
    this.templatename = data[0].name
    console.log(this.template_id)
  }

  getTemplateList(data) {
    this.apiService.CommonApi(Apiconfig.notificationTemplate.method, Apiconfig.notificationTemplate.url, data).subscribe(
      (result) => {
        if (result) {
          // for (let i = 0; i < result.length; i++) {
          //   console.log("safddasd", result[i].notificationtype)
          //   result[i].notificationtype = (result[i].notificationtype ? (((result[i].notificationtype == 'Email') || (result[i].notificationtype == 'email') ? "Email" : '') || ((result[i].notificationtype == 'Message') || (result[i].notificationtype == 'message') ? "Message" : '')) : '');
          // }

          // this.notificationtype = this.tempdata[0].notificationtype
          // console.log("######", this.tempdata[0].notificationtype)
          this.cd.detectChanges();
        }
      }
    )
  }

  getDataList(data) {
    this.apiService.CommonApi(Apiconfig.notificationuserlist.method, Apiconfig.notificationuserlist.url, data).subscribe(
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
      'search': this.global_search
    };
    this.getDataList(data);
  }

  // onheaderCardChange(event) {
  //   this.skip = 0;
  //   this.source = new LocalDataSource();
  //   let data = {
  //     'skip': this.skip,
  //     'limit': this.limit,
  //     'search': this.global_search
  //   }
  //   if (event == 'all') {
  //     //data.status = 0;
  //     this.global_status = 0;
  //   } else if (event == 'active') {
  //     // data.status = 1;
  //     this.global_status = 1;
  //   } else if (event == 'inactive') {
  //     //data.status = 2;
  //     this.global_status = 2;
  //   } else if (event == 'delete') {
  //     //data.status = 4;
  //     this.global_status = 4;
  //   } else if (event == 'today') {
  //     // data.status = 5;
  //     this.global_status = 5;
  //   }
  //   this.loadsettings(event);
  //   this.getDataList(data);
  // }

  defaultlang(id) {
    this.apiService.CommonApi(Apiconfig.languageDefault.method, Apiconfig.languageDefault.url, { id: id }).subscribe(
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
          email: {
            title: 'Email',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              if (this.curentUser && this.curentUser.role == "subadmin") {
                return `<div class="overflow-text">XXXXX@gmail.com</div>`;
              } else {
                return `<div class="overflow-text">${value ? value : '-'}</div>`;
              }
            }
          },
          phone: {
            title: 'Phone',
            filter: true,
            valuePrepareFunction: value => {
              if (this.curentUser && this.curentUser.role == "subadmin") {
                return 'XXXXX-XXXXX';
              } else {
                if (value.code && value.number) {
                  return value.code + ' ' + value.number;
                } else {
                  return '-';
                }
              }
            }
          },
          Status: {
            title: 'Status',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
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
      // this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/notification/list', this.userPrivilegeDetails,true,true,false);
    } else {
      this.settings = {
        selectMode: 'multi',
        hideSubHeader: true,
        columns: {
          username: {
            title: 'Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          email: {
            title: 'Email',
            filter: true,
            type: 'html',
            valuePrepareFunction: value => {
              if (this.curentUser && this.curentUser.role == "subadmin") {
                return `<div class="overflow-text">XXXXX@gmail.com</div>`;
              } else {
                return `<div class="overflow-text">${value ? value : '-'}</div>`;
              }
            }
          },
          phone: {
            title: 'Phone',
            filter: true,
            valuePrepareFunction: value => {
              if (this.curentUser && this.curentUser.role == "subadmin") {
                return 'XXXXX-XXXXX';
              } else {
                if (value.code && value.number) {
                  return value.code + ' ' + value.number;
                } else {
                  return '-';
                }
              }
            }
          },
          status: {
            title: 'status',
            filter: true,
            valuePrepareFunction: value => {
              return value == 1 ? 'Active ' : 'In Active';
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
      // this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/notification/list', this.userPrivilegeDetails,true,true,false);
    };
  };
  onNotificationAction(event) {
    console.log("sdfsdf", event)
    this.notificationActionData = event;
    var data = this.notificationActionData.data;
    console.log("sda", data)
    this.finalArray = data.map(function (obj) {
      console.log("object", obj)
      return obj._id;
    });
    console.log("sadfsdfsdvsd+++++", data)
    var find = data.filter(email => email.email)
    if (find.length != data.length) {
      this.notifyService.showError('Please select Email User');
    } else {
      if (event && event.type == 'mail') {
        this.templateList = this.mainTemplateList.filter(x => x.notificationtype == 'email');
        let btnaction = <HTMLElement>document.querySelector('.notification1');
        btnaction.click();
      } else {
        this.templateList = this.mainTemplateList.filter(x => x.notificationtype != 'email');
        let btnaction = <HTMLElement>document.querySelector('.notification-modal');
        btnaction.click();
      }
    }
  }


  sendEmail() {
    let data = {
      template: this.template_id,
      delvalue: this.finalArray ? this.finalArray : [],
      type: 'user',
    };
    // if(this.notificationActionData.data.email)
    this.apiService.CommonApi(Apiconfig.sendgmail.method, Apiconfig.sendgmail.url, data).subscribe(
      (result) => {
        if (result) {

          let btnaction = <HTMLElement>document.querySelector('.notification-modal-close');
          btnaction.click();
          this.notifyService.showSuccess(result.message);
          this.template = '';
          this.notificationActionData = {};
          // window.location.reload();
        }
      },
      (error) => {
        console.log(error);
      }
    )
  }


  sendNotification() {
    let data = {
      template: this.template_id,
      delvalue: this.finalArray ? this.finalArray : [],
      type: 'user',
    };
    // if(this.notificationActionData.data.email)
    this.apiService.CommonApi(Apiconfig.sendmessage.method, Apiconfig.sendmessage.url, data).subscribe(
      (result) => {
        if (result) {

          let btnaction = <HTMLElement>document.querySelector('.notification-modal-close1');
          btnaction.click();
          this.notifyService.showSuccess(result.message);
          this.template = '';
          this.notificationActionData = {};
        }
      },
      (error) => {
        console.log(error);
      }
    )
  }

}
