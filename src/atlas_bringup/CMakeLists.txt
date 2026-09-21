cmake_minimum_required(VERSION 3.8)
project(atlas_bringup)

find_package(ament_cmake REQUIRED)

install(
  DIRECTORY config launch
  DESTINATION share/${PROJECT_NAME}
)

install(
  PROGRAMS scripts/collision_guard_relay.py
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
