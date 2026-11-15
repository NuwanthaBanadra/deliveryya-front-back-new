export interface EmployeeOption {
  id: string;
  name: string;
  mobile: string;
}

export interface EmployeeSelectOption {
  value: string;
  label: string;
}

export interface JobTask {
  id: number;
  task: string;
  location: string;
  isComplete: boolean;
  beAt: string;
}

export interface Employee {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  mobile: string;
  whatsapp?: string;
}

export interface CreatedByUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AssignmentRecord {
  id: number;
  task: string;
  accepted: boolean | null;
  createdAt: string;
  updatedAt: string;
  tasks: JobTask[];
  employee: Employee;
  createdByUser: CreatedByUser;
  urgentJob: unknown | null;
}

// Legacy interface for backward compatibility with employee map lookup
export interface LegacyAssignmentRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  createdByName: string;
  mobile: string;
  task: string;
  goTo: string;
  deliverTo: string;
  assignedAt: string;
  accepted: boolean | null;
}

export type DateFilter = 'today' | 'yesterday' | 'lastWeek' | 'lastMonth';
