import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule, MatCheckboxChange } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupplyRequest, SupplyStatus, SupplyItem, SupplyService } from '../../services/supply.service';
import { CommentService, Comment } from '../../services/comment.service';
import { UserService } from '../../services/user.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';
import { UserRoles } from '../../models/user.model';
import { environment } from '../../../environments/environment';

interface StatusOption {
  value: SupplyStatus;
  label: string;
}

@Component({
  selector: 'app-supply-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatChipsModule,
    MatIconModule,
    MatCheckboxModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './supply-details-modal.component.html',
  styleUrls: ['./supply-details-modal.component.scss']
})
export class SupplyDetailsModalComponent implements OnInit, OnDestroy {
  @Input() data!: SupplyRequest;
  @Input() userRole: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<{ id: string; status: SupplyStatus; callback?: (success: boolean) => void }>();
  @Output() itemUpdate = new EventEmitter<{ id: string; items: SupplyItem[]; callback?: (success: boolean) => void }>();
  @Output() duplicate = new EventEmitter<SupplyRequest>();
  @Output() edit = new EventEmitter<SupplyRequest>();
  @ViewChild('commentFileInput') commentFileInput!: ElementRef<HTMLInputElement>;

  statuses: StatusOption[] = [
    { value: 'new', label: 'Новая' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'completed', label: 'Выполнена' },
    { value: 'finalized', label: 'Завершена' },
    { value: 'cancelled', label: 'Отменена' }
  ];

  comments: Comment[] = [];
  newComment: string = '';
  currentUser: any = null;
  private commentSubscription?: Subscription;
  private supplyUpdateSubscription?: Subscription;
  uploadingCommentFile: boolean = false;
  apiUrl = environment.apiUrl;

  constructor(
    private commentService: CommentService,
    private userService: UserService,
    private websocketService: WebsocketService,
    private supplyService: SupplyService,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.loadComments();
    this.currentUser = this.userService.getUserData();

    const supplyId = this.data.id || this.data._id;
    if (supplyId) {
      this.websocketService.joinSupply(supplyId);

      this.commentSubscription = this.websocketService.onNewComment().subscribe(comment => {
        this.ngZone.run(() => {
          if (comment.supplyId.toString() === supplyId.toString()) {
            // Обрабатываем комментарий с помощью нашей функции
            const processedComment = this.processAttachmentName(comment);
            this.comments = [...this.comments, processedComment];
            this.scrollToBottom();
          }
        });
      });

      this.supplyUpdateSubscription = this.websocketService.onSupplyDetailsUpdate().subscribe(updatedSupply => {
        this.ngZone.run(() => {
          if (updatedSupply.id === supplyId || updatedSupply._id === supplyId) {
            if (updatedSupply.deleted) {
              this.closeModal();
            } else {
              this.data = updatedSupply;
            }
          }
        });
      });
    }
  }

