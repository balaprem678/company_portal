import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContractsRoutingModule } from './contracts-routing.module';
import { AddContractsComponent } from './add-contracts/add-contracts.component';
import { ListContractsComponent } from './list-contracts/list-contracts.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
  
  
    AddContractsComponent,
          ListContractsComponent
  ],
  imports: [
    CommonModule,
    ContractsRoutingModule,
    FormsModule,
        ReactiveFormsModule,
        NgSelectModule
  ]
})
export class ContractsModule { }
