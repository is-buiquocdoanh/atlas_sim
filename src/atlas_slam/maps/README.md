# Maps

Thư mục này chứa bản đồ do SLAM tạo ra (Module 8). **Có 2 định dạng khác nhau, không thay
thế cho nhau** — cần cả hai nếu muốn dùng được cả AMCL lẫn slam_toolbox để định vị (Module 9):

## 1. Định dạng chuẩn Nav2 (`.pgm` + `.yaml`) — dùng cho AMCL

```bash
ros2 run nav2_map_server map_saver_cli -f src/atlas_slam/maps/maze_map
```

Tạo ra `maze_map.yaml` (metadata) + `maze_map.pgm` (ảnh occupancy grid). Cần cho
`navigation.launch.py` khi chạy mặc định (`localization:=amcl`).

## 2. Định dạng serialize của slam_toolbox (`.posegraph` + `.data`) — dùng cho slam_toolbox

```bash
ros2 service call /slam_toolbox/serialize_map slam_toolbox/srv/SerializePoseGraph \
  "{filename: '/đường/dẫn/tuyệt/đối/tới/src/atlas_slam/maps/maze_map'}"
```

(Phải dùng đường dẫn tuyệt đối — filename tương đối bị hiểu theo thư mục làm việc hiện tại
của node `slam_toolbox`, không phải theo terminal bạn gõ lệnh.) Tạo ra `maze_map.posegraph` +
`maze_map.data`. Cần cho `navigation.launch.py localization:=slam_toolbox`.

Cả 2 lệnh trên đều chạy trong lúc `atlas_slam/launch/slam.launch.py` (mode mapping) đang hoạt
động — chạy sau khi đã lái robot đi hết world, trước khi tắt SLAM. Nên chạy cả 2 lệnh cùng
lúc (cùng 1 phiên mapping) để 2 định dạng khớp đúng cùng 1 bản đồ, tránh AMCL và slam_toolbox
định vị trên 2 map hơi khác nhau nếu chạy lại mapping ở 2 thời điểm riêng.

Chưa có file nào ở đây trong repo vì bản đồ phải tự tay tạo (không có sẵn "đáp án" — đây
chính là bài tập của Module 8).
