import { Component } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { Apiconfig } from 'src/app/_helpers/api-config';

@Component({
  selector: 'app-add-invoice',
  templateUrl: './add-invoice.component.html',
  styleUrls: ['./add-invoice.component.scss']
})
export class AddInvoiceComponent {
  submitted = false;
  today: string = '';
  showItemModal = false;

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
    private notification: NotificationService
  ) {
    const d = new Date();
    this.today = d.toISOString().substring(0, 10);
    this.invoiceForm.date = this.today;
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

  // ✅ Submit invoice
  submitForm(form: any) {
    this.submitted = true;
    if (form.valid && this.invoiceForm.items.length > 0) {
      this.apiService.CommonApi(
        Apiconfig.addInvoice.method,
        Apiconfig.addInvoice.url,
        this.invoiceForm
      ).subscribe((res: any) => {
        if (res.status) {
          this.notification.showSuccess('Invoice created successfully');
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
