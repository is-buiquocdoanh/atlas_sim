# 5. Parameter

*[← Service](04-service.md) · [Mục lục module](00-gioi-thieu.md) · Tiếp theo: [Launch file →](06-launch-file.md)*

## Định nghĩa

**Parameter** là giá trị cấu hình gắn với 1 node, đọc/ghi được lúc chạy — không cần sửa code hay build lại.

## Cơ chế

```python
self.declare_parameter("base_temperature", 25.0)   # khai báo + giá trị MẶC ĐỊNH
value = self.get_parameter("base_temperature").value  # đọc giá trị hiện tại
```
`declare_parameter` phải gọi trước `get_parameter`. Giá trị mặc định chỉ dùng khi không ai ghi đè (CLI hoặc launch file).

**Điểm dễ hiểu nhầm nhất — ROS 2 không tự "live-bind" parameter vào biến:**
```python
# Cách A: đọc 1 lần, lưu self.xxx lúc __init__
self.rate = self.get_parameter("publish_rate_hz").value
# -> ros2 param set giữa chừng KHÔNG có tác dụng, code không đọc lại nữa

# Cách B: đọc lại MỖI LẦN dùng, trong chính callback
def publish_reading(self):
    base_temperature = self.get_parameter("base_temperature").value
    # -> ros2 param set có tác dụng NGAY ở lần gọi tiếp theo
```
Chọn A hay B tùy giá trị gắn với gì: dùng để tính chu kỳ `Timer` thì đổi giữa chừng cần hủy/tạo lại timer (A hợp lý hơn); phép tính đơn giản trong callback thì đọc lại (B) gần như miễn phí.

```bash
ros2 param list /ten_node
ros2 param get /ten_node <tên>
ros2 param set /ten_node <tên> <giá_trị>
```

## Ví dụ trong bài học

`sensor_publisher.py` minh họa cả 2 cách cạnh nhau — `publish_rate_hz` (cách A) và `base_temperature` (cách B):
```bash
ros2 param set /sensor_publisher base_temperature 30.0   # có tác dụng ngay
ros2 param set /sensor_publisher publish_rate_hz 5.0      # không có tác dụng gì
```
Muốn đổi `publish_rate_hz` thật — cần khởi động lại, hoặc truyền đúng giá trị NGAY LÚC khởi động qua launch file (bài tiếp theo).

## Ví dụ trong dự án Atlas

`atlas_control/config/diff_drive_controller.yaml`:
```yaml
diff_drive_controller:
  ros__parameters:
    wheel_separation: 0.30
    wheel_radius: 0.05
```
Cấu trúc `<tên_node>: ros__parameters: <tên>: <giá_trị>` là cách YAML khai báo sẵn nhiều parameter cùng lúc, nạp lúc khởi động — bên dưới vẫn đúng cơ chế vừa học. "Đổi `wheel_radius` để khớp bánh xe thật" (Module 5) hay "đổi `nav2_params_dwb.yaml` sang `nav2_params_mppi.yaml`" (Module 10) đều chỉ là **sửa parameter trong YAML, không sửa code** — đây là lý do parameter quan trọng: tách cấu hình khỏi logic.

---
*Tiếp theo: [Launch file →](06-launch-file.md)*
