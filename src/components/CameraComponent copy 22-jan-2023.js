import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { sendToApi } from '../service';

const CameraComponent = () => {
  const webcamRef = useRef(null);
  const [warning, setWarning] = useState('');
  // const [nameOfDetectedPerson, setNameOfDetectedPerson] = useState('');
  let nameOfDetectedPerson = "";
  const videoConstraints = {
    width: "100%",
    height: "100%",
    facingMode: 'user',
  };

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
    };

    loadModels();

    //const captureInterval = setInterval(() => {
    captureImage();
    //}, 1000);

    // Clean up the interval when the component unmounts
    //return () => clearInterval(captureInterval);
  }, []);

  const captureImage = async () => {
    if (webcamRef.current && webcamRef.current.video && faceapi) {
      const video = webcamRef.current.video;
      if (video && video.offsetWidth > 0 && video.offsetHeight > 0) {
        const displaySize = {
          width: video.offsetWidth,
          height: video.offsetHeight,
        };

        const canvas = faceapi.createCanvasFromMedia(video);
        var existingCanvas = document.getElementById('reactAngleCanvas');

        // If a canvas exists, remove it
        if (existingCanvas) {
          existingCanvas.parentNode.removeChild(existingCanvas);
          document.body.append(canvas);
        }
        document.body.append(canvas);

        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.id = 'reactAngleCanvas';
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        faceapi.matchDimensions(canvas, displaySize);

        const context = canvas.getContext('2d');

        // Create a separate canvas for text without mirroring
        const textCanvas = document.createElement('canvas');
        textCanvas.width = video.offsetWidth;
        textCanvas.height = video.offsetHeight;
        const textContext = textCanvas.getContext('2d');

        const detections = await faceapi
          .detectAllFaces(
            webcamRef.current.video,
            new faceapi.TinyFaceDetectorOptions(),
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        // context.drawImage(video, 0, 0);

        textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
        textContext.translate(textCanvas.width, 0);
        textContext.scale(-1, 1);
        // textContext.drawImage(video, 0, 0);

        // Adjust text position
        resizedDetections.forEach((detection) => {
          const box = detection.detection.box;
          const text = nameOfDetectedPerson; // Replace with your desired text

          // Draw rectangle on mirrored video canvas
          faceapi.draw.drawDetections(context, [detection]);

          // Draw text on separate text canvas without mirroring
          textContext.fillStyle = 'red'; // Set the text color
          textContext.font = '16px Arial'; // Set the font style
          textContext.fillText(text, box.x + 5, box.y - 5); // Adjust the position
        });

        // Draw the text canvas on the mirrored video canvas
        context.drawImage(textCanvas, 0, 0);
      } else {
        console.error('Invalid video dimensions');
      }
    }

    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      const img = new Image();

      img.src = imageSrc;

      img.onload = async () => {
        const detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();
        if (detections.length >= 1) {
          detections.forEach(async (detection) => {
            setWarning('');
            //setCapturedImage(imageSrc);
            // Send the captured image to the REST API
            const croppedImage = await cropImage(img, detection.alignedRect._box._x, detection.alignedRect._box._y, detection.alignedRect._box._width, detection.alignedRect._box._height);

            const data = await sendToApi(croppedImage);
            console.log(data);
            if (data) {
              const name = data[0].Face.ExternalImageId.split('.')[0];
              console.log(data[0].Face.ExternalImageId);
              nameOfDetectedPerson = name;
              // setNameOfDetectedPerson(name);
            }


          });
        }
        else {
          setWarning('No person detected!');
          // setCapturedImage('');
        }
      };
    }
  };

  const cropImage = (sourceImage, startX, startY, width, height) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the dimensions of the new canvas
    canvas.width = width;
    canvas.height = height;

    // Draw the cropped part onto the new canvas
    ctx.drawImage(sourceImage, startX, startY, width, height, 0, 0, width, height);

    // Create a new image element with the cropped image data
    const croppedImage = new Image();
    croppedImage.src = canvas.toDataURL(); // Convert the canvas to a data URL

    return canvas.toDataURL();
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
          videoConstraints={videoConstraints}
        />
      </div>

    </div>
  );
};

export default CameraComponent;