import { Component, ElementRef, ViewChild } from '@angular/core';
import html2pdf from 'html2pdf.js';

interface MaintenanceRecord {
  date: string;
  vehicleNo: string;
  driverName: string;
  type: string;
  parts: string;
  cost: number;
  remarks: string;
}
@Component({
  selector: 'app-maintenance-list',
  templateUrl: './maintenance-list.component.html',
  styleUrls: ['./maintenance-list.component.scss']
})
export class MaintenanceListComponent {
  @ViewChild('maintenanceTable', { static: false }) maintenanceTable!: ElementRef;

  // Filters
  searchVehicle: string = '';
  searchDriver: string = '';
  filterType: string = '';
  filterPart: string = '';
  startDate: string = '';
  endDate: string = '';
  sortBy: string = '';

  // Dummy Data
  records: MaintenanceRecord[] = [
    { date: '2025-09-01', vehicleNo: 'KA-01-AB-1234', driverName: 'John Smith', type: 'Serviced', parts: 'Engine Oil', cost: 1500, remarks: 'Regular service' },
    { date: '2025-09-03', vehicleNo: 'KA-01-AB-5678', driverName: 'Mary Johnson', type: 'Repaired', parts: 'Brake Pads', cost: 2200, remarks: 'Front pads replaced' },
    { date: '2025-09-05', vehicleNo: 'KA-02-XY-1111', driverName: 'David Lee', type: 'Replaced', parts: 'Front Tyres', cost: 8000, remarks: 'Worn-out tyres' }
  ];

  // Filter + Sort
  get filteredRecords() {
    let data = [...this.records];

    if (this.searchVehicle) {
      data = data.filter(d => d.vehicleNo.toLowerCase().includes(this.searchVehicle.toLowerCase()));
    }
    if (this.searchDriver) {
      data = data.filter(d => d.driverName.toLowerCase().includes(this.searchDriver.toLowerCase()));
    }
    if (this.filterType) {
      data = data.filter(d => d.type === this.filterType);
    }
    if (this.filterPart) {
      data = data.filter(d => d.parts === this.filterPart);
    }
    if (this.startDate && this.endDate) {
      data = data.filter(d => d.date >= this.startDate && d.date <= this.endDate);
    }

    if (this.sortBy === 'dateAsc') data.sort((a, b) => a.date.localeCompare(b.date));
    if (this.sortBy === 'dateDesc') data.sort((a, b) => b.date.localeCompare(a.date));
    if (this.sortBy === 'vehicle') data.sort((a, b) => a.vehicleNo.localeCompare(b.vehicleNo));
    if (this.sortBy === 'driver') data.sort((a, b) => a.driverName.localeCompare(b.driverName));
    if (this.sortBy === 'costAsc') data.sort((a, b) => a.cost - b.cost);
    if (this.sortBy === 'costDesc') data.sort((a, b) => b.cost - a.cost);

    return data;
  }

  // Export as PDF
  downloadPDF() {
    const element = this.maintenanceTable.nativeElement;
    const opt = {
      margin: 0.5,
      filename: 'maintenance-records.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
  }
}