export interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  profilePhoto?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRoles {
  EMPLOYEE = 'EMPLOYEE',
  SUPPLY_SPECIALIST = 'SUPPLY_SPECIALIST',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
} 