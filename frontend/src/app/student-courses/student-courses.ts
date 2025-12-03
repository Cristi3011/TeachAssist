import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-student-courses',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-courses.html',
  styleUrls: ['./student-courses.scss'],
})
export class StudentCourses {
  get courses() {
    try {
      return JSON.parse(localStorage.getItem('teachassist_courses') || '[]');
    } catch {
      return [];
    }
  }

  enroll(course: any) {
    const enrollments = JSON.parse(localStorage.getItem('teachassist_enrollments') || '[]');
    enrollments.push({ course: course.title, date: new Date().toISOString() });
    localStorage.setItem('teachassist_enrollments', JSON.stringify(enrollments));
    alert('Enrolled (local demo)');
  }
}
