import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { Home } from './home/home';
import { Dashboard } from './dashboard/dashboard';
import { CourseDetails } from './course-details/course-details';
import { AttendanceMark } from './attendance/attendance';
import { CourseStudents } from './course-students/course-students';
import { Admin } from './admin/admin';
import { AssignmentDetails } from './assignment-details/assignment-details';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard/course/:id', component: CourseDetails },
  { path: 'dashboard/course/:courseId/assignment/:assignmentId', component: AssignmentDetails },
  { path: 'dashboard/course/:id/students', component: CourseStudents },
  { path: 'dashboard', component: Dashboard },
  { path: 'attendance/mark', component: AttendanceMark },
  { path: 'admin', component: Admin },
  { path: '', component: Home },
];
