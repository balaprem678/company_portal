import { Component } from '@angular/core';

@Component({
  selector: 'app-return-reason',
  templateUrl: './return-reason.component.html',
  styleUrls: ['./return-reason.component.scss']
})
export class ReturnReasonComponent {
  submitebtn: boolean=false;
  

  onFormSubmit(data:any){
    console.log("form submit data is shown here");
    console.log(data.valid)
    console.log(data.value)
    this.submitebtn = true;
  } 
}
