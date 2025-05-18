# detect_yolo.py
import sys
import json
from ultralytics import YOLO

names = ["닭가슴살구이", "방울토마토", "삶은고구마", "삶은달걀", 
         "쇠고기구이", "두부", "연어구이", "밥", "단호박", "바나나", 
         "아몬드", "캐슈넛"]

model = YOLO("C:/Users/박민서/Desktop/졸업프로젝트/Fabre/ai/food_yolo_fabre/weights/best.pt")

image_url = sys.argv[1]

results = model.predict(source=image_url, save=False, device='cpu')
detected = []

for r in results:
    for cls in r.boxes.cls:
        idx = int(cls.item())
        if 0 <= idx < len(names):
            detected.append(names[idx])

# ✅ JSON 객체로 출력
print(json.dumps({ "detected": detected }))
