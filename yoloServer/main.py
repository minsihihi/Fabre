# 파일명: main.py

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import uvicorn
import torch
from PIL import Image
import io

app = FastAPI()

# YOLO 모델 로드 (pt 파일 경로 맞게 수정)
model = torch.hub.load('ultralytics/yolov5', 'custom', path='diet_yolov8.pt', force_reload=True)

@app.post("/predict/")
async def predict_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))

    results = model(img)
    preds = results.pandas().xyxy[0].to_dict(orient="records")  # 예측 결과 리스트

    return JSONResponse(content={"predictions": preds})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
