import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from "src/app/_helpers/api-config";
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-offers',
  templateUrl: './offers.component.html',
  styleUrls: ['../views.component.scss', './offers.component.scss']
})
export class OffersComponent implements OnInit {
  count: number = 0;  // Total count of offers
  offerlist: any[] = [];
  skip: number = 0;
  limit: number = 10;  // Number of offers per page
  apiUrl: string = environment.apiUrl;
  currentPage: number = 1;  // Track the current page
  loading: boolean = true;
  constructor(private apiService: ApiService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    const data = {
      'skip': this.skip,
      'limit': this.limit,
    };
    this.loading = true;
    console.log("aaaaaaaaaaaaaaaaaa");
    
    this.apiService.CommonApi(Apiconfig.offerManagementList.method, Apiconfig.offerManagementList.url, data).subscribe(response => {
      this.loading = false;
      if (response && response.length > 0) {
        console.log("bbbbbbbbbbbbbbb");
        console.log(this.loading,"this.loadingthis.loadingthis.loading");
        
        this.offerlist = response[0];
        this.count = response[1];
        this.cd.detectChanges();
        window.scrollTo(0, 0);
      }
    });
  }

  onPageChange(direction: string): void {
    if (direction === 'next' && this.skip + this.limit < this.count) {
      this.skip += this.limit;
      this.currentPage++;
    } else if (direction === 'prev' && this.skip > 0) {
      this.skip -= this.limit;
      this.currentPage--;
    }
    this.loadOffers();
  }

  get totalPages(): number {
    return Math.ceil(this.count / this.limit);
  }
}
