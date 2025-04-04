import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { UserService, User } from '../../services/user.service';
import { UserRoles } from '../../models/user.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatMenuModule
  ],
  templateUrl: './employees-page.component.html',
  styleUrls: ['./employees-page.component.scss']
})
export class EmployeesPageComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  displayedColumns: string[] = ['photo', 'name', 'phone', 'role'];
  searchTerm: string = '';
  roles = Object.values(UserRoles);
  isLoading: boolean = false;
  serverUrl: string = 'http://localhost:3000'; // URL сервера для полного пути к изображениям
  private refreshSubscription: Subscription | null = null;

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadUsers();

    // Устанавливаем интервал обновления данных каждые 30 секунд
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    // Отписываемся при уничтожении компонента
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка при загрузке пользователей', error);
        this.snackBar.open('Не удалось загрузить список пользователей', 'Закрыть', {
          duration: 3000
        });
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredUsers = [...this.users];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.firstName.toLowerCase().includes(searchTermLower) ||
      user.lastName.toLowerCase().includes(searchTermLower) ||
      (user.middleName && user.middleName.toLowerCase().includes(searchTermLower)) ||
      (user.phone && user.phone.includes(searchTermLower))
    );
  }

  updateUserRole(user: User, newRole: string): void {
    if (!user || !newRole) return;

    // Если роль такая же, ничего не делать
    if (user.role === newRole) return;

    this.isLoading = true;
    this.userService.updateUserRole(user._id, newRole).subscribe({
      next: () => {
        // Обновляем роль в локальном списке
        const userIndex = this.users.findIndex(u => u._id === user._id);
        if (userIndex >= 0) {
          this.users[userIndex].role = newRole;
          this.applyFilter();
        }

        this.snackBar.open('Роль успешно обновлена', 'Закрыть', {
          duration: 3000
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка при обновлении роли', error);
        this.snackBar.open('Не удалось обновить роль пользователя', 'Закрыть', {
          duration: 3000
        });
        this.isLoading = false;
      }
    });
  }

  translateRole(role: string): string {
    const roleTranslations: {[key: string]: string} = {
      [UserRoles.EMPLOYEE]: 'Сотрудник',
      [UserRoles.SUPPLY_SPECIALIST]: 'Специалист снабжения',
      [UserRoles.MANAGER]: 'Менеджер',
      [UserRoles.ADMIN]: 'Администратор'
    };

    return roleTranslations[role] || 'Неизвестная роль';
  }

  getUserFullName(user: User): string {
    return `${user.lastName} ${user.firstName}${user.middleName ? ' ' + user.middleName : ''}`;
  }

  isRoleChangeAllowed(user: User, newRole: string): boolean {
    const currentUserData = this.userService.getUserData();

    // Если текущий пользователь - менеджер, он не может назначать администраторов
    if (currentUserData?.role === UserRoles.MANAGER && newRole === UserRoles.ADMIN) {
      return false;
    }

    // Запрещаем изменять роль администраторов для менеджеров
    return !(currentUserData?.role === UserRoles.MANAGER && user.role === UserRoles.ADMIN);
  }

  // Получаем список доступных ролей, исключая текущую
  getAvailableRoles(user: User): string[] {
    return this.roles.filter(role => role !== user.role);
  }

  // Проверяем, можно ли отображать селектор смены роли для пользователя
  canShowRoleSelector(user: User): boolean {
    const currentUserData = this.userService.getUserData();

    // Если текущий пользователь - администратор, найдем его через API
    if (currentUserData?.role === UserRoles.ADMIN) {
      // Проверяем, является ли текущий пользователь этим администратором
      // сравнивая имя, фамилию и отчество
      if (currentUserData.firstName === user.firstName &&
          currentUserData.lastName === user.lastName &&
          currentUserData.middleName === user.middleName) {
        return false;
      }
    }

    return true;
  }

  formatPhoneNumber(phone?: string): string {
    if (!phone) return '';

    // Форматируем номер телефона как +7 (XXX) XXX-XX-XX
    if (phone.length === 11 && phone.startsWith('7')) {
      return `+7 (${phone.substring(1, 4)}) ${phone.substring(4, 7)}-${phone.substring(7, 9)}-${phone.substring(9, 11)}`;
    }

    return phone;
  }

  getInitials(user: User): string {
    let initials = '';

    if (user.firstName) {
      initials += user.firstName.charAt(0);
    }

    if (user.lastName) {
      initials += user.lastName.charAt(0);
    }

    return initials.toUpperCase();
  }

  getProfileImageUrl(profilePhoto?: string | null): string {
    if (!profilePhoto) return '';

    // Добавляем случайное число к URL изображения, чтобы сбросить кэш браузера
    const cacheBuster = `?t=${new Date().getTime()}`;
    return this.serverUrl + profilePhoto + cacheBuster;
  }

  refreshUsersList(): void {
    // Дополнительный метод для явного обновления данных с обратной связью
    this.snackBar.open('Обновление списка сотрудников...', '', {
      duration: 1000
    });
    this.loadUsers();
  }

  // Получаем класс CSS для роли
  getRoleClass(role: string): string {
    switch(role) {
      case UserRoles.EMPLOYEE:
        return 'role-EMPLOYEE';
      case UserRoles.SUPPLY_SPECIALIST:
        return 'role-SUPPLY_SPECIALIST';
      case UserRoles.MANAGER:
        return 'role-MANAGER';
      case UserRoles.ADMIN:
        return 'role-ADMIN';
      default:
        return 'role-EMPLOYEE';
    }
  }
}
