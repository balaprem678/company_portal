import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-debatesettings',
  templateUrl: './debatesettings.component.html',
  styleUrls: ['./debatesettings.component.scss']
})
export class DebatesettingsComponent implements OnInit {

  @ViewChild('debateSettingForm') form: NgForm;
  submitebtn: boolean = false;
  durationList: any[] = [];
  @ViewChild('durationtag') durationInput: ElementRef;

  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService,
    private cd: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.apiService.CommonApi(Apiconfig.getSetting.method, Apiconfig.getSetting.url + 'debate', {}).subscribe(
      (result) => {
        if (result && result.status == 1) {
          this.durationList = result.data.settings ? (result.data.settings.duration ? result.data.settings.duration : []) : [];
          this.durationList.sort(function (a, b) {
            return a.value - b.value;
          });
          this.form.form.controls['leave_req_before_start_time'].setValue(result.data.settings ? (result.data.settings.leave_req_before_start_time ? result.data.settings.leave_req_before_start_time : 0) : 0)
          this.form.form.controls['before_start_time'].setValue(result.data.settings ? (result.data.settings.before_start_time ? result.data.settings.before_start_time : 0) : 0)
          this.form.form.controls['trending_debates'].setValue(result.data.settings ? (result.data.settings.trending_debates ? result.data.settings.trending_debates : 0) : 0)
          this.form.form.controls['recent_debate'].setValue(result.data.settings ? (result.data.settings.recent_debate ? result.data.settings.recent_debate : 0) : 0)
        };
      },
      (error) => {
        console.log(error);
      }
    )
  }
  durationmin(e) {
    if (e.which == 44 || e.which == 32) {
      var val = e.target.value;
      if (val != '' && val > 0) {
        if (this.durationList && this.durationList.length < 4) {
          if (this.durationList.filter(x => x.value == val).length > 0) {
            this.notifyService.showError('Value at This Time Already Exists');
            return
          }
          this.durationList.push({ name: val + ' mins', value: val });
          this.durationInput.nativeElement.value = '';
          this.cd.detectChanges();
        } else {
          this.notifyService.showError('4 Items only add');
        }
      } else {
        this.notifyService.showError('Please enter valid time');
      }
    }
  }
  clearitem(index) {
    this.durationList.splice(index, 1);
  }

  reloadComponent() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() =>
      this.router.navigate([currentUrl]));
  }

  public onFormSubmit() {
    if (this.durationList && this.durationList.length > 0 && this.form.valid) {
      var data = {
        settings: {
          duration: this.durationList,
          leave_req_before_start_time: this.form.form.value.leave_req_before_start_time ? this.form.form.value.leave_req_before_start_time : 0,
          before_start_time: this.form.form.value.before_start_time ? this.form.form.value.before_start_time : 0,
          trending_debates: this.form.form.value.trending_debates ? this.form.form.value.trending_debates : 0,
          recent_debate:this.form.form.value.recent_debate ? this.form.form.value.recent_debate : 0,
        }
      };

      this.apiService.CommonApi(Apiconfig.debateSettingSave.method, Apiconfig.debateSettingSave.url, data).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.reloadComponent();
            this.notifyService.showSuccess(result.message);
          } else {
            this.notifyService.showError(result.message);
          }
          this.submitebtn = false;
        }, (error) => {
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all fields');
    }
  }
}
