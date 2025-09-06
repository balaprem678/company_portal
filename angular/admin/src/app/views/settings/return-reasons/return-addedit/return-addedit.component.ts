import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-return-addedit',
  templateUrl: './return-addedit.component.html',
  styleUrls: ['./return-addedit.component.scss']
})
export class ReturnAddeditComponent {
  @ViewChild('returnReasonForm') form: NgForm;
  
  submitebtn: boolean=false;
  onFormSubmit(data:any){
    
    console.log("form submit data is shown here");
    console.log(data.valid)
    console.log(data.value)
    this.submitebtn = true;
  } 
}
