import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { settings } from 'src/app/interface/interface';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { WebSocketService } from 'src/app/_services/webSocketService.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-debateview',
  templateUrl: './debateview.component.html',
  styleUrls: ['./debateview.component.scss']
})
export class DebateviewComponent implements OnInit, AfterViewInit {

  pageTitle: string = 'View Debate';
  imageurl: string = environment.apiUrl;
  RootDebateDetails: any;
  pendingRequestList: any[] = [];
  pendingRequestCount: number = 0;
  acceptRequestList: any[] = [];
  acceptRequestCount: number = 0;
  rejectRequestList: any[] = [];
  rejectRequestCount: number = 0;
  usercroppedImage: string = 'assets/image/user.jpg';
  coverCroppedImage: string = 'assets/image/coverimg.png';
  accept_skip: number = 0;
  pending_skip: number = 0;
  reject_skip: number = 0;
  limit: number = 10;
  settings: settings;

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private socketService: WebSocketService,
    private notifyService: NotificationService,
    private store: DefaultStoreService,
  ) { }

  ngOnInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.apiService.CommonApi(Apiconfig.debateView.method, Apiconfig.debateView.url + id, {}).subscribe(
        (result) => {
          if (result && result.status) {
            this.RootDebateDetails = result.data;            
            if (this.RootDebateDetails && this.RootDebateDetails.hastags) {
              this.RootDebateDetails.hastagData = '';
              this.RootDebateDetails.hastags.forEach(x => {
                this.RootDebateDetails.hastagData += ('#' + x + ', ');
              });
            }
            this.apiService.imageExists(environment.apiUrl + this.RootDebateDetails.user_avatar, (exists) => {
              if (exists) {
                this.usercroppedImage = environment.apiUrl + this.RootDebateDetails.user_avatar;
              }
            });
            this.apiService.imageExists(environment.apiUrl + this.RootDebateDetails.cover_image, (exists) => {
              if (exists) {
                this.coverCroppedImage = environment.apiUrl + this.RootDebateDetails.cover_image;
              }
            });
          }
        }
      );
    };

    this.socketService.listen('admin_debate_new_request').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          if (id == data.debate_id) {
            this.notifyService.showInfo(data.message);
            this.ngOnInit();
            this.ngAfterViewInit();
          }
        }
      }
    });
    this.socketService.listen('admin_debate_leave_request').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          if (id == data.debate_id) {
            this.notifyService.showInfo(data.message);
            this.ngOnInit();
            this.ngAfterViewInit();
          }
        }
      }
    });
    this.socketService.listen('admin_debate_participate_accept').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          if (id == data.debate_id) {
            this.notifyService.showInfo(data.message);
            this.ngOnInit();
            this.ngAfterViewInit();
          }
        }
      }
    });
    this.socketService.listen('admin_debate_participate_remove').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          if (id == data.debate_id) {
            this.notifyService.showInfo(data.message);
            this.ngOnInit();
            this.ngAfterViewInit();
          }
        }
      }
    });
    this.socketService.listen('admin_debate_participate_reject').subscribe(data => {
      if (data && data != '') {
        if (data.message && data.message != '') {
          if (id == data.debate_id) {
            this.notifyService.showInfo(data.message);
            this.ngOnInit();
            this.ngAfterViewInit();
          }
        }
      }
    });
  };

  ngAfterViewInit(): void {
    const id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (id) {
      var data = {
        debate_id: id,
        status: 0,
        skip: this.pending_skip,
        limit: this.limit
      };
      this.apiService.CommonApi(Apiconfig.debateDetails.method, Apiconfig.debateDetails.url, data).subscribe(
        (result) => {
          if (result && result.status) {
            this.pendingRequestList = result.data ? result.data.userData : [];
            this.pendingRequestCount = result.data ? result.data.count : 0;
          }
        }, (error) => {
          console.log(error);
        }
      );
      var data1 = {
        debate_id: id,
        status: 1,
        skip: this.accept_skip,
        limit: this.limit
      };
      this.apiService.CommonApi(Apiconfig.debateDetails.method, Apiconfig.debateDetails.url, data1).subscribe(
        (result) => {
          if (result && result.status) {
            this.acceptRequestList = result.data ? result.data.userData : [];
            this.acceptRequestCount = result.data ? result.data.count : 0;
          }
        }, (error) => {
          console.log(error);
        }
      );

      var data2 = {
        debate_id: id,
        status: 2,
        skip: this.reject_skip,
        limit: this.limit
      };
      this.apiService.CommonApi(Apiconfig.debateDetails.method, Apiconfig.debateDetails.url, data2).subscribe(
        (result) => {
          if (result && result.status) {
            this.rejectRequestList = result.data ? result.data.userData : [];
            this.rejectRequestCount = result.data ? result.data.count : 0;
          }
        }, (error) => {
          console.log(error);
        }
      );

    }
  }

}
