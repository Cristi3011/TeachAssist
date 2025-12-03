import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { Home } from './home/home';
import { StudentCourses } from './student-courses/student-courses';
import { ProfessorCourses } from './professor-courses/professor-courses';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'student', component: StudentCourses },
  { path: 'professor', component: ProfessorCourses },
  { path: '', component: Home },
];
