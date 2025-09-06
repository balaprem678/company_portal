import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';

@Component({
  selector: 'app-couponview',
  templateUrl: './couponview.component.html',
  styleUrls: ['./couponview.component.scss']
})
export class CouponviewComponent implements OnInit {
  id: string;
  data: any;

  constructor(private apiService: ApiService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.apiService.CommonApi(Apiconfig.editcoupons.method, Apiconfig.editcoupons.url, { id: this.id }).subscribe(result => {
      this.data = result[0]
      console.log("sdsd", this.data)
    })
  }

}
