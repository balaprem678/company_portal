import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';

@Component({
  selector: 'app-cancellationview',
  templateUrl: './cancellationview.component.html',
  styleUrls: ['./cancellationview.component.scss']
})
export class CancellationviewComponent implements OnInit {
  id: any;
  data: any;

  constructor(private route: ActivatedRoute, private apiService: ApiService) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.apiService.CommonApi(Apiconfig.cancellationedit.method, Apiconfig.cancellationedit.url, { id: this.id }).subscribe(result => {
      this.data = result[0]
      console.log("sdsd", this.data)
    })
  }

}