  ngOnDestroy() {
    const supplyId = this.data.id || this.data._id;
    if (supplyId) {
      this.websocketService.leaveSupply(supplyId);
    }

    if (this.commentSubscription) {
      this.commentSubscription.unsubscribe();
    }

    if (this.supplyUpdateSubscription) {
      this.supplyUpdateSubscription.unsubscribe();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const commentsList = document.querySelector('.comments-list');
      if (commentsList) {
        commentsList.scrollTop = commentsList.scrollHeight;
      }
    });
  }

  loadComments() {
    const supplyId = this.data.id || this.data._id;
    if (supplyId) {
      this.commentService.getComments(supplyId).subscribe({
        next: (comments) => {
          // Обрабатываем полученные комментарии и исправляем имена файлов
          this.comments = comments.map(comment => this.processAttachmentName(comment));
          this.scrollToBottom();
        },
        error: () => {
          // Ошибка обработана в сервисе
        }
      });
    }
  }

  addComment() {
    if (!this.newComment.trim() || !this.currentUser) return;

    const supplyId = this.data.id || this.data._id;
    if (!supplyId) {
      alert('Не удалось определить ID заявки. Пожалуйста, обновите страницу и попробуйте снова.');
      return;
    }

    this.commentService.addComment(supplyId.toString(), this.newComment.trim()).subscribe({
      next: () => {
        this.newComment = '';
      },
      error: () => {
        alert('Не удалось добавить комментарий. Пожалуйста, попробуйте еще раз.');
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  onStatusChange(newStatus: SupplyStatus) {
    const itemId = this.data.id || this.data._id;
    if (this.data && itemId && newStatus !== this.data.status) {
      // Проверяем, имеет ли пользователь право на установку статуса "Завершена"
      if (newStatus === 'finalized' && !this.canSetFinalizedStatus) {
        alert('Только администратор или руководитель может установить статус "Завершена"');
        return;
      }

      // Проверяем, имеет ли пользователь право на отмену заявки
      if (newStatus === 'cancelled' && !this.canCancelSupply) {
        alert('Только администратор или руководитель может отменить заявку');
        return;
      }

      // Проверяем, меняется ли статус на "Новая" с "В работе"
      if (newStatus === 'new' && this.data.status === 'in_progress') {
        const hasPurchasedItems = this.data.items.some(item => item.purchased);
        let warningMessage = 'Вы уверены, что хотите изменить статус на "Новая"?';

        if (hasPurchasedItems) {
          warningMessage += '\n\nВнимание! В заявке есть отмеченные предметы. Изменение статуса может привести к потере прогресса.';
        } else {
          warningMessage += '\nЭто может привести к потере прогресса.';
        }

        const confirmed = confirm(warningMessage);
        if (!confirmed) {
          return;
        }
      }

      const previousStatus = this.data.status;
      this.data.status = newStatus;

      this.statusChange.emit({
        id: itemId,
        status: newStatus,
        callback: (success: boolean) => {
          if (!success) {
            this.data.status = previousStatus;
          }
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'new': return 'status-new';
      case 'in_progress': return 'status-progress';
      case 'completed': return 'status-completed';
      case 'finalized': return 'status-finalized';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Неизвестно';
  }

  getPriorityLabel(priority: string): string {
    const priorities: { [key: string]: string } = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return priorities[priority] || 'Неизвестно';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  onItemPurchasedChange(index: number, event: MatCheckboxChange) {
    const itemId = this.data.id || this.data._id;

    if (this.data && itemId) {
      if (this.data.status !== 'in_progress') {
        alert('Для отметки о покупке предметов переведите заявку в статус "В работе"');
        return;
      }

      this.data.items[index].purchased = event.checked;
      const updatedItems = this.data.items.map(item => ({ ...item }));

      this.itemUpdate.emit({
        id: itemId,
        items: updatedItems,
        callback: (success: boolean) => {
          if (!success) {
            this.data.items[index].purchased = !event.checked;
          }
        }
      });
    }
  }

  get canEditStatus(): boolean {
    return this.userRole === UserRoles.ADMIN ||
      this.userRole === UserRoles.MANAGER ||
      this.userRole === UserRoles.SUPPLY_SPECIALIST;
  }

  get canSetFinalizedStatus(): boolean {
    return this.userRole === UserRoles.ADMIN ||
      this.userRole === UserRoles.MANAGER;
  }

  get canCancelSupply(): boolean {
    return this.userRole === UserRoles.ADMIN ||
      this.userRole === UserRoles.MANAGER;
  }

  get isEmployee(): boolean {
    return this.userRole === UserRoles.EMPLOYEE;
  }

  // Функции для работы с вложениями в комментариях

  // Открыть диалог выбора файла для комментария
  openCommentFileSelector() {
    this.commentFileInput.nativeElement.click();
  }

  // Обработчик выбора файла для комментария
  onCommentFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Проверяем размер файла (7МБ = 7 * 1024 * 1024 байт)
      const maxSize = 7 * 1024 * 1024; // 7 МБ
      if (file.size > maxSize) {
        this.snackBar.open(`Размер файла превышает 7 МБ. Пожалуйста, выберите файл поменьше.`, 'Закрыть', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        // Очищаем input
        input.value = '';
        return;
      }

      this.uploadCommentFile(file);
    }
  }

  // Загрузка файла на сервер в комментарии
  uploadCommentFile(file: File) {
    const supplyId = this.data.id || this.data._id;
    if (!supplyId) {
      this.snackBar.open('Не удалось определить ID заявки', 'Закрыть', { duration: 3000 });
      return;
    }

    this.uploadingCommentFile = true;

    this.commentService.addCommentWithAttachment(supplyId.toString(), file, this.newComment.trim()).subscribe({
      next: () => {
        this.uploadingCommentFile = false;
        this.newComment = '';
        this.snackBar.open('Файл успешно загружен', 'Закрыть', { duration: 3000 });

        // Очищаем input для возможности повторной загрузки того же файла
        this.commentFileInput.nativeElement.value = '';
      },
      error: (error) => {
        this.uploadingCommentFile = false;

        // Проверяем, связана ли ошибка с превышением размера файла
        if (error.status === 413 || (error.error && error.error.message && error.error.message.includes('file size'))) {
          this.snackBar.open('Размер файла превышает допустимый лимит в 7 МБ', 'Закрыть', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        } else {
          this.snackBar.open('Ошибка при загрузке файла', 'Закрыть', { duration: 3000 });
        }

        console.error('Ошибка загрузки файла:', error);

        // Очищаем input
        this.commentFileInput.nativeElement.value = '';
      }
    });
  }

  // Получение полного URL файла
  getFileUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) {
      return url;
    }

    // Получаем базовый URL без /api части
    const baseUrl = this.apiUrl.substring(0, this.apiUrl.indexOf('/api'));

    // Для относительных путей просто добавляем базовый URL
    return `${baseUrl}/${url}`;
  }

  // Получение иконки для файла по его типу
  getFileIcon(type: string | undefined): string {
    if (!type) return 'insert_drive_file';

    if (type.includes('image')) {
      return 'image';
    } else if (type.includes('pdf')) {
      return 'picture_as_pdf';
    } else if (type.includes('word') || type.includes('document')) {
      return 'description';
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return 'table_chart';
    } else if (type.includes('presentation') || type.includes('powerpoint')) {
      return 'slideshow';
    } else if (type.includes('text')) {
      return 'text_snippet';
    } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return 'folder_zip';
    }

    return 'insert_drive_file';
  }

  // Форматирование размера файла
  formatFileSize(size: number | undefined): string {
    if (!size) return '';

    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  }

  // Вспомогательная функция для обработки имени файла
  private processAttachmentName(comment: Comment): Comment {
    if (comment.attachment) {
      // Получаем имя файла из URL
      const urlParts = comment.attachment.url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Проверяем, что имя файла выглядит как системное или содержит проблемные символы
      if (fileName.match(/^(pdf|doc|excel|image|text|archive|file)\d+\.[a-zA-Z0-9]+$/) ||
        /[\u0080-\uFFFF]/.test(comment.attachment.name) ||
        comment.attachment.name.includes('Ð')) {
        // Заменяем на системное имя файла
        console.log(`Заменяем проблемное имя файла: ${comment.attachment.name} на ${fileName}`);
        comment.attachment.name = fileName;
      }
    }
    return comment;
  }

  duplicateSupply() {
    this.duplicate.emit(this.data);
    this.closeModal();
  }

  editSupply() {
    this.edit.emit(this.data);
    this.closeModal();
  }
}
