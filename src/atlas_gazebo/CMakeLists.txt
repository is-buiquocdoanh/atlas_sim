cmake_minimum_required(VERSION 3.8)
project(atlas_gazebo)

find_package(ament_cmake REQUIRED)

install(
  DIRECTORY worlds launch config urdf models
  DESTINATION share/${PROJECT_NAME}
)

# Tự động thêm share/atlas_gazebo/models vào IGN_GAZEBO_RESOURCE_PATH/GZ_SIM_RESOURCE_PATH mỗi
# khi `source install/setup.bash` -- để các URI model://aws_robomaker_warehouse_... trong
# worlds/warehouse.sdf, worlds/office.sdf tìm thấy model thật mà KHÔNG cần tự export biến môi
# trường tay trước khi chạy `ros2 launch` (lỗi thật gặp: world:=office.sdf không load được vì
# thiếu đúng biến này khi chạy ở terminal thường, không export thủ công như lúc debug).
ament_environment_hooks("${CMAKE_CURRENT_SOURCE_DIR}/hooks/${PROJECT_NAME}.dsv.in")

ament_package()
