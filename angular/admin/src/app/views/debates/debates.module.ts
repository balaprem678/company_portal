import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DebatesRoutingModule } from './debates-routing.module';
import { DebatelistComponent } from './debatelist/debatelist.component';
import { DebateviewComponent } from './debateview/debateview.component';
import { DebatesComponent } from './debates.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { TabsModule } from 'ngx-bootstrap/tabs';


@NgModule({
  declarations: [
    DebatelistComponent,
    DebateviewComponent,
    DebatesComponent
  ],
  imports: [
    CommonModule,
    DebatesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CommonTableModule,
    TabsModule.forRoot(),
  ]
})
export class DebatesModule { }
