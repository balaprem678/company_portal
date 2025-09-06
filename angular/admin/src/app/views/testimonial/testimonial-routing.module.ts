import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddEditTestimonialComponent } from './add-edit-testimonial/add-edit-testimonial.component';
import { ListTestimonialComponent } from './list-testimonial/list-testimonial.component';
const routes: Routes = [

  {
    path: 'add',
    component: AddEditTestimonialComponent,
    data: {
      title: 'Add',
    },
    // canActivate: [AuthGuard]
  },
  {
    path: 'edit/:id',
    component: AddEditTestimonialComponent,
    data: {
      title: 'Add',
    },
  },
  {
    path: 'list',
    component: ListTestimonialComponent,
    data: {
      title: 'List',
    },
    // canActivate: [AuthGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TestimonialRoutingModule { }
