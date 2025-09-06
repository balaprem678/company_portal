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
import { RatingStarComponent } from 'src/app/shared/ratingStar.component';
import { filter } from 'rxjs';
@Component({
  selector: 'app-reviews-rating-list',
  templateUrl: './reviews-rating-list.component.html',
  styleUrls: ['./reviews-rating-list.component.scss']
})
export class ReviewsRatingListComponent {
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
  filter_action: boolean = true;
  filter_action_list: any[] = [];
  addBtnUrl: string = '';
  addBtnName: string = 'Add';
  editUrl: string = '';
  viewUrl: string = '/app/reviews/rating/views/';
  deleteApis: apis = Apiconfig.reviewsRatingDelete;
  permanentdelete: apis = Apiconfig.reviewsRatingDelete
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  restoreApis: apis = Apiconfig.reviewsRestore;
  From_Date: any;
  To_Date: any;
  constructor(
    private apiService: ApiService,
    private router: Router,
    private authService: AuthenticationService,
    private cd: ChangeDetectorRef,
    private getSettings: TableSettingsService,
    private notifyService: NotificationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/app/reviews/rating/list' && this.curentUser.privileges) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'reviewsRatings');
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
    ]
    this.loadsettings('');
  }

  ngOnInit(): void {
    this.getDataList();

  }

  getDataList() {
    let data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'From_Date': this.From_Date,
      'End_Date': this.To_Date
    } as any;

    if (this.global_search) {
      data.search = this.global_search;
    }
    this.apiService.CommonApi(Apiconfig.reviewsRatingList.method, Apiconfig.reviewsRatingList.url, data).subscribe(
      (result) => {


        if (result.status == 1) {
          console.log("resulty data is listed heres", result)
          this.source.load(result.data);
          this.count = result.count;

          this.loadCard_Details(result.allCount, result.activeCount, result.inactiveCount, result.deletedCount)
          // this.cd.detectChanges();
        }
      }
    )
  };

  onFilterAction(event) {
    this.From_Date = event.From_Date
    this.To_Date = event.To_Date
    let data = {
      'skip': this.skip,
      'limit': this.default_limit,
      'status': this.global_status,
      'From_Date': event?.From_Date,// Corrected assignment
      'End_Date': event?.To_Date,
    } as any;
    if (this.global_search) {
      data.search = this.global_search;
    }
    this.apiService.CommonApi(Apiconfig.reviewsRatingList.method, Apiconfig.reviewsRatingList.url, data).subscribe(
      (result) => {
        if (result.status === 1) {
          this.source.load(result.data);
          this.count = result.count;
          this.loadCard_Details(result.allCount, result.activeCount, result.inactiveCount, result.deletedCount)
          this.cd.detectChanges();
        }
      }
    )
  }

  loadCard_Details(allUsers, activeUsers, inactiveUsers, deletedUsers) {
    this.card_details = [
      {
        title: 'ALL Reviews',
        value: allUsers,
        bg_color: 'clr-green',
        //icon: 'fa fa-users',
        click_val: 'all'
      },
      {
        title: 'ACTIVE Reviews',
        value: activeUsers,
        bg_color: 'clr-ancblue',
        //icon: 'fa fa-user-plus',
        click_val: 'active'
      },
      {
        title: 'INACTIVE Reviews',
        value: inactiveUsers,
        bg_color: 'clr-orange',
        //icon: 'fa fa-user-times',
        click_val: 'inactive'
      },
      {
        title: 'DELETED Reviews',
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

  onDeleteChange(event) {
    if (event && event.status == 1) {
      this.skip = 0;
      this.ngOnInit();
    }
  };

  onSearchChange(event) {
    this.source = new LocalDataSource();
    this.global_search = event;
    this.skip = 0;
    this.getDataList();
  };

  onitemsPerPageChange(event) {
    this.limit = event;
    this.skip = 0;
    this.default_limit = event;
    this.source = new LocalDataSource();
    this.getDataList();
  };
  onPageChange(event) {
    this.skip = this.limit * (event - 1);
    this.source = new LocalDataSource();
    this.getDataList();
  }

  onheaderCardChange(event) {
    this.skip = 0;
    this.source = new LocalDataSource();
    if (event == 'all') {
      // data.status = 0;
      this.global_status = 0;
    } else if (event == 'active') {
      // data.status = 1;
      this.global_status = 1;
    } else if (event == 'inactive') {
      // data.status = 2;
      this.global_status = 2;
    } else if (event == 'delete') {
      // data.status = 4;
      this.global_status = 4;
    } else if (event == 'today') {
      // data.status = 5;
      this.global_status = 5;
    }
    this.loadsettings(event);
    this.getDataList();
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
              return (this.skip + cell.row.index + 1) + '.';
            }
          },
          username: {
            title: 'User Name',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          product: {
            title: 'Product Name',
            filter: true,
            valuePrepareFunction: value => {
              console.log(value,"valuevaluevaluevalue");
              
              return value ? value.name.charAt(0).toUpperCase() + value.name.substr(1).toLowerCase() : '-';
            }
          },
          comment: {
            title: 'Comments',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          rating: {
            title: 'Ratings',
            filter: true,
            valuePrepareFunction: value => {
              return value ? value : '-';
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/paymentgateway/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
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
            }
          },
          username: {
            title: 'User Customer',
            filter: true,
            valuePrepareFunction: (value, row) => {
              // console.log("row",row)
              return (row.first_name.charAt(0).toUpperCase() + row.first_name.substr(1).toLowerCase()) + " " + (row.last_name.charAt(0).toUpperCase() + row.last_name.substr(1).toLowerCase());

              // return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          product: {
            title: 'Product Name',
            filter: true,
            valuePrepareFunction: value => {
              return value ? value.name.charAt(0).toUpperCase() + value.name.substr(1).toLowerCase() : '-';
            }
          },
          comment: {
            title: 'Comments',
            filter: true,
            valuePrepareFunction: value => {
              return value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
            }
          },
          rating: {
            title: 'Ratings',
            filter: true,
            type: 'custom',
            renderComponent: RatingStarComponent,
            sort: false,
            editable: true,
            onComponentInitFunction: (instance: any) => {
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
      this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/paymentgateway/list', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
    };
  };
}
