import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertService } from '../shared/alert.service';

@Component({
  selector: 'app-course-students',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-students.html',
  styleUrls: ['./course-students.scss'],
})
export class CourseStudents {
  courseId = 0;
  loading = false;
  error: string | null = null;
  courseTitle = '';
  acceptedStudents: Array<{ id: number; username: string; studentEmail: string; created_at: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private alerts: AlertService,
  ) {
    this.route.paramMap.subscribe((params) => {
      this.courseId = Number(params.get('id') || 0);
      if (!this.courseId) {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.loadPage();
    });
  }

  async loadPage() {
    this.loading = true;
    this.error = null;
    try {
      await Promise.all([this.loadCourse(), this.loadAcceptedStudents()]);
    } catch (err: any) {
      this.error = err?.message || 'Nu am putut incarca studentii cursului.';
      this.alerts.error(this.error || 'Nu am putut incarca studentii cursului.');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private async loadCourse() {
    const res = await fetch(`http://localhost:3000/courses/${this.courseId}`);
    const data = await res.json();
    if (!res.ok || !data?.id) throw new Error(data?.message || 'Cursul nu a fost gasit');
    this.courseTitle = (data?.title || '').toString();
  }

  private async loadAcceptedStudents() {
    const res = await fetch(`http://localhost:3000/enrollments/course?courseId=${this.courseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Nu am putut incarca studentii');

    const rows = Array.isArray(data) ? data : [];
    this.acceptedStudents = rows
      .filter((r: any) => (r?.status || '').toString().toLowerCase() === 'accepted')
      .map((r: any) => {
        const studentEmail = (r?.studentEmail || '').toString();
        const username = (studentEmail.split('@')[0] || studentEmail).trim();
        return {
          id: Number(r?.id || 0),
          username,
          studentEmail,
          created_at: (r?.created_at || '').toString(),
        };
      });
  }

  trackById(_: number, item: { id: number }) {
    return item.id;
  }
}
