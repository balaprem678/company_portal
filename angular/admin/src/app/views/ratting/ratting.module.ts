import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RattingRoutingModule } from './ratting-routing.module';
import { RattingComponent } from './ratting.component';
import { RattingQuesComponent } from './ratting-ques/ratting-ques.component';
import { RattingQuesAddeditComponent } from './ratting-ques-addedit/ratting-ques-addedit.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonTableModule } from 'src/app/common-table/common-table.module';


@NgModule({
  declarations: [
    RattingComponent,
    RattingQuesComponent,
    RattingQuesAddeditComponent
  ],
  imports: [
    CommonModule,
    RattingRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class RattingModule { }
