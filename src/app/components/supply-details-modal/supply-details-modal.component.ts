import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyRequest, SupplyStatus, SupplyItem } from '../../services/supply.service';
import { CommentService, Comment } from '../../services/comment.service';
import { UserService } from '../../services/user.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-supply-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supply-details-modal.component.html',
  styleUrls: ['./supply-details-modal.component.scss']
})
export class SupplyDetailsModalComponent implements OnInit, OnDestroy {
  @Input() data!: SupplyRequest;
  @Output() close = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<{ id: string; status: SupplyStatus; callback?: (success: boolean) => void }>();
  @Output() itemUpdate = new EventEmitter<{ id: string; items: SupplyItem[]; callback?: (success: boolean) => void }>();

  statuses = [
    { value: 'new', label: 'Новая' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'completed', label: 'Выполнена' },
    { value: 'cancelled', label: 'Отменена' }
  ];

  comments: Comment[] = [];
  newComment: string = '';
  currentUser: any = null;
  private commentSubscription?: Subscription;
  private supplyUpdateSubscription?: Subscription;

  constructor(
    private commentService: CommentService,
    private userService: UserService,
    private websocketService: WebsocketService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadComments();
    this.currentUser = this.userService.getUserData();
    
    const supplyId = this.data.id || this.data._id;
    if (supplyId) {
      this.websocketService.joinSupply(supplyId);
      
      this.commentSubscription = this.websocketService.onNewComment().subscribe(comment => {
        this.ngZone.run(() => {
          if (comment.supplyId.toString() === supplyId.toString()) {
            this.comments = [...this.comments, comment];
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
          this.comments = comments;
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

  onItemPurchasedChange(index: number, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const itemId = this.data.id || this.data._id;
    
    if (this.data && itemId) {
      if (this.data.status !== 'in_progress') {
        event.preventDefault();
        alert('Для отметки о покупке предметов переведите заявку в статус "В работе"');
        return;
      }

      this.data.items[index].purchased = checkbox.checked;
      const updatedItems = this.data.items.map(item => ({ ...item }));
      
      this.itemUpdate.emit({ 
        id: itemId, 
        items: updatedItems,
        callback: (success: boolean) => {
          if (!success) {
            this.data.items[index].purchased = !checkbox.checked;
          }
        }
      });
    }
  }
} 