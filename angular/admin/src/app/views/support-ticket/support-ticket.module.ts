import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SupportTicketRoutingModule } from './support-ticket-routing.module';
import { SupportTicketComponent } from './support-ticket.component';
import { ListComponent } from './list/list.component';
import { ViewComponent } from './view/view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonTableModule } from 'src/app/common-table/common-table.module';


@NgModule({
  declarations: [
    SupportTicketComponent,
    ListComponent,
    ViewComponent
  ],
  imports: [
    CommonModule,
    SupportTicketRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonTableModule,
  ]
})
export class SupportTicketModule { }
