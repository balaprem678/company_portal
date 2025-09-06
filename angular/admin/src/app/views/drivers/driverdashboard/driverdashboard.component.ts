import { Component, OnInit } from '@angular/core';
import { ChartOptions, ChartType } from 'chart.js';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { Chart, registerables } from 'chart.js';


@Component({
  selector: 'app-driverdashboard',
  templateUrl: './driverdashboard.component.html',
  styleUrls: ['./driverdashboard.component.scss']
})
export class DriverdashboardComponent implements OnInit {

  pieChartOptions: ChartOptions;
  pieChartLabels: any;
  pieChartData: any;
  pieChartType: ChartType;
  pieChartLegend: boolean;
  // pieChartPlugins = [];
  public pieChartPlugins: any[] = [registerables];

  data: any;
  niteos: []
  keys: string[];
  value: unknown[];
  topdrivers: any;
  topdelivery: any;
  leastrating: any;

  constructor(private apiService: ApiService) { }


  ngOnInit(): void {
    this.pieChartOptions = this.createOptions();
    this.pieChartLabels = [];
    this.pieChartData = []
    this.pieChartType = 'pie';
    this.pieChartLegend = true;
    this.apiService.CommonApi(Apiconfig.dashboard.method, Apiconfig.dashboard.url, {}).subscribe(result => {
      this.topdrivers = result[0]
      this.topdelivery = result[2]
      this.leastrating = result[1]
      console.log("Reuslt", this.topdrivers)
      this.keys = Object.keys(result[3])
      this.value = Object.values(result[2])
      this.data = result
      this.pieChartLabels = Object.keys(result[3]) as any;
      this.pieChartData = Object.values(result[3]) as any;
    })
  }

  public pieColor: any[] = [{
    backgroundColor: ["#FF7360", "#6FC8CE", "#FAFFF2", "#FFFCC4", "#B9E8E0"]
  }
  ]
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

}
