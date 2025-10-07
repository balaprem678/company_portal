import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { Apiconfig } from 'src/app/_helpers/api-config';

@Component({
  selector: 'app-add-invoice',
  templateUrl: './add-invoice.component.html',
  styleUrls: ['./add-invoice.component.scss']
})
export class AddInvoiceComponent implements OnInit {
  submitted = false;
  today: string = '';
  showItemModal = false;
  invoiceId: string | null = null; // <-- for edit mode
  isEditMode = false;

  // Form values
  invoiceForm: any = {
    invoiceNo: '',
    date: '',
    dueDate: '',
    clientName: '',
    remarks: '',
    paymentDetails: {
      bankName: '',
      accountNo: ''
    },
    items: [],
    totalAmount: 0
  };

  // Clients dropdown
  clientOptions: string[] = ['Acme Corp', 'Globex Inc', 'Soylent LLC', 'Umbrella Ltd'];

  // Temporary item form
  itemForm: any = {
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0
  };

  constructor(
    private apiService: ApiService,
    private notification: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const d = new Date();
    this.today = d.toISOString().substring(0, 10);
    this.invoiceForm.date = this.today;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.invoiceId = params.get('id');
      if (this.invoiceId) {
        this.isEditMode = true;
        this.getInvoiceDetails(this.invoiceId);
      }
    });
  }

  // ✅ Fetch invoice for editing
  getInvoiceDetails(id: string) {
    this.apiService.CommonApi(
      Apiconfig.viewInvoice.method,
      Apiconfig.viewInvoice.url,{id}
      
    ).subscribe((res: any) => {
      if (res.status && res.data) {
        this.invoiceForm = res.data;
        // convert dates to yyyy-mm-dd format for input type="date"
        this.invoiceForm.date = new Date(this.invoiceForm.date).toISOString().substring(0, 10);
        this.invoiceForm.dueDate = new Date(this.invoiceForm.dueDate).toISOString().substring(0, 10);
        this.calculateTotalAmount();
      } else {
        this.notification.showError(res.message || 'Failed to load invoice');
        this.router.navigate(['/app/invoice']);
      }
    });
  }

  // ✅ Calculate item total dynamically
  updateItemTotal() {
    this.itemForm.total = this.itemForm.quantity * this.itemForm.unitPrice;
  }

  // ✅ Add item to invoice
  addItem() {
    if (!this.itemForm.description || this.itemForm.quantity < 1 || this.itemForm.unitPrice <= 0) {
      this.notification.showError('Please fill item details correctly');
      return;
    }
    this.invoiceForm.items.push({ ...this.itemForm });
    this.calculateTotalAmount();
    this.closeItemModal();
  }

  // ✅ Remove item
  deleteItem(index: number) {
    this.invoiceForm.items.splice(index, 1);
    this.calculateTotalAmount();
  }

  // ✅ Recalculate invoice total
  calculateTotalAmount() {
    this.invoiceForm.totalAmount = this.invoiceForm.items.reduce(
      (sum, item) => sum + item.total,
      0
    );
  }

  // ✅ Submit invoice (Add or Update)
 submitForm(form: any) {
  this.submitted = true;

  if (form.valid && this.invoiceForm.items.length > 0) {
    // --- Save or Update Invoice ---
    const payload = { ...this.invoiceForm };
    
    // Include _id only if updating
    if (this.isEditMode && this.invoiceId) {
      payload._id = this.invoiceId;
    }

    this.apiService.CommonApi(
      Apiconfig.addInvoice.method, // Use the same API
      Apiconfig.addInvoice.url,
      payload
    ).subscribe((res: any) => {
      if (res.status) {
        this.notification.showSuccess(
          this.isEditMode ? 'Invoice updated successfully' : 'Invoice created successfully'
        );

        if (this.isEditMode) {
          this.router.navigate(['/app/invoice/list']); // Back to list after update
        } else {
          form.resetForm();
          this.invoiceForm = {
            invoiceNo: '',
            date: this.today,
            dueDate: '',
            clientName: '',
            remarks: '',
            paymentDetails: { bankName: '', accountNo: '' },
            items: [],
            totalAmount: 0
          };
          this.submitted = false;
        }
      } else {
        this.notification.showError(res.message || 'Error saving invoice');
      }
    });

  } else {
    this.notification.showError('Please fill all required fields and add at least one item');
  }
}


  // ✅ Modal controls
  openItemModal() {
    this.showItemModal = true;
    this.itemForm = { description: '', quantity: 1, unitPrice: 0, total: 0 };
  }

  closeItemModal() {
    this.showItemModal = false;
  }
}
