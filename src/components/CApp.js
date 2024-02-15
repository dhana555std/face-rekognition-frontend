import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { fromEvent, interval, merge, of } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';
import { sendToApi } from '../service';

const CameraComponent = () => {
  const webcamRef = useRef(null);
  const [warning, setWarning] = useState('');
  const nameOfDetectedPerson = '';
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
    };

    loadModels();

    const captureObservable = interval(3000).pipe(
      switchMap(() => fromEvent(webcamRef.current.video, 'loadeddata')),
      map(() => captureImage()),
    );

    const subscription = captureObservable.subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const captureImage = async () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      return;
    }

    const video = webcamRef.current.video;
    const displaySize = { width: video.offsetWidth, height: video.offsetHeight };

    const canvas = faceapi.createCanvasFromMedia(video);
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.id = 'reactAngleCanvas';
    canvas.width = video.offsetWidth;
    canvas.height = video.offsetHeight;
    document.body.append(canvas);

    const context = canvas.getContext('2d');

    const textCanvas = document.createElement('canvas');
    textCanvas.width = video.offsetWidth;
    textCanvas.height = video.offsetHeight;
    const textContext = textCanvas.getContext('2d');

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
    textContext.translate(textCanvas.width, 0);
    textContext.scale(-1, 1);

    resizedDetections.forEach((detection) => {
      const box = detection.detection.box;
      const text = nameOfDetectedPerson; // Replace with your desired text

      faceapi.draw.drawDetections(context, [detection]);

      textContext.fillStyle = 'red';
      textContext.font = '16px Arial';
      textContext.fillText(text, box.x + 5, box.y - 5);
    });

    context.drawImage(textCanvas, 0, 0);

    const imageSrc = webcamRef.current.getScreenshot();
    const img = new Image();

    img.src = imageSrc;

    img.onload = async () => {
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length >= 1) {
        setWarning('');
        const data = await sendToApi(imageSrc);
        const name = data[0].Face.ExternalImageId.split('.')[0];
        console.log(data[0].Face.ExternalImageId);
        nameOfDetectedPerson = name;
      } else {
        setWarning('No person detected!');
      }
    };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {warning && <div style={{ color: 'red' }}>{warning}</div>}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          mirrored={true}
          screenshotFormat="image/jpeg"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default CameraComponent;
