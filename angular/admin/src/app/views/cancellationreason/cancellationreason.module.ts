import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CancellationreasonRoutingModule } from './cancellationreason-routing.module';
import { CancellationlistComponent } from './cancellationlist/cancellationlist.component';
import { CancellationaddeditComponent } from './cancellationaddedit/cancellationaddedit.component';
import { CommonTableModule } from 'src/app/common-table/common-table.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CancellationviewComponent } from './cancellationview/cancellationview.component';

@NgModule({
  declarations: [
    CancellationlistComponent,
    CancellationaddeditComponent,
    CancellationviewComponent
  ],
  imports: [
    CommonModule,
    CancellationreasonRoutingModule,
    CommonTableModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class CancellationreasonModule { }
