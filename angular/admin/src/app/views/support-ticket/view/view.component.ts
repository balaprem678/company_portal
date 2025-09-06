import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {

  pageTitle: string = 'View Support Ticket';
  imageurl: string = environment.apiUrl;
  supportData: any = {
    createdAt: "",
    description: "",
    open_close_status: 0,
    status: 1,
    topic: null,
    updatedAt: null,
    user_avatar: null,
    user_email: null,
    user_id: null,
    user_name: null,
    user_phone: { code: "", number: "" },
    _id: null,
  };
  usercroppedImage: any = 'assets/image/user.jpg';

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.apiService.CommonApi(Apiconfig.supportTicketView.method, Apiconfig.supportTicketView.url + id, {}).subscribe(
        (result) => {
          if (result && result.status) {
            this.supportData = result.data;
            this.apiService.imageExists(environment.apiUrl + this.supportData.user_avatar, (exists) => {
              if (exists) {
                this.usercroppedImage = environment.apiUrl + this.supportData.user_avatar;
              }
            });
          }
        }
      )
    };
  }
  closeSupportData() {
    this.apiService.CommonApi(Apiconfig.supportTicketClose.method, Apiconfig.supportTicketClose.url, {id: this.ActivatedRoute.snapshot.paramMap.get('id')}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.router.navigate(['/app/support-ticket/list']);
          this.notifyService.showSuccess(result.message);
        } else {
          this.notifyService.showError(result.message);
        }
      }
    )
  }
}
