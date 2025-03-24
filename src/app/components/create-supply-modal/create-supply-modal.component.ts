import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { SupplyRequest, SupplyItem } from '../../services/supply.service';

@Component({
	selector: 'app-create-supply-modal',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		MatDatepickerModule,
		MatInputModule,
		MatFormFieldModule,
		MatNativeDateModule,
		MatButtonModule,
		MatButtonToggleModule,
		MatIconModule,
		MatListModule,
		MatSelectModule
	],
	templateUrl: './create-supply-modal.component.html',
	styleUrls: ['./create-supply-modal.component.scss']
})
export class CreateSupplyModalComponent {
	@Output() close = new EventEmitter<void>();
	@Output() create = new EventEmitter<Omit<SupplyRequest, 'id'>>();

	today = new Date();
	minDate = new Date();

	constructor() {
		this.minDate.setHours(0, 0, 0, 0);
		this.today.setHours(0, 0, 0, 0);
	}

	formData: {
		title: string;
		description: string;
		items: SupplyItem[];
		priority: 'low' | 'medium' | 'high';
		deadline: Date | null;
	} = {
			title: '',
			description: '',
			items: [],
			priority: 'medium',
			deadline: null
		};

	newItem: SupplyItem = {
		name: '',
		quantity: 1,
		unit: 'шт'
	};

	priorities = [
		{ value: 'low', label: 'Низкий' },
		{ value: 'medium', label: 'Средний' },
		{ value: 'high', label: 'Высокий' }
	];

	units = [
		{ value: 'шт', label: 'штук' },
		{ value: 'кг', label: 'килограмм' },
		{ value: 'л', label: 'литров' },
		{ value: 'м', label: 'метров' },
		{ value: 'уп', label: 'упаковок' }
	];

	get isFormValid(): boolean {
		return !!(
			this.formData.title &&
			this.formData.deadline &&
			this.formData.items.length > 0
		);
	}

	closeModal() {
		this.close.emit();
	}

	addItem() {
		if (this.newItem.name && this.newItem.quantity > 0) {
			this.formData.items.push({ ...this.newItem });
			this.newItem = {
				name: '',
				quantity: 1,
				unit: 'шт'
			};
		}
	}

	removeItem(index: number) {
		this.formData.items.splice(index, 1);
	}

	createSupply() {
		if (this.isFormValid) {
			if (this.formData.deadline && this.formData.deadline < this.minDate) {
				return;
			}

			// Устанавливаем время на конец дня в UTC
			const deadline = new Date(this.formData.deadline!);
			const utcDeadline = new Date(Date.UTC(
				deadline.getFullYear(),
				deadline.getMonth(),
				deadline.getDate(),
				23, 59, 59, 999
			));

			const formattedData = {
				...this.formData,
				status: 'new' as const,
				deadline: utcDeadline.toISOString()
			};
			this.create.emit(formattedData);
		}
	}

	filterDate = (date: Date | null): boolean => {
		if (!date) return false;
		return date >= this.minDate;
	}
} 