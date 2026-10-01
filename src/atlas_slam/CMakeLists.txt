cmake_minimum_required(VERSION 3.8)
project(atlas_slam)

find_package(ament_cmake REQUIRED)

install(
  DIRECTORY config launch maps rviz
  DESTINATION share/${PROJECT_NAME}
)

install(
  PROGRAMS scripts/send_goal_and_time.py scripts/waypoint_demo.py
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
