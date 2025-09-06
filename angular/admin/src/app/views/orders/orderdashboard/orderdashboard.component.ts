import { Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { ChartOptions, ChartType } from 'chart.js';
import { LocalDataSource } from 'src/app/common-table/table/public-api';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-orderdashboard',
  templateUrl: './orderdashboard.component.html',
  styleUrls: ['./orderdashboard.component.scss']
})
export class OrderdashboardComponent implements OnInit {
  startDate = new UntypedFormControl(new Date());
  endDate = new UntypedFormControl(new Date());
  isCollapsed = true;
  pieChartOptions: ChartOptions;
  pieChartLabels: any;
  pieChartData: any;
  pieChartType: ChartType;
  public pieChartPlugins: any[] = [];

  pieChartLegend: boolean;
  data: any;
  niteos: []
  keys: string[];
  value: unknown[];
  view_btn: boolean = false;
  delete_btn: boolean = false;
  addBtnUrl: string = '/app/pages/add';
  addBtnName: string = 'Page Add';
  editUrl: string = 'app/brand/brand-edit/';
  viewUrl: string = '/app/orders/vieworders/';
  card_details: any[] = [];
  global_status: number = 0;
  global_search: string;
  bulk_action: boolean = false;
  getcity: any;
  maxDate = new Date();
  minDate = new Date();
  startdate: any;
  enddate: any;
  to_dates: string;
  _dates: string;
  fromDate: any;
  from_mindate: string;
  getcityid: any;
  subcity: any;
  myDateValue1: any;
  onToDate: string;
  myDateValue: Date;
  onFromDate: string | number | Date;
  filter_action_list: any[] = [];
  filter_action: boolean = true;
  global_filter_action = {} as any;
  default_limit: any;
  skip: any;
  status: any;
  source: LocalDataSource;
  city: [];
  city_name: any = [];
  constructor(private apiService: ApiService, private store: DefaultStoreService) {
    this.filter_action_list = [
      // {
      //   name: 'City',
      //   tag: 'select',
      //   type: '',
      // },
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
  }
  public createOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: true,
      legend: {
        display: true,
      },
      tooltips: {
        enabled: true,
      },
      plugins: {
        datalabels: {
          color: ['green', 'orange', 'red', 'blue', 'violet'],
          anchor: 'end',
          align: 'end',
          formatter: (value: any) => value.toFixed(2),
        },
      },
    };
  }
  ngOnInit(): void {
    this.pieChartOptions = this.createOptions();
    this.pieChartLabels = [];
    this.pieChartData = []
    this.pieChartType = 'pie';
    this.pieChartLegend = true;
    this.apiService.CommonApi(Apiconfig.ordersdashboard.method, Apiconfig.ordersdashboard.url, {}).subscribe(result => {
      console.log("Reuslt", result)
      this.keys = Object.keys(result)
      this.value = Object.values(result)
      this.data = result
      this.pieChartLabels = Object.keys(result)
      this.pieChartData = Object.values(result) as any;
    })
  }

  public pieColor: any[] = [{
    backgroundColor: ["#FF7360", "#6FC8CE", "#FAFFF2", "#FFFCC4", "#B9E8E0"]
  }
  ]

  fromdateStarted() {
    if (this.myDateValue1) {
      this.onToDate = ""
      this.myDateValue = new Date(this.onFromDate);
    }
    else {
      this.myDateValue = new Date(this.onFromDate);
    }
  }

  ToDateStarted() {
    this.myDateValue1 = new Date(this.onToDate);
  }
  onsubmit() {
    var data = {
      city: this.getcityid,
      area: "",
      start_date: this.myDateValue ? this.myDateValue.toISOString() : '',
      end_date: this.myDateValue1 ? this.myDateValue1.toISOString() : '',
      status: this.status,
      rest: ""
    }
    this.apiService.CommonApi(Apiconfig.orderdashboard1.method, Apiconfig.orderdashboard1.url, data).subscribe(result => {
      this.keys = Object.keys(result)
      this.value = Object.values(result)
      this.data = result
      this.pieChartLabels = Object.keys(result)
      this.pieChartData = Object.values(result) as any;
    })
  }

  onclear() {
    this.onToDate = "";
    this.onFromDate = "";
    this.getcityid = "";
    this.city_name = [];
    this.ngOnInit()
  }

  onFilterData(event) {
    this.getcityid = event.cityname;
  }

  ngAfterViewInit(): void {
    this.apiService.CommonApi(Apiconfig.productcatgory.method, Apiconfig.productcatgory.url, {}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.store.categoryList.next(result.list ? result.list : []);
        }
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productbrandns.method, Apiconfig.productbrandns.url, {}).subscribe(
      (result) => {
        if (result && result.length == 1) {
          this.store.brandsList.next(result[0].length > 0 ? result[0] : []);
        };
      },
      (error) => {
        console.log(error);
      }
    );
    this.apiService.CommonApi(Apiconfig.productcity.method, Apiconfig.productcity.url, {}).subscribe(
      (result) => {
        if (result && result.length > 0) {
          this.store.cityList.next(result[0].length > 0 ? result[0] : []);
          this.getcity = result[0];
        }
      },
      (error) => {
        console.log(error);
      }
    );
  };

  onFilterAction(event) {
    this.source = new LocalDataSource();
    if (event && event.City != '') {
      this.global_filter_action.city = event.City;
    } else {
      delete this.global_filter_action.city;
    }

    if (event && event.From_Date != '') {
      this.global_filter_action.From_Date = event.From_Date;
    } else {
      delete this.global_filter_action.From_Date;
    }

    if (event && event.To_Date != '') {
      this.global_filter_action.To_Date = event.To_Date;
    } else {
      delete this.global_filter_action.To_Date;
    }
    let filterdata = {
      ...this.global_filter_action
    };
    this.apiService.CommonApi(Apiconfig.orderdashboard1.method, Apiconfig.orderdashboard1.url, filterdata).subscribe(result => {
      this.source.load(result[0] == 0 ? [] : result[0]);
    })
  }



}
