import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SupplyRequest, SupplyStatus } from '../../models/supply-request.model';
import { SupplyService } from '../../services/supply.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-supply-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonToggleModule,
    MatSnackBarModule
  ],
  template: `
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal-content mat-elevation-z8" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="mat-headline-5">Редактирование заявки</h2>
          <button mat-icon-button class="close-button" (click)="closeModal()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <mat-form-field appearance="outline" color="primary">
              <mat-label>Название</mat-label>
              <input matInput type="text" [(ngModel)]="formData.title" name="title" required
                placeholder="Введите название заявки">
              <mat-error *ngIf="!formData.title">Название заявки обязательно</mat-error>
            </mat-form-field>
          </div>

          <div class="form-group">
            <mat-form-field appearance="outline" color="primary">
              <mat-label>Описание</mat-label>
              <textarea matInput [(ngModel)]="formData.description" name="description" 
                placeholder="Введите описание заявки" rows="6"></textarea>
            </mat-form-field>
          </div>

          <div class="form-group priority-toggle-group">
            <label>Приоритет заявки</label>
            <mat-button-toggle-group [(ngModel)]="formData.priority" name="priority" 
              aria-label="Приоритет заявки" hideSingleSelectionIndicator="true" class="buttons-toggle-group">
              <mat-button-toggle value="low" class="no-check-icon priority-low">
                <mat-icon>arrow_downward</mat-icon> Низкий
              </mat-button-toggle>
              <mat-button-toggle value="medium" class="no-check-icon priority-medium">
                <mat-icon>remove</mat-icon> Средний
              </mat-button-toggle>
              <mat-button-toggle value="high" class="no-check-icon priority-high">
                <mat-icon>arrow_upward</mat-icon> Высокий
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <div class="form-actions">
            <button mat-button type="button" (click)="closeModal()">Отмена</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="!formData.title">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      padding: 24px;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .priority-toggle-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .buttons-toggle-group {
      display: flex;
      gap: 8px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
    }

    .no-check-icon {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .priority-low {
      color: #4caf50;
    }

    .priority-medium {
      color: #ff9800;
    }

    .priority-high {
      color: #f44336;
    }
  `]
})
export class EditSupplyModalComponent implements OnInit {
  @Input() supply!: SupplyRequest;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SupplyRequest>();

  formData: Partial<SupplyRequest> = {};

  constructor(
    private supplyService: SupplyService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    if (this.supply) {
      this.formData = {
        title: this.supply.title,
        description: this.supply.description,
        priority: this.supply.priority
      };
    }
  }

  closeModal() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.formData.title) {
      return;
    }

    const supplyId = this.supply.id || this.supply._id;
    if (!supplyId) {
      this.snackBar.open('Ошибка: не удалось определить ID заявки', 'Закрыть', { duration: 3000 });
      return;
    }

    this.supplyService.updateSupplyRequest(supplyId, this.formData).subscribe({
      next: (updatedSupply) => {
        this.saved.emit(updatedSupply);
        this.closeModal();
        this.snackBar.open('Заявка успешно обновлена', 'Закрыть', { duration: 3000 });
      },
      error: (error) => {
        console.error('Ошибка при обновлении заявки:', error);
        this.snackBar.open('Ошибка при обновлении заявки', 'Закрыть', { duration: 3000 });
      }
    });
  }
} 