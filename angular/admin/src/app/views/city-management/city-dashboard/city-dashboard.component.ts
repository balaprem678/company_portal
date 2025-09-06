import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { TableSettingsService } from 'src/app/_helpers/table-settings.service';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { SpinnerService } from 'src/app/_services/spinner.service';
@Component({
  selector: 'app-city-dashboard',
  templateUrl: './city-dashboard.component.html',
  styleUrls: ['./city-dashboard.component.scss']
})
export class CityDashboardComponent implements OnInit {
  cityList:any;
  main_city:any="";
  driverData:any;
  public pieChartLabels: any =['active','inactivate','deleted','disable','newdriver'];
  public pieChartData: any=[];
  public pieChartType: any = 'pie';
  public pieChartLegend = true;
  public pieChartPlugins: any[] = [registerables];
  public pieColor: any[] = [{
    backgroundColor: ["#FF7360", "#6FC8CE", "#f90a0a", "#FFFCC4", "#B9E8E0"]
  }
  ]
  public pieChartOptions=this.createOptions()

  private createOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
        },
        tooltip: {
          enabled: true,
        },
        datalabels: {
          color: ['green', 'orange', 'red', 'blue', 'violet'],
          anchor: 'end',
          align: 'end',
          formatter: (value: any) => value.toFixed(2),
        },
      },
    };
  }
  constructor(
    private router: Router, 
    private authService: AuthenticationService,
    private apiService: ApiService, 
    private sanitized: DomSanitizer, 
    private getSettings: TableSettingsService,
    private loader: SpinnerService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.cityDashboard.method, Apiconfig.cityDashboard.url, {}).subscribe(response => {
      if(response){
        for (let index = 0; index < this.pieChartLabels.length; index++) {
          this.pieChartData.push(response[3][`${this.pieChartLabels[index]}`])
        }
        this.driverData=response;
        
      }
    })
    this.apiService.CommonApi(Apiconfig.getCity.method, Apiconfig.getCity.url, {}).subscribe(response => {
      if(response){
        this.cityList=response[0];
      }
    })
  }

  getDrivers(){
    this.apiService.CommonApi(Apiconfig.getCityDrivers.method, Apiconfig.getCityDrivers.url, {main_city:this.main_city}).subscribe(response => {
      if(response){
        console.log(response)
        this.pieChartData=[]
        for (let index = 0; index < this.pieChartLabels.length; index++) {
          this.pieChartData.push(response[3][`${this.pieChartLabels[index]}`])
        }
        this.driverData=response;
      }
    })
  }

}
