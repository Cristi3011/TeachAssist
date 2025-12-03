import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-professor-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './professor-courses.html',
  styleUrls: ['./professor-courses.scss'],
})
export class ProfessorCourses {
  courseTitle = '';

  get courses() {
    try {
      return JSON.parse(localStorage.getItem('teachassist_courses') || '[]');
    } catch {
      return [];
    }
  }

  addCourse() {
    if (!this.courseTitle.trim()) return alert('Enter a title');
    const list = this.courses;
    list.unshift({ title: this.courseTitle.trim(), created: new Date().toISOString() });
    localStorage.setItem('teachassist_courses', JSON.stringify(list));
    this.courseTitle = '';
    alert('Course added (local demo)');
  }
}
