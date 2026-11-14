using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Data;

public partial class RoxyDbContext : DbContext
{
    public RoxyDbContext(DbContextOptions<RoxyDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Attendance> Attendances { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<Class> Classes { get; set; }

    public virtual DbSet<Course> Courses { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<Homework> Homeworks { get; set; }

    public virtual DbSet<HomeworkSubmission> HomeworkSubmissions { get; set; }

    public virtual DbSet<LeaveRequest> LeaveRequests { get; set; }

    public virtual DbSet<LessonProgress> LessonProgresses { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<Newsfeed> Newsfeeds { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<Schedule> Schedules { get; set; }

    public virtual DbSet<Student> Students { get; set; }

    public virtual DbSet<StudentClass> StudentClasses { get; set; }

    public virtual DbSet<Tuition> Tuitions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<VwTuitionSummary> VwTuitionSummaries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.UseCollation("Vietnamese_100_CI_AS");

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasIndex(e => e.StudentId, "IX_Attendances_StudentId");

            entity.HasIndex(e => new { e.ScheduleId, e.StudentId }, "UQ_Attendances").IsUnique();

            entity.Property(e => e.MarkedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Note).HasMaxLength(300);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.MarkedByNavigation).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.MarkedBy)
                .HasConstraintName("FK_Attendances_MarkedBy");

            entity.HasOne(d => d.Schedule).WithMany(p => p.Attendances)
                .HasPrincipalKey(p => new { p.Id, p.ClassId })
                .HasForeignKey(d => new { d.ScheduleId, d.ClassId })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Attendances_Schedules");

            entity.HasOne(d => d.StudentClass).WithMany(p => p.Attendances)
                .HasPrincipalKey(p => new { p.StudentId, p.ClassId })
                .HasForeignKey(d => new { d.StudentId, d.ClassId })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Attendances_Enrolled");
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.BranchName).HasMaxLength(150);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasIndex(e => new { e.BranchId, e.Status }, "IX_Classes_BranchId_Status");

            entity.HasIndex(e => e.CourseId, "IX_Classes_CourseId");

            entity.HasIndex(e => e.TeacherId, "IX_Classes_TeacherId");

            entity.Property(e => e.ClassName).HasMaxLength(200);
            entity.Property(e => e.ClassType)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("Group");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Upcoming");
            entity.Property(e => e.TeacherRole)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasComputedColumnSql("(CONVERT([varchar](20),'Teacher'))", true);
            entity.Property(e => e.TuitionFee).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.Branch).WithMany(p => p.Classes)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Classes_Branches");

            entity.HasOne(d => d.Course).WithMany(p => p.Classes)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Classes_Courses");

            entity.HasOne(d => d.User).WithMany(p => p.Classes)
                .HasPrincipalKey(p => new { p.Id, p.Role })
                .HasForeignKey(d => new { d.TeacherId, d.TeacherRole })
                .HasConstraintName("FK_Classes_Teacher");
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(e => e.CourseCode, "UX_Courses_CourseCode")
                .IsUnique()
                .HasFilter("([CourseCode] IS NOT NULL)");

            entity.Property(e => e.CourseCode)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.CourseName).HasMaxLength(200);
            entity.Property(e => e.CourseNameEn).HasMaxLength(200);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DefaultFee).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasIndex(e => new { e.StudentId, e.ClassId }, "IX_Grades_Student_Class");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ExamName).HasMaxLength(150);
            entity.Property(e => e.ExamType)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Other");
            entity.Property(e => e.MaxScore)
                .HasDefaultValue(10m)
                .HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Score).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.TeacherComment).HasMaxLength(1000);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.GradedByNavigation).WithMany(p => p.Grades)
                .HasForeignKey(d => d.GradedBy)
                .HasConstraintName("FK_Grades_GradedBy");

            entity.HasOne(d => d.StudentClass).WithMany(p => p.Grades)
                .HasPrincipalKey(p => new { p.StudentId, p.ClassId })
                .HasForeignKey(d => new { d.StudentId, d.ClassId })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Grades_Enrolled");
        });

        modelBuilder.Entity<Homework>(entity =>
        {
            entity.HasIndex(e => new { e.ClassId, e.DueDate }, "IX_Homeworks_Class_Due");

            entity.HasIndex(e => new { e.Id, e.ClassId }, "UQ_Homeworks_Id_Class").IsUnique();

            entity.Property(e => e.AttachmentUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DueDate).HasPrecision(0);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Class).WithMany(p => p.Homeworks)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Homeworks_Classes");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Homeworks)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Homeworks_Creator");

            entity.HasOne(d => d.Schedule).WithMany(p => p.Homeworks)
                .HasPrincipalKey(p => new { p.Id, p.ClassId })
                .HasForeignKey(d => new { d.ScheduleId, d.ClassId })
                .HasConstraintName("FK_Homeworks_Schedules");
        });

        modelBuilder.Entity<HomeworkSubmission>(entity =>
        {
            entity.HasIndex(e => e.StudentId, "IX_HwSub_StudentId");

            entity.HasIndex(e => new { e.HomeworkId, e.StudentId }, "UQ_HwSub").IsUnique();

            entity.Property(e => e.ReviewedAt).HasPrecision(0);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Pending");
            entity.Property(e => e.StudentNote).HasMaxLength(500);
            entity.Property(e => e.SubmissionUrl).HasMaxLength(500);
            entity.Property(e => e.SubmittedAt).HasPrecision(0);
            entity.Property(e => e.TeacherFeedback).HasMaxLength(1000);

            entity.HasOne(d => d.Homework).WithMany(p => p.HomeworkSubmissions)
                .HasPrincipalKey(p => new { p.Id, p.ClassId })
                .HasForeignKey(d => new { d.HomeworkId, d.ClassId })
                .HasConstraintName("FK_HwSub_Homeworks");

            entity.HasOne(d => d.StudentClass).WithMany(p => p.HomeworkSubmissions)
                .HasPrincipalKey(p => new { p.StudentId, p.ClassId })
                .HasForeignKey(d => new { d.StudentId, d.ClassId })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HwSub_Enrolled");
        });

        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.HasIndex(e => new { e.Status, e.LeaveDate }, "IX_Leave_Status");

            entity.HasIndex(e => e.StudentId, "IX_Leave_StudentId");

            entity.HasIndex(e => e.TeacherId, "IX_Leave_TeacherId");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.RequesterType)
                .HasMaxLength(7)
                .IsUnicode(false)
                .HasComputedColumnSql("(case when [StudentId] IS NOT NULL then 'Student' else 'Teacher' end)", true);
            entity.Property(e => e.ReviewNote).HasMaxLength(500);
            entity.Property(e => e.ReviewedAt).HasPrecision(0);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Pending");
            entity.Property(e => e.TeacherRole)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasComputedColumnSql("(CONVERT([varchar](20),'Teacher'))", true);

            entity.HasOne(d => d.Class).WithMany(p => p.LeaveRequests)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("FK_Leave_Classes");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.LeaveRequestRequestedByNavigations)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Leave_Requester");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.LeaveRequestReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("FK_Leave_Reviewer");

            entity.HasOne(d => d.Student).WithMany(p => p.LeaveRequests)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("FK_Leave_Students");

            entity.HasOne(d => d.Schedule).WithMany(p => p.LeaveRequests)
                .HasPrincipalKey(p => new { p.Id, p.ClassId })
                .HasForeignKey(d => new { d.ScheduleId, d.ClassId })
                .HasConstraintName("FK_Leave_Schedules");

            entity.HasOne(d => d.StudentClass).WithMany(p => p.LeaveRequests)
                .HasPrincipalKey(p => new { p.StudentId, p.ClassId })
                .HasForeignKey(d => new { d.StudentId, d.ClassId })
                .HasConstraintName("FK_Leave_Enrolled");

            entity.HasOne(d => d.User).WithMany(p => p.LeaveRequestUsers)
                .HasPrincipalKey(p => new { p.Id, p.Role })
                .HasForeignKey(d => new { d.TeacherId, d.TeacherRole })
                .HasConstraintName("FK_Leave_Teacher");
        });

        modelBuilder.Entity<LessonProgress>(entity =>
        {
            entity.ToTable("LessonProgress");

            entity.HasIndex(e => new { e.ClassId, e.LessonDate }, "IX_LessonProgress_Class_Date");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.Class).WithMany(p => p.LessonProgresses)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LessonProgress_Classes");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.LessonProgresses)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LessonProgress_Creator");

            entity.HasOne(d => d.Schedule).WithMany(p => p.LessonProgresses)
                .HasPrincipalKey(p => new { p.Id, p.ClassId })
                .HasForeignKey(d => new { d.ScheduleId, d.ClassId })
                .HasConstraintName("FK_LessonProgress_Schedules");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasIndex(e => new { e.ClassId, e.CreatedAt }, "IX_Messages_Class").IsDescending(false, true);

            entity.HasIndex(e => new { e.ReceiverId, e.IsRead, e.CreatedAt }, "IX_Messages_Receiver").IsDescending(false, false, true);

            entity.Property(e => e.Content).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ReadAt).HasPrecision(0);

            entity.HasOne(d => d.Class).WithMany(p => p.Messages)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("FK_Messages_Classes");

            entity.HasOne(d => d.Receiver).WithMany(p => p.MessageReceivers)
                .HasForeignKey(d => d.ReceiverId)
                .HasConstraintName("FK_Messages_Receiver");

            entity.HasOne(d => d.Sender).WithMany(p => p.MessageSenders)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Messages_Sender");

            entity.HasOne(d => d.Student).WithMany(p => p.Messages)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("FK_Messages_Students");
        });

        modelBuilder.Entity<Newsfeed>(entity =>
        {
            entity.ToTable("Newsfeed");

            entity.HasIndex(e => new { e.BranchId, e.CreatedAt }, "IX_Newsfeed_Branch_Created").IsDescending(false, true);

            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.IsPublished).HasDefaultValue(true);
            entity.Property(e => e.TargetAudience)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("All");
            entity.Property(e => e.Title).HasMaxLength(300);
            entity.Property(e => e.TitleEn).HasMaxLength(300);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.Branch).WithMany(p => p.Newsfeeds)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("FK_Newsfeed_Branches");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Newsfeeds)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Newsfeed_Creator");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.IsRead, e.CreatedAt }, "IX_Notif_User_Read").IsDescending(false, false, true);

            entity.Property(e => e.Body).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ReadAt).HasPrecision(0);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Type)
                .HasMaxLength(30)
                .IsUnicode(false);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Notif_Users");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable(tb =>
            {
                tb.HasTrigger("TR_Payments_NoOverpay");
                tb.UseSqlOutputClause(false);
            });

            entity.HasIndex(e => e.TransactionCode, "IX_Payments_TransactionCode").HasFilter("([TransactionCode] IS NOT NULL)");

            entity.HasIndex(e => e.TuitionId, "IX_Payments_TuitionId");

            entity.Property(e => e.Amount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.ConfirmedAt).HasPrecision(0);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.PaidAt).HasPrecision(0);
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.ProofImageUrl).HasMaxLength(500);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("PendingConfirm");
            entity.Property(e => e.TransactionCode).HasMaxLength(100);

            entity.HasOne(d => d.ConfirmedByNavigation).WithMany(p => p.Payments)
                .HasForeignKey(d => d.ConfirmedBy)
                .HasConstraintName("FK_Payments_Confirmer");

            entity.HasOne(d => d.Tuition).WithMany(p => p.Payments)
                .HasForeignKey(d => d.TuitionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payments_Tuitions");
        });

        modelBuilder.Entity<Schedule>(entity =>
        {
            entity.HasIndex(e => new { e.ClassId, e.StudyDate }, "IX_Schedules_ClassId_Date");

            entity.HasIndex(e => e.StudyDate, "IX_Schedules_Date");

            entity.HasIndex(e => new { e.Id, e.ClassId }, "UQ_Schedules_Id_Class").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.EndTime).HasPrecision(0);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.Room).HasMaxLength(50);
            entity.Property(e => e.StartTime).HasPrecision(0);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Scheduled");
            entity.Property(e => e.SubstituteRole)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasComputedColumnSql("(CONVERT([varchar](20),'Teacher'))", true);

            entity.HasOne(d => d.Class).WithMany(p => p.Schedules)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Schedules_Classes");

            entity.HasOne(d => d.User).WithMany(p => p.Schedules)
                .HasPrincipalKey(p => new { p.Id, p.Role })
                .HasForeignKey(d => new { d.SubstituteTeacherId, d.SubstituteRole })
                .HasConstraintName("FK_Schedules_Substitute");
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasIndex(e => e.BranchId, "IX_Students_BranchId");

            entity.HasIndex(e => e.ParentId, "IX_Students_ParentId");

            entity.HasIndex(e => e.UserId, "UX_Students_UserId")
                .IsUnique()
                .HasFilter("([UserId] IS NOT NULL)");

            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Dob).HasColumnName("DOB");
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.Gender)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.Grade).HasMaxLength(50);
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.ParentRole)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasComputedColumnSql("(CONVERT([varchar](20),'Parent'))", true);
            entity.Property(e => e.School).HasMaxLength(200);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Active");
            entity.Property(e => e.UpdatedAt).HasPrecision(0);
            entity.Property(e => e.UserRole)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasComputedColumnSql("(CONVERT([varchar](20),'Student'))", true);

            entity.HasOne(d => d.Branch).WithMany(p => p.Students)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Students_Branches");

            entity.HasOne(d => d.User).WithMany(p => p.StudentUsers)
                .HasPrincipalKey(p => new { p.Id, p.Role })
                .HasForeignKey(d => new { d.ParentId, d.ParentRole })
                .HasConstraintName("FK_Students_Parent");

            entity.HasOne(d => d.UserNavigation).WithMany(p => p.StudentUserNavigations)
                .HasPrincipalKey(p => new { p.Id, p.Role })
                .HasForeignKey(d => new { d.UserId, d.UserRole })
                .HasConstraintName("FK_Students_User");
        });

        modelBuilder.Entity<StudentClass>(entity =>
        {
            entity.HasIndex(e => new { e.ClassId, e.Status }, "IX_StudentClasses_ClassId");

            entity.HasIndex(e => new { e.StudentId, e.ClassId }, "UQ_StudentClasses").IsUnique();

            entity.Property(e => e.ApprovedAt).HasPrecision(0);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.RegisteredAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.StudentClasses)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("FK_StudentClasses_Approver");

            entity.HasOne(d => d.Class).WithMany(p => p.StudentClasses)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StudentClasses_Classes");

            entity.HasOne(d => d.Student).WithMany(p => p.StudentClasses)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StudentClasses_Students");
        });

        modelBuilder.Entity<Tuition>(entity =>
        {
            entity.HasIndex(e => new { e.BranchId, e.DueDate }, "IX_Tuitions_Branch_Due");

            entity.HasIndex(e => e.StudentId, "IX_Tuitions_Student");

            entity.Property(e => e.Amount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Discount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Branch).WithMany(p => p.Tuitions)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Tuitions_Branches");

            entity.HasOne(d => d.Student).WithMany(p => p.Tuitions)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Tuitions_Students");

            entity.HasOne(d => d.StudentClass).WithMany(p => p.Tuitions)
                .HasPrincipalKey(p => new { p.StudentId, p.ClassId })
                .HasForeignKey(d => new { d.StudentId, d.ClassId })
                .HasConstraintName("FK_Tuitions_Enrolled");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => new { e.BranchId, e.Role }, "IX_Users_BranchId_Role");

            entity.HasIndex(e => new { e.Id, e.Role }, "UQ_Users_Id_Role").IsUnique();

            entity.HasIndex(e => e.PhoneNumber, "UX_Users_PhoneNumber").IsUnique();

            entity.HasIndex(e => e.ZaloId, "UX_Users_ZaloId")
                .IsUnique()
                .HasFilter("([ZaloId] IS NOT NULL)");

            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LastLoginAt).HasPrecision(0);
            entity.Property(e => e.PasswordHash).HasMaxLength(256);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(15)
                .IsUnicode(false);
            entity.Property(e => e.PreferredLanguage)
                .HasMaxLength(5)
                .IsUnicode(false)
                .HasDefaultValue("vi");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);
            entity.Property(e => e.ZaloId)
                .HasMaxLength(64)
                .IsUnicode(false);

            entity.HasOne(d => d.Branch).WithMany(p => p.Users)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("FK_Users_Branches");
        });

        modelBuilder.Entity<VwTuitionSummary>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_TuitionSummary");

            entity.Property(e => e.NetAmount).HasColumnType("decimal(19, 0)");
            entity.Property(e => e.PaidAmount).HasColumnType("decimal(38, 0)");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(13)
                .IsUnicode(false);
            entity.Property(e => e.PendingAmount).HasColumnType("decimal(38, 0)");
            entity.Property(e => e.RemainingAmount).HasColumnType("decimal(38, 0)");
            entity.Property(e => e.Title).HasMaxLength(200);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
