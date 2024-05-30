import cv2

available_dicts = [name for name in dir(cv2.aruco) if 'DICT' in name]

print(available_dicts)