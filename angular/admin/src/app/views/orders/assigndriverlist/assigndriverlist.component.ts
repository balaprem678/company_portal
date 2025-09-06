import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Assign_driverComponent } from 'src/app/shared/assign_driver';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-assigndriverlist',
  templateUrl: './assigndriverlist.component.html',
  styleUrls: ['./assigndriverlist.component.scss']
})
export class AssigndriverlistComponent implements OnInit {
  id: string;

  status: any
  getnewuserslist: any[];
  totalItems: any;
  getnewuserlistdata: any;
  getlistusers: any;
  getlistdata: any;
  event_limit: any;
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
  add_btn: boolean = false;
  edit_btn: boolean = false;
  view_btn: boolean = false;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/pages/add';
  addBtnName: string = 'Page Add';
  editUrl: string = 'app/brand/brand-edit/';
  viewUrl: string = '/app/orders/vieworders/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = true;
  dataid: any;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;

  constructor(private apiService: ApiService, private getSettings: TableSettingsService,
    private route: ActivatedRoute,
    private webSocket: WebSocketService,
    private router: Router,
  ) {
    this.filter_action_list = [
      {
        name: 'City',
        tag: 'select',
        type: '',
      },
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
    this.id = this.route.snapshot.paramMap.get('id')
    console.log(this.id);
    this.getUsers()
    this.webSocket.listen('r2e_get_nearest_driver').subscribe(result => {
      console.log(result)
      this.source.load(result.driversDetails)
      this.totalItems = result.count
    })
    this.webSocket.listen('r2e_assign_driver_by_admin').subscribe(result => {
      console.log(result)
      if (result && result.err == 0) {
        this.router.navigate(['app/orders/packedorders'])
      }
    })
  }


  getUsers() {
    this.apiService.CommonApi(Apiconfig.getAssignJobOrder.method, Apiconfig.getAssignJobOrder.url, { orderId: this.id }).subscribe(response => {
      console.log(response);
      if (response && response.err == 0) {
        this.webSocket.emit('r2e_get_nearest_driver', { orderId: this.id, lat: response.orderDetails.location.lat, lon: response.orderDetails.location.lng, cityname: response.orderDetails.restaurantDetails.cityname })
      }
    })
  }

  loadsettings(event) {
    this.settings = {
      selectMode: 'multi',
      hideSubHeader: true,
      columns: {
        name: {
          title: 'Name',
          filter: true,
          valuePrepareFunction: value => {
            return value;
          }
        },
        email: {
          title: 'Email',
          filter: true,
          valuePrepareFunction: (value, row) => {
            return value;
          }
        },
        phone: {
          title: 'phone',
          filter: true,
          valuePrepareFunction: (value, row) => {
            return value.code + ' ' + value.number;
          }
        },
        action: {
          title: "Actions",
          filter: true,
          type: "custom",
          renderComponent: Assign_driverComponent,
          sort: false,
          editable: true,
          onComponentInitFunction: (instance: any) => {
            instance.save.subscribe((row, value) => {
              this.assignDriver(row)
            });
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
        view: true,
        columnTitle: 'Actions',
        class: 'action-column',
        position: 'right',
        custom: [],
      },
    }
    this.settings.actions.custom = this.getSettings.loadSettings(event, this.curentUser, '/app/orders/usercancelledorders', this.userPrivilegeDetails, this.delete_btn, this.edit_btn, this.view_btn);
  };

  assignDriver(value) {
    console.log(value);
    this.webSocket.emit('r2e_assign_driver_by_admin', { orderId: this.id, lat: value.location.lat, lon: value.location.lng, driverId: value._id, pickup_distance: value.pickup_distance, deliver_distance: value.deliver_distance })

  }

}
