# Atlas Sim — Docs Index

> Dự án mô phỏng robot diff-drive trên Gazebo (ROS 2), làm nền cho khóa học ROS 2 & Navigation2.
> A diff-drive robot simulation project on Gazebo (ROS 2), built to double as a ROS 2 & Navigation2 course.

Đây là tập tài liệu **ý tưởng ban đầu** (concept docs), viết ra để thống nhất phạm vi trước khi bắt tay code. Mọi thứ ở đây có thể chỉnh sửa khi triển khai thực tế.

## Mục lục

| # | File | Nội dung |
|---|------|----------|
| 00 | [Tổng quan dự án](overview/00-tong-quan-du-an.md) | Ý tưởng, mục tiêu kép, đối tượng, USP, tech stack |
| 01 | [Cấu trúc workspace](overview/01-cau-truc-workspace.md) | Cấu trúc package ROS 2 đề xuất cho robot Atlas |
| 02 | [Lộ trình khóa học](overview/02-lo-trinh-khoa-hoc.md) | Chi tiết 12 module, từ ROS 2 cơ bản đến Nav2 nâng cao |
| 03 | [Yêu cầu môi trường](overview/03-yeu-cau-moi-truong.md) | Hệ điều hành, phần cứng, Docker, cách học viên setup |
| 04 | [Capstone & đánh giá](overview/04-capstone-va-danh-gia.md) | Đồ án cuối khóa, tiêu chí chấm, chứng chỉ |
| 05 | [Kế hoạch triển khai](overview/05-ke-hoach-trien-khai.md) | Roadmap xây dựng dự án + khóa học theo giai đoạn |
| — | [course/](course/) | Nội dung bài học chi tiết từng module (đang viết dần, xem [02](overview/02-lo-trinh-khoa-hoc.md) cho outline toàn bộ 13 module). Mỗi module = 1 thư mục riêng, tách theo khái niệm, có định nghĩa + ví dụ thật trong dự án. |

### Module đã viết (Giai đoạn 1-2)

- [Module 1 — ROS 2 core concepts](course/module-01-ros2-core-concepts/00-gioi-thieu.md)
- [Module 2 — TF2 & tọa độ](course/module-02-tf2-toa-do/00-gioi-thieu.md)
- [Module 3 — URDF/XACRO](course/module-03-urdf-xacro/00-gioi-thieu.md)
- [Module 4 — Đưa robot vào Gazebo](course/module-04-gazebo/00-gioi-thieu.md)
- [Module 5 — ros2_control](course/module-05-ros2-control/00-gioi-thieu.md)
- [Module 6 — Cảm biến: LiDAR & IMU](course/module-06-cam-bien/00-gioi-thieu.md)
- [Module 7 — Teleoperation & RViz](course/module-07-teleoperation/00-gioi-thieu.md) *(hết Giai đoạn 2)*

Module 8-13 (Giai đoạn 3-4 — Navigation2 & Capstone) chưa viết.

## Quyết định khung (đã chốt với người dùng)

- **Đối tượng**: người mới bắt đầu học ROS 2 + sinh viên làm đồ án tốt nghiệp.
- **Định dạng chính**: Markdown docs dạng bài học tuần tự, đi kèm code mẫu trong cùng repo (không phải video).
- **Robot**: diff-drive đơn giản (2 bánh chủ động + 1 caster), ưu tiên dạy ROS 2/Nav2 hơn là cơ khí phức tạp.
- **Ngôn ngữ**: song ngữ theo kiểu thực dụng — nội dung tiếng Việt, thuật ngữ kỹ thuật giữ nguyên tiếng Anh, tiêu đề có bản dịch Anh.
