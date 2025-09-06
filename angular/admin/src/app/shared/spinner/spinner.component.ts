import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SpinnerService } from './spinner.service';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent implements OnInit {

  spinner: string = 'none';

  constructor(
    private spinnerservice: SpinnerService,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.spinnerservice.getMessage().subscribe((result: any) => {
      this.spinner = result;
      this.cdRef.detectChanges();
    })
  }
}
